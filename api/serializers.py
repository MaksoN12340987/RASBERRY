from rest_framework import serializers

from supply.models import SupplySwitch


class SupplySerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplySwitch
        fields = "__all__"
