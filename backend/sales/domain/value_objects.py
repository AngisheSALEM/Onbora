from enum import Enum
from dataclasses import dataclass
from shared.domain.entities import ValueObject


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


class PlaqueTerritory(str, Enum):
    KINSHASA_GOMBE = 'Kinshasa (Gombe)'
    KINSHASA_LIMETE = 'Kinshasa (Limete)'
    BRAZZAVILLE_CENTRE = 'Brazzaville (Centre/Plateau)'
    POINTE_NOIRE_CENTRE = 'Pointe-Noire (Centre)'
    LUBUMBASHI_CENTRE = 'Lubumbashi (Centre)'
    ABIDJAN_PLATEAU = 'Abidjan (Plateau)'
    DAKAR_CENTRE = 'Dakar (Plateau)'

    @classmethod
    def choices(cls):
        return [(p.value, p.value) for p in cls]


class ConversionReadiness(str, Enum):
    READY = 'READY'
    IN_PROGRESS = 'IN_PROGRESS'
    COLD = 'COLD'


@dataclass(frozen=True)
class GPSCoordinates(ValueObject):
    latitude: float
    longitude: float
