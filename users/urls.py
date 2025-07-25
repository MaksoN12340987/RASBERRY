from django.urls import path
from .apps import UsersConfig
from .views import UsersCreate, Login, Logout

app_name = UsersConfig.name

urlpatterns = [
    path("", UsersCreate.as_view(), name="create"),
    path("login/", Login.as_view(), name="login"),
    path("logout/", Logout.as_view(), name="logout"),
]
