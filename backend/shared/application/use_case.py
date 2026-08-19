from abc import ABC, abstractmethod
from typing import Any, Generic, TypeVar

TRequest = TypeVar('TRequest')
TResponse = TypeVar('TResponse')


class BaseUseCase(ABC, Generic[TRequest, TResponse]):
    """
    Base contract for all application use cases.
    Encapsulates specific business workflows and transactional boundaries.
    """
    @abstractmethod
    def execute(self, request: TRequest) -> TResponse:
        """Execute the use case with the given input request/command/query."""
        raise NotImplementedError
