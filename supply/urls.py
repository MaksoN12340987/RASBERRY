from django.urls import path

from supply.apps import SupplyConfig

from .views import (
    SwitchesButtonsView,
    CreateButtonSwitch,
    ButtonDelete,
    SwitchON,
    SwitchOFF,
    ButtonUpdate,
)

app_name = SupplyConfig.name

urlpatterns = [
    path("home/", SwitchesButtonsView.as_view(), name="home"),
    path("home/turn_on/<int:pk>/", SwitchON.as_view(), name="turn_on"),
    path("home/turn_off/<int:pk>/", SwitchOFF.as_view(), name="turn_off"),
    path("home/create/", CreateButtonSwitch.as_view(), name="create"),
    path("home/update/<int:pk>/", ButtonUpdate.as_view(), name="update"),
    path("home/delite/<int:pk>/", ButtonDelete.as_view(), name="delite"),
]
