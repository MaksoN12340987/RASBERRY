from django.contrib import admin  # type: ignore

from .models import SupplySwitch


@admin.register(SupplySwitch)
class SwitchAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "adres_board",
        "adres_registr",
    )
    list_filter = (
        "adres_board",
    )
    search_fields = ("name",)

