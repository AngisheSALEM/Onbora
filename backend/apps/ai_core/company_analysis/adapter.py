"""Project supported facts through their evidence IDs; provider prose is never evidence."""
import re
from .models import (AISummary, CompanyBriefOutput, CompanyInfo, DiscoverySummary,
                     EvidenceItem, LeadQualification, SectorPrimary, SectorSegmentation,
                     SourceReference, SourcedStatement)


def supported_facts(result):
    if result.get("identity", {}).get("status") not in ("confirmed", "probable"):
        return []
    sources = {s["id"]: s for s in result.get("sources", [])}
    evidence = {e["id"]: e for e in result.get("evidence", [])}
    valid = {key for key, item in evidence.items()
             if item.get("excerpt") and sources.get(item.get("source_id"), {}).get("relationship")
             in ("confirmed_match", "probable_match")}
    disputed = {field["field"] for field in result.get("contradictions", [])}
    return [fact for fact in result.get("facts", [])
            if fact.get("support_status") in ("supported", "corroborated")
            and not re.fullmatch(r"(?:nos services|nos produits en un coup d['’]oeil|découvrez nos services|"
                                 r"siège principal|siège social|adresse siège\s*:|son adresse officielle\s*\.{0,3})[.!\s]*",
                                 fact.get('statement', '').strip(), re.I)
            and fact.get("field") not in disputed and fact.get("evidence_ids")
            and set(fact["evidence_ids"]).issubset(valid)]


def build_company_brief(name, sector=None, rccm=None, city=None, dossier=None, result=None):
    result = result if isinstance(result, dict) and "identity" in result else {}
    field_order = ['description', 'activities', 'projects_partnerships', 'products_services',
                   'locations', 'business_contacts', 'news', 'identifiers']
    facts = sorted(supported_facts(result), key=lambda fact: field_order.index(fact['field'])
                   if fact['field'] in field_order else len(field_order))
    sources = {s["id"]: s for s in result.get("sources", [])}
    used = {eid for fact in facts for eid in fact["evidence_ids"]}
    captures = [e for e in result.get("evidence", []) if e["id"] in used]
    refs, evidence = {}, []
    for index, capture in enumerate(captures, 1):
        source = sources[capture["source_id"]]
        refs[capture["id"]] = SourceReference(evidence_id=index, url=source["url"],
                                             title=source["title"], publisher=source["publisher"])
        evidence.append(EvidenceItem(evidence_id=index, url=source["url"], title=source["title"],
            publisher=source["publisher"], source_type=source["source_type"],
            relationship=source["relationship"], access_status=source["access_status"],
            verdict="Sourcée", reasons=source["relationship_reasons"],
            relevant_excerpt=capture["excerpt"], collected_at=capture["collected_at"]))
    statements = {f["id"]: SourcedStatement(text=f["statement"],
                  sources=[refs[eid] for eid in f["evidence_ids"]]) for f in facts}
    sentences = [s["text"] for s in result.get("summary", {}).get("sentences", [])
                 if s.get("fact_ids") and set(s["fact_ids"]).issubset(statements)]
    overview = " ".join(sentences) or " ".join(s.text for s in list(statements.values())[:3])
    overview = overview or f"{name} : aucune information publique étayée disponible à ce stade."
    gaps = list(result.get("missing_fields", []))
    limitations = [item["message"] for item in result.get("limitations", [])]
    if not result:
        limitations.append("Recherche publique non effectuée ; seules les données du compte sont disponibles.")
    return CompanyBriefOutput(
        state="completed" if result else "not_researched",
        coverage=result.get("outcome", "no_information"),
        identity_status=result.get("identity", {}).get("status", "not_found"),
        limitations=limitations,
        company=CompanyInfo(legal_name=name, rccm=rccm, dossier_number=dossier,
                            province=city, activity_arsp=sector),
        summary=DiscoverySummary(captured_count=len(evidence), analyzed_count=len(sources),
                                  ai_search_attempted=bool(result)),
        sector_segmentation=SectorSegmentation(status="declared", primary=SectorPrimary(
            label=sector or "Non renseigné", confidence="à confirmer",
            reason="Secteur enregistré dans Onbora ; ne constitue pas une preuve publique.")),
        lead_qualification=LeadQualification(status="requires_qualification", journeys=[]),
        ai_summary=AISummary(status="available" if facts else "unavailable", model="research-rules-v2",
            overview=SourcedStatement(text=overview, sources=list(refs.values())),
            key_facts=list(statements.values()),
            contradictions=[SourcedStatement(text=item["message"]) for item in result.get("contradictions", [])],
            gaps=gaps), evidence=evidence,
        sources=[{"url": s["url"], "title": s["title"], "category": s["source_type"],
                  "provider": s["discovered_by"], "query": "", "discovery_score": 0}
                 for s in sources.values()])
