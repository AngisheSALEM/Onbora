import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:get/get.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'app/common/binding/common_binding.dart';
import 'app/common/constants/app_constants.dart';
import 'app/core/services/notification_service.dart';
import 'app/core/storage/session_storage.dart';
import 'app/core/theme/app_theme.dart';
import 'app/routes/app_pages.dart';
import 'app/routes/app_routes.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  await initializeDateFormatting('fr_FR', null);

  final notifService = Get.put(NotificationService(), permanent: true);
  await notifService.init();

  // Détermination instantanée de la route initiale sans flash de l'écran de connexion
  final token = await SessionStorage.getToken();
  final role = await SessionStorage.getUserRole();
  String initialRoute = Routes.LOGIN;
  if (token != null && token.isNotEmpty) {
    initialRoute = (role?.toUpperCase() == 'KAM')
        ? Routes.KAM_NAVIGATION
        : Routes.MAIN_NAVIGATION;
  }
  
  runApp(OnboraSalesApp(initialRoute: initialRoute));
}

class OnboraSalesApp extends StatelessWidget {
  final String initialRoute;
  const OnboraSalesApp({super.key, this.initialRoute = Routes.LOGIN});

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      initialBinding: CommonBinding(),
      initialRoute: initialRoute,
      getPages: AppPages.routes,
    );
  }
}
