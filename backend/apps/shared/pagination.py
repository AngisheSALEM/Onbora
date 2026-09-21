from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Pagination standard pour l'API REST Onbora (Option B : Vues CBV).
    Permet le couplage automatique et fluide avec les composants de pagination front-end.
    Retourne :
      - count : nombre total d'éléments
      - total_pages : nombre total de pages calculé côté serveur
      - current_page : numéro de la page active
      - page_size : taille de page courante (configurable via ?page_size=)
      - next : URL de la page suivante
      - previous : URL de la page précédente
      - results : liste des éléments sérialisés de la page
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data
        })
