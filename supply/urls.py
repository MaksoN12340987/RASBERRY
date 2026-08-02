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
    MobileView
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

    # Mobile
    path("mobile/", MobileView.as_view(), name="mobile"),
    path("mob_on/<int:pk>/", SwitchON.as_view(), name="mob_on"),
    path("mob_off/<int:pk>/", SwitchOFF.as_view(), name="mob_off"),

]
