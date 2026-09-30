import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'mobile_page.dart';

/// Shared, icon-free reading surface for KAM and field visit reports.
class VisitReportDocument extends StatefulWidget {
  const VisitReportDocument({
    super.key,
    required this.report,
    required this.company,
    this.onPrimary,
    this.primaryLabel,
    this.busy = false,
    this.onExport,
  });
  final Map<String, dynamic> report;
  final String company;
  final VoidCallback? onPrimary, onExport;
  final String? primaryLabel;
  final bool busy;
  @override
  State<VisitReportDocument> createState() => _VisitReportDocumentState();
}

class _VisitReportDocumentState extends State<VisitReportDocument> {
  int _tab = 0;
  @override
  Widget build(BuildContext context) {
    final data = widget.report;
    final email = readableValue(data['follow_up_email_draft']);
    final transcript = readableValue(data['raw_transcript']);
    final tabs = ['Rapport', 'Email', 'Transcription'];
    return MobilePage(
      title: 'Rapport de visite',
      subtitle: widget.company,
      primaryLabel: _tab == 0 ? widget.primaryLabel : null,
      onPrimary: widget.onPrimary,
      busy: widget.busy,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: List.generate(
            tabs.length,
            (i) => ChoiceChip(
              label: Text(tabs[i]),
              selected: _tab == i,
              showCheckmark: false,
              side: BorderSide.none,
              labelStyle: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
              backgroundColor: Theme.of(context).colorScheme.surface,
              onSelected: (_) => setState(() => _tab = i),
              selectedColor: mobilePrimary.withValues(alpha: .12),
            ),
          ),
        ),
        const SizedBox(height: 32),
        if (_tab == 0) ...[
          ReadingSection('Synthèse', readableValue(data['executive_summary'])),
          ReadingSection(
            'Besoins confirmés',
            readableValue(data['confirmed_needs']),
          ),
          ReadingSection(
            'Objections',
            readableValue(data['objections_raised']),
          ),
          ReadingSection(
            'Prochaines actions',
            readableValue(data['actions_todo']),
          ),
          if ((data['bant_scores'] ?? data['bant_score']) is Map)
            ReadingSection(
              'Qualification BANT',
              readableValue(data['bant_scores'] ?? data['bant_score']),
            ),
          for (final entry in {
            'Offres recommandées':
                data['recommended_packages'] ?? data['tiered_packages'],
            'Impact financier': data['coi_metrics'],
            'Transmission technique': data['technical_handover_specs'],
          }.entries)
            if (readableValue(entry.value).isNotEmpty)
              ReadingSection(entry.key, readableValue(entry.value)),
          if (widget.onExport != null)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: widget.onExport,
                child: const Text('Exporter en PDF'),
              ),
            ),
        ],
        if (_tab == 1) ...[
          ReadingSection('Email de suivi', email),
          if (email.isNotEmpty)
            TextButton(
              onPressed: () => _copy(email),
              child: const Text('Copier l’email'),
            ),
          if (readableValue(data['email_j4']).isNotEmpty)
            ReadingSection('Relance J+4', readableValue(data['email_j4'])),
        ],
        if (_tab == 2) ...[
          ReadingSection('Transcription conservée', transcript),
          if (transcript.isNotEmpty)
            TextButton(
              onPressed: () => _copy(transcript),
              child: const Text('Copier la transcription'),
            ),
        ],
      ],
    );
  }

  Future<void> _copy(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Texte copié.')));
    }
  }
}
