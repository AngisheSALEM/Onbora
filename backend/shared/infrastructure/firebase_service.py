import os
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

_firebase_app = None

def get_firebase_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app
    
    try:
        import firebase_admin
        from firebase_admin import credentials
        
        cred_path = getattr(settings, 'FIREBASE_CREDENTIALS_PATH', None)
        if not cred_path or not os.path.exists(cred_path):
            logger.warning(f"Firebase credentials not found at: {cred_path}. Push notifications will run in mock mode.")
            return None
        
        cred = credentials.Certificate(cred_path)
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK successfully initialized.")
        return _firebase_app
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
        return None


def send_push_notification_to_token(token: str, title: str, body: str, data: dict = None) -> bool:
    """
    Envoie une notification push FCM à un token unique.
    """
    if not token or not token.strip():
        return False
    
    app = get_firebase_app()
    if not app:
        logger.info(f"[Mock Push FCM] To: {token[:15]}... | Title: {title} | Body: {body}")
        return True
    
    try:
        from firebase_admin import messaging
        import datetime
        
        clean_data = {}
        if data:
            for k, v in data.items():
                clean_data[str(k)] = str(v) if not isinstance(v, str) else v
        clean_data['title'] = str(title)
        clean_data['body'] = str(body)
        clean_data['click_action'] = 'FLUTTER_NOTIFICATION_CLICK'

        android_config = messaging.AndroidConfig(
            priority='high',
            ttl=datetime.timedelta(days=7),
            notification=messaging.AndroidNotification(
                title=title,
                body=body,
                channel_id='onbora_territory_channel',
                sound='default',
                priority='max',
                default_vibrate_timings=True,
                default_sound=True,
                visibility='public',
                click_action='FLUTTER_NOTIFICATION_CLICK',
            )
        )
        
        apns_config = messaging.APNSConfig(
            headers={'apns-priority': '10'},
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    alert=messaging.ApsAlert(
                        title=title,
                        body=body,
                    ),
                    sound='default',
                    badge=1,
                    content_available=True,
                )
            )
        )
        
        message = messaging.Message(
            token=token,
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=clean_data,
            android=android_config,
            apns=apns_config,
        )
        
        response = messaging.send(message)
        logger.info(f"Successfully sent FCM push notification {response} to token {token[:15]}...")
        return True
    except Exception as e:
        logger.error(f"Error sending FCM notification to token {token[:15]}...: {e}")
        return False


def send_push_notification_to_user(user, title: str, body: str, data: dict = None) -> int:
    """
    Envoie une notification push FCM à tous les appareils actifs d'un utilisateur.
    Retourne le nombre de notifications envoyées avec succès.
    """
    if not user:
        return 0
    
    tokens = set()
    if getattr(user, 'fcm_token', None) and user.fcm_token.strip():
        tokens.add(user.fcm_token.strip())
    
    if hasattr(user, 'devices'):
        for device in user.devices.filter(is_active=True):
            if device.fcm_token and device.fcm_token.strip():
                tokens.add(device.fcm_token.strip())
    
    if not tokens:
        logger.info(f"No FCM tokens found for user {user.username}. Skipping push notification.")
        return 0
    
    sent_count = 0
    for token in tokens:
        success = send_push_notification_to_token(token, title, body, data=data)
        if success:
            sent_count += 1
            
    return sent_count
