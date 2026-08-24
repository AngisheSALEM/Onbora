import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Configuration Firebase Default Options pour le projet onbora-3508c
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        return android;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyB2a052f340eca315e96ec8fb45e91e7da6f101',
    appId: '1:113938126731:web:b2a052f340eca315e96ec8',
    messagingSenderId: '113938126731',
    projectId: 'onbora-3508c',
    storageBucket: 'onbora-3508c.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyB2a052f340eca315e96ec8fb45e91e7da6f101',
    appId: '1:113938126731:android:b2a052f340eca315e96ec8',
    messagingSenderId: '113938126731',
    projectId: 'onbora-3508c',
    storageBucket: 'onbora-3508c.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyB2a052f340eca315e96ec8fb45e91e7da6f101',
    appId: '1:113938126731:ios:b2a052f340eca315e96ec8',
    messagingSenderId: '113938126731',
    projectId: 'onbora-3508c',
    storageBucket: 'onbora-3508c.firebasestorage.app',
    iosBundleId: 'com.onbora.onbora_sales',
  );
}
