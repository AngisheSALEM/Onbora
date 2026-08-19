from abc import ABC, abstractmethod
from typing import List, Optional
from shared.infrastructure.repositories import BaseRepository
from .entities import ClientConversationEntity, ConversationMessageEntity


class IConversationRepository(BaseRepository[ClientConversationEntity, int], ABC):
    @abstractmethod
    def list_by_client(self, client_id: int) -> List[ClientConversationEntity]:
        raise NotImplementedError

    @abstractmethod
    def add_message(self, conversation_id: int, sender: str, content: str) -> ConversationMessageEntity:
        raise NotImplementedError
