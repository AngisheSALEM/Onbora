import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:get/get.dart';
import '../../routes/app_routes.dart';
import '../../modules/sales/controller/sales_controller.dart';
import '../api/api_client.dart';
import '../../../firebase_options.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    debugPrint("Handling Firebase Background Message: ${message.messageId}");
  } catch (e) {
    debugPrint("Background message handler init error: $e");
  }
}

class NotificationService extends GetxService {
  static NotificationService get to => Get.find<NotificationService>();

  final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();

  static const String channelId = 'onbora_territory_channel';
  static const String channelName = 'Affectations Territoriales & Plaque';
  static const String channelDescription = 'Alertes et notifications push Firebase pour les assignations de plaques, tracés KML et prospects prioritaires';

  final RxBool hasPermission = false.obs;
  final RxString fcmToken = ''.obs;

  Future<NotificationService> init() async {
    // 1. Initialisation de Firebase
    try {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    } catch (e) {
      debugPrint("Firebase initializeApp error (will fallback to local): $e");
    }

    // 2. Initialisation des Notifications Locales
    const AndroidInitializationSettings androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const DarwinInitializationSettings iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    const InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notificationsPlugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    await _createNotificationChannel();
    await checkPermissionStatus();

    // 3. Écoute des événements Firebase Cloud Messaging
    _setupFCMListeners();

    return this;
  }

  Future<void> _createNotificationChannel() async {
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      channelId,
      channelName,
      description: channelDescription,
      importance: Importance.max,
      playSound: true,
      enableVibration: true,
    );

    await _notificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  Future<bool> checkPermissionStatus() async {
    final status = await Permission.notification.status;
    hasPermission.value = status.isGranted;
    return status.isGranted;
  }

  /// Configuration des écouteurs Firebase FCM (Foreground, Background, Token Refresh)
  void _setupFCMListeners() {
    try {
      // Notification reçue pendant que l'application est au premier plan
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint("FCM Foreground Message: ${message.data}");
        final notification = message.notification;
        final data = message.data;

        final title = notification?.title ?? data['title'] ?? '🎯 Notification Onbora Territoire';
        final body = notification?.body ?? data['body'] ?? data['message'] ?? 'Mise à jour de votre portefeuille commercial.';

        showPushNotification(
          id: message.hashCode,
          title: title,
          body: body,
          payload: data,
        );

        // Si le contrôleur de ventes est actif, rafraîchir la liste
        if (Get.isRegistered<SalesController>()) {
          Get.find<SalesController>().fetchNotifications(showBannerOnNew: false);
        }
      });

      // Clic sur notification quand l'application est en arrière-plan
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint("FCM Message Clicked (Background): ${message.data}");
        _handleMessageNavigation(message.data);
      });

      // Notification ayant ouvert l'application depuis l'état fermé
      FirebaseMessaging.instance.getInitialMessage().then((RemoteMessage? message) {
        if (message != null) {
          debugPrint("FCM Initial Message (Terminated state): ${message.data}");
          _handleMessageNavigation(message.data);
        }
      });

      // Écoute du renouvellement du token FCM
      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
        debugPrint("FCM Token Refreshed: $newToken");
        fcmToken.value = newToken;
        syncFCMTokenWithBackend();
      });
    } catch (e) {
      debugPrint("Error setting up FCM listeners: $e");
    }
  }

  /// Demande explicite de l'autorisation d'accès aux notifications push
  Future<bool> requestNotificationPermission() async {
    try {
      // 1. Android 13+ & Standard Permission Handler
      final status = await Permission.notification.request();

      // 2. Firebase & iOS specific request
      final fcmSettings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      final isGranted = status.isGranted ||
          fcmSettings.authorizationStatus == AuthorizationStatus.authorized ||
          fcmSettings.authorizationStatus == AuthorizationStatus.provisional;

      hasPermission.value = isGranted;

      if (isGranted) {
        // Enregistrer le token FCM auprès du backend Django
        await syncFCMTokenWithBackend();
      }

      return isGranted;
    } catch (e) {
      debugPrint("Erreur demande permission notification: $e");
      return false;
    }
  }

  /// Récupère le jeton FCM et le synchronise avec le serveur Django
  Future<void> syncFCMTokenWithBackend() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) {
        fcmToken.value = token;
        debugPrint("🔥 Synchronisation Jeton FCM avec Onbora Backend: $token");

        if (Get.isRegistered<ApiClient>()) {
          final apiClient = Get.find<ApiClient>();
          await apiClient.post(
            '/api/accounts/fcm-token/',
            body: {
              'fcm_token': token,
              'device_type': defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android',
              'device_name': 'Commercial Mobile Device',
            },
          );
        }
      }
    } catch (e) {
      debugPrint("Impossible de synchroniser le token FCM avec le backend: $e");
    }
  }

  /// Émission d'une Notification Push Native au niveau de l'OS (Android Status Bar / iOS Notification Center)
  Future<void> showPushNotification({
    required int id,
    required String title,
    required String body,
    Map<String, dynamic>? payload,
  }) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDescription,
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
      playSound: true,
      enableVibration: true,
      icon: '@mipmap/ic_launcher',
    );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const NotificationDetails platformDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    final payloadString = payload != null ? jsonEncode(payload) : null;

    await _notificationsPlugin.show(
      id,
      title,
      body,
      platformDetails,
      payload: payloadString,
    );
  }

  /// Gestion du clic utilisateur sur la notification native locale
  void _onNotificationTapped(NotificationResponse response) {
    final payloadStr = response.payload;
    if (payloadStr != null && payloadStr.isNotEmpty) {
      try {
        final Map<String, dynamic> data = jsonDecode(payloadStr);
        _handleMessageNavigation(data);
      } catch (e) {
        debugPrint("Erreur parsing payload local: $e");
      }
    }
  }

  /// Routage intelligent vers la plaque ou l'écran approprié lors d'un clic sur la notification
  void _handleMessageNavigation(Map<String, dynamic> data) {
    final plaqueCode = data['plaque_code'] ?? data['code'];
    if (plaqueCode != null && plaqueCode.toString().isNotEmpty) {
      if (Get.isRegistered<SalesController>()) {
        final salesCtrl = Get.find<SalesController>();
        salesCtrl.setFilterPlaque(plaqueCode.toString());
      }
      Get.toNamed(Routes.SALES_HOME);
    }
  }
}
