from enum import Enum


class UserRole(str, Enum):
    CLIENT_B2B = 'CLIENT_B2B'
    SALESPERSON = 'SALESPERSON'
    KAM = 'KAM'
    ADMIN = 'ADMIN'

    @classmethod
    def choices(cls):
        return [
            (cls.CLIENT_B2B.value, 'Client B2B'),
            (cls.SALESPERSON.value, 'Prospecteur / Commercial'),
            (cls.KAM.value, 'Key Account Manager'),
            (cls.ADMIN.value, 'Administrateur MSP'),
        ]
