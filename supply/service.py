import os
import logging
import requests
from escpos.printer import Serial
import serial
from PIL import Image, ImageDraw, ImageFont
from queue import Queue
from threading import Thread

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
# Очередь и воркер — на уровне модуля (создаются ОДИН раз)
# ─────────────────────────────────────────────────────
print_queue: "Queue[dict]" = Queue()


def printer_worker():
    """Фоновый поток: открывает порт один раз и печатает задания из очереди."""
    try:
        printer = Serial(
            devfile='/dev/ttyUSB0',
            baudrate=9600,
            bytesize=8,
            parity=serial.PARITY_ODD,
            stopbits=1,
            timeout=1.0,
            xonxoff=True,          # ← как в SETUP принтера
            encoding='cp866'
        )
        printer._raw(b'\x1b\x74\x11')   # ESC t 17 → CP866
    except Exception as e:
        logger.exception(f"Не удалось открыть порт: {e}")
        return

    while True:
        task = print_queue.get()
        if task is None:
            break
        try:
            data = task
            img = Image.new('RGB', (576, 200), 'white')
            d = ImageDraw.Draw(img)
            font = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36
            )
            d.text((10, 10), "Погода", font=font, fill='black')
            d.text((10, 50), f"Температура: {data.get('temp', 'N/A')}°C", font=font, fill='black')
            d.text((10, 90), f"Влажность: {data.get('humidity', 'N/A')}%", font=font, fill='black')
            d.text((10, 130), f"Давление: {data.get('pressure', 'N/A')} мм", font=font, fill='black')

            printer.image(img)
            printer.cut()
            printer.text("")

            logger.info("Печать успешна")
        except Exception as e:
            logger.exception(f"Ошибка печати: {e}")
        finally:
            print_queue.task_done()


# Запускаем воркер один раз при импорте модуля
Thread(target=printer_worker, daemon=True).start()


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
        # Кладём задание в очередь — печать пойдёт в фоне
        print_queue.put(self.weather_now)
        return self.weather_now
