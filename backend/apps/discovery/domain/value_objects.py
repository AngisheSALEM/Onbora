from enum import Enum


class ConversationStatus(str, Enum):
    ACTIVE = 'ACTIVE'
    ARCHIVED = 'ARCHIVED'
    TRANSMITTED = 'TRANSMITTED'

    @classmethod
    def choices(cls):
        return [
            (cls.ACTIVE.value, 'Active'),
            (cls.ARCHIVED.value, 'Archivée'),
            (cls.TRANSMITTED.value, 'Transmise au KAM'),
        ]


class ConversationChannel(str, Enum):
    PORTAL = 'PORTAL'
    WIDGET = 'WIDGET'
    MAXIT = 'MAXIT'

    @classmethod
    def choices(cls):
        return [
            (cls.PORTAL.value, 'Portail MSP'),
            (cls.WIDGET.value, 'Widget Externe'),
            (cls.MAXIT.value, 'Mini-App Maxit'),
        ]


class MessageSender(str, Enum):
    USER = 'USER'
    AI = 'AI'

    @classmethod
    def choices(cls):
        return [
            (cls.USER.value, 'Utilisateur'),
            (cls.AI.value, 'Intelligence Artificielle'),
        ]
