import os
import logging
import requests # type: ignore
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
    
    code = ''
    temp = ''
    icon = ''
    status = ''
    # Давление
    pressure = ''
    # Влажность
    humidity = ''
    # Облачность
    clouds = ''
    
    # indicators = {
    #     "code": '',
    #     "temp": '',
    #     "icon": '',
    #     "description": '',
    #     # Давление
    #     "pressure": '',
    #     # Влажность
    #     "humidity": '',
    #     # Облачность
    #     "clouds": '',
    # }
    
    def __str__(self) -> str:
        return f"lat {self.lat}, lon {self.lon}"
    
    def _request_weather(self):
        response = requests.get(
            f'https://api.openweathermap.org/data/2.5/weather?lat={self.lat}&lon={self.lon}&appid={self.appid}&units={self.units}&lang={self.lang}'
        )
        data = response.json()
        
        logger_weather_conditions.info(f"{type(data)}")
        
        return data
    
    def get_weather(self):
        
        raw_data = self._request_weather()
        logger_weather_conditions.info(raw_data)
                
        self.code = raw_data["weather"][0]["id"] # type: ignore
        self.icon = raw_data["weather"][0]["icon"] # type: ignore
        self.status = raw_data["weather"][0]["description"] # type: ignore
        self.temp = raw_data["main"]["temp"] # type: ignore
        self.pressure = raw_data["main"]["grnd_level"] # type: ignore
        self.humidity = raw_data["main"]["humidity"] # type: ignore
        self.clouds = raw_data["clouds"]["all"] # type: ignore
