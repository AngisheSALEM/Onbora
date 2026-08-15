import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'ui/features/auth/view_models/auth_view_model.dart';
import 'ui/features/auth/views/login_view.dart';
import 'ui/features/sales/view_models/sales_view_model.dart';
import 'ui/features/sales/view_models/dictaphone_view_model.dart';
import 'ui/features/catalog/view_models/catalog_view_model.dart';
import 'ui/main_navigation_view.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const OnboraSalesApp());
}

class OnboraSalesApp extends StatelessWidget {
  const OnboraSalesApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthViewModel()..checkAuthStatus()),
        ChangeNotifierProvider(create: (_) => SalesViewModel()),
        ChangeNotifierProvider(create: (_) => DictaphoneViewModel()),
        ChangeNotifierProvider(create: (_) => CatalogViewModel()),
      ],
      child: MaterialApp(
        title: 'Onbora Sales',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();

    if (authVm.isLoading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: Color(0xFFF97316)),
              SizedBox(height: 16),
              Text('Initialisation de l\'application Onbora...'),
            ],
          ),
        ),
      );
    }

    if (authVm.isAuthenticated) {
      return const MainNavigationView();
    }

    return const LoginView();
  }
}
