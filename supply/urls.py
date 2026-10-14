from django.urls import path

from supply.apps import SupplyConfig

from .views import (
    SwitchesButtonsView,
    CreateButtonSwitch,
    ButtonDelete,
    SwitchOnOff,
    ButtonUpdate,
    RaedactButtonsView,
    MobileView,
    MobileOnOff
)

app_name = SupplyConfig.name

urlpatterns = [

    path("", SwitchesButtonsView.as_view(), name="home"),
    path("turn_on/<int:pk>/", SwitchOnOff.as_view(), name="turn_on_off"),
    path("create/", CreateButtonSwitch.as_view(), name="create"),
    path("redact/", RaedactButtonsView.as_view(), name="redact"),
    path("update/<int:pk>/", ButtonUpdate.as_view(), name="update"),
    path("delite/<int:pk>/", ButtonDelete.as_view(), name="delite"),

    # Mobile
    path("mobile/", MobileView.as_view(), name="mobile"),
    path("mob_on/<int:pk>/", MobileOnOff.as_view(), name="mob_on_off"),
]
