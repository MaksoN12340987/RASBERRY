from django.urls import path
from rest_framework.routers import DefaultRouter

from .apps import ApiConfig
from .views import (
    AddFavorite,
    CreateSwitchAPI,
    SwitchAPI,
    OnOffAPI,
    FavoriteViewSet
)

app_name = ApiConfig.name

urlpatterns = [
    path("", SwitchAPI.as_view(), name="JSON_switches"),
    path("on_off/<int:pk>/", OnOffAPI.as_view(), name="JSON_on"),
    path("<int:pk>/create/", CreateSwitchAPI.as_view(), name="create"),
    path("favorites/", FavoriteViewSet.as_view(), name="JSON_favorites"),
    path("Add_favorites/<int:pk>/", AddFavorite.as_view(), name="Add_favorites"),
    
    # Users
    # path("", SwitchAPI.as_view(), name="JSON_switches"),
    # path("on_off/<int:pk>/", OnOffAPI.as_view(), name="JSON_on"),
    # path("<int:pk>/create/", CreateSwitchAPI.as_view(), name="create"),
    # path("favorites/", FavoriteViewSet.as_view(), name="JSON_favorites"),
    # path("Add_favorites/<int:pk>/", AddFavorite.as_view(), name="Add_favorites"),
]
