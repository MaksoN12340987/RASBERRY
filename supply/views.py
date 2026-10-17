import logging

from django.db.models.query import QuerySet
from django.urls import reverse, reverse_lazy
from django.views.generic import (
    CreateView,
    DeleteView,
    ListView,
    UpdateView,
)

from supply.i2c import SwitchI2C
from .printer import Print_VKP80
from supply.forms import CreateSwitchForm, UpdateForm
from supply.models import SupplySwitch
from supply.service import WeatherConditions

logger_views = logging.getLogger(__name__)
file_handler = logging.FileHandler(f"log/{__name__}.log", mode="a", encoding="UTF8")
file_formatter = logging.Formatter(
    "\n%(asctime)s %(levelname)s %(name)s \n%(funcName)s %(lineno)d: \n%(message)s",
    datefmt="%H:%M:%S %d-%m-%Y",
)
file_handler.setFormatter(file_formatter)
logger_views.addHandler(file_handler)
logger_views.setLevel(logging.INFO)


weather = WeatherConditions()
printer = Print_VKP80()


class SwitchesButtonsView(ListView):
    model = SupplySwitch
    template_name = "supply/home.html"
    context_object_name = "switches"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data()
        
        weather.get_weather()
        weather_data = weather.weather_now
        context["weather"] = weather_data
         
        # printer.print_weather(weather_data)
        printer.print_str(f"{context}")
        
        return context


class SwitchOnOff(ListView):
    model = SupplySwitch
    template_name = "supply/on_off.html"
    context_object_name = "switches"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data()
        weather.get_weather()
        context["weather"] = weather.weather_now
        
        logger_views.info(context)
        
        return context

    def get_queryset(self) -> QuerySet:
        switch = SupplySwitch.objects.get(pk=self.kwargs["pk"])
        logger_views.info(
            f"{switch.adres_board} type {type(switch.adres_board)}\n{switch.adres_registr} type {type(switch.adres_registr)}"
        )

        i2c = SwitchI2C(1, switch.name, switch.adres_board, switch.adres_registr)
        if switch.on_off:
            i2c.turn_off()
            logger_views.info("ON")
            switch.on_off = False
        else:
            i2c.turn_on()
            logger_views.info("OFF")
            switch.on_off = True
        
        switch.save()
        return super().get_queryset()

class CreateButtonSwitch(CreateView):
    model = SupplySwitch
    form_class = CreateSwitchForm
    template_name = "supply/create.html"
    success_url = reverse_lazy("supply:home")

class ButtonUpdate(UpdateView):
    model = SupplySwitch
    form_class = UpdateForm
    template_name = "supply/update.html"
    context_object_name = "switch"

    def get_success_url(self):
        return reverse("supply:home")

class ButtonDelete(DeleteView):
    model = SupplySwitch
    template_name = "supply/delite.html"
    context_object_name = "switch"
    success_url = reverse_lazy("supply:home")

class RaedactButtonsView(ListView):
    model = SupplySwitch
    template_name = "supply/redacters.html"
    context_object_name = "switches"

class MobileView(ListView):
    model = SupplySwitch
    template_name = "supply/mobile/mobile.html"
    context_object_name = "switches"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data()
        weather.get_weather()
        context["weather"] = weather.weather_now
        
        logger_views.info(context)
        
        return context

class MobileOnOff(ListView):
    model = SupplySwitch
    template_name = "supply/mobile/on_off_mobile.html"
    context_object_name = "switches"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data()
        weather.get_weather()
        context["weather"] = weather.weather_now
        
        logger_views.info(context)
        
        return context

    def get_queryset(self) -> QuerySet:
        switch = SupplySwitch.objects.get(pk=self.kwargs["pk"])
        logger_views.info(
            f"{switch.adres_board} type {type(switch.adres_board)}\n{switch.adres_registr} type {type(switch.adres_registr)}"
        )

        i2c = SwitchI2C(1, switch.name, switch.adres_board, switch.adres_registr)
        if switch.on_off:
            i2c.turn_off()
            logger_views.info("ON")
            switch.on_off = False
        else:
            i2c.turn_on()
            logger_views.info("OFF")
            switch.on_off = True
        
        switch.save()
        return super().get_queryset()
