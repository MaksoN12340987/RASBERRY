import logging
from escpos.printer import Serial
import serial
from PIL import Image, ImageDraw, ImageFont

logger_printer = logging.getLogger(__name__)
file_handler = logging.FileHandler(f"log/{__name__}.log", mode="a", encoding="UTF8")
file_formatter = logging.Formatter(
    "\n%(asctime)s %(levelname)s %(name)s \n%(funcName)s %(lineno)d: \n%(message)s",
    datefmt="%H:%M:%S %d-%m-%Y",
)
file_handler.setFormatter(file_formatter)
logger_printer.addHandler(file_handler)
logger_printer.setLevel(logging.INFO)

class Print_VKP80():
    devfile='/dev/ttyUSB0'
    baudrate=9600
    bytesize=8
    stopbits=1
    parity=serial.PARITY_ODD
    timeout=1.00
    xonxoff=False
    encoding='cp866'
    
    def __str__(self) -> str:
        return f"""{self.devfile}, 
    {self.baudrate} bot, byte-{self.bytesize}, 
    stopbits={self.stopbits}, parity={self.parity}, 
    {self.timeout} sec, encoding={self.encoding}"""

    def printer_worker(self, data={}):
        """Фоновый поток: открывает порт один раз и печатает задания из очереди."""
        printer = Serial(
            ddevfile=self.devfile, 
            baudrate=self.baudrate, 
            bytesize=self.bytesize, 
            parity=self.parity, 
            stopbits=self.stopbits, 
            timeout=self.timeout, 
            xonxoff=self.xonxoff,
            encoding=self.encoding
        )
        
        logger_printer.info(f"""{self.devfile}, 
        {self.baudrate} bot, byte-{self.bytesize}, 
        stopbits={self.stopbits}, parity={self.parity}, 
        {self.timeout} sec, encoding={self.encoding}""")
        
        try:
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
            printer.text(" ")

            logger_printer.info("Печать успешна")
        except Exception as e:
            logger_printer.exception(f"Ошибка печати: {e}")
