import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../controller/sales_controller.dart';
import '../model/field_intelligence_model.dart';
import '../model/ocr_document_model.dart';
import '../../../routes/app_routes.dart';
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
  Worker? _ocrWorker;

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
  void initState() {
    super.initState();
    final salesController = Get.find<SalesController>();
    _applyOcr(salesController.lastOcrResult.value);
    _ocrWorker = ever(salesController.lastOcrResult, (ocr) {
      if (mounted && ocr != null) {
        setState(() {
          _applyOcr(ocr);
        });
      }
    });
  }

  void _applyOcr(OcrDocumentResultModel? ocr) {
    if (ocr == null) return;
    if (ocr.rccm.isNotEmpty) {
      _rccmController.text = ocr.rccm;
    }
    if (ocr.currentProvider.isNotEmpty) {
      _competitorNameController.text = ocr.currentProvider;
    }
    if (ocr.monthlySpendEstimated != null) {
      _monthlySpendController.text = ocr.monthlySpendEstimated!.toStringAsFixed(0);
    }
    if (ocr.contactName.isNotEmpty) {
      _ref1ContactController.text = ocr.contactName;
      _ref1PhoneController.text = ocr.phone;
    }
  }

  @override
  void dispose() {
    _ocrWorker?.dispose();
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
        backgroundColor: Colors.black87,
        colorText: Colors.white,
        snackPosition: SnackPosition.TOP,
        duration: const Duration(seconds: 3),
        margin: const EdgeInsets.all(16),
        borderRadius: 14,
        icon: const Icon(LucideIcons.checkCircle2, color: Colors.white),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final salesController = Get.find<SalesController>();
    final enterprise = salesController.selectedEnterprise.value;

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: Icon(CupertinoIcons.chevron_back, color: isDark ? Colors.white : AppConstants.textDark, size: 22),
          tooltip: 'Retour',
          onPressed: () => Get.back(),
        ),
      ),
      body: AuroraBackground(
        child: SafeArea(
          child: Form(
            key: _formKey,
            child: RepaintBoundary(
              child: SingleChildScrollView(
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                physics: const ClampingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Surtitre Meta (11px Uppercase)
                    Text(
                      'FORMULAIRE DE VISITE',
                      style: AppConstants.overlineStyle(isDark),
                    ),
                    const SizedBox(height: 4),
                    // Grand Titre (34px Bold)
                    Text(
                      enterprise?.name ?? 'Compte-rendu terrain',
                      style: AppConstants.largeTitleStyle(isDark),
                    ),
                    Divider(
                      height: 16,
                      thickness: 0.5,
                      color: isDark ? const Color(0x22FFFFFF) : const Color(0x15000000),
                    ),
                    const SizedBox(height: 6),
                    // Banner explanation (Clean, neutral)
                    GlassCard(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF222228) : const Color(0xFFE2E8F0),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(LucideIcons.radar, color: isDark ? Colors.white : AppConstants.textDark, size: 18),
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
                                    color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                                    height: 1.3,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Quick OCR Scanner Shortcut (Clean Monochrome)
                    ScaleTap(
                      onTap: () => Get.toNamed(Routes.DOCUMENT_SCAN),
                      child: GlassCard(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        child: Row(
                          children: [
                            Icon(LucideIcons.scanLine, color: isDark ? Colors.white : AppConstants.textDark, size: 18),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Scanner un document (RCCM / Facture)',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                      color: isDark ? Colors.white : AppConstants.textDark,
                                    ),
                                  ),
                                  Text(
                                    'Pré-remplissage automatique des champs par photo',
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: isDark ? Colors.white : const Color(0xFF18181B),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'Scanner',
                                style: TextStyle(
                                  color: isDark ? const Color(0xFF121214) : Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ],
                        ),
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
                                prefixIcon: Icon(LucideIcons.fileText, size: 16, color: isDark ? Colors.white54 : AppConstants.textSecondaryLight),
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
                              initialValue: _nurturingReason,
                              isExpanded: true,
                              dropdownColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                              style: TextStyle(fontSize: 12, color: isDark ? Colors.white : AppConstants.textDark, fontWeight: FontWeight.w600),
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              ),
                              items: const [
                                DropdownMenuItem(value: 'DECIDER_ABSENT', child: Text('Absence du décideur / gérant', overflow: TextOverflow.ellipsis)),
                                DropdownMenuItem(value: 'COMPETITOR_CONTRACT', child: Text('Contrat concurrent en cours', overflow: TextOverflow.ellipsis)),
                                DropdownMenuItem(value: 'BUDGET_WAITING', child: Text('Attente d\'arbitrage budgétaire', overflow: TextOverflow.ellipsis)),
                                DropdownMenuItem(value: 'COMMITMENT_FEAR', child: Text('Crainte d\'engagement long terme', overflow: TextOverflow.ellipsis)),
                                DropdownMenuItem(value: 'TECHNICAL_DOUBT', child: Text('Doutes éligibilité technique', overflow: TextOverflow.ellipsis)),
                                DropdownMenuItem(value: 'OTHER', child: Text('Autre motif', overflow: TextOverflow.ellipsis)),
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
                                          prefixIcon: Icon(LucideIcons.bellRing, size: 14, color: isDark ? Colors.white54 : AppConstants.textSecondaryLight),
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
                      badgeColor: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
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
                      badgeColor: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
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
                              SizedBox(
                                width: 120,
                                child: DropdownButtonFormField<String>(
                                  initialValue: _ref1Type,
                                  isExpanded: true,
                                  dropdownColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                                  style: TextStyle(fontSize: 11, color: isDark ? Colors.white : AppConstants.textDark, fontWeight: FontWeight.w600),
                                  decoration: InputDecoration(
                                    filled: true,
                                    fillColor: isDark ? const Color(0xFF1C1C22) : Colors.white,
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                  ),
                                  items: const [
                                    DropdownMenuItem(value: 'SUPPLIER', child: Text('Fournisseur', overflow: TextOverflow.ellipsis)),
                                    DropdownMenuItem(value: 'PARTNER', child: Text('Partenaire', overflow: TextOverflow.ellipsis)),
                                    DropdownMenuItem(value: 'PEER', child: Text('Confrère', overflow: TextOverflow.ellipsis)),
                                  ],
                                  onChanged: (val) => setState(() => _ref1Type = val ?? 'SUPPLIER'),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: TextFormField(
                                  controller: _ref1CompanyController,
                                  onChanged: (_) => setState(() {}),
                                  style: TextStyle(fontSize: 12, color: isDark ? Colors.white : AppConstants.textDark),
                                  decoration: InputDecoration(
                                    hintText: 'Nom entreprise',
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
                      icon: LucideIcons.shieldAlert,
                      title: '4. Radar Friction & Concurrent',
                      badge: 'Audit FAI',
                      badgeColor: const Color(0xFFF59E0B),
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
                              hintText: 'Opérateur / FAI en place (ex: Canalbox, Airtel...)',
                              prefixIcon: Icon(LucideIcons.shieldAlert, size: 14, color: isDark ? Colors.white54 : AppConstants.textSecondaryLight),
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
                                      'Alerte Friction : Lead qualifié prioritaire pour le KAM.',
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
                                label: Text(
                                  friction,
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: isSelected
                                        ? (isDark ? const Color(0xFF121214) : Colors.white)
                                        : (isDark ? Colors.white70 : AppConstants.textDark),
                                  ),
                                ),
                                selected: isSelected,
                                selectedColor: isDark ? Colors.white : const Color(0xFF18181B),
                                backgroundColor: isDark ? const Color(0xFF1C1C22) : const Color(0xFFF1F2F6),
                                checkmarkColor: isDark ? const Color(0xFF121214) : Colors.white,
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
                    // SUBMIT BUTTON (Pure Monochrome: White on Dark / Black on Light)
                    // =========================================================
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ScaleTap(
                        child: ElevatedButton.icon(
                          onPressed: salesController.isSubmittingFieldIntelligence.value ? null : _submitReport,
                          icon: salesController.isSubmittingFieldIntelligence.value
                              ? SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    color: isDark ? const Color(0xFF121214) : Colors.white,
                                    strokeWidth: 2,
                                  ),
                                )
                              : Icon(LucideIcons.send, size: 18, color: isDark ? const Color(0xFF121214) : Colors.white),
                          label: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              salesController.isSubmittingFieldIntelligence.value
                                  ? 'Transmission en cours...'
                                  : 'Valider le Rapport Terrain',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                color: isDark ? const Color(0xFF121214) : Colors.white,
                              ),
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isDark ? Colors.white : const Color(0xFF18181B),
                            foregroundColor: isDark ? const Color(0xFF121214) : Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
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
        Icon(icon, size: 16, color: isDark ? Colors.white : AppConstants.textDark),
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
