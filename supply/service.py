import os
import logging
import requests

logger = logging.getLogger(__name__)
file_handler = logging.FileHandler(f"log/{__name__}.log", mode="a", encoding="UTF8")
file_formatter = logging.Formatter(
    "\n%(asctime)s %(levelname)s %(name)s \n%(funcName)s %(lineno)d: \n%(message)s",
    datefmt="%H:%M:%S %d-%m-%Y",
)
file_handler.setFormatter(file_formatter)
logger.addHandler(file_handler)
logger.setLevel(logging.INFO)

# ─────────────────────────────────────────────────────
# Погода
# ─────────────────────────────────────────────────────
class WeatherConditions:
    lat = 55.420403
    lon = 37.498375
    appid = os.getenv("API_KEY_weather")
    units = 'metric'
    lang = 'ru'
    weather_now = {}

    def __str__(self):
        return f"lat {self.lat}, lon {self.lon}"

    def _request_weather(self):
        response = requests.get(
            f'https://api.openweathermap.org/data/2.5/weather'
            f'?lat={self.lat}&lon={self.lon}&appid={self.appid}'
            f'&units={self.units}&lang={self.lang}'
        )
        return response.json()

    def get_weather(self):   
        raw_data = self._request_weather()
        self.weather_now = {
            "temp": f"{raw_data['main']['temp']}",
            "icon": f"icon_weather/{raw_data['weather'][0]['icon']}.png",
            "status": raw_data['weather'][0]['description'],
            "pressure": raw_data['main']['grnd_level'],
            "humidity": raw_data['main']['humidity'],
            "clouds": f"{raw_data['clouds']['all']} %",
        }
        return self.weather_now