from shared.domain.exceptions import DomainException, EntityNotFoundException


class DossierNotFoundException(EntityNotFoundException):
    def __init__(self, dossier_id: int):
        super().__init__("ProspectDossier", dossier_id)


class DispatchFailedException(DomainException):
    def __init__(self, message: str = "Impossible d'affecter le dossier à un conseiller KAM."):
        super().__init__(message, code="DISPATCH_FAILED")
