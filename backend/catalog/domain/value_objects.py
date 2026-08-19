from enum import Enum


class ServiceCategory(str, Enum):
    CONNECTIVITY = 'CONNECTIVITY'
    CLOUD = 'CLOUD'
    SECURITY = 'SECURITY'
    COLLABORATIVE = 'COLLABORATIVE'
    PAYMENT = 'PAYMENT'

    @classmethod
    def choices(cls):
        return [
            (cls.CONNECTIVITY.value, 'Connectivité'),
            (cls.CLOUD.value, 'Cloud'),
            (cls.SECURITY.value, 'Cybersécurité'),
            (cls.COLLABORATIVE.value, 'Collaboration / Outils collaboratifs'),
            (cls.PAYMENT.value, 'Moyens de Paiement / FinTech'),
        ]
