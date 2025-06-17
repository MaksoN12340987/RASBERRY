import logging

from django.db.models.query import QuerySet
from django.urls import reverse, reverse_lazy
from django.views.generic import CreateView, DeleteView, ListView, UpdateView

from supply.i2c import SwitchI2C
from supply.models import SupplySwitch

logger_views = logging.getLogger(__name__)
file_handler = logging.FileHandler(f"log/{__name__}.log", mode="a", encoding="UTF8")
file_formatter = logging.Formatter(
    "\n%(asctime)s %(levelname)s %(name)s \n%(funcName)s %(lineno)d: \n%(message)s",
    datefmt="%H:%M:%S %d-%m-%Y",
)
file_handler.setFormatter(file_formatter)
logger_views.addHandler(file_handler)
logger_views.setLevel(logging.INFO)


class SwitchesButtonsView(ListView):
    model = SupplySwitch
    template_name = "supply/home.html"
    context_object_name = "switches"
    
    
class SwitchON(ListView):
    model = SupplySwitch
    template_name = "supply/home.html"
    context_object_name = "switches"
    
    def get_queryset(self) -> QuerySet:
        switch = SupplySwitch.objects.get(pk=self.kwargs['pk'])
        
        i2c = SwitchI2C(1, "super_1", switch.adres_board, switch.adres_registr)
        i2c.turn_on()
        
        return super().get_queryset()
    
    def get_success_url(self):
        return reverse('supply:home')
    
    
class SwitchOFF(ListView):
    model = SupplySwitch
    template_name = "supply/home.html"
    context_object_name = "switches"
    
    def get_queryset(self) -> QuerySet:
        switch = SupplySwitch.objects.get(pk=self.kwargs['pk'])
        
        i2c = SwitchI2C(1, "super_1", switch.adres_board, switch.adres_registr)
        i2c.turn_off()
        
        return super().get_queryset()
    
    # i2c = SwitchI2C(1, "super_1", 0x40, 0x22)

    # reg = int(input("set reg: "))
    # i2c.turn_off(reg)
    
    def get_success_url(self):
        return reverse('supply:home')


class CreateButtonSwitch(CreateView):
    model = SupplySwitch
    fields = ["name", "adres_board", "adres_registr"]
    template_name = "supply/"
    success_url = reverse_lazy("supply:home")


class PostsUpdate(UpdateView):
    model = SupplySwitch
    template_name = "supply/update.html"
    context_object_name = "switch"
    fields = ["name", "adres_board", "adres_registr"]
    
    def get_success_url(self):
        return reverse('supply:home')


class SwitchButtonDelete(DeleteView):
    model = SupplySwitch
    template_name = "supply/delite.html"
    context_object_name = "switch"
    success_url = reverse_lazy("supply:home")
