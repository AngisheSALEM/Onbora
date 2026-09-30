import 'package:flutter/material.dart';
import '../../constants/app_constants.dart';

const mobilePrimary = AppConstants.primaryBlue;

class MobilePage extends StatelessWidget {
  const MobilePage({
    super.key,
    required this.title,
    required this.children,
    this.subtitle,
    this.primaryLabel,
    this.onPrimary,
    this.busy = false,
    this.tabRoot = false,
    this.onRefresh,
  });
  final String title;
  final String? subtitle, primaryLabel;
  final List<Widget> children;
  final VoidCallback? onPrimary;
  final bool busy, tabRoot;
  final Future<void> Function()? onRefresh;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final textColor = Theme.of(context).colorScheme.onSurface;
    Widget content = ListView(
      key: PageStorageKey(title),
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.fromLTRB(
        24,
        24,
        24,
        tabRoot && primaryLabel == null ? 130 : 32,
      ),
      children: [
        Text(
          title,
          style: TextStyle(
            color: textColor,
            fontSize: 30,
            height: 1.15,
            fontWeight: FontWeight.w700,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 10),
          Text(
            subtitle!,
            style: TextStyle(
              fontSize: 15,
              height: 1.5,
              color: dark
                  ? AppConstants.textSecondaryDark
                  : AppConstants.textMuted,
            ),
          ),
        ],
        const SizedBox(height: 28),
        ...children,
      ],
    );
    if (onRefresh != null) {
      content = RefreshIndicator(onRefresh: onRefresh!, child: content);
    }
    content = Theme(
      data: Theme.of(context).copyWith(
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(foregroundColor: textColor),
        ),
      ),
      child: content,
    );
    return Scaffold(
      backgroundColor: dark
          ? AppConstants.backgroundDark
          : AppConstants.backgroundLight,
      appBar: tabRoot
          ? null
          : AppBar(
              backgroundColor: dark
                  ? AppConstants.backgroundDark
                  : AppConstants.backgroundLight,
              elevation: 0,
              scrolledUnderElevation: 0,
              automaticallyImplyLeading: false,
              leadingWidth: 92,
              leading: TextButton(
                onPressed: () => Navigator.of(context).maybePop(),
                style: TextButton.styleFrom(foregroundColor: textColor),
                child: const Text('Retour'),
              ),
            ),
      bottomNavigationBar: primaryLabel == null
          ? null
          : SafeArea(
              top: false,
              child: Padding(
                padding: EdgeInsets.fromLTRB(24, 12, 24, tabRoot ? 112 : 12),
                child: Center(
                  heightFactor: 1,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 712),
                    child: FilledButton(
                      onPressed: busy ? null : onPrimary,
                      style: FilledButton.styleFrom(
                        backgroundColor: mobilePrimary,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 52),
                      ),
                      child: Text(
                        busy ? 'Veuillez patienter…' : primaryLabel!,
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ),
              ),
            ),
      body: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: DefaultTextStyle.merge(
              style: TextStyle(color: textColor),
              child: content,
            ),
          ),
        ),
      ),
    );
  }
}

class ReadingSection extends StatelessWidget {
  const ReadingSection(this.title, this.content, {super.key});
  final String title, content;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 28),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        SelectableText(
          content.trim().isEmpty ? 'Non renseigné.' : content,
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontSize: 16,
            height: 1.65,
          ),
        ),
      ],
    ),
  );
}

String readableValue(dynamic value) {
  if (value == null) return '';
  if (value is List) {
    return value.map(readableValue).where((s) => s.isNotEmpty).join('\n\n');
  }
  if (value is Map) {
    return value.entries
        .map((e) => '${e.key} : ${readableValue(e.value)}')
        .join('\n');
  }
  return value.toString();
}
