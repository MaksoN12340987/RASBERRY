from rest_framework import serializers

from supply.models import SupplySwitch
from users.models import HomeUser


class SupplySerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplySwitch
        fields = ['id', 'name', 'location', 'on_off', 'image', 'is_favorite']
        read_only_fields = ['id']

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeUser
        fields = ["username", "first_name", "last_name", "is_active", "groups"]
