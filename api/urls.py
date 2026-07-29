from django.urls import path
from rest_framework.routers import DefaultRouter

from .apps import ApiConfig
from .views import (
    SwitchAPI,
    OnOffSwitchAPI
)

app_name = ApiConfig.name

urlpatterns = [
    path("", SwitchAPI.as_view(), name="list_switches"),
    path("", OnOffSwitchAPI.as_view(), name="on_off_switches")
]
