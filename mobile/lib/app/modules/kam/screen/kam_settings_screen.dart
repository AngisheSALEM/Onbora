import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../common/controller/theme_controller.dart';
import '../../auth/controller/auth_controller.dart';
import 'kam_workspace_screen.dart';
import 'widget/kam_workspace_widgets.dart';
import '../data/kam_repository.dart';

class KamSettingsScreen extends StatefulWidget {
  const KamSettingsScreen({super.key});
  @override
  State<KamSettingsScreen> createState() => _KamSettingsScreenState();
}

class _KamSettingsScreenState extends State<KamSettingsScreen> {
  final repo = kamRepository();
  final photo = TextEditingController();
  String activity = 'AVAILABLE';
  bool loaded = false;
  bool busy = false;
  String? error;
  @override
  void dispose() {
    photo.dispose();
    super.dispose();
  }

  Future<void> save() async {
    if (busy) return;
    final uri = Uri.tryParse(photo.text.trim());
    if (photo.text.isNotEmpty &&
        (uri == null || !['http', 'https'].contains(uri.scheme))) {
      setState(
        () => error = 'Utilisez une adresse de photo commençant par https://.',
      );
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await repo.api.patch(
        '/api/accounts/me/',
        body: {
          'avatar': photo.text.trim(),
          'profile_picture_url': photo.text.trim(),
          'activity_status': activity,
          'is_available': activity == 'AVAILABLE',
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Paramètres enregistrés.')),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => error = 'Les paramètres n’ont pas été enregistrés. Réessayez.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Paramètres')),
    body: KamAsyncView(
      load: () => repo.api.get('/api/accounts/me/'),
      builder: (raw) {
        final user = KamRepository.record(raw);
        if (!loaded) {
          photo.text = (user['profile_picture_url'] ?? user['avatar'] ?? '')
              .toString();
          activity = user['activity_status']?.toString() ?? 'AVAILABLE';
          if (!statuses.containsKey(activity)) activity = 'AVAILABLE';
          loaded = true;
        }
        return ListView(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 140),
          children: [
            Text(
              '${user['first_name'] ?? user['username'] ?? ''} ${user['last_name'] ?? ''}',
              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w600),
            ),
            Text(
              user['email']?.toString() ?? '',
              style: const TextStyle(fontSize: 16, height: 1.618),
            ),
            const SizedBox(height: 32),
            TextField(
              controller: photo,
              decoration: const InputDecoration(
                labelText: 'Adresse de la photo de profil',
              ),
            ),
            const SizedBox(height: 24),
            DropdownButtonFormField<String>(
              initialValue: activity,
              decoration: const InputDecoration(labelText: 'Disponibilité'),
              items: [
                for (final e in statuses.entries)
                  DropdownMenuItem(value: e.key, child: Text(e.value)),
              ],
              onChanged: busy ? null : (v) => setState(() => activity = v!),
            ),
            if (error != null) Text(error!),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: busy ? null : save,
              child: Text(busy ? 'Enregistrement…' : 'Enregistrer'),
            ),
            const SizedBox(height: 32),
            if (Get.isRegistered<ThemeController>())
              Obx(() {
                final theme = Get.find<ThemeController>();
                return DropdownButtonFormField<ThemeMode>(
                  key: ValueKey(theme.themeMode),
                  initialValue: theme.themeMode,
                  decoration: const InputDecoration(labelText: 'Apparence'),
                  items: const [
                    DropdownMenuItem(
                      value: ThemeMode.system,
                      child: Text('Système'),
                    ),
                    DropdownMenuItem(
                      value: ThemeMode.light,
                      child: Text('Clair'),
                    ),
                    DropdownMenuItem(
                      value: ThemeMode.dark,
                      child: Text('Sombre'),
                    ),
                  ],
                  onChanged: (v) {
                    if (v != null) theme.setThemeMode(v);
                  },
                );
              }),
            const SizedBox(height: 32),
            TextButton.icon(
              onPressed: () async {
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Se déconnecter ?'),
                    content: const Text(
                      'Vous quitterez votre session de travail.',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context, false),
                        child: const Text('Annuler'),
                      ),
                      FilledButton(
                        onPressed: () => Navigator.pop(context, true),
                        child: const Text('Se déconnecter'),
                      ),
                    ],
                  ),
                );
                if (confirmed == true && Get.isRegistered<AuthController>()) {
                  Get.find<AuthController>().logout();
                }
              },
              icon: const Icon(Icons.logout),
              label: const Text('Se déconnecter'),
            ),
          ],
        );
      },
    ),
  );
  static const statuses = {
    'AVAILABLE': 'Disponible',
    'CLIENT_MEETING': 'En clientèle / RDV',
    'IN_MEETING': 'En réunion',
    'UNAVAILABLE': 'Indisponible',
  };
}
