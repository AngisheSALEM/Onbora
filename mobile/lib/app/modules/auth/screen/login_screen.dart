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
                  
                  // Official Orange Brand Square Symbol (Solid #FF7900 Square with crisp White Icon)
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppConstants.orangeOfficial,
                      borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
                      boxShadow: [
                        BoxShadow(
                          color: AppConstants.orangeOfficial.withValues(alpha: 0.35),
                          blurRadius: 20,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.directions_run_rounded,
                        size: 40,
                        color: Colors.white,
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
                                    backgroundColor: AppConstants.orangeOfficial,
                                    foregroundColor: Colors.white,
                                  ),
                                  child: authController.isLoading.value
                                      ? Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: const [
                                            SizedBox(
                                              height: 18,
                                              width: 18,
                                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                            ),
                                            SizedBox(width: 10),
                                            Text(
                                              'Connexion en cours...',
                                              style: TextStyle(fontSize: 14, color: Colors.white, fontWeight: FontWeight.bold),
                                            ),
                                          ],
                                        )
                                      : Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: const [
                                            Text(
                                              AppConstants.loginButton,
                                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
                                            ),
                                            SizedBox(width: 8),
                                            Icon(Icons.arrow_forward_rounded, size: 20, color: Colors.white),
                                          ],
                                        ),
                                ),
                              )),
                          const SizedBox(height: AppConstants.marginLg),

                          // Demo Info Footer
                          Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: isDark ? AppConstants.primaryDark : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                                border: Border.all(
                                  color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                                ),
                              ),
                              child: Text(
                                AppConstants.loginDemoHint,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
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
