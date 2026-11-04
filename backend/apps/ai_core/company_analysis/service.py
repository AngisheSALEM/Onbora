"""Compatibility facade; all remote calls run in the persistent research worker."""
from .adapter import build_company_brief


class CompanyAnalysisClient:
    def __init__(self, base_url=None, timeout=3.5):
        self.base_url, self.timeout = base_url, timeout

    def get_analysis_for_enterprise(self, company_name, sector=None, rccm=None, province=None,
                                    dossier_number=None, site_count=1, research_result=None):
        return build_company_brief(company_name, sector, rccm, province, dossier_number,
                                   research_result)
