from rest_framework import serializers

from supply.models import SupplySwitch


class SupplySerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplySwitch
        fields = ['id', 'name', 'location', 'on_off', 'image', 'is_favorite']
        read_only_fields = ['id']
