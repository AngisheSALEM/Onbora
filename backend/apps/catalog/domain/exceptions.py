from shared.domain.exceptions import DomainException, EntityNotFoundException


class ServiceNotFoundException(EntityNotFoundException):
    def __init__(self, service_id: int):
        super().__init__("ServiceCatalog", service_id)


class InvalidCatalogFileException(DomainException):
    def __init__(self, message: str = "Format de fichier invalide pour le catalogue."):
        super().__init__(message, code="INVALID_CATALOG_FILE")
