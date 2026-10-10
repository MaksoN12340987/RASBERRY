from django.urls import path
from rest_framework.routers import DefaultRouter

from .apps import ApiConfig
from .views import (
    CreateSwitchAPI,
    SwitchAPI,
    OnOffAPI
)

app_name = ApiConfig.name

urlpatterns = [
    path("", SwitchAPI.as_view(), name="JSON_switches"),
    path("on_off/<int:pk>/", OnOffAPI.as_view(), name="JSON_on"),
    # path("off/<int:pk>/", OffAPI.as_view(), name="JSON_off"),
    # path("turn_on/<int:pk>/", SwitchON.as_view(), name="turn_on"),
    path("<int:pk>/create/", CreateSwitchAPI.as_view(), name="create"),
    # path("redact/", RaedactButtonsView.as_view(), name="redact"),
    # path("update/<int:pk>/", ButtonUpdate.as_view(), name="update"),
    # path("delite/<int:pk>/", ButtonDelete.as_view(), name="delite"),
]
