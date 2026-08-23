import 'dart:io';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../controller/sales_controller.dart';
import '../model/ocr_document_model.dart';
import '../../../routes/app_routes.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/aurora_background.dart';
import '../../../common/screen/widget/glass_card.dart';

class DocumentScanScreen extends StatefulWidget {
  const DocumentScanScreen({super.key});

  @override
  State<DocumentScanScreen> createState() => _DocumentScanScreenState();
}

class _DocumentScanScreenState extends State<DocumentScanScreen> {
  final SalesController salesController = Get.find<SalesController>();
  final ImagePicker _picker = ImagePicker();

  String _selectedDocType = 'RCCM'; // RCCM, BUSINESS_CARD, INVOICE, GENERAL
  XFile? _capturedImage;
  bool _isProcessing = false;

  // Controllers for extracted fields
  late TextEditingController _companyController;
  late TextEditingController _rccmController;
  late TextEditingController _nifController;
  late TextEditingController _contactController;
  late TextEditingController _titleController;
  late TextEditingController _phoneController;
  late TextEditingController _emailController;
  late TextEditingController _providerController;
  late TextEditingController _bandwidthController;
  late TextEditingController _spendController;

  @override
  void initState() {
    super.initState();
    final ocr = salesController.lastOcrResult.value;
    final enterprise = salesController.selectedEnterprise.value;

    _companyController = TextEditingController(text: ocr?.companyName ?? enterprise?.name ?? '');
    _rccmController = TextEditingController(text: ocr?.rccm ?? '');
    _nifController = TextEditingController(text: ocr?.nif ?? '');
    _contactController = TextEditingController(text: ocr?.contactName ?? '');
    _titleController = TextEditingController(text: ocr?.contactTitle ?? '');
    _phoneController = TextEditingController(text: ocr?.phone ?? '');
    _emailController = TextEditingController(text: ocr?.email ?? '');
    _providerController = TextEditingController(text: ocr?.currentProvider ?? '');
    _bandwidthController = TextEditingController(text: ocr?.currentBandwidth ?? '');
    _spendController = TextEditingController(
      text: ocr?.monthlySpendEstimated != null ? ocr!.monthlySpendEstimated!.toStringAsFixed(0) : '',
    );
  }

  @override
  void dispose() {
    _companyController.dispose();
    _rccmController.dispose();
    _nifController.dispose();
    _contactController.dispose();
    _titleController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _providerController.dispose();
    _bandwidthController.dispose();
    _spendController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final image = await _picker.pickImage(
        source: source,
        imageQuality: 85,
      );
      if (image != null) {
        setState(() {
          _capturedImage = image;
          _isProcessing = true;
        });

        // Trigger OCR scan on backend / fallback
        final result = await salesController.scanDocument(
          docType: _selectedDocType,
          imagePath: image.path,
          companyHint: salesController.selectedEnterprise.value?.name ?? '',
        );

        if (result != null) {
          _populateFields(result);
        }

        setState(() {
          _isProcessing = false;
        });
      }
    } catch (e) {
      setState(() => _isProcessing = false);
      Get.snackbar(
        'Numérisation',
        'Impossible de charger l\'image. Réessayez ou utilisez un modèle test.',
        backgroundColor: Colors.red.withValues(alpha: 0.8),
        colorText: Colors.white,
      );
    }
  }

  Future<void> _runDemoScan(String docType) async {
    setState(() {
      _selectedDocType = docType;
      _isProcessing = true;
    });

    await Future.delayed(const Duration(milliseconds: 600));

    final result = await salesController.scanDocument(
      docType: docType,
      companyHint: salesController.selectedEnterprise.value?.name ?? '',
    );

    if (result != null) {
      _populateFields(result);
    }

    setState(() {
      _isProcessing = false;
    });
  }

  void _populateFields(OcrDocumentResultModel result) {
    _companyController.text = result.companyName;
    _rccmController.text = result.rccm;
    _nifController.text = result.nif;
    _contactController.text = result.contactName;
    _titleController.text = result.contactTitle;
    _phoneController.text = result.phone;
    _emailController.text = result.email;
    _providerController.text = result.currentProvider;
    _bandwidthController.text = result.currentBandwidth;
    if (result.monthlySpendEstimated != null) {
      _spendController.text = result.monthlySpendEstimated!.toStringAsFixed(0);
    }
  }

  void _applyToFieldReport() {
    // Save updated values in controller
    final updated = OcrDocumentResultModel(
      companyName: _companyController.text.trim(),
      rccm: _rccmController.text.trim(),
      nif: _nifController.text.trim(),
      contactName: _contactController.text.trim(),
      contactTitle: _titleController.text.trim(),
      phone: _phoneController.text.trim(),
      email: _emailController.text.trim(),
      currentProvider: _providerController.text.trim(),
      currentBandwidth: _bandwidthController.text.trim(),
      monthlySpendEstimated: double.tryParse(_spendController.text.trim()),
      detectedType: _selectedDocType,
    );

    salesController.lastOcrResult.value = updated;

    // Navigate to field intelligence / report screen with prefilled values
    Get.toNamed(Routes.FIELD_INTELLIGENCE);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

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
        title: Text(
          'Numérisation de Document',
          style: TextStyle(
            color: isDark ? Colors.white : AppConstants.textDark,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.3,
            fontSize: 18,
          ),
        ),
      ),
      body: AuroraBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const ClampingScrollPhysics(),
            padding: const EdgeInsets.all(AppConstants.paddingLg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Info Card
                GlassCard(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2563EB).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(LucideIcons.scanLine, color: Color(0xFF2563EB), size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Récupération rapide des données',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                                color: isDark ? Colors.white : AppConstants.textDark,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Scannez le RCCM, la carte de visite ou la facture du client pour pré-remplir automatiquement le dossier.',
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
                const SizedBox(height: 16),

                // 2. Type Selector Pills
                Text(
                  'Type de Document',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildTypePill('RCCM', 'Extrait RCCM / NIF', LucideIcons.fileCheck2, isDark),
                      const SizedBox(width: 8),
                      _buildTypePill('BUSINESS_CARD', 'Carte de Visite', LucideIcons.contact, isDark),
                      const SizedBox(width: 8),
                      _buildTypePill('INVOICE', 'Facture / Contrat FAI', LucideIcons.receipt, isDark),
                      const SizedBox(width: 8),
                      _buildTypePill('GENERAL', 'Autre document', LucideIcons.file, isDark),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 3. Document Camera & Upload Card
                GlassCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      if (_capturedImage != null && !_isProcessing)
                        Container(
                          height: 140,
                          width: double.infinity,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.5)),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.file(
                              File(_capturedImage!.path),
                              fit: BoxFit.cover,
                            ),
                          ),
                        )
                      else if (_isProcessing)
                        Container(
                          height: 120,
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1E1E22) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                SizedBox(
                                  width: 28,
                                  height: 28,
                                  child: CircularProgressIndicator(color: Color(0xFF2563EB), strokeWidth: 2.5),
                                ),
                                SizedBox(height: 10),
                                Text(
                                  'Lecture et extraction des données...',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                          ),
                        )
                      else
                        Container(
                          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF18181B) : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isDark ? const Color(0xFF27272A) : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Column(
                            children: [
                              Icon(
                                LucideIcons.camera,
                                size: 36,
                                color: isDark ? Colors.white70 : AppConstants.textSecondaryLight,
                              ),
                              const SizedBox(height: 10),
                              Text(
                                'Cadrez le document dans le viseur',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Assurez-vous d\'un bon éclairage pour lire le texte.',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      const SizedBox(height: 14),

                      // Capture Buttons
                      Row(
                        children: [
                          Expanded(
                            child: ScaleTap(
                              child: ElevatedButton.icon(
                                onPressed: _isProcessing ? null : () => _pickImage(ImageSource.camera),
                                icon: const Icon(LucideIcons.camera, size: 16, color: Colors.white),
                                label: const Text(
                                  'Prendre une photo',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF2563EB),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ScaleTap(
                              child: OutlinedButton.icon(
                                onPressed: _isProcessing ? null : () => _pickImage(ImageSource.gallery),
                                icon: Icon(LucideIcons.image, size: 16, color: isDark ? Colors.white : AppConstants.textDark),
                                label: Text(
                                  'Galerie',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? Colors.white : AppConstants.textDark,
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Fast Demo Trigger
                      TextButton.icon(
                        onPressed: _isProcessing ? null : () => _runDemoScan(_selectedDocType),
                        icon: const Icon(LucideIcons.sparkles, size: 13, color: Color(0xFF2563EB)),
                        label: const Text(
                          'Tester avec un modèle de document type',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 4. Extracted Data Fields (Editable)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Données Extraites',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                    if (_rccmController.text.isNotEmpty || _contactController.text.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Prêt à valider',
                          style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.w900),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),

                GlassCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildTextField('Raison Sociale / Entreprise', _companyController, LucideIcons.building2, isDark),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _buildTextField('Numéro RCCM', _rccmController, LucideIcons.fileText, isDark, hint: 'CD/KIN/RCCM/...'),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildTextField('Numéro NIF', _nifController, LucideIcons.hash, isDark, hint: 'A0812345Z'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _buildTextField('Nom du Contact', _contactController, LucideIcons.user, isDark),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildTextField('Fonction', _titleController, LucideIcons.briefcase, isDark, hint: 'DG, DAF, DSI...'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _buildTextField('Téléphone', _phoneController, LucideIcons.phone, isDark),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildTextField('Email', _emailController, LucideIcons.mail, isDark),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _buildTextField('Opérateur Actuel', _providerController, LucideIcons.radio, isDark, hint: 'Vodacom, Canalbox...'),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildTextField(r'Budget Est. ($/mois)', _spendController, LucideIcons.dollarSign, isDark, hint: 'Ex: 450'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // 5. Main Action Button: Apply to Field Report
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ScaleTap(
                    child: ElevatedButton.icon(
                      onPressed: _applyToFieldReport,
                      icon: const Icon(LucideIcons.check, size: 18, color: Colors.white),
                      label: const Text(
                        'Valider et Insérer dans le Dossier',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTypePill(String typeKey, String label, IconData icon, bool isDark) {
    final isSelected = _selectedDocType == typeKey;
    return ScaleTap(
      onTap: () => setState(() => _selectedDocType = typeKey),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF2563EB)
              : (isDark ? const Color(0xFF1E1E24) : const Color(0xFFF1F5F9)),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF2563EB)
                : (isDark ? const Color(0xFF2E2E38) : const Color(0xFFE2E8F0)),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: isSelected ? Colors.white : (isDark ? Colors.white70 : AppConstants.textDark),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                color: isSelected ? Colors.white : (isDark ? Colors.white : AppConstants.textDark),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController controller,
    IconData icon,
    bool isDark, {
    String? hint,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white70 : AppConstants.textSecondaryLight,
          ),
        ),
        const SizedBox(height: 4),
        Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF141416) : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isDark ? const Color(0xFF27272A) : const Color(0xFFCBD5E1),
            ),
          ),
          child: TextField(
            controller: controller,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: isDark ? Colors.white : AppConstants.textDark,
            ),
            decoration: InputDecoration(
              isDense: true,
              hintText: hint,
              hintStyle: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.white30 : AppConstants.textMuted,
              ),
              prefixIcon: Icon(icon, size: 16, color: isDark ? Colors.white54 : AppConstants.textSecondaryLight),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            ),
          ),
        ),
      ],
    );
  }
}
