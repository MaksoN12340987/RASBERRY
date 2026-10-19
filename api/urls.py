from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token

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
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
    
    path("users/", UsersAPI.as_view(), name="JSON_users"),
    path("user/<int:pk>/", User.as_view(), name="JSON_user"),
    path("user/<int:pk>/update/", UpdateUsersAPI.as_view(), name="JSON_users"),
    path("user/<int:pk>/delete/", DeleteUsersAPI.as_view(), name="JSON_users"),
    path("user/create/", CreateUsersAPI.as_view(), name="JSON_users"),
]
