from django.urls import path

from supply.apps import SupplyConfig

from .views import SwitchesButtonsView, CreateButtonSwitch, SwitchButtonDelete, SwitchON, SwitchOFF

app_name = SupplyConfig.name

urlpatterns = [
    path("home/", SwitchesButtonsView.as_view(), name="home"),
    path("home/turn_on/<int:pk>/", SwitchON.as_view(), name="turn_on"),
    path("home/turn_off/<int:pk>/", SwitchOFF.as_view(), name="turn_off"),
    path("home/create/", CreateButtonSwitch.as_view(), name="create"),
    path("home/<int:pk>/update/", CreateButtonSwitch.as_view(), name="update"),
    path("home/<int:pk>/delite/", SwitchButtonDelete.as_view(), name="delite"),
]
