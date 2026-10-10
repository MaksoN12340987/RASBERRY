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
    
    def patch(self, request, *args, **kwargs):
        data = self.get_object()
        logger_views.info(f"{data}")
    
        return super().patch(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        data = self.get_object()
        logger_views.info(f"{data}")        

        # i2c = SwitchI2C(1, data.name, data.adres_board, data.adres_registr)
        
        # if data.on_off:
        #     i2c.turn_on()
        # else:
        #     i2c.turn_off()
        
        
        return super().update(request, *args, **kwargs)
    
# class OffAPI(generics.UpdateAPIView):
#     serializer_class = SupplySerializer
#     queryset = SupplySwitch.objects.all()
    
#     def update(self, request, *args, **kwargs):
#         data = request.data

#         i2c = SwitchI2C(1, data.name, data.adres_board, data.adres_registr)
#         result = i2c.turn_on()
#         if result:
#             data.on_off = True
#         else:
#             data.on_off = False
        
#         logger_views.info(f"{data}")        
        
#         return super().update(request, *args, **kwargs)

class CreateSwitchAPI(generics.CreateAPIView):
    serializer_class = SupplySerializer
