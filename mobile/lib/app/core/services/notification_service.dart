import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:get/get.dart';
import '../../routes/app_routes.dart';
import '../../modules/sales/controller/sales_controller.dart';

class NotificationService extends GetxService {
  static NotificationService get to => Get.find<NotificationService>();

  final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();

  static const String channelId = 'onbora_territory_channel';
  static const String channelName = 'Affectations Territoriales & Plaque';
  static const String channelDescription = 'Alertes et notifications push pour les assignations de plaques, tracés KML et prospects prioritaires';

  final RxBool hasPermission = false.obs;

  Future<NotificationService> init() async {
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

  /// Demande explicite de l'autorisation d'accès aux notifications push
  Future<bool> requestNotificationPermission() async {
    try {
      // 1. Android 13+ & Standard Permission Handler
      final status = await Permission.notification.request();

      // 2. iOS specific request
      final iosPlugin = _notificationsPlugin.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>();
      if (iosPlugin != null) {
        await iosPlugin.requestPermissions(
          alert: true,
          badge: true,
          sound: true,
        );
      }

      hasPermission.value = status.isGranted;
      return status.isGranted;
    } catch (e) {
      debugPrint("Erreur demande permission notification: $e");
      return false;
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

  /// Gestion du clic utilisateur sur la notification native
  void _onNotificationTapped(NotificationResponse response) {
    final payloadStr = response.payload;
    if (payloadStr != null && payloadStr.isNotEmpty) {
      try {
        final Map<String, dynamic> data = jsonDecode(payloadStr);
        final plaqueCode = data['plaque_code'] ?? data['code'];
        if (plaqueCode != null && plaqueCode.toString().isNotEmpty) {
          if (Get.isRegistered<SalesController>()) {
            final salesCtrl = Get.find<SalesController>();
            salesCtrl.setFilterPlaque(plaqueCode.toString());
          }
          Get.toNamed(Routes.SALES_HOME);
        }
      } catch (e) {
        debugPrint("Erreur navigation notification: $e");
      }
    }
  }
}
