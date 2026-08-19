from shared.domain.exceptions import DomainException


class ReportingException(DomainException):
    def __init__(self, message: str):
        super().__init__(message, code="REPORTING_ERROR")
