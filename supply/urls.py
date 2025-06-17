from django.urls import path

from supply.apps import SupplyConfig

from .views import SwitchesButtonsView, CreateButtonSwitch, SwitchButtonDelete

app_name = SupplyConfig.name

urlpatterns = [
    path("home/", SwitchesButtonsView.as_view(), name="home"),
    path("home/create/", CreateButtonSwitch.as_view(), name="contacts"),
    path("home/<int:pk>/delite/", SwitchButtonDelete.as_view(), name=f"{SupplyConfig.name}"),
]
