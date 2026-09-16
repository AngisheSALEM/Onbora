from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdmin
from .models import ScoreProfile, ScoreRule, AccountScoreResult, Enterprise
from .scoring_serializers import (
    ScoreProfileSerializer,
    ScoreRuleSerializer,
    AccountScoreResultSerializer
)
from .scoring_engine import (
    ScoringEngine,
    AccountMetricsExtractor,
    ensure_default_scoring_profiles
)
from shared.pagination import StandardResultsSetPagination


class ScoreProfileListCreateView(generics.ListCreateAPIView):
    """
    CBV pour lister et créer les profils de scoring MSP.
    Initialise automatiquement les profils par défaut si la base est vierge.
    """
    serializer_class = ScoreProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Garantit la présence des 2 profils standards (Santé et Upsell)
        if not ScoreProfile.objects.exists():
            ensure_default_scoring_profiles()
        return ScoreProfile.objects.all().prefetch_related('rules')


class ScoreProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Consultation, mise à jour et suppression d'un profil de score.
    """
    queryset = ScoreProfile.objects.all().prefetch_related('rules')
    serializer_class = ScoreProfileSerializer
    permission_classes = [IsAuthenticated]


class ScoreRuleListCreateView(generics.ListCreateAPIView):
    """
    Gestion des règles unitaires rattachées à un profil de score.
    """
    serializer_class = ScoreRuleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile_id = self.kwargs.get('profile_id')
        return ScoreRule.objects.filter(profile_id=profile_id).order_by('order', 'id')

    def perform_create(self, serializer):
        profile_id = self.kwargs.get('profile_id')
        profile = ScoreProfile.objects.get(pk=profile_id)
        serializer.save(profile=profile)


class ScoreRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Modification et suppression d'une règle de scoring spécifique.
    """
    queryset = ScoreRule.objects.all()
    serializer_class = ScoreRuleSerializer
    permission_classes = [IsAuthenticated]


class ScoringSimulatorView(APIView):
    """
    LABORATOIRE DE SIMULATION & TEST (Sans impact sur la production).
    Prend en entrée soit :
      1. Un compte réel (`enterprise_id`)
      2. Un jeu de métriques simulées (`simulated_metrics`)
    et retourne en temps réel le score calculé, la jauge, et le détail de chaque règle déclenchée.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile_id = request.data.get('profile_id')
        if not profile_id:
            # Fallback sur le premier profil actif
            profile = ScoreProfile.objects.filter(is_active=True).first()
            if not profile:
                ensure_default_scoring_profiles()
                profile = ScoreProfile.objects.first()
        else:
            try:
                profile = ScoreProfile.objects.prefetch_related('rules').get(pk=profile_id)
            except ScoreProfile.DoesNotExist:
                return Response({"detail": f"Profil de score {profile_id} introuvable."}, status=status.HTTP_404_NOT_FOUND)

        enterprise_id = request.data.get('enterprise_id')
        simulated_metrics = request.data.get('simulated_metrics', {})

        if enterprise_id:
            try:
                enterprise = Enterprise.objects.get(pk=enterprise_id)
                metrics = AccountMetricsExtractor.extract_from_enterprise(enterprise, window_days=profile.analysis_window_days)
                # Fusionner avec les métriques simulées si fournies (pour tester des 'what-if')
                if isinstance(simulated_metrics, dict):
                    metrics.update(simulated_metrics)
                source_label = f"Compte réel : {enterprise.name}"
            except Enterprise.DoesNotExist:
                return Response({"detail": f"Entreprise {enterprise_id} introuvable."}, status=status.HTTP_404_NOT_FOUND)
        else:
            metrics = simulated_metrics if isinstance(simulated_metrics, dict) else {}
            source_label = "Simulation Sandbox (Paramètres personnalisés)"

        calc_result = ScoringEngine.calculate(profile, metrics)
        calc_result['profile_id'] = profile.id
        calc_result['profile_name'] = profile.name
        calc_result['profile_type'] = profile.score_type
        calc_result['source_label'] = source_label

        return Response(calc_result, status=status.HTTP_200_OK)


class CalculateAccountsScoreView(APIView):
    """
    Exécute le calcul officiel du scoring sur les comptes ciblés
    et enregistre le résultat dans AccountScoreResult.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            profile_id = request.data.get('profile_id')
            limit = int(request.data.get('limit', 250))
            if profile_id:
                profiles = ScoreProfile.objects.filter(pk=profile_id, is_active=True).prefetch_related('rules')
            else:
                profiles = ScoreProfile.objects.filter(is_active=True).prefetch_related('rules')

            if not profiles.exists():
                ensure_default_scoring_profiles()
                profiles = ScoreProfile.objects.filter(is_active=True).prefetch_related('rules')

            enterprises = list(Enterprise.objects.all().order_by('-last_visited_at', '-created_at')[:limit])
            created_count = 0
            updated_count = 0
            scored_results = []

            for profile in profiles:
                for ent in enterprises:
                    try:
                        metrics = AccountMetricsExtractor.extract_from_enterprise(ent, window_days=profile.analysis_window_days)
                        res = ScoringEngine.calculate(profile, metrics)

                        obj, created = AccountScoreResult.objects.update_or_create(
                            enterprise=ent,
                            profile=profile,
                            defaults={
                                'score': res['score'],
                                'status_label': res['status_label'],
                                'status_color': res['status_color'],
                                'triggered_rules': res['triggered_rules'],
                                'dimension_scores': res['dimension_scores'],
                                'metrics_snapshot': res['metrics_snapshot'],
                            }
                        )
                        if created:
                            created_count += 1
                        else:
                            updated_count += 1

                        if len(scored_results) < 50:
                            scored_results.append({
                                "enterprise_id": ent.id,
                                "enterprise_name": ent.name,
                                "profile_name": profile.name,
                                "score": res['score'],
                                "status_label": res['status_label'],
                                "status_color": res['status_color'],
                                "triggered_action": res['triggered_action'],
                                "triggered_rules_count": len(res['triggered_rules']),
                            })
                    except Exception:
                        continue

            return Response({
                "message": f"Alertes et scores mis à jour avec succès pour {len(enterprises)} comptes.",
                "profiles_evaluated": [p.name for p in profiles],
                "total_evaluations": created_count + updated_count,
                "results_sample": scored_results[:20]
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Erreur lors de la mise à jour des alertes: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class ScoredAccountsListView(generics.ListAPIView):
    """
    CBV paginée pour consulter les comptes scorés et leurs résultats.
    """
    serializer_class = AccountScoreResultSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AccountScoreResult.objects.select_related('enterprise', 'profile').all()
        profile_id = self.request.query_params.get('profile_id')
        if profile_id:
            qs = qs.filter(profile_id=profile_id)
        score_type = self.request.query_params.get('type')
        if score_type:
            qs = qs.filter(profile__score_type=score_type)
        return qs.order_by('-calculated_at', '-score')
