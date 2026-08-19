from shared.domain.exceptions import DomainException, EntityNotFoundException


class EnterpriseNotFoundException(EntityNotFoundException):
    def __init__(self, enterprise_id: int):
        super().__init__("Enterprise", enterprise_id)


class VisitPreparationNotFoundException(EntityNotFoundException):
    def __init__(self, prep_id: int):
        super().__init__("VisitPreparation", prep_id)


class VisitReportNotFoundException(EntityNotFoundException):
    def __init__(self, report_id: int):
        super().__init__("VisitReport", report_id)


class ScraperCredentialNotFoundException(EntityNotFoundException):
    def __init__(self, platform: str):
        super().__init__("ScraperCredential", platform)
