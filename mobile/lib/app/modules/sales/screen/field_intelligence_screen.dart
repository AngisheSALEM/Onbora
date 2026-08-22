import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../controller/sales_controller.dart';
import '../model/field_intelligence_model.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/aurora_background.dart';
import '../../../common/screen/widget/glass_card.dart';

class FieldIntelligenceScreen extends StatefulWidget {
  const FieldIntelligenceScreen({super.key});

  @override
  State<FieldIntelligenceScreen> createState() => _FieldIntelligenceScreenState();
}

class _FieldIntelligenceScreenState extends State<FieldIntelligenceScreen> {
  final _formKey = GlobalKey<FormState>();

  // Section 1: Conversion & Nurturing
  String _conversionStatus = 'SUCCESS'; // SUCCESS, HESITATION, REFUSAL
  final TextEditingController _rccmController = TextEditingController(text: 'CD/KIN/RCCM/26-B-');
  String _nurturingReason = 'DECIDER_ABSENT';
  final TextEditingController _contractExpiryController = TextEditingController();
  final TextEditingController _followUpDateController = TextEditingController(
    text: DateTime.now().add(const Duration(days: 14)).toIso8601String().substring(0, 10),
  );
  final TextEditingController _nurturingNotesController = TextEditingController();

  // Section 2: Lookalike 100m
  final TextEditingController _nearby1NameController = TextEditingController();
  final TextEditingController _nearby1SectorController = TextEditingController(text: 'Commerce / PME');
  final TextEditingController _nearby1PhoneController = TextEditingController();
  final TextEditingController _nearby1NotesController = TextEditingController(text: 'Juste en face à 30 mètres');

  final TextEditingController _nearby2NameController = TextEditingController();
  final TextEditingController _nearby2SectorController = TextEditingController(text: 'Santé / Pharmacie');
  final TextEditingController _nearby2PhoneController = TextEditingController();
  final TextEditingController _nearby2NotesController = TextEditingController(text: '2 portes à gauche');

  // Section 3: Referral & Supply-chain
  final TextEditingController _ref1CompanyController = TextEditingController();
  final TextEditingController _ref1ContactController = TextEditingController();
  final TextEditingController _ref1PhoneController = TextEditingController();
  final TextEditingController _ref1NotesController = TextEditingController();
  String _ref1Type = 'SUPPLIER';

  // Section 4: Trade Audit
  final TextEditingController _competitorNameController = TextEditingController(text: 'FAI Historique / Autre');
  int _satisfactionScore = 2;
  final Set<String> _selectedFrictions = {'Coupures récurrentes', 'Support client injoignable'};
  final TextEditingController _monthlySpendController = TextEditingController();

  @override
  void dispose() {
    _rccmController.dispose();
    _contractExpiryController.dispose();
    _followUpDateController.dispose();
    _nurturingNotesController.dispose();
    _nearby1NameController.dispose();
    _nearby1SectorController.dispose();
    _nearby1PhoneController.dispose();
    _nearby1NotesController.dispose();
    _nearby2NameController.dispose();
    _nearby2SectorController.dispose();
    _nearby2PhoneController.dispose();
    _nearby2NotesController.dispose();
    _ref1CompanyController.dispose();
    _ref1ContactController.dispose();
    _ref1PhoneController.dispose();
    _ref1NotesController.dispose();
    _competitorNameController.dispose();
    _monthlySpendController.dispose();
    super.dispose();
  }

  int get _calculatedPoints {
    int pts = 0;
    if (_conversionStatus == 'SUCCESS') pts += 5;
    if (_nearby1NameController.text.trim().isNotEmpty) pts += 1;
    if (_nearby2NameController.text.trim().isNotEmpty) pts += 1;
    if (_ref1CompanyController.text.trim().isNotEmpty) pts += 1;
    if (_competitorNameController.text.trim().isNotEmpty) pts += 1;
    return pts;
  }

  Future<void> _submitReport() async {
    final salesController = Get.find<SalesController>();
    final enterprise = salesController.selectedEnterprise.value;
    final visitReport = salesController.currentReport.value;

    final nearbyLeads = <NearbyLeadItem>[];
    if (_nearby1NameController.text.trim().isNotEmpty) {
      nearbyLeads.add(NearbyLeadItem(
        name: _nearby1NameController.text.trim(),
        sector: _nearby1SectorController.text.trim(),
        phone: _nearby1PhoneController.text.trim(),
        proximityNotes: _nearby1NotesController.text.trim(),
      ));
    }
    if (_nearby2NameController.text.trim().isNotEmpty) {
      nearbyLeads.add(NearbyLeadItem(
        name: _nearby2NameController.text.trim(),
        sector: _nearby2SectorController.text.trim(),
        phone: _nearby2PhoneController.text.trim(),
        proximityNotes: _nearby2NotesController.text.trim(),
      ));
    }

    final referrals = <ReferralLeadItem>[];
    if (_ref1CompanyController.text.trim().isNotEmpty) {
      referrals.add(ReferralLeadItem(
        referralType: _ref1Type,
        companyName: _ref1CompanyController.text.trim(),
        contactPerson: _ref1ContactController.text.trim(),
        phone: _ref1PhoneController.text.trim(),
        notes: _ref1NotesController.text.trim(),
      ));
    }

    final tradeAudits = <TradeAuditItem>[];
    if (_competitorNameController.text.trim().isNotEmpty) {
      tradeAudits.add(TradeAuditItem(
        competitorName: _competitorNameController.text.trim(),
        satisfactionScore: _satisfactionScore,
        frictionReasons: _selectedFrictions.toList(),
        monthlySpendEstimated: double.tryParse(_monthlySpendController.text.trim()),
      ));
    }

    final report = FieldIntelligenceReportModel(
      enterpriseId: enterprise?.id ?? 1,
      visitReportId: visitReport?.id,
      conversionStatus: _conversionStatus,
      rccmNumber: _conversionStatus == 'SUCCESS' ? _rccmController.text.trim() : '',
      nurturingReason: _conversionStatus != 'SUCCESS' ? _nurturingReason : 'NONE',
      contractExpiryDate: _contractExpiryController.text.trim().isNotEmpty ? _contractExpiryController.text.trim() : null,
      scheduledFollowUp: _followUpDateController.text.trim().isNotEmpty ? _followUpDateController.text.trim() : null,
      nurturingNotes: _nurturingNotesController.text.trim(),
      nearbyLeads: nearbyLeads,
      referrals: referrals,
      tradeAudits: tradeAudits,
    );

    final ok = await salesController.submitFieldIntelligenceReport(report);
    if (ok) {
      Get.back();
      Get.snackbar(
        'Rapport Terrain Enregistré',
        'Dossier d\'intelligence commerciale validé avec succès.',
        backgroundColor: const Color(0xFF2563EB),
        colorText: Colors.white,
        snackPosition: SnackPosition.TOP,
        duration: const Duration(seconds: 3),
        margin: const EdgeInsets.all(16),
        borderRadius: 16,
        icon: const Icon(LucideIcons.checkCircle2, color: Colors.white),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final salesController = Get.find<SalesController>();
    final enterprise = salesController.selectedEnterprise.value;

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(LucideIcons.arrowLeft, color: isDark ? Colors.white : AppConstants.textDark, size: 20),
          tooltip: 'Retour',
          onPressed: () => Get.back(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Intelligence Terrain',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: isDark ? Colors.white : AppConstants.textDark,
                fontWeight: FontWeight.w800,
                fontSize: 15,
                letterSpacing: -0.3,
              ),
            ),
            if (enterprise != null)
              Text(
                'Visite : ${enterprise.name}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFF2563EB),
                  fontWeight: FontWeight.w600,
                  fontSize: 11,
                ),
              ),
          ],
        ),
      ),
      body: AuroraBackground(
        child: SafeArea(
          child: Form(
            key: _formKey,
            child: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Banner explanation
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1C1C22) : const Color(0xFFF1F2F6),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF2563EB).withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(LucideIcons.radar, color: Color(0xFF2563EB), size: 18),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Cartographiez l\'écosystème local',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Chaque descente terrain génère des leads qualifiés pour optimiser vos tournées et accumuler des points de prime.',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? Colors.white70 : AppConstants.textSecondaryLight,
                                  height: 1.3,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // =========================================================
                  // SECTION 1 : Résultat de Pré-Conversion & Nurturing
                  // =========================================================
                  _buildSectionHeader(
                    icon: LucideIcons.checkCheck,
                    title: '1. Résultat de la Pré-conversion',
                    badge: _conversionStatus == 'SUCCESS' ? 'Pré-converti' : 'En Nurturing',
                    badgeColor: _conversionStatus == 'SUCCESS' ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                    isDark: isDark,
                  ),
                  const SizedBox(height: 8),
                  GlassCard(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: _buildChoiceChip(
                                label: 'Pré-converti',
                                icon: LucideIcons.checkCircle2,
                                isSelected: _conversionStatus == 'SUCCESS',
                                activeColor: const Color(0xFF10B981),
                                onTap: () => setState(() => _conversionStatus = 'SUCCESS'),
                                isDark: isDark,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildChoiceChip(
                                label: 'En réflexion',
                                icon: LucideIcons.clock,
                                isSelected: _conversionStatus == 'HESITATION',
                                activeColor: const Color(0xFFF59E0B),
                                onTap: () => setState(() => _conversionStatus = 'HESITATION'),
                                isDark: isDark,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildChoiceChip(
                                label: 'Non-converti',
                                icon: LucideIcons.xCircle,
                                isSelected: _conversionStatus == 'REFUSAL',
                                activeColor: const Color(0xFFEF4444),
                                onTap: () => setState(() => _conversionStatus = 'REFUSAL'),
                                isDark: isDark,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        if (_conversionStatus == 'SUCCESS') ...[
                          Text(
                            'Numéro RCCM / Registre du Commerce',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isDark ? Colors.white70 : AppConstants.textDark),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _rccmController,
                            style: TextStyle(fontSize: 13, color: isDark ? Colors.white : AppConstants.textDark),
                            decoration: InputDecoration(
                              hintText: 'Ex: CD/KIN/RCCM/26-B-01234',
                              prefixIcon: const Icon(LucideIcons.fileText, size: 16, color: Color(0xFF2563EB)),
                              filled: true,
                              fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            ),
                          ),
                        ] else ...[
                          Text(
                            'Motif principal d\'hésitation / blocage',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isDark ? Colors.white70 : AppConstants.textDark),
                          ),
                          const SizedBox(height: 6),
                          DropdownButtonFormField<String>(
                            value: _nurturingReason,
                            dropdownColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                            style: TextStyle(fontSize: 12, color: isDark ? Colors.white : AppConstants.textDark, fontWeight: FontWeight.w600),
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            ),
                            items: const [
                              DropdownMenuItem(value: 'DECIDER_ABSENT', child: Text('Absence du décideur / gérant')),
                              DropdownMenuItem(value: 'COMPETITOR_CONTRACT', child: Text('Contrat concurrent en cours')),
                              DropdownMenuItem(value: 'BUDGET_WAITING', child: Text('Attente d\'arbitrage budgétaire')),
                              DropdownMenuItem(value: 'COMMITMENT_FEAR', child: Text('Crainte d\'engagement long terme')),
                              DropdownMenuItem(value: 'TECHNICAL_DOUBT', child: Text('Doutes éligibilité technique')),
                              DropdownMenuItem(value: 'OTHER', child: Text('Autre motif')),
                            ],
                            onChanged: (val) => setState(() => _nurturingReason = val ?? 'DECIDER_ABSENT'),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Date fin contrat conc.', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: isDark ? Colors.white70 : AppConstants.textDark)),
                                    const SizedBox(height: 4),
                                    TextFormField(
                                      controller: _contractExpiryController,
                                      style: TextStyle(fontSize: 11, color: isDark ? Colors.white : AppConstants.textDark),
                                      decoration: InputDecoration(
                                        hintText: 'AAAA-MM-JJ',
                                        prefixIcon: const Icon(LucideIcons.calendar, size: 14),
                                        filled: true,
                                        fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Date relance auto', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: isDark ? Colors.white70 : AppConstants.textDark)),
                                    const SizedBox(height: 4),
                                    TextFormField(
                                      controller: _followUpDateController,
                                      style: TextStyle(fontSize: 11, color: isDark ? Colors.white : AppConstants.textDark),
                                      decoration: InputDecoration(
                                        hintText: 'AAAA-MM-JJ',
                                        prefixIcon: const Icon(LucideIcons.bellRing, size: 14, color: Color(0xFF2563EB)),
                                        filled: true,
                                        fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // =========================================================
                  // SECTION 2 : Cartographie de Proximité (Lookalike 100m)
                  // =========================================================
                  _buildSectionHeader(
                    icon: LucideIcons.mapPin,
                    title: '2. Repérage Voisins (Lookalike)',
                    badge: 'Rayon 100m',
                    badgeColor: const Color(0xFF2563EB),
                    isDark: isDark,
                  ),
                  const SizedBox(height: 8),
                  GlassCard(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Voisin #1 (Rayon 50-100m)',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: isDark ? Colors.white : AppConstants.textDark),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: TextFormField(
                                controller: _nearby1NameController,
                                onChanged: (_) => setState(() {}),
                                style: TextStyle(fontSize: 12, color: isDark ? Colors.white : AppConstants.textDark),
                                decoration: InputDecoration(
                                  hintText: 'Nom enseigne / commerce',
                                  prefixIcon: const Icon(LucideIcons.store, size: 14),
                                  filled: true,
                                  fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextFormField(
                                controller: _nearby1PhoneController,
                                style: TextStyle(fontSize: 12, color: isDark ? Colors.white : AppConstants.textDark),
                                decoration: InputDecoration(
                                  hintText: 'Téléphone',
                                  prefixIcon: const Icon(LucideIcons.phone, size: 14),
                                  filled: true,
                                  fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _nearby1NotesController,
                          style: TextStyle(fontSize: 11, color: isDark ? Colors.white : AppConstants.textDark),
                          decoration: InputDecoration(
                            hintText: 'Repère géographique (ex: juste en face, 20m)',
                            prefixIcon: const Icon(LucideIcons.navigation, size: 14),
                            filled: true,
                            fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          ),
                        ),
                        const Divider(height: 24),

                        Text(
                          'Voisin #2 (Rayon 50-100m)',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: isDark ? Colors.white : AppConstants.textDark),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: TextFormField(
                                controller: _nearby2NameController,
                                onChanged: (_) => setState(() {}),
                                style: TextStyle(fontSize: 12, color: isDark ? Colors.white : AppConstants.textDark),
                                decoration: InputDecoration(
                                  hintText: 'Nom enseigne / commerce',
                                  prefixIcon: const Icon(LucideIcons.store, size: 14),
                                  filled: true,
                                  fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextFormField(
                                controller: _nearby2PhoneController,
                                style: TextStyle(fontSize: 12, color: isDark ? Colors.white : AppConstants.textDark),
                                decoration: InputDecoration(
                                  hintText: 'Téléphone',
                                  prefixIcon: const Icon(LucideIcons.phone, size: 14),
                                  filled: true,
                                  fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _nearby2NotesController,
                          style: TextStyle(fontSize: 11, color: isDark ? Colors.white : AppConstants.textDark),
                          decoration: InputDecoration(
                            hintText: 'Repère géographique (ex: 2 portes à gauche)',
                            prefixIcon: const Icon(LucideIcons.navigation, size: 14),
                            filled: true,
                            fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // =========================================================
                  // SECTION 3 : Parrainage & Supply-Chain
                  // =========================================================
                  _buildSectionHeader(
                    icon: LucideIcons.network,
                    title: '3. Parrainages & Partenaires',
                    badge: 'Supply-Chain',
                    badgeColor: const Color(0xFF8B5CF6),
                    isDark: isDark,
                  ),
                  const SizedBox(height: 8),
                  GlassCard(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                value: _ref1Type,
                                dropdownColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                                style: TextStyle(fontSize: 11, color: isDark ? Colors.white : AppConstants.textDark, fontWeight: FontWeight.w600),
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                ),
                                items: const [
                                  DropdownMenuItem(value: 'SUPPLIER', child: Text('Fournisseur')),
                                  DropdownMenuItem(value: 'PARTNER', child: Text('Partenaire')),
                                  DropdownMenuItem(value: 'PEER', child: Text('Confrère')),
                                ],
                                onChanged: (val) => setState(() => _ref1Type = val ?? 'SUPPLIER'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              flex: 2,
                              child: TextFormField(
                                controller: _ref1CompanyController,
                                onChanged: (_) => setState(() {}),
                                style: TextStyle(fontSize: 12, color: isDark ? Colors.white : AppConstants.textDark),
                                decoration: InputDecoration(
                                  hintText: 'Nom entreprise parrainée',
                                  prefixIcon: const Icon(LucideIcons.building2, size: 14),
                                  filled: true,
                                  fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _ref1ContactController,
                                style: TextStyle(fontSize: 11, color: isDark ? Colors.white : AppConstants.textDark),
                                decoration: InputDecoration(
                                  hintText: 'Nom contact / Gérant',
                                  prefixIcon: const Icon(LucideIcons.user, size: 14),
                                  filled: true,
                                  fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextFormField(
                                controller: _ref1PhoneController,
                                style: TextStyle(fontSize: 11, color: isDark ? Colors.white : AppConstants.textDark),
                                decoration: InputDecoration(
                                  hintText: 'Téléphone direct',
                                  prefixIcon: const Icon(LucideIcons.phone, size: 14),
                                  filled: true,
                                  fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // =========================================================
                  // SECTION 4 : Radar de Friction Concurrentielle
                  // =========================================================
                  _buildSectionHeader(
                    icon: LucideIcons.alertTriangle,
                    title: '4. Radar Friction & Concurrent',
                    badge: 'Audit FAI',
                    badgeColor: const Color(0xFFEC4899),
                    isDark: isDark,
                  ),
                  const SizedBox(height: 8),
                  GlassCard(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextFormField(
                          controller: _competitorNameController,
                          onChanged: (_) => setState(() {}),
                          style: TextStyle(fontSize: 12, color: isDark ? Colors.white : AppConstants.textDark),
                          decoration: InputDecoration(
                            hintText: 'Opérateur / FAI en place (ex: FAI X, Canalbox, Airtel...)',
                            prefixIcon: const Icon(LucideIcons.shieldAlert, size: 14, color: Color(0xFFEC4899)),
                            filled: true,
                            fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          ),
                        ),
                        const SizedBox(height: 12),

                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Satisfaction actuelle du prospect :',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isDark ? Colors.white70 : AppConstants.textDark),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: List.generate(5, (index) {
                                final star = index + 1;
                                return GestureDetector(
                                  onTap: () => setState(() => _satisfactionScore = star),
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 1.5),
                                    child: Icon(
                                      LucideIcons.star,
                                      size: 18,
                                      color: star <= _satisfactionScore ? const Color(0xFFF59E0B) : (isDark ? Colors.white24 : Colors.black12),
                                    ),
                                  ),
                                );
                              }),
                            ),
                          ],
                        ),

                        if (_satisfactionScore <= 2) ...[
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.25)),
                            ),
                            child: const Row(
                              children: [
                                Icon(LucideIcons.flame, color: Color(0xFFEF4444), size: 14),
                                SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'Alerte Friction Activée : Lead qualifié prioritaire (SQL) pour le KAM.',
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFFEF4444)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            'Coupures récurrentes',
                            'Débit insuffisant',
                            'Prix excessif',
                            'Support injoignable',
                            'Facturation floue',
                          ].map((friction) {
                            final isSelected = _selectedFrictions.contains(friction);
                            return FilterChip(
                              label: Text(friction, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: isSelected ? Colors.white : (isDark ? Colors.white70 : AppConstants.textDark))),
                              selected: isSelected,
                              selectedColor: const Color(0xFF2563EB),
                              backgroundColor: isDark ? const Color(0xFF1C1C22) : const Color(0xFFF1F2F6),
                              checkmarkColor: Colors.white,
                              onSelected: (selected) {
                                setState(() {
                                  if (selected) {
                                    _selectedFrictions.add(friction);
                                  } else {
                                    _selectedFrictions.remove(friction);
                                  }
                                });
                              },
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // =========================================================
                  // SUBMIT BUTTON
                  // =========================================================
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ScaleTap(
                      child: ElevatedButton.icon(
                        onPressed: salesController.isSubmittingFieldIntelligence.value ? null : _submitReport,
                        icon: salesController.isSubmittingFieldIntelligence.value
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Icon(LucideIcons.send, size: 20, color: Colors.white),
                        label: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            salesController.isSubmittingFieldIntelligence.value
                                ? 'Transmission en cours...'
                                : 'Valider le Rapport Terrain',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader({
    required IconData icon,
    required String title,
    required String badge,
    required Color badgeColor,
    required bool isDark,
  }) {
    return Row(
      children: [
        Icon(icon, size: 16, color: const Color(0xFF2563EB)),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: isDark ? Colors.white : AppConstants.textDark,
            ),
          ),
        ),
        const SizedBox(width: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: badgeColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
          ),
          child: Text(
            badge,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: badgeColor,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildChoiceChip({
    required String label,
    required IconData icon,
    required bool isSelected,
    required Color activeColor,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(
          color: isSelected ? activeColor.withValues(alpha: 0.15) : (isDark ? const Color(0xFF1C1C22) : const Color(0xFFF1F2F6)),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? activeColor : Colors.transparent,
            width: 1.5,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, size: 16, color: isSelected ? activeColor : (isDark ? Colors.white54 : Colors.black45)),
            const SizedBox(height: 4),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: isSelected ? activeColor : (isDark ? Colors.white70 : AppConstants.textDark),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
