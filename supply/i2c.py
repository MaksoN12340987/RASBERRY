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
        self.matrix_addresses = {
            # 2-pin register
            "20": 32,
            "21": 33,
            "22": 34,
            "23": 35,
            "24": 36,
            "25": 37,
            "26": 38,
            # 4-pin register
            "30": 48,
            "31": 49,
            "32": 50,
            "33": 51,
            "34": 51,
        }
        logger_i2c.info(f"INIT - {type(self.adress)}, {type(self.registr)}, 100")

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
                    result["adress"] = value
            else:
                if value > 255:
                    raise ValueError("Адрес не должун быть больше 255")
                else:
                    logger_i2c.info(value)
                    result["registr"] = value

        return result

    def __str__(self):
        return f"Name {self.name}, i2c-{self.bus}: \n{self.read_byte_data(self.adress, self.registr)}"

    def turn_on(self, reg: int = 0):
        """Включи устройство

        Args:
            reg (int, optional): регистр памяти в диапозоне:
            [20 ... 26]
            [30 ... 34]
            Defaults to 0.

        Returns:
            _int_: значение указанного регистра памяти
        """
        if reg:
            self.registr = self.matrix_addresses[f"{reg}"]
        logger_i2c.info(f"{self.adress}, {self.registr}, 100")
        
        self.open(self.bus)
        self.write_byte_data(self.adress, self.registr, 100)
        self.close()
        
        return self.read_byte_data(self.adress, self.registr)

    def turn_off(self, reg: int = 0):
        """Выключи устройство

        Args:
            reg (int, optional): регистр памяти в диапозоне:
            [20 ... 26]
            [30 ... 34]
            Defaults to 0.

        Returns:
            _int_: значение указанного регистра памяти
        """
        if reg:
            self.registr = self.matrix_addresses[f"{reg}"]
        logger_i2c.info(f"{self.adress}, {self.registr}, 0")
        
        self.open(self.bus)
        self.write_byte_data(self.adress, self.registr, 0)
        self.close()
        
        return self.read_byte_data(self.adress, self.registr)


# i2c = SwitchI2C(1, "super_1", 0x40, 0x22)

# reg = int(input("set reg: "))
# print(i2c.turn_on(reg))

# reg = int(input("set reg: "))
# print(i2c.turn_off(reg))
