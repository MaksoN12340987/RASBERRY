from django.contrib import admin

from users.models import BaseUser


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