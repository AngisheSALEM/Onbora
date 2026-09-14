from typing import Optional, Dict, Any


class DomainException(Exception):
    """Base exception for all domain logic failures."""
    def __init__(self, message: str, code: str = "DOMAIN_ERROR", details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


class EntityNotFoundException(DomainException):
    """Raised when an aggregate root or entity cannot be found."""
    def __init__(self, entity_name: str, identifier: Any):
        super().__init__(
            message=f"{entity_name} with identifier '{identifier}' not found.",
            code="ENTITY_NOT_FOUND",
            details={"entity": entity_name, "identifier": str(identifier)}
        )


class ValidationException(DomainException):
    """Raised when domain constraints or invariants are violated."""
    def __init__(self, message: str, errors: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            details=errors or {}
        )


class BusinessRuleViolationException(DomainException):
    """Raised when a business invariant is violated."""
    def __init__(self, message: str, rule_name: str = "GENERIC_RULE"):
        super().__init__(
            message=message,
            code="RULE_VIOLATION",
            details={"rule": rule_name}
        )
