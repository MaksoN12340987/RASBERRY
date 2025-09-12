from django.contrib import admin

from .models import HomeUser


@admin.register(HomeUser)
class UsersAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "email",
        "username",
        "password",
        "is_staff",
        "is_active",
        "is_superuser",
        "last_login",
        "first_name",
        "last_name",
        "phone_number",
        "date_joined",
        "comment",
        "photo",
    )
    list_filter = (
        "username",
        "is_active",
        "is_superuser",
    )
    search_fields = ("first_name", "last_name")
