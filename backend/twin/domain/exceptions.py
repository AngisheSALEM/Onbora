from typing import Any
from shared.domain.exceptions import EntityNotFoundException


class TwinNotFoundException(EntityNotFoundException):
    def __init__(self, identifier: Any):
        super().__init__("BusinessTwin", identifier)
