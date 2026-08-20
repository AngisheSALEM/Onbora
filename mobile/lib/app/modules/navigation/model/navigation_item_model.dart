import 'package:flutter/material.dart';

class NavigationItemModel {
  final int index;
  final String label;
  final IconData icon;

  const NavigationItemModel({
    required this.index,
    required this.label,
    required this.icon,
  });
}
