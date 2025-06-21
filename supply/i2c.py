import logging
import time

from smbus3 import SMBus

logger_i2c = logging.getLogger(__name__)
file_handler = logging.FileHandler(f"log/{__name__}.log", mode="a", encoding="UTF8")
file_formatter = logging.Formatter(
    "\n%(asctime)s %(levelname)s %(name)s \n%(funcName)s %(lineno)d: \n%(message)s",
    datefmt="%H:%M:%S %d-%m-%Y",
)
file_handler.setFormatter(file_formatter)
logger_i2c.addHandler(file_handler)
logger_i2c.setLevel(logging.INFO)


# sudo apt-get install smbus3


class SwitchI2C(SMBus):
    """Класс управляющий или отключающий устройства на
    аналоговой шине i2c

    Args:
        SMBus (Python библиотека smbus3): родительский класс
        библиотеки, позволяющей управлять устройствами по
        шине i2c
        i2c - номер шины
        name - название устройства
        adress - адресс устройства
        registr - регистр памяти по умолчанию

    Raises:
    Исключения метода __validation_input
        ValueError: имя длиннее 100 символов или пустое
        ValueError: адресс устройства задан не корректно
        ValueError: адресс регистра памяти задан не корректно

    Returns:
        _int_: значения регистра памяти
    """

    i2c: int
    name: str
    adress: int
    registr: int

    def __init__(
        self,
        i2c,
        name,
        adress,
        registr,
        force: bool = False,
    ):
        self.matrix_addresses = {
            # 2-pin register
            "21": 33,
            "22": 34,
            "23": 35,
            "24": 36,
            "25": 37,
            "26": 38,
            "27": 39,
            # 4-pin register
            "31": 49,
            "32": 50,
            "33": 51,
            "34": 52,
            # Adress
            "40": 64,
            "41": 65,
            "42": 66,
            "50": 80,
            "64": 100,
            "65": 101,
        }
        validation = self.__validation_input(
            [
                i2c,
                name,
                adress,
                registr,
            ]
        )
        logger_i2c.info(validation)

        self.bus = validation["i2c"]
        self.name = validation["name"]
        self.adress = validation["adress"]
        self.registr = validation["registr"]
        super().__init__(self.bus, force)
        logger_i2c.info(f"INIT - {type(self.adress)}, {type(self.registr)}")

    def __validation_input(self, validation_list: list = {}):
        """Приватный метод валидации данных, выполняет проверки
        переданных значений

        Args:
            validation_list (list, optional): список параметров
            в порядке:
            - номер шины
            - название устройства
            - адресс устройства
            - регистр памяти по умолчанию
            Defaults to {}.

        Raises:
            ValueError: имя длиннее 100 символов или пустое
            ValueError: адресс устройства задан не корректно
            ValueError: адресс регистра памяти задан не корректно

        Returns:
            _dict_: ключи - короткое наименование
                    значения переменных, прошедших
                    валидацию
        """
        result = {}
        for i, value in enumerate(validation_list):
            if i == 0:
                if value != 1:
                    result["i2c"] = value
                    logger_i2c.info(value)
                    print(f"Не стандартный номер шины i2c {value}")
                else:
                    logger_i2c.info(value)
                    result["i2c"] = value
            elif i == 1:
                if len(f"{value}") != 0 or len(f"{value}") < 101:
                    logger_i2c.info(value)
                    result["name"] = value
                else:
                    raise ValueError(
                        "Имя не должно быть пустыи и не длиннее 100 символов"
                    )
            elif i == 2:
                if value > 255:
                    raise ValueError("Адрес не должун быть больше 255")
                else:
                    logger_i2c.info(value)
                    result["adress"] = self.matrix_addresses[f"{value}"]
            else:
                if value > 255:
                    raise ValueError("Адрес не должун быть больше 255")
                else:
                    logger_i2c.info(value)
                    try:
                        result["registr"] = self.matrix_addresses[f"{value}"]
                    except KeyError:
                        print(f"Не нашли такой регистр, ставим {value}")
                        result["registr"] = value

        return result

    def __str__(self):
        return f"Name {self.name}, i2c-{self.bus}: \n{self.read_byte_data(self.adress, self.registr)}"

    def turn_on(self, reg: int = 0, level: int = 100):
        """Включи устройство

        Args:
            reg (int, optional): регистр памяти в диапозоне:
            [20 ... 26]
            [30 ... 34]
            Defaults to 0.

        Returns:
            _int_: значение указанного регистра памяти
        """
        logger_i2c.info(f"{self.adress}, {self.registr}, {level}")
        
        if self.address in [100, 101]:
            dict_result = self.__device_maintenance_12_V(reg)
            
            self.registr = dict_result["address"]
            level = dict_result["level"]
            
            logger_i2c.info(f"12_V = {self.registr}, {level}")

        if reg:
            self.registr = self.matrix_addresses[f"{reg}"]
            logger_i2c.info(f"if reg = {self.registr}")
        
        self.write_byte_data(self.adress, self.registr, level)

        return self.read_byte_data(self.adress, self.registr)

    def turn_off(self, reg: int = 0, level: int = 0):
        """Выключи устройство

        Args:
            reg (int, optional): регистр памяти в диапозоне:
            [20 ... 26]
            [30 ... 34]
            Defaults to 0.

        Returns:
            _int_: значение указанного регистра памяти
        """
        logger_i2c.info(f"{self.adress}, {self.registr}, {level}")
        
        if self.address in [100, 101]:
            dict_result = self.__device_maintenance_12_V(reg)
            
            self.registr = dict_result["address"]
            level = dict_result["level"]
            
            logger_i2c.info(f"12_V = {self.registr}, {level}")

        if reg:
            self.registr = self.matrix_addresses[f"{reg}"]
            logger_i2c.info(f"if reg = {self.registr}")
        
        self.write_byte_data(self.adress, self.registr, level)

        return self.read_byte_data(self.adress, self.registr)
    
    def __device_maintenance_12_V(self, reg: int):
        addresses = {
            "1": 1,
            "2": 2,
            "3": 4,
            "4": 8,
            "5": 16,
            "6": 32,
            "7": 64,
            "8": 128,
            "9": 1,
            "10": 2,
            "11": 4,
            "12": 8,
            "13": 16,
            "14": 32,
            "15": 64,
            "16": 128,
        }
        result = {}
        
        try:
            if reg < 9:
                result["address"] = 16
                result["level"] = addresses[reg]
            else:
                result["address"] = 17
                result["level"] = addresses[reg]
        except:
            result["address"] = 16
            result["level"] = 1
            
        return result
