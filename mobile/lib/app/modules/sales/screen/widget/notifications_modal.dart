import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:maplibre_gl/maplibre_gl.dart';
import '../../controller/sales_controller.dart';
import '../../../../common/constants/app_constants.dart';
import '../../../../common/screen/widget/scale_tap.dart';

class NotificationsModal {
  static void show(
    BuildContext context, {
    required bool isDark,
    MapLibreMapController? mapController,
  }) {
    final salesController = Get.find<SalesController>();
    salesController.isNotificationsOpen.value = true;
    salesController.fetchNotifications();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.72,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.25),
                blurRadius: 20,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Column(
            children: [
              // Drag Handle
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.black12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Icon(
                            CupertinoIcons.bell_fill,
                            color: isDark ? Colors.white : AppConstants.textDark,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              AppConstants.notificationsTitle,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppConstants.title2Style(isDark).copyWith(fontSize: 16),
                            ),
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => salesController.markAllNotificationsAsRead(),
                      child: Text(
                        'Tout marquer lu',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: isDark ? Colors.white : AppConstants.textDark,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Divider(
                height: 1,
                color: isDark ? const Color(0x1FFFFFFF) : const Color(0x0F000000),
              ),

              // Notifications List
              Expanded(
                child: Obx(() {
                  if (salesController.isLoadingNotifications.value) {
                    return Center(
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          isDark ? Colors.white : AppConstants.primaryBlue,
                        ),
                      ),
                    );
                  }

                  final notifs = salesController.notifications;
                  if (notifs.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(CupertinoIcons.bell_slash, size: 40, color: isDark ? Colors.white30 : Colors.grey.shade400),
                          const SizedBox(height: 12),
                          Text(
                            'Aucune notification pour le moment',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: isDark ? Colors.white60 : Colors.black54,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Les assignations de plaques et alertes apparaîtront ici.',
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? Colors.white38 : Colors.black38,
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: notifs.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, idx) {
                      final item = notifs[idx];
                      return ScaleTap(
                        onTap: () {
                          salesController.markNotificationAsRead(item.id);
                          if (item.plaqueCode.isNotEmpty) {
                            salesController.setFilterPlaque(item.plaqueCode);
                            if (mapController != null) {
                              final center = item.payload['center'];
                              if (center != null && center['lon'] != null && center['lat'] != null) {
                                mapController.animateCamera(
                                  CameraUpdate.newLatLng(
                                    LatLng((center['lat'] as num).toDouble(), (center['lon'] as num).toDouble()),
                                  ),
                                );
                              }
                            }
                            Navigator.pop(ctx);
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF18181B) : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isDark
                                  ? (item.isRead ? const Color(0x22FFFFFF) : const Color(0x44FFFFFF))
                                  : (item.isRead ? AppConstants.borderLight : const Color(0xFFCBD5E1)),
                              width: 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.05),
                                blurRadius: 10,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: isDark ? const Color(0xFF27272A) : const Color(0xFFF1F5F9),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(
                                            color: isDark ? const Color(0x33FFFFFF) : const Color(0x1A000000),
                                            width: 0.8,
                                          ),
                                        ),
                                        child: Text(
                                          item.plaqueCode.isNotEmpty ? item.plaqueCode : 'ONBORA',
                                          style: TextStyle(
                                            color: isDark ? Colors.white : AppConstants.textDark,
                                            fontSize: 10,
                                            fontWeight: FontWeight.w900,
                                          ),
                                        ),
                                      ),
                                      if (!item.isRead) ...[
                                        const SizedBox(width: 8),
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: const BoxDecoration(
                                            color: Color(0xFFEF4444),
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  if (item.createdAt != null)
                                    Text(
                                      '${item.createdAt!.hour.toString().padLeft(2, '0')}:${item.createdAt!.minute.toString().padLeft(2, '0')}',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: isDark ? Colors.white38 : Colors.black38,
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                item.title,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                item.message,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? Colors.white70 : Colors.black87,
                                  height: 1.4,
                                ),
                              ),
                              if (item.payload.containsKey('kml_url')) ...[
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Icon(CupertinoIcons.doc_text, size: 12, color: isDark ? Colors.white60 : Colors.black54),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Fichier KML & Tracé synchronisés sur votre carte',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                        color: isDark ? Colors.white60 : Colors.black54,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  );
                }),
              ),
            ],
          ),
        );
      },
    ).whenComplete(() {
      salesController.isNotificationsOpen.value = false;
    });
  }
}
