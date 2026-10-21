"""
Views pour l'interface de comparaison sectorielle KAM ("Versus" style).
Respect strict de la règle des Vues Minces (< 90 lignes) et Clean Architecture.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from kam.services.enterprise_comparison_service import EnterpriseComparisonService


class KamSectorOverviewView(APIView):
    """
    Retourne la liste des secteurs d'activité avec leurs entreprises éligibles
    pour initialiser les sélecteurs du comparateur KAM.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sectors = EnterpriseComparisonService.get_sectors_overview()
        return Response({"sectors": sectors}, status=status.HTTP_200_OK)


class KamEnterpriseComparisonView(APIView):
    """
    Effectue et retourne la comparaison détaillée entre deux entreprises
    du même secteur ou entre une entreprise et le benchmark sectoriel.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ent_a_id = request.query_params.get("enterprise_a")
        ent_b_id = request.query_params.get("enterprise_b")

        if not ent_a_id:
            return Response(
                {"error": "Le paramètre 'enterprise_a' est obligatoire."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            a_id = int(ent_a_id)
        except ValueError:
            return Response(
                {"error": "L'identifiant enterprise_a doit être un entier valide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        b_id = None
        if ent_b_id and ent_b_id.strip():
            raw_b = ent_b_id.strip().lower()
            if raw_b in ("benchmark", "0", "moyenne"):
                b_id = "benchmark"
            else:
                try:
                    b_id = int(raw_b)
                except ValueError:
                    return Response(
                        {"error": "L'identifiant enterprise_b doit être un entier valide ou 'benchmark'."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        try:
            comparison_data = EnterpriseComparisonService.compare(
                enterprise_a_id=a_id, enterprise_b_id=b_id
            )
            return Response(comparison_data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response(
                {"error": f"Erreur lors de la comparaison: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
