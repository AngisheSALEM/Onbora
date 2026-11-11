"""Build reviewable reports from commercial work, without requiring audio."""
import io
import zipfile
from uuid import uuid4
from xml.etree import ElementTree

from django.core import signing
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from kam.models import KamAppointment, KamVisitReport
from sales.models import Enterprise

SOURCE_TYPES = {
    'NOTES': 'Notes de rencontre', 'MESSAGE': 'Message de suivi',
    'PROPOSAL': 'Proposition commerciale', 'TECHNICAL': 'Retour avant-vente',
}
SIGNING_SALT = 'kam.meeting-report.v1'
MAX_FILE_SIZE = 5 * 1024 * 1024


class ReportSourceSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=30000, default='')
    source_type = serializers.ChoiceField(choices=SOURCE_TYPES, default='NOTES')
    document_text = serializers.CharField(required=False, allow_blank=True, max_length=30000, default='')
    document_name = serializers.CharField(required=False, allow_blank=True, max_length=255, default='')
    next_action = serializers.CharField(required=False, allow_blank=True, max_length=1000, default='')
    owner = serializers.CharField(required=False, allow_blank=True, max_length=200, default='')
    due_date = serializers.DateField(required=False, allow_null=True, default=None)

    def validate(self, attrs):
        if not any(attrs[key].strip() for key in ('notes', 'document_text', 'next_action')):
            raise serializers.ValidationError('Ajoutez des notes, un message, un document ou une prochaine action.')
        if (attrs['owner'] or attrs['due_date']) and not attrs['next_action']:
            raise serializers.ValidationError('Précisez l’action associée au responsable ou à l’échéance.')
        return attrs


class ReviewedReportSerializer(serializers.Serializer):
    draft_token = serializers.CharField(max_length=150000)
    executive_summary = serializers.CharField(max_length=30000)
    confirmed_needs = serializers.ListField(child=serializers.CharField(max_length=2000), max_length=100)
    objections_raised = serializers.ListField(child=serializers.CharField(max_length=2000), max_length=100)
    actions_todo = serializers.ListField(child=serializers.CharField(max_length=2000), max_length=100)
    follow_up_email_draft = serializers.CharField(allow_blank=True, max_length=30000)


def extract_document(upload):
    """Extract bounded text only; no file is executed or retained on the server."""
    if upload.size > MAX_FILE_SIZE:
        raise serializers.ValidationError('Le document dépasse 5 Mo. Choisissez un fichier plus léger.')
    suffix = upload.name.rsplit('.', 1)[-1].lower()
    content = upload.read(MAX_FILE_SIZE + 1)
    try:
        if suffix in ('txt', 'md', 'csv'):
            text = content.decode('utf-8-sig')
        elif suffix == 'pdf':
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(content))
            if reader.is_encrypted or len(reader.pages) > 50:
                raise ValueError('Unsupported PDF')
            text = '\n'.join(page.extract_text() or '' for page in reader.pages)
        elif suffix == 'docx':
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                info = archive.getinfo('word/document.xml')
                if info.file_size > MAX_FILE_SIZE:
                    raise ValueError('Document too large')
                xml = archive.read(info)
                if b'<!DOCTYPE' in xml or b'<!ENTITY' in xml:
                    raise ValueError('Unsupported XML')
                root = ElementTree.fromstring(xml)
                ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
                text = '\n'.join(''.join(p.itertext()) for p in root.iter(f'{ns}p'))
        else:
            raise serializers.ValidationError('Choisissez un document PDF, DOCX ou texte.')
    except serializers.ValidationError:
        raise
    except Exception as exc:
        raise serializers.ValidationError('Ce document ne peut pas être lu. Copiez son texte dans les notes.') from exc
    text = text.strip()
    if not text or len(text) > 30000:
        raise serializers.ValidationError('Texte absent ou trop long. Copiez les passages utiles dans les notes.')
    return {'name': upload.name[:255], 'text': text}


def prepare_report(enterprise, appointment, user, data):
    from apps.ai_core.unified_engine import get_unified_core_ai
    source = ReportSourceSerializer(data=data)
    source.is_valid(raise_exception=True)
    values = source.validated_data
    values['due_date'] = values['due_date'].isoformat() if values['due_date'] else None
    parts = [values['notes'], values['document_text']]
    action = values['next_action']
    if action:
        action += f" — {values['owner']}" if values['owner'] else ''
        action += f" — {values['due_date']}" if values['due_date'] else ''
    raw_text = '\n\n'.join(part for part in parts if part)
    transcript = f"[{SOURCE_TYPES[values['source_type']]}]\n{raw_text}" if raw_text else ''
    if action:
        transcript += f'\n\n[Action renseignée par le KAM]\n{action}'
    analysis = get_unified_core_ai().generate_meeting_report(**{
        key: values[key] for key in ('source_type', 'notes', 'document_text', 'next_action', 'owner', 'due_date')
    })
    draft = {key: analysis[key] for key in (
        'executive_summary', 'confirmed_needs', 'objections_raised', 'actions_todo', 'follow_up_email_draft',
    )}
    scores = {
        'status': 'INSUFFICIENT_DATA', 'budget': 0, 'authority': 0, 'need': 0,
        'timeline': 0, 'total': 0, 'decision_maker_contacted': False,
        'decision_maker_role': 'Non confirmé', 'decision_maker_notes': 'Non renseigné dans les éléments fournis.',
        'budget_discussed': False, 'budget_range': 'Non renseigné', 'has_explicit_timeline': False,
        'signature_timeline': 'Non renseigné', 'discovered_needs': [],
    }
    token = signing.dumps({
        'user_id': user.pk, 'enterprise_id': enterprise.pk,
        'appointment_id': appointment.pk if appointment else None,
        'source': values, 'transcript': transcript, 'bant_scores': scores, 'insights': analysis['insights'],
        'nonce': uuid4().hex,
    }, salt=SIGNING_SALT, compress=True)
    return {'draft': draft, 'draft_token': token, 'insights': analysis['insights']}


def save_reviewed_report(enterprise, appointment, user, data):
    from .briefing_service import persist_meeting_report
    serializer = ReviewedReportSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    values = serializer.validated_data
    try:
        draft = signing.loads(values.pop('draft_token'), salt=SIGNING_SALT, max_age=86400)
    except signing.BadSignature as exc:
        raise serializers.ValidationError('Le brouillon a expiré. Préparez-le à nouveau à partir de vos notes.') from exc
    if (draft['user_id'], draft['enterprise_id'], draft['appointment_id']) != (
        user.pk, enterprise.pk, appointment.pk if appointment else None
    ):
        raise serializers.ValidationError('Ce brouillon appartient à un autre dossier. Préparez un nouveau compte rendu.')
    with transaction.atomic():
        enterprise = Enterprise.objects.select_for_update().get(pk=enterprise.pk)
        existing = KamVisitReport.objects.select_related('appointment', 'enterprise').filter(
            enterprise=enterprise, crm_payload__draft_id=draft['nonce'],
        ).first()
        if existing:
            return existing
        if appointment:
            appointment = KamAppointment.objects.select_for_update().get(pk=appointment.pk)
            if appointment.status == 'CANCELLED':
                raise serializers.ValidationError('Ce rendez-vous est annulé. Vérifiez votre agenda.')
            if KamVisitReport.objects.filter(appointment=appointment).exists():
                raise serializers.ValidationError('Ce rendez-vous possède déjà un compte rendu. Consultez son historique.')
        else:
            appointment = KamAppointment.objects.create(
                enterprise=enterprise, kam=user, title=f'Rencontre — {enterprise.name}'[:200],
                scheduled_at=timezone.now(), meeting_type='PHYSICAL',
            )
        draft['bant_scores']['discovered_needs'] = values['confirmed_needs']
        report, _ = persist_meeting_report(
            appointment, user, draft['transcript'], '', enterprise.conversion_status,
            values['executive_summary'], values['confirmed_needs'], values['objections_raised'],
            values['follow_up_email_draft'], draft['bant_scores'], actions_todo=values['actions_todo'],
        )
        report.crm_payload.update({
            'source': draft['source'], 'draft_id': draft['nonce'], 'reviewed_by': user.pk,
            'reviewed_at': timezone.now().isoformat(),
            'meeting_insights': draft.get('insights', {}),
        })
        report.save(update_fields=['crm_payload'])
        return report
