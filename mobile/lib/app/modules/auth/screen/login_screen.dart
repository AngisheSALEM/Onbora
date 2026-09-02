import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/auth_controller.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/aurora_background.dart';
import '../../../common/screen/widget/glass_card.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController(text: 'sales1');
  final _passwordController = TextEditingController(text: 'sales1pass');
  bool _obscurePassword = true;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() {
    if (_formKey.currentState!.validate()) {
      Get.find<AuthController>().login(
        _usernameController.text.trim(),
        _passwordController.text,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final authController = Get.find<AuthController>();

    final hasMinLength = _passwordController.text.length >= 6;
    final hasLetters = RegExp(r'[a-zA-Z]').hasMatch(_passwordController.text);
    final hasDigits = RegExp(r'[0-9]').hasMatch(_passwordController.text);

    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              physics: const ClampingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingXl),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: 20),
                  
                  // Onbora Official App Icon
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(AppConstants.borderRadiusLg),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.12),
                          blurRadius: 18,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(AppConstants.borderRadiusLg),
                      child: Image.asset(
                        'assets/icons/app_icon.png',
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Container(
                          color: isDark ? const Color(0xFF2C2C2E) : AppConstants.primaryBlack,
                          child: const Icon(Icons.directions_run_rounded, color: Colors.white, size: 36),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppConstants.marginLg),

                  // Brand Title 75 (Thick, Direct, Essential)
                  Text(
                    AppConstants.appName,
                    style: theme.textTheme.displayLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.0,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                  const SizedBox(height: 6),
                  
                  // Orange Business B2B Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDark ? AppConstants.primaryDark : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                      border: Border.all(
                        color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppConstants.orangeOfficial,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Orange Business • Copilote Terrain',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppConstants.marginXxL),

                  // High-Contrast Form Card
                  GlassCard(
                    padding: const EdgeInsets.all(AppConstants.paddingXl),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            AppConstants.loginTitle,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : AppConstants.textDark,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Entrez vos identifiants pour accéder au copilote terrain.',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontSize: AppConstants.fontSizeSm,
                              color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                            ),
                          ),
                          const SizedBox(height: AppConstants.marginXxL),

                          // Error Banner if login failed with Retry Action
                          Obx(() {
                            if (authController.errorMessage.value.isEmpty) return const SizedBox.shrink();
                            return Column(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(AppConstants.paddingMd),
                                  decoration: BoxDecoration(
                                    color: Colors.red.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
                                    border: Border.all(color: Colors.redAccent.withValues(alpha: 0.4)),
                                  ),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 22),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text(
                                              'Échec de Connexion',
                                              style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 12),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              authController.errorMessage.value,
                                              style: TextStyle(
                                                color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                                                fontSize: 11,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      TextButton(
                                        onPressed: _handleLogin,
                                        child: const Text('Réessayer', style: TextStyle(color: AppConstants.orangeOfficial, fontWeight: FontWeight.bold, fontSize: 12)),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: AppConstants.marginLg),
                              ],
                            );
                          }),

                          // Username / Email input
                          TextFormField(
                            controller: _usernameController,
                            keyboardType: TextInputType.emailAddress,
                            style: TextStyle(color: isDark ? Colors.white : AppConstants.textDark, fontWeight: FontWeight.w600),
                            decoration: InputDecoration(
                              labelText: AppConstants.loginIdLabel,
                              prefixIcon: Icon(Icons.person_outline_rounded, color: isDark ? Colors.white70 : AppConstants.textDark),
                              hintText: 'sales1 ou commercial@onbora.cd',
                            ),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'L\'identifiant est obligatoire';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: AppConstants.marginLg),

                          // Password input
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            style: TextStyle(color: isDark ? Colors.white : AppConstants.textDark, fontWeight: FontWeight.w600),
                            onChanged: (_) => setState(() {}),
                            decoration: InputDecoration(
                              labelText: AppConstants.loginPasswordLabel,
                              prefixIcon: Icon(Icons.lock_outline_rounded, color: isDark ? Colors.white70 : AppConstants.textDark),
                              suffixIcon: IconButton(
                                icon: Icon(_obscurePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded, color: isDark ? Colors.white70 : AppConstants.textDark),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                            ),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'Le mot de passe est obligatoire';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 10),

                          // Dynamic Password Requirements Checklist
                          Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children: [
                              _buildRequirementChip(context, '6+ car.', hasMinLength),
                              _buildRequirementChip(context, 'Lettres', hasLetters),
                              _buildRequirementChip(context, 'Chiffres', hasDigits),
                            ],
                          ),
                          const SizedBox(height: AppConstants.marginXxL),

                          // Submit Button (#FF7900 Official CTA)
                          Obx(() => ScaleTap(
                                child: ElevatedButton(
                                  onPressed: authController.isLoading.value ? null : _handleLogin,
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 15),
                                    backgroundColor: isDark ? Colors.white : const Color(0xFF18181B),
                                    foregroundColor: isDark ? const Color(0xFF121214) : Colors.white,
                                  ),
                                  child: authController.isLoading.value
                                      ? Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            SizedBox(
                                              height: 18,
                                              width: 18,
                                              child: CircularProgressIndicator(color: isDark ? const Color(0xFF121214) : Colors.white, strokeWidth: 2),
                                            ),
                                            const SizedBox(width: 10),
                                            Text(
                                              'Connexion en cours...',
                                              style: TextStyle(fontSize: 14, color: isDark ? const Color(0xFF121214) : Colors.white, fontWeight: FontWeight.bold),
                                            ),
                                          ],
                                        )
                                      : Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Text(
                                              AppConstants.loginButton,
                                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: isDark ? const Color(0xFF121214) : Colors.white),
                                            ),
                                            const SizedBox(width: 8),
                                            const Icon(Icons.arrow_forward_rounded, size: 18),
                                          ],
                                        ),
                                ),
                              )),
                          const SizedBox(height: AppConstants.marginLg),

                          // Boutons d'accès rapide Démo : Commercial Terrain & KAM
                          Column(
                            children: [
                              Text(
                                'Accès Démonstration Rapide :',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Wrap(
                                alignment: WrapAlignment.center,
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  ScaleTap(
                                    onTap: () {
                                      _usernameController.text = 'sales1';
                                      _passwordController.text = 'sales1pass';
                                      authController.login('sales1', 'sales1pass');
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                                        borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                                        border: Border.all(
                                          color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            CupertinoIcons.person_fill,
                                            size: 13,
                                            color: isDark ? Colors.white : AppConstants.textDark,
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            'Commercial Terrain',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                              color: isDark ? Colors.white : AppConstants.textDark,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  ScaleTap(
                                    onTap: () {
                                      _usernameController.text = 'kam1';
                                      _passwordController.text = 'kam1pass';
                                      authController.login('kam1', 'kam1pass');
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                                        borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                                        border: Border.all(
                                          color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            CupertinoIcons.building_2_fill,
                                            size: 13,
                                            color: isDark ? Colors.white : AppConstants.textDark,
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            'KAM Grands Comptes',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                              color: isDark ? Colors.white : AppConstants.textDark,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
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

  Widget _buildRequirementChip(BuildContext context, String label, bool isSatisfied) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isSatisfied
            ? AppConstants.successGreen.withValues(alpha: 0.15)
            : Colors.grey.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isSatisfied ? Icons.check_circle_rounded : Icons.circle_outlined,
            size: 12,
            color: isSatisfied ? AppConstants.successGreen : Colors.grey,
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: isSatisfied ? AppConstants.successGreen : Colors.grey,
            ),
          ),
        ],
      ),
    );
  }
}
