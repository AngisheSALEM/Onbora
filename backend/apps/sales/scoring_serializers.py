from rest_framework import serializers
from .models import ScoreProfile, ScoreRule, AccountScoreResult, Enterprise


class ScoreRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoreRule
        fields = [
            'id', 'profile', 'name', 'dimension', 'field',
            'operator', 'value', 'points', 'valid_for_days',
            'is_active', 'order'
        ]
        read_only_fields = ['id']


class ScoreProfileSerializer(serializers.ModelSerializer):
    rules = ScoreRuleSerializer(many=True, read_only=True)
    rules_count = serializers.IntegerField(source='rules.count', read_only=True)

    class Meta:
        model = ScoreProfile
        fields = [
            'id', 'name', 'score_type', 'objective', 'population',
            'analysis_window_days', 'recalculation_frequency', 'base_score',
            'dimensions', 'thresholds', 'actions', 'is_active',
            'rules', 'rules_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AccountScoreResultSerializer(serializers.ModelSerializer):
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    enterprise_id = serializers.IntegerField(source='enterprise.id', read_only=True)
    profile_name = serializers.CharField(source='profile.name', read_only=True)
    profile_type = serializers.CharField(source='profile.score_type', read_only=True)

    class Meta:
        model = AccountScoreResult
        fields = [
            'id', 'enterprise_id', 'enterprise_name', 'profile',
            'profile_name', 'profile_type', 'score', 'status_label',
            'status_color', 'triggered_rules', 'dimension_scores',
            'metrics_snapshot', 'calculated_at'
        ]
        read_only_fields = ['id', 'calculated_at']
