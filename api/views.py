import logging

from rest_framework import generics

from supply.models import SupplySwitch
from .serializers import SupplySerializer

logger_views = logging.getLogger(__name__)
file_handler = logging.FileHandler(f"log/{__name__}.log", mode="a", encoding="UTF8")
file_formatter = logging.Formatter(
    "\n%(asctime)s %(levelname)s %(name)s \n%(funcName)s %(lineno)d: \n%(message)s",
    datefmt="%H:%M:%S %d-%m-%Y",
)
file_handler.setFormatter(file_formatter)
logger_views.addHandler(file_handler)
logger_views.setLevel(logging.INFO)


class SwitchAPI(generics.ListAPIView):
    serializer_class = SupplySerializer
    queryset = SupplySwitch.objects.all()

class OnOffSwitchAPI(generics.UpdateAPIView):
    serializer_class = SupplySerializer
