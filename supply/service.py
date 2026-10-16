import os
import logging
import requests # type: ignore
from escpos.printer import Serial # type: ignore
import serial # type: ignore
from PIL import Image, ImageDraw, ImageFont

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
        # logger_weather_conditions.info(raw_data)
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
        
        print_weather = Printer()
        print_weather.generate_string(self.weather_now)

class Printer():
    devfile='/dev/ttyUSB0'
    baudrate=9600
    bytesize=8
    stopbits=1
    parity=serial.PARITY_ODD
    timeout=1.00
    xonxoff=False
    encoding='cp866'
    
    def __str__(self) -> str:
        return f"{self.devfile}, {self.baudrate} bot, byte-{self.bytesize}, stopbits={self.stopbits}, parity={self.parity}, {self.timeout} sec, encoding={self.encoding}"
    
    def generate_string(self, data={}):
        try:
            # Настройки порта (уточните в документации или через raspi-config)
            # VKP80 II поддерживает скорость до 115200[reference:4]
            printer = Serial(
                devfile=self.devfile, 
                baudrate=self.baudrate, 
                bytesize=self.bytesize, 
                parity=self.parity, 
                stopbits=self.stopbits, 
                timeout=self.timeout, 
                xonxoff=self.xonxoff,
                encoding=self.encoding
                )
            
            # Печать данных
            # printer.set(align='center', font='a', width=2, height=2, custom_size=True)
            # printer.text("Weather\n")
            # printer.set(align='center', font='a', width=1, height=1)
            # printer.text("----------------\n")
            
            # # Пример вывода данных
            # printer.set(align='left')
            # printer.text(f"Temp: {data.get('temp', 'N/A')}°C\n") # type: ignore
            # printer.text(f"Outdor: {data.get('status', 'N/A')}\n") # type: ignore
            # printer.text(f"Pressure: {data.get('pressure', 'N/A')} мм рт.ст.\n") # type: ignore
            # printer.text(f"Water: {data.get('humidity', 'N/A')}%\n") # type: ignore            
            
            # printer.text("\n\n")
            # printer.cut()  # Отрезка бумаги
            
            img = Image.new('RGB', (576, 200), 'white')
            d = ImageDraw.Draw(img)
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)

            d.text((14, 10), "Погода\n", font=font, fill='black')
            d.text((14, 90), f"Температура: {data.get('temp', 'N/A')}°C", font=font, fill='black')
            d.text((14, 170), f"Влажность: {data.get('humidity', 'N/A')}%", font=font, fill='black')
            d.text((14, 260), f"Давление: {data.get('temp', 'N/A')}мм", font=font, fill='black')

            printer.image(img)
            printer.cut()
            printer.text("\n\n")
            
            
            logger_weather_conditions.info("Печать успешна")
        except Exception as e:
            logger_weather_conditions.info(e)
