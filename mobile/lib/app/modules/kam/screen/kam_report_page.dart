import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/kam_workspace_controller.dart';
import '../../../common/screen/widget/mobile_page.dart';
import 'kam_screen_helpers.dart';
import '../../../common/screen/widget/visit_report_document.dart';

class KamReportPage extends StatefulWidget {
  const KamReportPage({super.key, required this.reportId, this.initialReport});
  final int reportId;
  final KamData? initialReport;
  @override
  State<KamReportPage> createState() => _KamReportPageState();
}

class _KamReportPageState extends State<KamReportPage> {
  KamData? _report;
  String _error = '';
  bool _busy = false, _synced = false;
  @override
  void initState() {
    super.initState();
    _report = widget.initialReport;
    if (_report == null) _load();
  }

  Future<void> _load() async {
    try {
      final r = KamData.from(
        await workspace().api.get('/api/kam/visits/${widget.reportId}/') as Map,
      );
      if (mounted) setState(() => _report = r);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
  }

  @override
  Widget build(BuildContext context) => _report == null
      ? MobilePage(
          title: 'Rapport de visite',
          primaryLabel: _error.isEmpty ? null : 'Réessayer',
          onPrimary: () {
            setState(() => _error = '');
            _load();
          },
          children: [
            _error.isEmpty
                ? const LinearProgressIndicator(color: mobilePrimary)
                : ReadingSection('Rapport indisponible', _error),
          ],
        )
      : VisitReportDocument(
          report: _report!,
          company: '${_report!['enterprise_name']}',
          primaryLabel: _synced
              ? 'Synchronisation demandée'
              : 'Synchroniser avec le CRM',
          busy: _busy,
          onPrimary: _synced
              ? null
              : () async {
                  setState(() => _busy = true);
                  try {
                    await workspace().api.post(
                      '/api/kam/visits/${widget.reportId}/sync-crm/',
                    );
                    if (mounted) setState(() => _synced = true);
                  } catch (e) {
                    Get.snackbar('Synchronisation interrompue', '$e');
                  } finally {
                    if (mounted) setState(() => _busy = false);
                  }
                },
        );
}
