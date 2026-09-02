import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../view_models/sales_view_model.dart';
import '../../../../core/api/api_config.dart';
import '../../../../data/models/visit_report_model.dart';

class VisitReportDetailView extends StatefulWidget {
  const VisitReportDetailView({super.key});

  @override
  State<VisitReportDetailView> createState() => _VisitReportDetailViewState();
}

class _VisitReportDetailViewState extends State<VisitReportDetailView> {
  int _selectedEmailTab = 0; // 0 = J+1 (ROI), 1 = J+4 (Réassurance)

  @override
  Widget build(BuildContext context) {
    final salesVm = context.watch<SalesViewModel>();
    final report = salesVm.currentReport;
    final enterprise = salesVm.selectedEnterprise;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rapport & Restitution Valeur'),
        actions: [
          if (report != null)
            IconButton(
              icon: const Icon(Icons.picture_as_pdf_rounded),
              tooltip: 'Télécharger Export PDF',
              onPressed: () async {
                final pdfUrl = '${ApiConfig.baseUrl}/api/sales/visit-reports/${report.id}/export/?format=pdf';
                final uri = Uri.parse(pdfUrl);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                } else if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Ouverture du PDF : $pdfUrl')),
                  );
                }
              },
            ),
        ],
      ),
      body: report == null
          ? const Center(child: Text('Aucun rapport disponible.'))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Success Transmitted Notification Banner
                  if (salesVm.successMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      margin: const EdgeInsets.only(bottom: 20),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.green),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_rounded, color: Colors.green, size: 28),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  salesVm.successMessage!,
                                  style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                const SizedBox(height: 2),
                                const Text(
                                  'Cahier des charges d\'installation transmis. Délai cible : 5 jours.',
                                  style: TextStyle(color: Color(0xFF166534), fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  // Enterprise Title Card
                  Card(
                    color: const Color(0xFF0F172A),
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF97316).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.description_rounded, color: Color(0xFFF97316), size: 28),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  enterprise?.name ?? 'Entreprise',
                                  style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Rapport ID #${report.id} • Qualifié BANT & ROI',
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ROI & Financial Impact Card (COI vs Gain Net)
                  _buildFinancialROICard(report),
                  const SizedBox(height: 16),

                  // Executive Summary
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.auto_awesome_rounded, color: Color(0xFFF97316), size: 20),
                              SizedBox(width: 8),
                              Text('Diagnostic & Synthèse IA', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            ],
                          ),
                          const Divider(height: 20),
                          Text(
                            report.executiveSummary,
                            style: const TextStyle(fontSize: 14, height: 1.5, color: Color(0xFF334155)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Tiered Packaging Grid (3 Formules Good / Better / Best)
                  if (report.tieredPackages.isNotEmpty) ...[
                    _buildTieredPackagesSection(report.tieredPackages),
                    const SizedBox(height: 16),
                  ],

                  // Confirmed Needs Badges
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.verified_rounded, color: Colors.green, size: 20),
                              SizedBox(width: 8),
                              Text('Besoins Confirmés en Entretien', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: report.confirmedNeeds.map((need) {
                              return Chip(
                                backgroundColor: Colors.green.withValues(alpha: 0.12),
                                side: BorderSide.none,
                                label: Text(
                                  need,
                                  style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                avatar: const Icon(Icons.check_rounded, color: Colors.green, size: 16),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Action Items
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.task_alt_rounded, color: Colors.blue, size: 20),
                              SizedBox(width: 8),
                              Text('Plan d\'Actions de Closing', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            ],
                          ),
                          const Divider(height: 20),
                          Column(
                            children: report.actionsTodo.map((action) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(Icons.arrow_right_rounded, color: Colors.blue),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        action,
                                        style: const TextStyle(fontSize: 13, color: Color(0xFF334155)),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Multi-Touch Follow-up Email Section (Speed-to-lead)
                  _buildFollowUpEmailSection(report),
                  const SizedBox(height: 28),

                  // Transmit to KAM Button (Technical Handover Pack)
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton.icon(
                      onPressed: salesVm.isTransmitting
                          ? null
                          : () async {
                              await salesVm.transmitReportToKAM();
                            },
                      icon: salesVm.isTransmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(Icons.send_rounded, size: 22),
                      label: Text(
                        salesVm.isTransmitting
                            ? 'Transmission du Dossier Technique...'
                            : 'Transmettre le Dossier Technique au KAM',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF97316),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
    );
  }

  Widget _buildFinancialROICard(VisitReportModel report) {
    final coi = report.coiMetrics;
    final monthlyLoss = coi != null ? (coi['total_monthly_coi_usd'] as num?)?.toDouble() ?? 1250.0 : 1250.0;
    final netGain = monthlyLoss - 320.0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.trending_up_rounded, color: Color(0xFF22C55E), size: 22),
              SizedBox(width: 8),
              Text(
                'Bilan Financier & Rentabilité Métier',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Pertes Actuelles (COI)',
                        style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${monthlyLoss.toStringAsFixed(0)} \$/m',
                        style: const TextStyle(color: Colors.redAccent, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Gain Net Client',
                        style: TextStyle(color: Color(0xFF86EFAC), fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '+${netGain.toStringAsFixed(0)} \$/m',
                        style: const TextStyle(color: Color(0xFF22C55E), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'Argument massue : L\'offre MSP transforme une perte de 1 250 \$/mois en un investissement de 320 \$/mois remboursé 3x dès le 1er mois.',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _buildTieredPackagesSection(List<Map<String, dynamic>> packages) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: const [
            Icon(Icons.inventory_2_outlined, color: Color(0xFFF97316), size: 20),
            SizedBox(width: 8),
            Text('Packages Tierés (Marge Garantie)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          ],
        ),
        const SizedBox(height: 12),
        ...packages.map((pkg) {
          final isRecommended = pkg['tier'] == 'PERFORMANCE';
          final price = (pkg['monthly_price_usd'] as num?)?.toDouble() ?? 0.0;
          final margin = (pkg['gross_margin_percent'] as num?)?.toDouble() ?? 40.0;

          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isRecommended ? const Color(0xFFF97316).withValues(alpha: 0.06) : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isRecommended ? const Color(0xFFF97316) : const Color(0xFFE2E8F0),
                width: isRecommended ? 1.5 : 1.0,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        pkg['name'] as String? ?? 'Pack MSP',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: isRecommended ? const Color(0xFFEA580C) : const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isRecommended ? const Color(0xFFF97316) : const Color(0xFF64748B),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${price.toStringAsFixed(0)} \$/mois',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Marge MSP : ${margin.toStringAsFixed(0)}%',
                        style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 11),
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (isRecommended)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF97316).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Recommandé',
                          style: TextStyle(color: Color(0xFFEA580C), fontWeight: FontWeight.bold, fontSize: 11),
                        ),
                      ),
                  ],
                ),
                if (pkg['pitch'] != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    pkg['pitch'] as String,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
                  ),
                ],
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildFollowUpEmailSection(VisitReportModel report) {
    final emailText = _selectedEmailTab == 0
        ? (report.emailJ1.isNotEmpty ? report.emailJ1 : report.followUpEmailDraft)
        : (report.emailJ4.isNotEmpty ? report.emailJ4 : report.followUpEmailDraft);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: const [
                    Icon(Icons.email_outlined, color: Colors.purple, size: 20),
                    SizedBox(width: 8),
                    Text('Emails de Relance (Speed-to-Lead)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  ],
                ),
                TextButton.icon(
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: emailText));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(_selectedEmailTab == 0 ? 'Email J+1 copié dans le presse-papier !' : 'Email J+4 copié dans le presse-papier !'),
                        backgroundColor: const Color(0xFF0F172A),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  icon: const Icon(Icons.copy_rounded, size: 16),
                  label: const Text('Copier', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                ChoiceChip(
                  label: const Text('J+1 : Synthèse & ROI'),
                  selected: _selectedEmailTab == 0,
                  onSelected: (val) => setState(() => _selectedEmailTab = 0),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('J+4 : Réassurance'),
                  selected: _selectedEmailTab == 1,
                  onSelected: (val) => setState(() => _selectedEmailTab = 1),
                ),
              ],
            ),
            const Divider(height: 20),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Text(
                emailText,
                style: const TextStyle(fontSize: 12, height: 1.4, color: Color(0xFF475569)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
