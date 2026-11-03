from rest_framework import serializers


class CatalogSearchInput(serializers.Serializer):
    query = serializers.CharField(max_length=2000)
    limit = serializers.IntegerField(default=5, min_value=1, max_value=50)


class VectorSearchInput(serializers.Serializer):
    query = serializers.CharField(max_length=2000)
    n_results = serializers.IntegerField(default=5, min_value=1, max_value=50)
    doc_type = serializers.CharField(required=False, allow_null=True, max_length=80)


class SimilarEnterpriseInput(serializers.Serializer):
    enterprise_id = serializers.CharField(required=False, max_length=120)
    query_text = serializers.CharField(required=False, max_length=2000, default="", allow_blank=True)
    top_k = serializers.IntegerField(default=10, min_value=1, max_value=50)
    service_not_having = serializers.CharField(required=False, allow_null=True, max_length=255)

    def validate(self, attrs):
        if not attrs.get("enterprise_id") and not attrs.get("query_text"):
            raise serializers.ValidationError("Fournir enterprise_id ou query_text.")
        return attrs


class SessionAnalyzeInput(serializers.Serializer):
    session_id = serializers.CharField(max_length=120)
    client_name = serializers.CharField(max_length=255, default="Compte B2B")
    conversation = serializers.CharField(max_length=20000)


class SessionValidateInput(serializers.Serializer):
    session_id = serializers.CharField(max_length=120)
    decision = serializers.ChoiceField(choices=["approved", "rejected", "pending"])
    comment = serializers.CharField(max_length=4000, default="", allow_blank=True)


class DiscoveryInput(serializers.Serializer):
    query = serializers.CharField(max_length=500)
