import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../view_models/sales_view_model.dart';
import 'dictaphone_recording_view.dart';

class VisitPreparationView extends StatefulWidget {
  const VisitPreparationView({super.key});

  @override
  State<VisitPreparationView> createState() => _VisitPreparationViewState();
}

class _VisitPreparationViewState extends State<VisitPreparationView> {
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
        title: const Text('Brief de Préparation Visite'),
      ),
      body: salesVm.isCreatingPrep
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: Color(0xFFF97316)),
                  SizedBox(height: 16),
                  Text('Génération du brief de visite personnalisé par Onbora AI...'),
                ],
              ),
            )
          : prep == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Aucun brief généré.'),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: () => salesVm.prepareVisit(),
                        child: const Text('Générer le Brief'),
                      ),
                    ],
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
                                    enterprise?.name ?? 'Entreprise',
                                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${enterprise?.sector ?? 'Secteur'} • ${enterprise?.location ?? 'France'}',
                                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

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

                      // Custom Pitch
                      _buildSectionCard(
                        title: 'Pitch Commercial Sur-Mesure',
                        icon: Icons.campaign_rounded,
                        color: const Color(0xFFF97316),
                        content: prep.customPitch,
                      ),
                      const SizedBox(height: 16),

                      // Key Questions
                      _buildSectionCard(
                        title: 'Questions Clés à Poser',
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
                            'Démarrer l\'Enregistrement Vocal (Dictaphone)',
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
