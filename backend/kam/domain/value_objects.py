from enum import Enum


class DossierSource(str, Enum):
    INBOUND_CONVERSATION = 'INBOUND_CONVERSATION'
    OUTBOUND_VISIT = 'OUTBOUND_VISIT'

    @classmethod
    def choices(cls):
        return [
            (cls.INBOUND_CONVERSATION.value, 'Conversation en ligne'),
            (cls.OUTBOUND_VISIT.value, 'Visite commerciale terrain'),
        ]


class DossierStatus(str, Enum):
    DRAFT = 'DRAFT'
    QUALIFYING = 'QUALIFYING'
    NEW = 'NEW'
    DISPATCHED = 'DISPATCHED'
    IN_REVIEW = 'IN_REVIEW'
    ESTIMATE_PREPARED = 'ESTIMATE_PREPARED'
    NEGOTIATION = 'NEGOTIATION'
    ACCEPTED = 'ACCEPTED'
    PROVISIONING = 'PROVISIONING'
    COMPLETED = 'COMPLETED'
    TRAINING = 'TRAINING'
    REJECTED = 'REJECTED'

    @classmethod
    def choices(cls):
        return [
            (cls.DRAFT.value, 'Brouillon'),
            (cls.QUALIFYING.value, 'conversation en cours'),
            (cls.NEW.value, 'Nouveau / Qualifié'),
            (cls.DISPATCHED.value, 'Affecté au KAM'),
            (cls.IN_REVIEW.value, 'En revue'),
            (cls.ESTIMATE_PREPARED.value, 'Proposition commerciale rédigée'),
            (cls.NEGOTIATION.value, 'En négociation'),
            (cls.ACCEPTED.value, 'Signé / Accepté'),
            (cls.PROVISIONING.value, 'Provisioning technique'),
            (cls.COMPLETED.value, 'Installé / Opérationnel'),
            (cls.TRAINING.value, 'En cours d\'adoption / Formation'),
            (cls.REJECTED.value, 'Rejeté / Perdu'),
        ]
