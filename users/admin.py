from django.contrib import admin

from .models import BaseUser


@admin.register(BaseUser)
class UsersAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "is_superuser",
        "username",
        "password",
        "first_name",
        "last_name",
        "is_staff",
        "is_active",
        "preview",
        "email",
        "phone_number",
        "id",
        "date_joined",
        "last_login",
    )
    list_filter = (
        "username",
        "is_superuser",
    )
    search_fields = ("username",)
