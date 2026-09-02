import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../view_models/sales_view_model.dart';
import 'dictaphone_recording_view.dart';
import '../../../shared/skeleton_loader.dart';
import '../../../../data/models/visit_prep_model.dart';

class VisitPreparationView extends StatefulWidget {
  const VisitPreparationView({super.key});

  @override
  State<VisitPreparationView> createState() => _VisitPreparationViewState();
}

class _VisitPreparationViewState extends State<VisitPreparationView> {
  bool _showAdvancedPitch = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final salesVm = context.read<SalesViewModel>();
      if (salesVm.currentPrep == null && salesVm.selectedEnterprise != null) {
        salesVm.prepareVisit();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final salesVm = context.watch<SalesViewModel>();
    final prep = salesVm.currentPrep;
    final enterprise = salesVm.selectedEnterprise;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Brief & Diagnostic Pré-Visite'),
      ),
      body: salesVm.isCreatingPrep
          ? Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  SkeletonBox(height: 70, borderRadius: 16),
                  SizedBox(height: 16),
                  SkeletonBox(height: 80, borderRadius: 16),
                  SizedBox(height: 20),
                  SkeletonBox(height: 100, borderRadius: 16),
                  SizedBox(height: 16),
                  SkeletonBox(height: 120, borderRadius: 16),
                  SizedBox(height: 16),
                  SkeletonBox(height: 140, borderRadius: 16),
                ],
              ),
            )
          : prep == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.note_alt_outlined, size: 64, color: Colors.grey),
                        const SizedBox(height: 16),
                        const Text(
                          'Aucun brief généré pour le moment',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Générez votre brief et diagnostic BANT avec l\'IA Onbora pour structurer votre entretien.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton.icon(
                          onPressed: () => salesVm.prepareVisit(),
                          icon: const Icon(Icons.auto_awesome_rounded),
                          label: const Text('Générer le Diagnostic avec l\'IA'),
                        ),
                      ],
                    ),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Enterprise Info Header Card
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.business_rounded, color: Color(0xFFF97316), size: 36),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    enterprise?.name ?? 'Entreprise Cible',
                                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${enterprise?.sector ?? 'Secteur'} • ${enterprise?.location ?? 'Kinshasa'}',
                                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),

                      // BANT Qualification Status Badge Card
                      _buildBANTBanner(prep),
                      const SizedBox(height: 14),

                      // Financial Impact & Cost of Inaction Card (COI)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0284C7).withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: const [
                                Icon(Icons.monetization_on_rounded, color: Color(0xFF0284C7), size: 22),
                                SizedBox(width: 8),
                                Text(
                                  'Coût de l\'Inaction Estimé (COI)',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0284C7)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'Pertes estimées dues aux pannes : ~${prep.coiEstimatedMonthly.toStringAsFixed(0)} \$/mois (~${(prep.coiEstimatedMonthly * 12).toStringAsFixed(0)} \$/an).',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Conseil valeur : Ne parlez pas du prix au poste. Demandez combien d\'heures de coupure ils subissent chaque semaine.',
                              style: TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.4),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Meeting Objective
                      _buildSectionCard(
                        title: 'Objectif du Rendez-vous',
                        icon: Icons.flag_rounded,
                        color: Colors.blue,
                        content: prep.meetingObjective,
                      ),
                      const SizedBox(height: 16),

                      // Hypotheses to Verify
                      _buildSectionCard(
                        title: 'Hypothèses Terrain à Vérifier',
                        icon: Icons.psychology_rounded,
                        color: Colors.purple,
                        content: prep.hypothesisToVerify,
                      ),
                      const SizedBox(height: 16),

                      // Progressive Disclosure: Pitch Commercial collapsible
                      Card(
                        child: Column(
                          children: [
                            ListTile(
                              onTap: () => setState(() => _showAdvancedPitch = !_showAdvancedPitch),
                              leading: const Icon(Icons.campaign_rounded, color: Color(0xFFF97316)),
                              title: const Text(
                                'Pitch de Rentabilité Sur-Mesure',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFFF97316)),
                              ),
                              trailing: Icon(
                                _showAdvancedPitch ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                                color: const Color(0xFFF97316),
                              ),
                            ),
                            if (_showAdvancedPitch)
                              Padding(
                                padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
                                child: Text(
                                  prep.customPitch,
                                  style: const TextStyle(fontSize: 14, height: 1.5, color: Color(0xFF334155)),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Key Questions for Value Selling
                      _buildSectionCard(
                        title: 'Questions Clés d\'Impact Financier',
                        icon: Icons.quiz_rounded,
                        color: Colors.teal,
                        content: prep.keyQuestions,
                      ),
                      const SizedBox(height: 28),

                      // Action Button: Launch Voice Dictaphone
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const DictaphoneRecordingView()),
                            );
                          },
                          icon: const Icon(Icons.mic_rounded, size: 24),
                          label: const Text(
                            'Démarrer le Dictaphone (Post-Visite)',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFF97316),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildBANTBanner(VisitPrepModel prep) {
    if (prep.isDisqualified) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.red.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.red.withValues(alpha: 0.4)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 26),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'PROSPECT DISQUALIFIÉ (Score BANT Faible)',
                    style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    prep.disqualificationReason ?? 'Budget insuffisant ou interlocuteur sans mandat de décision.',
                    style: const TextStyle(color: Color(0xFF7F1D1D), fontSize: 12, height: 1.3),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Recommandation : Ne pas faire de déplacement ni de devis coûteux.',
                    style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600, fontSize: 11),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final isHot = prep.bantStatus == 'HOT_LEAD' || prep.bantScore >= 80;
    final color = isHot ? Colors.green : Colors.blue;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(isHot ? Icons.local_fire_department_rounded : Icons.verified_user_rounded, color: color, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isHot ? 'OPPORTUNITÉ HAUTE PRIORITÉ' : 'PROSPECT QUALIFIÉ',
                  style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13),
                ),
                Text(
                  'Score de qualification BANT : ${prep.bantScore}/100 • Budget et décision validés.',
                  style: const TextStyle(color: Color(0xFF334155), fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required Color color,
    required String content,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 22),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: color),
                ),
              ],
            ),
            const Divider(height: 20),
            Text(
              content,
              style: const TextStyle(fontSize: 14, height: 1.5, color: Color(0xFF334155)),
            ),
          ],
        ),
      ),
    );
  }
}
