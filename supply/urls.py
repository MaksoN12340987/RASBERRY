from django.urls import path

from supply.apps import SupplyConfig

from .views import (
    SwitchesButtonsView,
    CreateButtonSwitch,
    ButtonDelete,
    SwitchON,
    SwitchOFF,
    ButtonUpdate,
    RaedactButtonsView,
)

app_name = SupplyConfig.name

urlpatterns = [
    path("", SwitchesButtonsView.as_view(), name="home"),
    path("turn_on/<int:pk>/", SwitchON.as_view(), name="turn_on"),
    path("turn_off/<int:pk>/", SwitchOFF.as_view(), name="turn_off"),
    path("create/", CreateButtonSwitch.as_view(), name="create"),
    path("redact/", RaedactButtonsView.as_view(), name="redact"),
    path("update/<int:pk>/", ButtonUpdate.as_view(), name="update"),
    path("delite/<int:pk>/", ButtonDelete.as_view(), name="delite"),
]
