import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../view_models/auth_view_model.dart';
import '../../../../core/api/api_config.dart';

class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  final _usernameController = TextEditingController(text: 'sales1');
  final _passwordController = TextEditingController(text: 'sales1pass');
  late GlobalKey<FormState> _formKey;
  String _selectedServer = 'Render Cloud';
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _formKey = GlobalKey<FormState>();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    if (_formKey.currentState!.validate()) {
      final authVm = context.read<AuthViewModel>();
      final success = await authVm.login(
        _usernameController.text.trim(),
        _passwordController.text.trim(),
      );

      if (!mounted) return;
      if (!success && authVm.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: Colors.white),
                const SizedBox(width: 10),
                Expanded(child: Text(authVm.errorMessage!)),
              ],
            ),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();
    final theme = Theme.of(context);
    final password = _passwordController.text;
    final hasMinLength = password.length >= 6;
    final hasLetters = password.contains(RegExp(r'[a-zA-Z]'));
    final hasDigits = password.contains(RegExp(r'[0-9]'));

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Card(
                  elevation: 8,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                  child: Padding(
                    padding: const EdgeInsets.all(28),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Header Logo & Title
                          Center(
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF97316).withValues(alpha: 0.12),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.business_center_rounded,
                                size: 44,
                                color: Color(0xFFF97316),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'ONBORA SALES',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.displayLarge?.copyWith(
                              fontSize: 24,
                              letterSpacing: 1.2,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Espace Commercial & Copilote Terrain',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontSize: 13,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Server Environment Selector
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () {
                                      setState(() => _selectedServer = 'Render Cloud');
                                      ApiConfig.useRenderServer();
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      decoration: BoxDecoration(
                                        color: _selectedServer == 'Render Cloud' ? Colors.white : Colors.transparent,
                                        borderRadius: BorderRadius.circular(8),
                                        boxShadow: _selectedServer == 'Render Cloud'
                                            ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                            : [],
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: const [
                                          Icon(Icons.cloud_done_rounded, size: 16, color: Color(0xFF14B8A6)),
                                          SizedBox(width: 6),
                                          Text('Render Cloud', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () {
                                      setState(() => _selectedServer = 'Local');
                                      ApiConfig.useLocalEmulator();
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      decoration: BoxDecoration(
                                        color: _selectedServer == 'Local' ? Colors.white : Colors.transparent,
                                        borderRadius: BorderRadius.circular(8),
                                        boxShadow: _selectedServer == 'Local'
                                            ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                            : [],
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: const [
                                          Icon(Icons.developer_board_rounded, size: 16, color: Color(0xFFF97316)),
                                          SizedBox(width: 6),
                                          Text('Local Dev', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),

                          // 3-Part Practical Error Banner if login failed
                          if (authVm.errorMessage != null) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.red.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.redAccent.withValues(alpha: 0.4)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    '1. Échec de Connexion (Serveur Render)',
                                    style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '2. Pourquoi : ${authVm.errorMessage}',
                                    style: const TextStyle(color: Color(0xFF475569), fontSize: 11),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    '3. Action : Si Render sort de veille (cold start), réessayez dans 15s.',
                                    style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w600, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // Username / Email input (with inline validation)
                          TextFormField(
                            controller: _usernameController,
                            keyboardType: TextInputType.emailAddress,
                            decoration: const InputDecoration(
                              labelText: 'Identifiant / Email *',
                              prefixIcon: Icon(Icons.person_outline_rounded),
                              hintText: 'sales1 ou commercial@onbora.cg',
                            ),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'L\'identifiant est obligatoire';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Password input (with toggle obscure & dynamic requirements)
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            onChanged: (_) => setState(() {}),
                            decoration: InputDecoration(
                              labelText: 'Mot de passe *',
                              prefixIcon: const Icon(Icons.lock_outline_rounded),
                              suffixIcon: IconButton(
                                icon: Icon(_obscurePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded),
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
                          Row(
                            children: [
                              _buildRequirementChip('6+ car.', hasMinLength),
                              const SizedBox(width: 6),
                              _buildRequirementChip('Lettres', hasLetters),
                              const SizedBox(width: 6),
                              _buildRequirementChip('Chiffres', hasDigits),
                            ],
                          ),
                          const SizedBox(height: 24),

                          // Submit Button with Progress State
                          ElevatedButton(
                            onPressed: authVm.isLoading ? null : _handleLogin,
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              backgroundColor: const Color(0xFFF97316),
                            ),
                            child: authVm.isLoading
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
                                        'Connexion à Render Cloud...',
                                        style: TextStyle(fontSize: 14, color: Colors.white),
                                      ),
                                    ],
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: const [
                                      Text('Se Connecter', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                      SizedBox(width: 8),
                                      Icon(Icons.arrow_forward_rounded, size: 20),
                                    ],
                                  ),
                          ),
                          const SizedBox(height: 16),

                          // Demo Info Footer
                          Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.blue.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Text(
                                'Compte démo Render : sales1 / sales1pass',
                                style: TextStyle(fontSize: 11, color: Colors.blue, fontWeight: FontWeight.w500),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRequirementChip(String label, bool isSatisfied) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isSatisfied ? Colors.green.withValues(alpha: 0.12) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isSatisfied ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
            size: 12,
            color: isSatisfied ? Colors.green : Colors.grey,
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: isSatisfied ? FontWeight.bold : FontWeight.normal,
              color: isSatisfied ? Colors.green : Colors.grey,
            ),
          ),
        ],
      ),
    );
  }
}
