import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../view_models/sales_view_model.dart';
import '../../../../core/api/api_config.dart';

class VisitReportDetailView extends StatelessWidget {
  const VisitReportDetailView({super.key});

  @override
  Widget build(BuildContext context) {
    final salesVm = context.watch<SalesViewModel>();
    final report = salesVm.currentReport;
    final enterprise = salesVm.selectedEnterprise;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rapport de Visite Synthétisé'),
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
                  // Success Transmitted Notification Banner if sent
                  if (salesVm.successMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      margin: const EdgeInsets.only(bottom: 20),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.green),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_rounded, color: Colors.green, size: 28),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              salesVm.successMessage!,
                              style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 14),
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
                              color: const Color(0xFFF97316).withOpacity(0.2),
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
                                  'Rapport ID #${report.id} • Qualifié Onbora AI',
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

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
                              Text('Résumé Exécutif IA', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
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
                              Text('Besoins Confirmés', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: report.confirmedNeeds.map((need) {
                              return Chip(
                                backgroundColor: Colors.green.withOpacity(0.12),
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
                              Text('Plan d\'Actions à Dérouler', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
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

                  // Follow up Email Draft
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.email_outlined, color: Colors.purple, size: 20),
                              SizedBox(width: 8),
                              Text('Brouillon d\'Email de Relance Client', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
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
                              report.followUpEmailDraft,
                              style: const TextStyle(fontSize: 12, height: 1.4, color: Color(0xFF475569)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Transmit to KAM Button
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
                            ? 'Transmission au KAM en cours...'
                            : 'Transmettre le Dossier au KAM',
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
}
