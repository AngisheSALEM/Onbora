from enum import Enum


class SyncStatus(str, Enum):
    PENDING = 'PENDING'
    SYNCED = 'SYNCED'
    ERROR = 'ERROR'

    @classmethod
    def choices(cls):
        return [
            (cls.PENDING.value, 'En attente'),
            (cls.SYNCED.value, 'Synchronisé'),
            (cls.ERROR.value, 'Erreur de synchro'),
        ]


class PlatformChoice(str, Enum):
    LINKEDIN = 'LINKEDIN'
    TWITTER = 'TWITTER'
    TIKTOK = 'TIKTOK'
    FACEBOOK = 'FACEBOOK'

    @classmethod
    def choices(cls):
        return [
            (cls.LINKEDIN.value, 'LinkedIn'),
            (cls.TWITTER.value, 'Twitter / X'),
            (cls.TIKTOK.value, 'TikTok'),
            (cls.FACEBOOK.value, 'Facebook'),
        ]
