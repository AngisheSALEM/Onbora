import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/kam_workspace_controller.dart';
import '../../../common/screen/widget/mobile_page.dart';
import 'kam_screen_helpers.dart';

class KamCommercialOutcomePage extends StatefulWidget {
  const KamCommercialOutcomePage({super.key, required this.account});
  final KamData account;
  @override
  State<KamCommercialOutcomePage> createState() =>
      _KamCommercialOutcomePageState();
}

class _KamCommercialOutcomePageState extends State<KamCommercialOutcomePage> {
  final _form = GlobalKey<FormState>();
  late String _status = '${widget.account['conversion_status'] ?? 'PROSPECT'}';
  late final _offer = TextEditingController(
    text: '${widget.account['converted_offer'] ?? ''}',
  );
  late final _amount = TextEditingController(
    text: '${widget.account['converted_amount'] ?? 0}',
  );
  late final _notes = TextEditingController(
    text: '${widget.account['conversion_notes'] ?? ''}',
  );
  bool _busy = false;
  String _error = '';
  @override
  void dispose() {
    _offer.dispose();
    _amount.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MobilePage(
    title: 'Résultat commercial',
    subtitle: '${widget.account['account_name']}',
    primaryLabel: 'Enregistrer le résultat',
    busy: _busy,
    onPrimary: _save,
    children: [
      Form(
        key: _form,
        child: Column(
          children: [
            spacedField(
              DropdownButtonFormField<String>(
                initialValue: _status,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Statut du compte',
                ),
                items:
                    {
                          'PROSPECT': 'Prospect',
                                    'IN_NEGOTIATION': 'En négociation',
                          'CONVERTED': 'Converti',
                          'LOST': 'Perdu',
                        }.entries
                        .map(
                          (e) => DropdownMenuItem(
                            value: e.key,
                            child: Text(e.value),
                          ),
                        )
                        .toList(),
                onChanged: (v) => setState(() => _status = v!),
              ),
            ),
            spacedField(
              TextFormField(
                controller: _offer,
                decoration: const InputDecoration(labelText: 'Offre retenue'),
              ),
            ),
            spacedField(
              TextFormField(
                controller: _amount,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(labelText: 'Montant (USD)'),
                validator: (v) =>
                    (double.tryParse((v ?? '').replaceAll(',', '.')) ?? -1) < 0
                    ? 'Saisissez un montant positif.'
                    : null,
              ),
            ),
            spacedField(
              TextFormField(
                controller: _notes,
                minLines: 3,
                maxLines: 8,
                decoration: const InputDecoration(
                  labelText: 'Notes commerciales',
                  alignLabelWithHint: true,
                ),
              ),
            ),
          ],
        ),
      ),
      if (_error.isNotEmpty)
        ReadingSection('Enregistrement interrompu', _error),
    ],
  );
  Future<void> _save() async {
    if (_busy || !_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      await workspace().api.post(
        '/api/kam/accounts/${accountId(widget.account)}/debrief/',
        body: {
          'conversion_status': _status,
          'converted_offer': _offer.text.trim(),
          'converted_amount': double.parse(_amount.text.replaceAll(',', '.')),
          'conversion_notes': _notes.text.trim(),
          'generate_ai': false,
        },
      );
      await workspace().reload();
      if (mounted) Get.back();
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}
