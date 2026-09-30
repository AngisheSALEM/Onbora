import 'package:flutter/material.dart';
import '../controller/kam_workspace_controller.dart';
import '../../../common/screen/widget/mobile_page.dart';
import 'kam_screen_helpers.dart';

class KamAccountMemoryPage extends StatefulWidget {
  const KamAccountMemoryPage({super.key, required this.account});
  final KamData account;
  @override
  State<KamAccountMemoryPage> createState() => _KamAccountMemoryPageState();
}

class _KamAccountMemoryPageState extends State<KamAccountMemoryPage> {
  List<KamData> _events = [];
  String _error = '';
  bool _loading = true;
  final _note = TextEditingController();
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final result = await workspace().api.get(
        '/api/kam/accounts/${accountId(widget.account)}/memory/',
      );
      if (mounted) {
        setState(() => _events = KamWorkspaceController.rows(result));
      }
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => MobilePage(
    title: 'Mémoire du compte',
    subtitle: '${widget.account['account_name']}',
    onRefresh: _load,
    busy: _loading,
    primaryLabel: 'Ajouter une note',
    onPrimary: () async {
      if (_note.text.trim().isEmpty) return;
      setState(() => _loading = true);
      try {
        await workspace().api.post(
          '/api/kam/accounts/${accountId(widget.account)}/memory/',
          body: {'summary': _note.text.trim(), 'event_type': 'DECISION'},
        );
        _note.clear();
        await _load();
      } catch (e) {
        if (mounted) {
          setState(() {
            _loading = false;
            _error = '$e';
          });
        }
      }
    },
    children: [
      if (_error.isNotEmpty) ReadingSection('Chargement interrompu', _error),
      for (final e in _events)
        ReadingSection(
          dateLabel(e['occurred_at'] ?? e['created_at']),
          '${e['summary']}\n${e['details'] ?? ''}',
        ),
      if (!_loading && _events.isEmpty)
        const ReadingSection(
          'Aucune note',
          'Conservez ici les décisions et engagements du compte.',
        ),
      spacedField(
        TextField(
          controller: _note,
          minLines: 3,
          maxLines: 7,
          decoration: const InputDecoration(labelText: 'Nouvelle note'),
        ),
      ),
    ],
  );
}
