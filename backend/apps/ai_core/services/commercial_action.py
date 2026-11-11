"""Commercial action contract shared by Core AI and the KAM API."""


def build_commercial_action(*, company_name, commercial_angle="", signal_rationale="",
                            recommended_offer="", recommended_action=""):
    """Project recorded analysis into the three commercial decision fields.

    Missing evidence is left explicit; reading a recommendation never triggers
    inference, invents a confirmed need, or writes to the account.
    """
    def clean(value):
        return value.strip() if isinstance(value, str) else ""

    return {
        "company_name": clean(company_name) or "Entreprise",
        "interest_reason": clean(commercial_angle) or clean(signal_rationale)
        or "Intérêt commercial à qualifier.",
        "recommended_solution": clean(recommended_offer)
        or "Solution à définir après qualification des besoins.",
        "next_action": clean(recommended_action)
        or "Qualifier les besoins auprès de l’entreprise avant de proposer une solution.",
    }
