import os
import logging
import requests # type: ignore
from django.http import JsonResponse
from escpos.printer import Serial # type: ignore
import sys
import json

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
    weather_now = {}
    
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
        temp = raw_data["main"]["temp"]
        icon = raw_data["weather"][0]["icon"]
        clouds = raw_data["clouds"]["all"]
        
        self.weather_now = {
            "temp": f"{temp}",
            "icon": f"icon_weather/{icon}.png",
            "status": raw_data["weather"][0]["description"],
            "pressure": raw_data["main"]["grnd_level"],
            "humidity": raw_data["main"]["humidity"],
            "clouds": f"{clouds} %"
        }

class Printer():

    # Данные приходят от Django в виде JSON
    data = json.loads(sys.argv[1])

    try:
        # Настройки порта (уточните в документации или через raspi-config)
        # VKP80 II поддерживает скорость до 115200[reference:4]
        printer = Serial(devfile='/dev/ttyUSB0', baudrate=9600, bytesize=8, parity='N', stopbits=1, timeout=1.00)
        
        # Печать данных
        printer.set(align='center', font='a', width=2, height=2, custom_size=True)
        printer.text("ПОГОДА\n")
        printer.set(align='center', font='a', width=1, height=1)
        printer.text("----------------\n")
        
        # Пример вывода данных
        printer.set(align='left')
        printer.text(f"Город: {data.get('city', 'N/A')}\n")
        printer.text(f"Температура: {data.get('temp', 'N/A')}°C\n")
        printer.text(f"Давление: {data.get('pressure', 'N/A')} мм рт.ст.\n")
        printer.text(f"Влажность: {data.get('humidity', 'N/A')}%\n")
        
        printer.text("\n\n")
        printer.cut()  # Отрезка бумаги
        
        print("Печать успешна")
    except Exception as e:
        print(f"Ошибка печати: {e}")
