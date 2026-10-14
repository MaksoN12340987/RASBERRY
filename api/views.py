import logging

from supply.i2c import SwitchI2C

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

class OnOffAPI(generics.UpdateAPIView):
    serializer_class = SupplySerializer
    queryset = SupplySwitch.objects.all()
    
    def update(self, request, *args, **kwargs):
        switch = self.get_object()
        data =  request.data
        logger_views.info(f"{data} type {type(switch.adres_board)}\n{switch.adres_registr} type {type(switch.adres_registr)}")

        i2c = SwitchI2C(1, switch.name, switch.adres_board, switch.adres_registr)
        if data["on_off"]:
            i2c.turn_on()
            logger_views.info("ON")
        else:
            i2c.turn_off()
            logger_views.info("OFF")

        return super().update(request, *args, **kwargs)


class CreateSwitchAPI(generics.CreateAPIView):
    serializer_class = SupplySerializer
