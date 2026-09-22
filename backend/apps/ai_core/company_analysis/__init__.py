"""Company Analysis Module in AI Core.
Interacts with the Onbora Analysis service on port 8001.
"""

from .service import CompanyAnalysisClient
from .models import CompanyBriefOutput

__all__ = ["CompanyAnalysisClient", "CompanyBriefOutput"]
