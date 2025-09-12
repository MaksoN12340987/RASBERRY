from django.urls import path

from .apps import UsersConfig
from .views import Login, Logout, UpdateProfile, UsersCreate, UsersList

app_name = UsersConfig.name

urlpatterns = [
    path("", UsersCreate.as_view(), name="create"),
    path("login/", Login.as_view(), name="login"),
    path("logout/", Logout.as_view(), name="logout"),
    path("list/", UsersList.as_view(), name="list"),
    path("profile/<int:pk>/", UpdateProfile.as_view(), name="profile"),
]
