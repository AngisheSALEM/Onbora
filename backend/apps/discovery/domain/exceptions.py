from shared.domain.exceptions import DomainException, EntityNotFoundException


class ConversationNotFoundException(EntityNotFoundException):
    def __init__(self, conversation_id: int):
        super().__init__("ClientConversation", conversation_id)


class EmptyMessageException(DomainException):
    def __init__(self, message: str = "Le contenu du message ne peut pas être vide."):
        super().__init__(message, code="EMPTY_MESSAGE")
