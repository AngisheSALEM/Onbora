from shared.domain.exceptions import DomainException


class InvalidCredentialsException(DomainException):
    def __init__(self, message: str = "Identifiants incorrects. Vérifiez votre identifiant/email et mot de passe."):
        super().__init__(message, code="INVALID_CREDENTIALS")


class UserAlreadyExistsException(DomainException):
    def __init__(self, username: str):
        super().__init__(f"L'utilisateur '{username}' existe déjà.", code="USER_ALREADY_EXISTS")


class UserNotFoundException(DomainException):
    def __init__(self, identifier: str):
        super().__init__(f"Utilisateur introuvable ({identifier}).", code="USER_NOT_FOUND")
