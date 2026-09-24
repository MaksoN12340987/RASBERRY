import os
import logging
import requests
from django.http import JsonResponse

logger_weather_conditions = logging.getLogger(__name__)
file_handler = logging.FileHandler(f"log/{__name__}.log", mode="a", encoding="UTF8")
file_formatter = logging.Formatter(
    "\n%(asctime)s %(levelname)s %(name)s \n%(funcName)s %(lineno)d: \n%(message)s",
    datefmt="%H:%M:%S %d-%m-%Y",
)
file_handler.setFormatter(file_formatter)
logger_weather_conditions.addHandler(file_handler)
logger_weather_conditions.setLevel(logging.INFO)


class WeatherConditions():
    lat = 55.420403
    lon = 37.498375
    appid = os.getenv("API_KEY_weather")
    units = 'metric'
    lang = 'ru'
    
    indicators = {
        "code": '',
        "temp": '',
        # Давление
        "pressure": '',
        # Влажность
        "humidity": '',
        # Облачность
        "clouds": '',
    }
    
    def __str__(self) -> str:
        return f"lat {self.lat}, lon {self.lon}"
    
    def _request_weather(self):
        response = requests.get(
            f'https://api.openweathermap.org/data/2.5/weather?lat={self.lat}&lon={self.lon}&appid={self.appid}&units={self.units}&lang={self.lang}'
        )
        data = response.json()
        
        logger_weather_conditions.info(f"{data}")
        
        return JsonResponse(data)
    
    def weather(self):
        
        raw_data = self._request_weather()
        for indicator in raw_data:
            if indicator == 'weather':
                self.indicators["id"] = indicator["id"] # type: ignore
            if indicator == '':
                self.indicators["temp"] = indicator["main"] # type: ignore
            if indicator == '':
                self.indicators["pressure"] = indicator["weather"] # type: ignore
            if indicator == '':
                self.indicators["humidity"] = indicator["weather"] # type: ignore
            if indicator == '':
                self.indicators["clouds  "] = indicator["weather"] # type: ignore
        
