import io
from django.http import HttpResponse
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, String as DString, Circle

def render_export_html(title, content_html):
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #18181b;
            line-height: 1.6;
            margin: 0;
            padding: 30px;
            background-color: #ffffff;
        }}
        .no-print-bar {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #f4f4f5;
            padding: 12px 24px;
            border-radius: 12px;
            margin-bottom: 30px;
            border: 1px solid #e4e4e7;
        }}
        .no-print-bar p {{
            margin: 0;
            font-size: 13px;
            color: #71717a;
            font-weight: 500;
        }}
        .print-btn {{
            padding: 8px 16px;
            background-color: #f97316;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            transition: background-color 0.2s;
        }}
        .print-btn:hover {{
            background-color: #ea580c;
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid #f97316;
            padding-bottom: 15px;
            margin-bottom: 30px;
        }}
        .header-logo {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        .logo-text {{
            font-size: 24px;
            font-weight: 800;
            color: #050508;
            letter-spacing: -0.5px;
        }}
        .header-meta {{
            text-align: right;
            font-size: 12px;
            color: #475569;
        }}
        .document-title {{
            font-size: 26px;
            font-weight: 800;
            color: #050508;
            margin-top: 0;
            margin-bottom: 25px;
            letter-spacing: -0.5px;
        }}
        .section {{
            margin-bottom: 35px;
            page-break-inside: avoid;
        }}
        .section-title {{
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #ea580c;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 20px;
        }}
        .grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }}
        .card {{
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 18px;
            background-color: #f8fafc;
        }}
        .card-title {{
            font-size: 13px;
            font-weight: bold;
            color: #334155;
            margin-top: 0;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            margin-right: 5px;
            margin-bottom: 5px;
            border: 1px solid transparent;
        }}
        .badge-success {{ background-color: #ffedd5; color: #ea580c; border-color: #fed7aa; }}
        .badge-warning {{ background-color: #fef3c7; color: #92400e; border-color: #fde68a; }}
        .badge-danger {{ background-color: #fee2e2; color: #991b1b; border-color: #fecaca; }}
        .badge-neutral {{ background-color: #f1f5f9; color: #334155; border-color: #e2e8f0; }}
        
        .timeline {{
            border-left: 2px solid #e2e8f0;
            padding-left: 24px;
            margin-left: 12px;
            margin-top: 15px;
        }}
        .timeline-item {{
            position: relative;
            margin-bottom: 20px;
        }}
        .timeline-item::before {{
            content: '';
            position: absolute;
            left: -30px;
            top: 5px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #f97316;
            border: 2px solid white;
            box-shadow: 0 0 0 2px #f97316;
        }}
        .timeline-title {{
            font-size: 13px;
            font-weight: bold;
            color: #0f172a;
            margin: 0 0 5px 0;
        }}
        .timeline-desc {{
            font-size: 12px;
            color: #475569;
            margin: 0;
        }}
        .email-preview {{
            background-color: #18181b;
            color: #f4f4f5;
            border-radius: 12px;
            padding: 20px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
            border: 1px solid #27272a;
        }}
        .list-unstyled {{
            list-style: none;
            padding-left: 0;
            margin: 0;
        }}
        .list-unstyled li {{
            margin-bottom: 8px;
            font-size: 13px;
            color: #334155;
        }}
        @media print {{
            .no-print {{
                display: none !important;
            }}
            body {{
                padding: 0;
            }}
            .card {{
                background-color: #ffffff !important;
                border: 1px solid #cbd5e1 !important;
            }}
        }}
    </style>
</head>
<body>
    <div class="no-print no-print-bar">
        <p>Aperçu avant impression. Pour sauvegarder en PDF, choisissez "Enregistrer au format PDF" dans les options d'impression.</p>
        <button onclick="window.print()" class="print-btn">🖨️ Imprimer / PDF</button>
    </div>

    <div class="header">
        <div class="header-logo">
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" rx="24" fill="#F97316" />
                <path d="M 33 26 C 31 16, 33 9, 36 7 C 38 5, 41 7, 40 16 C 39 23, 37 30, 36 33 C 35 34, 34 34, 33 33 Z M 43 23 C 41 12, 44 5, 47 3 C 49 1, 52 4, 50 14 C 49 22, 46 29, 44.5 32 C 44 33, 43 33, 43 32.5 Z M 53 24 C 51 15, 54 8, 57 6 C 59 4, 61 7, 59 16 C 57 24, 54 29, 52.5 32 C 52 33, 51 33, 51.5 32.5 Z M 50 35 C 62 35, 76 45, 76 58 C 76 65, 71 67, 65 67 L 65 77 C 76 77, 86 73, 86 58 C 86 40, 68 25, 50 25 C 32 25, 18 39, 18 58 C 18 77, 32 91, 50 91 C 68 91, 82 78, 84 63 L 74 63 C 72 72, 62 81, 50 81 C 38 81, 28 71, 28 58 C 28 45, 38 35, 50 35 Z" fill="white" />
            </svg>
            <span class="logo-text">Onbora</span>
        </div>
        <div class="header-meta">
            <p style="margin: 0 0 4px 0; font-weight: bold; color: #050508;">Orange Business Services MSP</p>
            <p style="margin: 0;">Généré automatiquement par Onbora Copilot</p>
        </div>
    </div>

    {content_html}
</body>
</html>"""

def get_export_response(filename, title, content_html):
    html = render_export_html(title, content_html)
    response = HttpResponse(html, content_type='text/html; charset=utf-8')
    response['Content-Disposition'] = f'inline; filename="{filename}.html"'
    return response


# --- REPORTLAB HIGH FIDELITY PDF GENERATOR ---

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and draw total page count
    along with professional header lines and footer text.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Header (Top)
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#71717A"))
        self.drawString(40, 755, "ONBORA — Orange Business Services MSP")
        self.setStrokeColor(colors.HexColor("#F97316"))
        self.setLineWidth(1)
        self.line(40, 745, 572, 745)
        
        # Footer (Bottom)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#71717A"))
        self.drawString(40, 30, "Document officiel confidentiel généré par Onbora Copilot. Tous droits réservés.")
        
        page_text = f"Page {self._pageNumber} sur {page_count}"
        self.drawRightString(572, 30, page_text)
        
        self.setStrokeColor(colors.HexColor("#E4E4E7"))
        self.setLineWidth(0.5)
        self.line(40, 42, 572, 42)
        
        self.restoreState()


def draw_logo_header():
    d = Drawing(120, 35)
    # Background rounded rect
    d.add(Rect(0, 0, 120, 35, rx=6, ry=6, fillColor=colors.HexColor("#F97316"), strokeColor=None))
    # Text
    d.add(DString(15, 12, "ONBORA", fontName="Helvetica-Bold", fontSize=14, fillColor=colors.HexColor("#FFFFFF")))
    d.add(Circle(102, 17, 3, fillColor=colors.HexColor("#FFFFFF"), strokeColor=None))
    return d


def get_styles():
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#09090B"),
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#71717A"),
        spaceAfter=25
    )
    
    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#EA580C"),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#27272A"),
        spaceAfter=10
    )
    
    bold_body_style = ParagraphStyle(
        'BoldBodyText',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#3F3F46")
    )
    
    return title_style, subtitle_style, h1_style, body_style, bold_body_style, code_style


def make_card_table(title_text, paragraphs_list, bg_color="#F8FAF9", border_color="#E4E4E7"):
    """
    Wraps content inside a stylized visual card table.
    """
    card_content = []
    if title_text:
        card_content.append(Paragraph(f"<b>{title_text.upper()}</b>", ParagraphStyle('CardTitle', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor("#52525B"), spaceAfter=6)))
    
    for p in paragraphs_list:
        card_content.append(p)
        
    t = Table([[card_content]], colWidths=[490])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg_color)),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor(border_color)),
        ('PADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    return t


def generate_reportlab_pdf_response(doc_type, obj):
    """
    Generates a high-fidelity PDF document stream according to the requested doc_type
    using ReportLab flowables, and returns an HTTP response containing the binary PDF stream.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=72,
        bottomMargin=72
    )
    
    title_style, subtitle_style, h1_style, body_style, bold_body_style, code_style = get_styles()
    story = []
    
    # 1. Fetch administration / generic info
    company_name = "Entreprise Qualifiée"
    contact_name = "Contact Référent"
    phone_number = "Non renseigné"
    rccm = "Non renseigné"
    billing_address = "Non renseigné"
    created_at = "Non renseigné"
    internal_notes = "Aucune note saisie."
    
    # Determine type of object and populate fields
    class_name = obj.__class__.__name__
    
    # If the object is a ProspectDossier
    if class_name == "ProspectDossier":
        dossier = obj
        created_at = dossier.created_at.strftime('%d/%m/%Y %H:%M')
        internal_notes = dossier.internal_kam_notes or "Aucune note interne."
        phone_number = dossier.phone or "Non renseigné"
        rccm = dossier.rccm or "Non renseigné"
        billing_address = dossier.billing_address or "Non renseigné"
        
        if dossier.source == 'INBOUND_CONVERSATION' and dossier.conversation:
            profile = dossier.conversation.extracted_profile or {}
            client = dossier.conversation.client
            company_name = profile.get('company_name') or (client.company_name if client else None) or "Entreprise Inbound"
            contact_name = f"{client.first_name} {client.last_name}" if client else "Visiteur En Ligne"
        elif dossier.source == 'OUTBOUND_VISIT' and dossier.visit_report:
            company_name = dossier.visit_report.preparation.enterprise.name
            prep = dossier.visit_report.preparation
            contact_name = f"{prep.salesperson.first_name} {prep.salesperson.last_name}"
        else:
            company_name = dossier.company_name or "Entreprise Inbound"
            contact_name = dossier.contact_name or "Contact Référent"
            
    # If the object is a ClientConversation (Business Twin view)
    elif class_name == "ClientConversation":
        conv = obj
        profile = conv.extracted_profile or {}
        company_name = profile.get('company_name') or (conv.client.company_name if conv.client else None) or "Entreprise Inbound"
        contact_name = f"{conv.client.first_name} {conv.client.last_name}" if conv.client else "Visiteur En Ligne"
        created_at = conv.created_at.strftime('%d/%m/%Y %H:%M')
        # Try to find associated dossier
        try:
            dossier = conv.prospect_dossier
            phone_number = dossier.phone or "Non renseigné"
            rccm = dossier.rccm or "Non renseigné"
            billing_address = dossier.billing_address or "Non renseigné"
            internal_notes = dossier.internal_kam_notes or "Aucune note."
        except Exception:
            dossier = None
            
    # If the object is a VisitReport (Sales preparation)
    elif class_name == "VisitReport":
        report = obj
        prep = report.preparation
        company_name = prep.enterprise.name
        contact_name = f"Commercial: {prep.salesperson.first_name} {prep.salesperson.last_name}"
        created_at = report.created_at.strftime('%d/%m/%Y %H:%M')
        # Find associated dossier
        try:
            dossier = prep.dossier
            phone_number = dossier.phone or "Non renseigné"
            rccm = dossier.rccm or "Non renseigné"
            billing_address = dossier.billing_address or "Non renseigné"
            internal_notes = dossier.internal_kam_notes or "Aucune note."
        except Exception:
            dossier = None

    else:
        # Fallback dictionary
        dossier = None
    
    # Render layout according to requested document type
    
    # -------------------------------------------------------------
    # DOCUMENT 1: DOSSIER CLIENT (Fiche Prospect & Suivi)
    # -------------------------------------------------------------
    if doc_type == 'dossier_client' or doc_type == 'dossier':
        story.append(draw_logo_header())
        story.append(Spacer(1, 20))
        story.append(Paragraph("Dossier Prospect & Suivi d'Intégration", title_style))
        story.append(Paragraph(f"Généré le {created_at} pour l'entreprise {company_name}", subtitle_style))
        
        story.append(Paragraph("1. Informations Administratives", h1_style))
        admin_info = [
            Paragraph(f"<b>Nom de l'entreprise</b> : {company_name}", body_style),
            Paragraph(f"<b>Contact Référent</b> : {contact_name}", body_style),
            Paragraph(f"<b>Téléphone de contact</b> : {phone_number}", body_style),
            Paragraph(f"<b>Numéro RCCM</b> : {rccm}", body_style),
            Paragraph(f"<b>Adresse de Facturation</b> : {billing_address}", body_style),
        ]
        story.append(make_card_table("Coordonnées Client", admin_info))
        story.append(Spacer(1, 15))
        
        story.append(Paragraph("2. Notes Internes du Conseiller (KAM)", h1_style))
        notes_p = [Paragraph(internal_notes, body_style)]
        story.append(make_card_table("Notes de suivi", notes_p, bg_color="#FEF3C7", border_color="#FDE68A"))
        story.append(Spacer(1, 15))
        
        # Load twin details if available
        twin = None
        if dossier:
            try:
                twin = dossier.business_twin
            except Exception:
                pass
        
        if twin:
            story.append(Paragraph("3. Synthèse d'Audit - Diagnostic d'Architecture Cible", h1_style))
            twin_info = [
                Paragraph("<b>Situation Initiale (Dysfonctionnements détectés) :</b>", bold_body_style),
            ]
            for item in (twin.current_state or []):
                twin_info.append(Paragraph(f"• ⚠️ {item}", body_style))
                
            twin_info.append(Spacer(1, 8))
            twin_info.append(Paragraph("<b>Situation Cible (Architecture Proposée) :</b>", bold_body_style))
            for item in (twin.proposed_state or []):
                twin_info.append(Paragraph(f"• ✓ {item}", body_style))
                
            story.append(make_card_table("Étude de transition numérique", twin_info))
            story.append(Spacer(1, 20))
            
            story.append(Paragraph("4. Services Recommandés & Roadmap", h1_style))
            services_data = [["Service préconisé", "Priorité", "Justification / Bénéfice"]]
            for s in (twin.recommended_services or []):
                services_data.append([
                    Paragraph(f"<b>{s.get('name')}</b>", body_style),
                    Paragraph(s.get('priority', 'MEDIUM'), bold_body_style),
                    Paragraph(s.get('reasoning', ''), body_style)
                ])
            
            t_services = Table(services_data, colWidths=[130, 70, 290])
            t_services.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F97316")),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E4E4E7")),
                ('PADDING', (0,0), (-1,-1), 8),
            ]))
            story.append(t_services)
            
    # -------------------------------------------------------------
    # DOCUMENT 2: DIAGNOSTIC D'ARCHITECTURE CIBLE
    # -------------------------------------------------------------
    elif doc_type == 'business_twin' or doc_type == 'twin':
        story.append(draw_logo_header())
        story.append(Spacer(1, 20))
        story.append(Paragraph("Diagnostic d'Architecture Cible", title_style))
        story.append(Paragraph(f"Architecture Technique & Fonctionnelle ciblée pour l'entreprise {company_name}", subtitle_style))
        
        # Load twin details
        twin = None
        if dossier:
            try: twin = dossier.business_twin
            except Exception: pass
        elif class_name == "ClientConversation":
            try:
                dossier_temp = obj.prospect_dossier
                twin = dossier_temp.business_twin
            except Exception: pass
            
        if not twin:
            story.append(Paragraph("Aucun diagnostic n'a encore été finalisé pour ce client. Veuillez terminer l'audit en ligne pour générer le Diagnostic d'Architecture Cible.", body_style))
        else:
            story.append(Paragraph("1. Analyse Comparée de l'Infrastructure", h1_style))
            
            comp_data = [["Dysfonctionnements constatés (Avant)", "Solutions d'intégration Orange (Après)"]]
            for idx in range(max(len(twin.current_state or []), len(twin.proposed_state or []))):
                cur = twin.current_state[idx] if idx < len(twin.current_state) else ""
                prop = twin.proposed_state[idx] if idx < len(twin.proposed_state) else ""
                comp_data.append([
                    Paragraph(f"🔴 <i>{cur}</i>", body_style),
                    Paragraph(f"🟢 <b>{prop}</b>", body_style)
                ])
                
            t_comp = Table(comp_data, colWidths=[245, 245])
            t_comp.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F4F4F5")),
                ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#18181B")),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E4E4E7")),
                ('PADDING', (0,0), (-1,-1), 8),
            ]))
            story.append(t_comp)
            story.append(Spacer(1, 15))
            
            story.append(Paragraph("2. Projections d'Impact de Performance", h1_style))
            story.append(Paragraph("Suite au déploiement des services managés préconisés par Onbora, les gains d'efficacité opérationnelle estimés sont les suivants :", body_style))
            
            services = twin.recommended_services or []
            hasNetwork = any(s.get('name','').lower().find('fibre') != -1 or s.get('name','').lower().find('sd-wan') != -1 for s in services)
            hasSecurity = any(s.get('name','').lower().find('firewall') != -1 or s.get('name','').lower().find('edr') != -1 for s in services)
            hasCollab = any(s.get('name','').lower().find('365') != -1 or s.get('name','').lower().find('teams') != -1 for s in services)
            
            metrics_data = [
                ["Indicateur de transition", "Avant", "Après", "Gain estimé"],
                ["Bande passante & Débits réseau", "20%", f"{'95%' if hasNetwork else '45%'}", f"+{75 if hasNetwork else 25}%"],
                ["Niveau de sécurité périmétrique", "15%", f"{'98%' if hasSecurity else '40%'}", f"+{83 if hasSecurity else 25}%"],
                ["Collaboration & Productivité Teams", "35%", f"{'90%' if hasCollab else '55%'}", f"+{55 if hasCollab else 20}%"],
            ]
            t_metrics = Table(metrics_data, colWidths=[210, 80, 80, 120])
            t_metrics.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#FFF7ED")),
                ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#EA580C")),
                ('ALIGN', (1,0), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#FED7AA")),
                ('PADDING', (0,0), (-1,-1), 8),
            ]))
            story.append(t_metrics)
            story.append(Spacer(1, 15))
            
            story.append(Paragraph("3. Roadmap de déploiement et d'installation", h1_style))
            roadmap_p = []
            for idx, step in enumerate(twin.roadmap or []):
                roadmap_p.append(Paragraph(f"<b>Étape {idx+1}</b> : {step}", body_style))
            story.append(make_card_table("Chronogramme de transition", roadmap_p))

    # -------------------------------------------------------------
    # DOCUMENT 3: RAPPORT DE VISITE COMMERCIAL (Preparation/Notes)
    # -------------------------------------------------------------
    elif doc_type == 'visit_report' or doc_type == 'visit':
        story.append(draw_logo_header())
        story.append(Spacer(1, 20))
        story.append(Paragraph("Rapport de Visite Commercial", title_style))
        story.append(Paragraph(f"Compte-rendu de visite terrain — {company_name}", subtitle_style))
        
        # Load visit report properties
        notes = "Aucune note."
        transcription = "Aucune transcription vocale disponible."
        summary = "Aucune synthèse rédigée."
        audio_path = "Aucun fichier audio."
        
        if class_name == "VisitReport":
            notes = getattr(obj, 'notes', getattr(obj, 'raw_transcript', '')) or ""
            transcription = getattr(obj, 'raw_transcript', getattr(obj, 'transcription', '')) or "Aucune transcription vocale disponible."
            summary = getattr(obj, 'executive_summary', getattr(obj, 'summary', '')) or "Aucune synthèse rédigée."
            audio_path = getattr(obj, 'audio_file_path', None) or "Non renseigné"
            
        story.append(Paragraph("1. Détails de la Visite", h1_style))
        visit_info = [
            Paragraph(f"<b>Entreprise visitée</b> : {company_name}", body_style),
            Paragraph(f"<b>Date du rapport</b> : {created_at}", body_style),
            Paragraph(f"<b>Commercial Terrain</b> : {contact_name}", body_style),
            Paragraph(f"<b>Fichier Audio Capturé</b> : {audio_path}", body_style),
        ]
        story.append(make_card_table("Données d'identification", visit_info))
        story.append(Spacer(1, 15))
        
        story.append(Paragraph("2. Transcription Audio du Dictaphone", h1_style))
        trans_p = [Paragraph(transcription, code_style)]
        story.append(make_card_table("Dictée vocale convertie en texte", trans_p, bg_color="#18181B", border_color="#27272A"))
        story.append(Spacer(1, 15))
        
        story.append(Paragraph("3. Synthèse Structurée (IA) & Plan d'Action", h1_style))
        sum_p = [Paragraph(summary, body_style)]
        story.append(make_card_table("Synthèse automatique", sum_p))

    # -------------------------------------------------------------
    # DOCUMENT 4: CONTRAT CADRE DE SERVICES MANAGÉS (MSP)
    # -------------------------------------------------------------
    elif doc_type == 'contrat_cadre' or doc_type == 'contrat':
        story.append(draw_logo_header())
        story.append(Spacer(1, 20))
        story.append(Paragraph("Contrat Cadre de Services Managés (MSP)", title_style))
        story.append(Paragraph(f"Contrat N° OBS-MSP-{created_at[:10].replace('/', '-')}-{company_name.upper()[:4]}", subtitle_style))
        
        story.append(Paragraph("ENTRE LES SOUSSIGNÉS :", bold_body_style))
        story.append(Paragraph("<b>Orange Business Services</b>, ci-après désigné 'Onbora' ou 'le Prestataire'.", body_style))
        story.append(Paragraph(f"ET : <b>{company_name}</b>, domicilié à {billing_address}, RCCM : {rccm}, représenté par {contact_name}, ci-après désigné 'le Client'.", body_style))
        story.append(Spacer(1, 10))
        
        story.append(Paragraph("IL A ÉTÉ ARRÊTÉ ET CONVENU CE QUI SUIT :", bold_body_style))
        
        story.append(Paragraph("Article 1 : Objet du contrat", h1_style))
        story.append(Paragraph("Le présent contrat a pour objet de définir les conditions dans lesquelles le Prestataire s'engage à fournir au Client les services managés et les abonnements télécoms décrits dans les Conditions Particulières ci-annexées.", body_style))
        
        story.append(Paragraph("Article 2 : Durée et engagement", h1_style))
        story.append(Paragraph("Le présent contrat est conclu pour une durée ferme d'engagement de vingt-quatre (24) mois à compter de la date de signature de la fiche de mise en service technique.", body_style))
        
        story.append(Paragraph("Article 3 : Niveaux de service (Garantie de Temps de Rétablissement)", h1_style))
        story.append(Paragraph("Le Prestataire garantit un temps de rétablissement de quatre (4) heures sur la liaison principale Fibre Optique Pro en cas de panne totale. En cas de dépassement, des pénalités financières contractuelles s'appliqueront conformément à la charte de service Orange.", body_style))
        
        story.append(Paragraph("Article 4 : Résiliation anticipée", h1_style))
        story.append(Paragraph("Toute résiliation anticipée du fait du Client durant la période d'engagement ferme entraînera la facturation immédiate de l'intégralité des mensualités restantes dues jusqu'à la fin de la période d'engagement.", body_style))
        
        story.append(Spacer(1, 25))
        
        # Signature block
        sig_data = [
            [Paragraph("Pour le Prestataire (Orange OBS)", bold_body_style), Paragraph("Pour le Client (Bon pour accord)", bold_body_style)],
            ["", ""],
            [Paragraph("Signature & Cachet commercial", body_style), Paragraph("Signature & Cachet de l'entreprise", body_style)],
        ]
        t_sig = Table(sig_data, colWidths=[245, 245], rowHeights=[20, 50, 20])
        t_sig.setStyle(TableStyle([
            ('LINEBELOW', (0,0), (-1,0), 0.5, colors.HexColor("#CCCCCC")),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E4E4E7")),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(KeepTogether(t_sig))

    # -------------------------------------------------------------
    # DOCUMENT 5: CONDITIONS PARTICULIÈRES D'ABONNEMENT
    # -------------------------------------------------------------
    elif doc_type == 'conditions_particulieres' or doc_type == 'conditions':
        story.append(draw_logo_header())
        story.append(Spacer(1, 20))
        story.append(Paragraph("Conditions Particulières d'Abonnement (CPA)", title_style))
        story.append(Paragraph(f"Annexe financière au Contrat Cadre — {company_name}", subtitle_style))
        
        # Build pricing dynamically based on recommended services
        twin = None
        if dossier:
            try: twin = dossier.business_twin
            except Exception: pass
            
        services_list = []
        if twin and twin.recommended_services:
            services_list = twin.recommended_services
        else:
            services_list = [
                {"name": "Fibre Optique Pro", "category": "CONNECTIVITY"},
                {"name": "Firewall Managé", "category": "SECURITY"},
                {"name": "Microsoft 365 Pro & Teams", "category": "COLLABORATIVE"},
            ]
            
        pricing_data = [["Service souscrit", "Catégorie", "Frais Fixes (NRC)", "Abonnement Mensuel (MRC)"]]
        total_mrc = 0
        total_nrc = 0
        
        for s in services_list:
            name = s.get('name', '')
            category = s.get('category', '')
            mrc = 0
            nrc = 0
            
            # Simulated pricing values
            if name.lower().find("fibre") != -1:
                mrc = 250
                nrc = 450
            elif name.lower().find("sd-wan") != -1:
                mrc = 180
                nrc = 300
            elif name.lower().find("firewall") != -1:
                mrc = 120
                nrc = 150
            elif name.lower().find("edr") != -1:
                mrc = 120 # for 10 users default
                nrc = 50
            elif name.lower().find("365") != -1:
                mrc = 160 # for 10 users default
                nrc = 100
            elif name.lower().find("téléphonie") != -1:
                mrc = 80
                nrc = 50
            elif name.lower().find("tpe") != -1:
                mrc = 39
                nrc = 20
            else:
                mrc = 90
                nrc = 100
                
            total_mrc += mrc
            total_nrc += nrc
            pricing_data.append([
                Paragraph(f"<b>{name}</b>", body_style),
                Paragraph(category, body_style),
                f"{nrc} €",
                f"{mrc} € / mois"
            ])
            
        pricing_data.append([
            Paragraph("<b>TOTAL ESTIMÉ (HT)</b>", bold_body_style),
            "",
            f"<b>{total_nrc} €</b>",
            f"<b>{total_mrc} € / mois</b>"
        ])
        
        t_price = Table(pricing_data, colWidths=[170, 100, 110, 110])
        t_price.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F97316")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (2,0), (-1,-1), 'RIGHT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E4E4E7")),
            ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#F4F4F5")),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(t_price)
        story.append(Spacer(1, 20))
        
        story.append(Paragraph("Note : Les tarifs indiqués ci-dessus sont des estimations basées sur l'audit initial de conversation. La facturation définitive commencera dès la livraison de l'accès Fibre principal.", body_style))
        story.append(Spacer(1, 25))
        
        # Simple initials box
        init_data = [
            [Paragraph("Initiales Prestataire", body_style), Paragraph("Initiales Client (Bon pour accord)", body_style)]
        ]
        t_init = Table(init_data, colWidths=[245, 245], rowHeights=[40])
        t_init.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#CCCCCC")),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(KeepTogether(t_init))

    # -------------------------------------------------------------
    # DOCUMENT 6: PLAN D'ADRESSAGE IP & SPÉCIFICATIONS RÉSEAU
    # -------------------------------------------------------------
    elif doc_type == 'plan_adressage' or doc_type == 'adressage':
        story.append(draw_logo_header())
        story.append(Spacer(1, 20))
        story.append(Paragraph("Plan d'Adressage IP & Fiche Technique", title_style))
        story.append(Paragraph(f"Dossier technique de déploiement réseau — {company_name}", subtitle_style))
        
        story.append(Paragraph("1. Raccordement WAN (Orange Fibre)", h1_style))
        wan_data = [
            ["Paramètre réseau WAN", "Valeur configurée (IP fixes)"],
            ["IP WAN Principale", "195.154.22.46 /30"],
            ["Passerelle WAN (Gateway)", "195.154.22.45"],
            ["Masque de sous-réseau WAN", "255.255.255.252"],
            ["DNS Principal (Orange)", "80.10.246.2"],
            ["DNS Secondaire (Orange)", "80.10.246.129"],
        ]
        t_wan = Table(wan_data, colWidths=[220, 270])
        t_wan.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F4F4F5")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E4E4E7")),
            ('PADDING', (0,0), (-1,-1), 7),
        ]))
        story.append(t_wan)
        story.append(Spacer(1, 15))
        
        story.append(Paragraph("2. Topologie Réseau Local (LAN & VLANs)", h1_style))
        lan_data = [
            ["VLAN", "Nom", "Plage d'adresses LAN", "Passerelle (Firewall)"],
            ["VLAN 10", "DATA_PRO", "192.168.10.0 /24", "192.168.10.254"],
            ["VLAN 20", "VOIP_TEAMS", "192.168.20.0 /24", "192.168.20.254"],
            ["VLAN 30", "GUEST_WIFI", "192.168.30.0 /24", "192.168.30.254"],
        ]
        t_lan = Table(lan_data, colWidths=[70, 110, 160, 150])
        t_lan.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#FFF7ED")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#FED7AA")),
            ('PADDING', (0,0), (-1,-1), 7),
        ]))
        story.append(t_lan)
        story.append(Spacer(1, 15))
        
        story.append(Paragraph("3. Spécifications du Firewall & Sécurité", h1_style))
        fw_info = [
            Paragraph("<b>Filtrage de contenu Web</b> : Catégories réseaux sociaux et streaming restreintes en journée.", body_style),
            Paragraph("<b>VPN Collaborateur Distant</b> : Tunnel chiffré SSL avec double authentification obligatoire.", body_style),
            Paragraph("<b>Protection EDR active</b> : Agents comportementaux supervisés connectés au SOC central.", body_style),
        ]
        story.append(make_card_table("Règles de sécurité réseau", fw_info))

    # -------------------------------------------------------------
    # DOCUMENT 7: GUIDE D'ADOPTION & FORMATION UTILISATEUR
    # -------------------------------------------------------------
    elif doc_type == 'guide_adoption' or doc_type == 'guide':
        story.append(draw_logo_header())
        story.append(Spacer(1, 20))
        story.append(Paragraph("Guide d'Adoption & Formation", title_style))
        story.append(Paragraph(f"Accompagnement au changement pour les collaborateurs de {company_name}", subtitle_style))
        
        story.append(Paragraph("1. Vos nouveaux outils collaboratifs (M365 & Teams)", h1_style))
        story.append(Paragraph("Votre espace de travail évolue pour plus de fluidité au quotidien. Voici comment démarrer :", body_style))
        
        guide_info = [
            Paragraph("<b>Étape 1 : Connexion au Portail</b><br/>Allez sur https://portal.office.com et connectez-vous avec vos identifiants d'entreprise.", body_style),
            Paragraph("<b>Étape 2 : Lancement de Microsoft Teams</b><br/>Teams centralise désormais vos échanges. Installez l'application sur votre PC et votre smartphone pour rester connecté.", body_style),
            Paragraph("<b>Étape 3 : Partage de Fichiers SharePoint / OneDrive</b><br/>Stockez tous vos documents de travail sur le cloud pour coéditer vos fichiers en temps réel avec vos collègues.", body_style),
        ]
        story.append(make_card_table("Guide pas à pas - Collaboration", guide_info))
        story.append(Spacer(1, 15))
        
        story.append(Paragraph("2. Bonnes pratiques de Cybersécurité", h1_style))
        cyber_rules = [
            Paragraph("<b>Mots de passe complexes</b> : Utilisez des mots de passe de 12 caractères minimum avec caractères spéciaux.", body_style),
            Paragraph("<b>Double Authentification (MFA)</b> : Confirmez toujours les connexions sur votre téléphone via l'application Microsoft Authenticator.", body_style),
            Paragraph("<b>Phishing</b> : Ne cliquez jamais sur un lien d'expéditeur inconnu. En cas de doute, signalez-le au support technique.", body_style),
        ]
        story.append(make_card_table("Règles de sécurité utilisateur", cyber_rules, bg_color="#F0FDFA", border_color="#CCFBF1"))
        story.append(Spacer(1, 15))
        
        story.append(Paragraph("3. Contacter le Support Client Onbora", h1_style))
        story.append(Paragraph("Notre centre d'assistance technique est disponible 24h/24 et 7j/7 pour vous accompagner :", body_style))
        story.append(Paragraph("• 📞 <b>Numéro vert de support</b> : 0 800 123 456 (gratuit depuis un poste Onbora)", body_style))
        story.append(Paragraph("• ✉️ <b>Email de support</b> : support@onbora.cg", body_style))
        story.append(Paragraph("• 🌐 <b>Portail de gestion de tickets</b> : https://client.onbora.cg/tickets", body_style))

    # Fallback to general cover sheet if type not matched
    else:
        story.append(draw_logo_header())
        story.append(Spacer(1, 20))
        story.append(Paragraph("Document de Synthèse Client", title_style))
        story.append(Paragraph(f"Export documentaire Onbora — {company_name}", subtitle_style))
        story.append(Paragraph("Ce document rassemble les spécifications et les détails liés à la conversation de votre dossier commercial Orange Business Services.", body_style))

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    
    # Retrieve PDF value from buffer and return response
    pdf_val = buffer.getvalue()
    buffer.close()
    
    response = HttpResponse(pdf_val, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{doc_type}_{obj.id if hasattr(obj, "id") else "export"}.pdf"'
    return response
