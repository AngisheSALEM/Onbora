import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../controller/sales_controller.dart';
import '../../catalog/model/offer_questionnaire_model.dart';
import '../../../routes/app_routes.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/aurora_background.dart';
import '../../../common/screen/widget/glass_card.dart';

class VisitFormScreen extends StatefulWidget {
  const VisitFormScreen({super.key});

  @override
  State<VisitFormScreen> createState() => _VisitFormScreenState();
}

class _VisitFormScreenState extends State<VisitFormScreen> {
  final SalesController salesController = Get.find<SalesController>();
  final TextEditingController _objectionsController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();
  final Map<int, TextEditingController> _textControllers = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (salesController.availableQuestionnaires.isEmpty) {
        salesController.fetchQuestionnaires();
      }
    });
  }

  @override
  void dispose() {
    _objectionsController.dispose();
    _notesController.dispose();
    for (var c in _textControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _getTextController(int questionId, String initialValue) {
    if (!_textControllers.containsKey(questionId)) {
      _textControllers[questionId] = TextEditingController(text: initialValue);
    }
    return _textControllers[questionId]!;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final enterprise = salesController.selectedEnterprise.value;

    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Column(
            children: [
              _buildTopBar(context, isDark, enterprise?.name ?? 'Entreprise'),
              Expanded(
                child: Obx(() {
                  if (salesController.isLoadingQuestionnaires.value) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  final questionnaires = salesController.availableQuestionnaires;
                  final currentQ = salesController.selectedQuestionnaire.value;

                  return ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                    children: [
                      // Enterprise Info Card
                      _buildEnterpriseBanner(context, isDark, enterprise),

                      const SizedBox(height: 16),

                      // Offer Selector
                      _buildOfferSelector(context, isDark, questionnaires, currentQ),

                      const SizedBox(height: 20),

                      // Questionnaire Content
                      if (currentQ != null) ...[
                        _buildQuestionnaireHeader(context, isDark, currentQ),
                        const SizedBox(height: 16),
                        ...currentQ.questions.map((question) => _buildQuestionCard(context, isDark, question)),
                      ] else ...[
                        _buildEmptyQuestionnaireState(context, isDark),
                      ],

                      const SizedBox(height: 16),

                      // Optional Objections & Notes
                      _buildNotesSection(context, isDark),

                      const SizedBox(height: 32),

                      // Submit Button
                      _buildSubmitButton(context, isDark, enterprise?.id ?? 0),

                      const SizedBox(height: 40),
                    ],
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context, bool isDark, String enterpriseName) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: Row(
        children: [
          ScaleTap(
            onTap: () => Get.back(),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
                shape: BoxShape.circle,
                border: Border.all(
                  color: isDark ? AppConstants.glassDarkBorder : AppConstants.glassLightBorder,
                ),
              ),
              child: Icon(
                LucideIcons.arrowLeft,
                size: 20,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Formulaire de Visite Terrain",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
                Text(
                  enterpriseName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? Colors.white60 : Colors.black54,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEnterpriseBanner(BuildContext context, bool isDark, dynamic enterprise) {
    if (enterprise == null) return const SizedBox.shrink();

    return GlassCard(
      borderRadius: BorderRadius.circular(16),
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppConstants.primaryBlue.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              LucideIcons.building2,
              color: AppConstants.primaryBlue,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  enterprise.name,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  "${enterprise.sector} • ${enterprise.location}",
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.white60 : Colors.black54,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOfferSelector(
    BuildContext context,
    bool isDark,
    List<OfferQuestionnaireModel> questionnaires,
    OfferQuestionnaireModel? currentQ,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(LucideIcons.tag, size: 16, color: AppConstants.primaryBlue),
            const SizedBox(width: 6),
            Text(
              "1. Choisissez l'offre à qualifier",
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 42,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: questionnaires.length,
            separatorBuilder: (ctx, idx) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final q = questionnaires[index];
              final isSelected = currentQ?.id == q.id;

              return ScaleTap(
                onTap: () => salesController.selectQuestionnaire(q),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppConstants.primaryBlue
                        : (isDark ? AppConstants.cardDark : AppConstants.cardLight),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isSelected
                          ? AppConstants.primaryBlue
                          : (isDark ? AppConstants.glassDarkBorder : AppConstants.glassLightBorder),
                      width: isSelected ? 1.5 : 1.0,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      q.targetOfferName.isNotEmpty ? q.targetOfferName : q.title,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected
                            ? Colors.white
                            : (isDark ? Colors.white70 : Colors.black87),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildQuestionnaireHeader(BuildContext context, bool isDark, OfferQuestionnaireModel questionnaire) {
    return GlassCard(
      borderRadius: BorderRadius.circular(16),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppConstants.primaryBlue.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  "Questions Back-Office",
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppConstants.primaryBlue,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                "${questionnaire.questions.length} questions",
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: isDark ? Colors.white60 : Colors.black54,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            questionnaire.title,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          if (questionnaire.description.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              questionnaire.description,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.white60 : Colors.black54,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildQuestionCard(BuildContext context, bool isDark, OfferQuestionModel question) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14.0),
      child: GlassCard(
        borderRadius: BorderRadius.circular(16),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Question Label & Order
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white12 : Colors.black12,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      "${question.order}",
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        question.questionText,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      if (question.helpText.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          question.helpText,
                          style: TextStyle(
                            fontSize: 11,
                            fontStyle: FontStyle.italic,
                            color: isDark ? Colors.white54 : Colors.black45,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (question.isRequired)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.orange.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      "Requis",
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: Colors.orange,
                      ),
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 12),

            // Dynamic Input Field based on questionType
            _buildInputForQuestionType(context, isDark, question),
          ],
        ),
      ),
    );
  }

  Widget _buildInputForQuestionType(BuildContext context, bool isDark, OfferQuestionModel question) {
    switch (question.questionType) {
      case 'SINGLE_CHOICE':
        return _buildSingleChoice(context, isDark, question);
      case 'MULTIPLE_CHOICE':
        return _buildMultipleChoice(context, isDark, question);
      case 'BOOLEAN':
        return _buildBooleanChoice(context, isDark, question);
      case 'NUMBER':
        return _buildNumberInput(context, isDark, question);
      case 'TEXT':
      default:
        return _buildTextInput(context, isDark, question);
    }
  }

  Widget _buildSingleChoice(BuildContext context, bool isDark, OfferQuestionModel question) {
    return Obx(() {
      final currentAnswer = salesController.getFormAnswer(question.id);

      return Column(
        children: question.options.map((option) {
          final isSelected = currentAnswer == option;

          return Padding(
            padding: const EdgeInsets.only(bottom: 6.0),
            child: ScaleTap(
              onTap: () => salesController.setFormAnswer(question.id, option),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppConstants.primaryBlue.withValues(alpha: 0.12)
                      : (isDark ? Colors.white.withValues(alpha: 0.04) : Colors.black.withValues(alpha: 0.03)),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected
                        ? AppConstants.primaryBlue
                        : (isDark ? Colors.white12 : Colors.black12),
                    width: isSelected ? 1.5 : 1.0,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isSelected ? AppConstants.primaryBlue : Colors.transparent,
                        border: Border.all(
                          color: isSelected
                              ? AppConstants.primaryBlue
                              : (isDark ? Colors.white38 : Colors.black38),
                          width: 2,
                        ),
                      ),
                      child: isSelected
                          ? const Center(
                              child: Icon(Icons.circle, size: 8, color: Colors.white),
                            )
                          : null,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        option,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      );
    });
  }

  Widget _buildMultipleChoice(BuildContext context, bool isDark, OfferQuestionModel question) {
    return Obx(() {
      final currentAnswer = salesController.getFormAnswer(question.id);
      final List<String> selectedList = currentAnswer is List
          ? List<String>.from(currentAnswer)
          : <String>[];

      return Column(
        children: question.options.map((option) {
          final isSelected = selectedList.contains(option);

          return Padding(
            padding: const EdgeInsets.only(bottom: 6.0),
            child: ScaleTap(
              onTap: () {
                final updated = List<String>.from(selectedList);
                if (isSelected) {
                  updated.remove(option);
                } else {
                  updated.add(option);
                }
                salesController.setFormAnswer(question.id, updated);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppConstants.primaryBlue.withValues(alpha: 0.12)
                      : (isDark ? Colors.white.withValues(alpha: 0.04) : Colors.black.withValues(alpha: 0.03)),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected
                        ? AppConstants.primaryBlue
                        : (isDark ? Colors.white12 : Colors.black12),
                    width: isSelected ? 1.5 : 1.0,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(6),
                        color: isSelected ? AppConstants.primaryBlue : Colors.transparent,
                        border: Border.all(
                          color: isSelected
                              ? AppConstants.primaryBlue
                              : (isDark ? Colors.white38 : Colors.black38),
                          width: 2,
                        ),
                      ),
                      child: isSelected
                          ? const Center(
                              child: Icon(Icons.check, size: 14, color: Colors.white),
                            )
                          : null,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        option,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      );
    });
  }

  Widget _buildBooleanChoice(BuildContext context, bool isDark, OfferQuestionModel question) {
    return Obx(() {
      final currentAnswer = salesController.getFormAnswer(question.id);

      return Row(
        children: [
          Expanded(
            child: ScaleTap(
              onTap: () => salesController.setFormAnswer(question.id, 'Oui'),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: currentAnswer == 'Oui'
                      ? AppConstants.primaryBlue
                      : (isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.04)),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: currentAnswer == 'Oui'
                        ? AppConstants.primaryBlue
                        : (isDark ? Colors.white12 : Colors.black12),
                  ),
                ),
                child: Center(
                  child: Text(
                    "Oui",
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: currentAnswer == 'Oui'
                          ? Colors.white
                          : (isDark ? Colors.white70 : Colors.black87),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: ScaleTap(
              onTap: () => salesController.setFormAnswer(question.id, 'Non'),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: currentAnswer == 'Non'
                      ? (isDark ? Colors.white24 : Colors.black26)
                      : (isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.04)),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: currentAnswer == 'Non'
                        ? (isDark ? Colors.white38 : Colors.black38)
                        : (isDark ? Colors.white12 : Colors.black12),
                  ),
                ),
                child: Center(
                  child: Text(
                    "Non",
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: currentAnswer == 'Non'
                          ? Colors.white
                          : (isDark ? Colors.white70 : Colors.black87),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      );
    });
  }

  Widget _buildTextInput(BuildContext context, bool isDark, OfferQuestionModel question) {
    final currentAnswer = salesController.getFormAnswer(question.id)?.toString() ?? '';
    final controller = _getTextController(question.id, currentAnswer);

    return TextField(
      controller: controller,
      onChanged: (val) => salesController.setFormAnswer(question.id, val),
      style: TextStyle(fontSize: 13, color: isDark ? Colors.white : Colors.black87),
      decoration: InputDecoration(
        hintText: "Saisir la réponse...",
        hintStyle: TextStyle(fontSize: 13, color: isDark ? Colors.white38 : Colors.black38),
        filled: true,
        fillColor: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.04),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: isDark ? Colors.white12 : Colors.black12),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: isDark ? Colors.white12 : Colors.black12),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppConstants.primaryBlue),
        ),
      ),
    );
  }

  Widget _buildNumberInput(BuildContext context, bool isDark, OfferQuestionModel question) {
    final currentAnswer = salesController.getFormAnswer(question.id)?.toString() ?? '';
    final controller = _getTextController(question.id, currentAnswer);

    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      onChanged: (val) => salesController.setFormAnswer(question.id, val),
      style: TextStyle(fontSize: 13, color: isDark ? Colors.white : Colors.black87),
      decoration: InputDecoration(
        hintText: "Ex: 15",
        hintStyle: TextStyle(fontSize: 13, color: isDark ? Colors.white38 : Colors.black38),
        filled: true,
        fillColor: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.04),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        prefixIcon: Icon(LucideIcons.hash, size: 16, color: isDark ? Colors.white54 : Colors.black54),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: isDark ? Colors.white12 : Colors.black12),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: isDark ? Colors.white12 : Colors.black12),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppConstants.primaryBlue),
        ),
      ),
    );
  }

  Widget _buildEmptyQuestionnaireState(BuildContext context, bool isDark) {
    return GlassCard(
      borderRadius: BorderRadius.circular(16),
      padding: const EdgeInsets.all(24),
      child: Center(
        child: Column(
          children: [
            Icon(LucideIcons.fileQuestion, size: 36, color: isDark ? Colors.white38 : Colors.black38),
            const SizedBox(height: 10),
            Text(
              "Sélectionnez une offre pour charger les questions",
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.white60 : Colors.black54,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotesSection(BuildContext context, bool isDark) {
    return GlassCard(
      borderRadius: BorderRadius.circular(16),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(LucideIcons.messageSquare, size: 16, color: AppConstants.primaryBlue),
              const SizedBox(width: 6),
              Text(
                "Objections & Remarques (Optionnel)",
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _objectionsController,
            maxLines: 2,
            style: TextStyle(fontSize: 13, color: isDark ? Colors.white : Colors.black87),
            decoration: InputDecoration(
              hintText: "Objections du client (ex: budget serré, contrat actuel jusqu'en juin)...",
              hintStyle: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : Colors.black38),
              filled: true,
              fillColor: isDark ? Colors.white.withValues(alpha: 0.04) : Colors.black.withValues(alpha: 0.03),
              contentPadding: const EdgeInsets.all(10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: isDark ? Colors.white12 : Colors.black12),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: isDark ? Colors.white12 : Colors.black12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitButton(BuildContext context, bool isDark, int enterpriseId) {
    return Obx(() {
      final isSubmitting = salesController.isSubmittingForm.value;

      return ScaleTap(
        onTap: isSubmitting
            ? null
            : () async {
                final success = await salesController.submitVisitForm(
                  enterpriseId: enterpriseId,
                  objections: _objectionsController.text.trim(),
                  customNotes: _notesController.text.trim(),
                );

                if (success && context.mounted) {
                  _showSuccessDialog(context, isDark);
                }
              },
        child: Container(
          width: double.infinity,
          height: 52,
          decoration: BoxDecoration(
            color: AppConstants.primaryBlue,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppConstants.primaryBlue.withValues(alpha: 0.3),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Center(
            child: isSubmitting
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Colors.white,
                    ),
                  )
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.send, color: Colors.white, size: 18),
                      SizedBox(width: 8),
                      Text(
                        "Valider & Transmettre au Back-Office",
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      );
    });
  }

  void _showSuccessDialog(BuildContext context, bool isDark) {
    final submission = salesController.lastSubmissionResult.value;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white24 : Colors.black26,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.green.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.checkCheck, color: Colors.green, size: 36),
                ),
                const SizedBox(height: 14),
                Text(
                  "Rapport Transmis avec Succès !",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  "Le dossier commercial a été qualifié et synchronisé dans le CRM Back-Office pour l'équipe KAM.",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? Colors.white60 : Colors.black54,
                  ),
                ),
                const SizedBox(height: 16),
                if (submission != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white.withValues(alpha: 0.04) : Colors.black.withValues(alpha: 0.03),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              "Score de Qualification : ",
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? Colors.white70 : Colors.black87,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.green.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                "${submission.qualificationScore}/100",
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.green,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "Prochaine action : ${submission.nextAction}",
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: AppConstants.primaryBlue,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                ScaleTap(
                  onTap: () {
                    Get.back();
                    Get.offNamed(Routes.SALES_HOME);
                  },
                  child: Container(
                    width: double.infinity,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppConstants.primaryBlue,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Center(
                      child: Text(
                        "Retour à l'accueil",
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
