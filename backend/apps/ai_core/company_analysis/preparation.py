"""Turn known activity into discovery questions, never into asserted client needs."""
import unicodedata


def commercial_preparation(context, public_facts):
    from ..rag_service import get_catalog_rag

    activity_facts = [fact for fact in context['facts'] if fact['id'] == 'registry:activity']
    activity_facts += [fact for fact in public_facts if fact.get('field') in (
        'activities', 'description', 'projects_partnerships', 'products_services')]
    activity = ' '.join(fact.get('text', fact.get('statement', '')) for fact in activity_facts)
    normalized = ''.join(c for c in unicodedata.normalize('NFKD', activity.casefold())
                         if not unicodedata.combining(c))
    topics = []
    if any(word in normalized for word in ('export', 'transport', 'logistique', 'agricol')):
        topics.append(('internet connexion réseau', 'Internet fixe et réseaux',
            'Comment échangez-vous les commandes et les documents avec vos sites et partenaires ?',
            'Si ces échanges dépendent d’un accès permanent, qualifier la continuité de connexion.'))
    if any(word in normalized for word in ('projet', 'solidarite', 'developpement', 'conseil', 'education')):
        topics.append(('Microsoft 365 collaboration documents', 'Cloud et collaboration',
            'Comment les équipes partagent-elles et sauvegardent-elles les documents de leurs projets ?',
            'Si le partage de documents pose difficulté, examiner les outils collaboratifs et leur sauvegarde.'))
    if any(word in normalized for word in ('banqu', 'financ', 'paiement', 'sante', 'hopital', 'pharmaceut')):
        topics.append(('diagnostic cybersécurité protection données', 'Cybersécurité',
            'Comment protégez-vous les données et les accès aux applications métier ?',
            'Si des accès sensibles sont à sécuriser, examiner les protections et les engagements requis.'))
    questions = [topic[2] for topic in topics]
    for question in ('Quels sites et quels outils sont indispensables à votre activité au quotidien ?',
                     'Quelles difficultés souhaitez-vous résoudre en priorité ?',
                     'Quels services utilisez-vous déjà, et à quelles échéances souhaitez-vous les revoir ?'):
        if len(questions) < 3:
            questions.append(question)
    options, seen = [], set()
    for query, category, question, condition in topics[:2]:
        matches = [offer for offer in get_catalog_rag().search(query, limit=20)
                   if offer['category'] == category]
        if not matches or matches[0]['service_id'] in seen:
            continue
        offer = matches[0]
        seen.add(offer['service_id'])
        options.append({'id': offer['service_id'], 'name': offer['name'], 'category': offer['category'],
            'description': condition, 'sla': '', 'requires_confirmation': True,
            'qualification_question': question,
            'basis': activity, 'fact_ids': [fact['id'] for fact in activity_facts]})
    return {'questions': questions[:3], 'solution_options': options}
