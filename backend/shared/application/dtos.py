from dataclasses import dataclass
from typing import Any, Generic, Optional, TypeVar

T = TypeVar('T')


@dataclass
class Result(Generic[T]):
    """Standard operation result envelope."""
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    code: Optional[str] = None

    @classmethod
    def ok(cls, data: T = None) -> 'Result[T]':
        return cls(success=True, data=data)

    @classmethod
    def fail(cls, error: str, code: str = "ERROR", data: Optional[T] = None) -> 'Result[T]':
        return cls(success=False, error=error, code=code, data=data)


@dataclass
class BaseDTO:
    """Base marker for Data Transfer Objects."""
    pass
