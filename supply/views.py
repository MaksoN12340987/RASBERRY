import logging

from django.urls import reverse_lazy
from django.views.generic import CreateView, DeleteView, ListView

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


class CreateButtonSwitch(CreateView):
    model = SupplySwitch
    fields = ["name", "adres_board", "adres_registr"]
    template_name = "supply/"
    success_url = reverse_lazy("catalog:users")


class SwitchButtonDelete(DeleteView):
    model = SupplySwitch
    template_name = "supply/"
    success_url = reverse_lazy("catalog:orders")
