import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_provider.dart';
import 'ui/features/auth/view_models/auth_view_model.dart';
import 'ui/features/auth/views/login_view.dart';
import 'ui/features/sales/view_models/sales_view_model.dart';
import 'ui/features/sales/view_models/dictaphone_view_model.dart';
import 'ui/features/catalog/view_models/catalog_view_model.dart';
import 'ui/main_navigation_view.dart';
import 'ui/shared/skeleton_loader.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    ChangeNotifierProvider(
      create: (_) => ThemeProvider(),
      child: const OnboraSalesApp(),
    ),
  );
}

class OnboraSalesApp extends StatelessWidget {
  const OnboraSalesApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();

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
        darkTheme: AppTheme.darkTheme,
        themeMode: themeProvider.themeMode,
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

    if (authVm.isBootstrapping) {
      return const AppBootstrapSkeleton();
    }

    if (authVm.isAuthenticated) {
      return const MainNavigationView();
    }

    return const LoginView();
  }
}

/// High-End Skeleton Loader for App Bootstrap
class AppBootstrapSkeleton extends StatelessWidget {
  const AppBootstrapSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const SkeletonBox(width: 160, height: 20, borderRadius: 6),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 16),
            child: SkeletonBox(width: 32, height: 32, borderRadius: 16),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SkeletonBox(height: 160, borderRadius: 20),
            const SizedBox(height: 24),
            const SkeletonBox(width: 140, height: 18, borderRadius: 6),
            const SizedBox(height: 12),
            const SkeletonBox(height: 90, borderRadius: 18),
            const SizedBox(height: 24),
            Row(
              children: const [
                Expanded(child: SkeletonBox(height: 80, borderRadius: 16)),
                SizedBox(width: 10),
                Expanded(child: SkeletonBox(height: 80, borderRadius: 16)),
                SizedBox(width: 10),
                Expanded(child: SkeletonBox(height: 80, borderRadius: 16)),
              ],
            ),
            const SizedBox(height: 24),
            const SkeletonBox(width: 180, height: 18, borderRadius: 6),
            const SizedBox(height: 12),
            const Expanded(child: SkeletonCard()),
          ],
        ),
      ),
    );
  }
}
