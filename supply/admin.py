from django.contrib import admin  # type: ignore

from .models import SupplySwitch
from users.models import BaseUser


@admin.register(SupplySwitch)
class SwitchAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "adres_board",
        "adres_registr",
        "connected",
        "image",
        "location",
    )
    list_filter = (
        "adres_board",
        "connected",
        "location",
    )
    search_fields = ("name",)


@admin.register(BaseUser)
class UsersAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "last_login",
        "is_superuser",
        "username",
        "first_name",
        "last_name",
        "is_staff",
        "is_active",
        "date_joined",
        "groups",
        "user_permissions",
        "preview",
        "email",
        "phone_number",
    )
    list_filter = (
        "id",
        "last_login",
        "is_superuser",
        "groups",
    )
    search_fields = ("username",)