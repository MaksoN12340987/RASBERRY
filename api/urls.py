from django.urls import path
from rest_framework.routers import DefaultRouter

from .apps import ApiConfig
from .views import (
    AddFavorite,
    CreateSwitchAPI,
    CreateUsersAPI,
    DeleteUsersAPI,
    SwitchAPI,
    OnOffAPI,
    FavoriteViewSet,
    UpdateUsersAPI,
    User,
    UsersAPI
)

app_name = ApiConfig.name

urlpatterns = [
    path("", SwitchAPI.as_view(), name="JSON_switches"),
    path("on_off/<int:pk>/", OnOffAPI.as_view(), name="JSON_on"),
    path("<int:pk>/create/", CreateSwitchAPI.as_view(), name="create"),
    path("favorites/", FavoriteViewSet.as_view(), name="JSON_favorites"),
    path("Add_favorites/<int:pk>/", AddFavorite.as_view(), name="Add_favorites"),
    
    # Users
    path("lessons/", UsersAPI.as_view(), name="JSON_users"),
    path("lesson/<int:pk>/", User.as_view(), name="JSON_user"),
    path("lesson/<int:pk>/update/", UpdateUsersAPI.as_view(), name="JSON_users"),
    path("lesson/<int:pk>/delete/", DeleteUsersAPI.as_view(), name="JSON_users"),
    path("lesson/", CreateUsersAPI.as_view(), name="JSON_users"),
]
