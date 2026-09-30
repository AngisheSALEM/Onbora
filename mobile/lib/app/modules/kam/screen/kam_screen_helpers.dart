import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../controller/kam_workspace_controller.dart';

KamWorkspaceController workspace() => Get.isRegistered<KamWorkspaceController>()
    ? Get.find<KamWorkspaceController>()
    : Get.put(KamWorkspaceController());
int accountId(KamData a) => int.parse('${a['account_id']}');
String dateLabel(dynamic value) {
  final date = DateTime.tryParse('$value');
  return date == null
      ? 'Date non renseignée'
      : DateFormat('dd MMM yyyy · HH:mm', 'fr_FR').format(date.toLocal());
}

Widget spacedField(Widget field) =>
    Padding(padding: const EdgeInsets.only(bottom: 22), child: field);
Widget neutralRow(String title, String subtitle, VoidCallback onTap) => Builder(
  builder: (context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 10),
              Text(subtitle, style: const TextStyle(fontSize: 14, height: 1.6)),
            ],
          ),
        ),
      ),
    ),
  ),
);
