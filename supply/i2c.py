import logging

from smbus3 import SMBus  # type: ignore

logger_i2c = logging.getLogger(__name__)
file_handler = logging.FileHandler(f"log/{__name__}.log", mode="a", encoding="UTF8")
file_formatter = logging.Formatter(
    "\n%(asctime)s %(levelname)s %(name)s \n%(funcName)s %(lineno)d: \n%(message)s",
    datefmt="%H:%M:%S %d-%m-%Y",
)
file_handler.setFormatter(file_formatter)
logger_i2c.addHandler(file_handler)
logger_i2c.setLevel(logging.INFO)


MATRIX_ADRESS = {
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
            # Адреса плат "4x"-supervisor, "5x"-sirup, "6x"-milk
            "40": 64,
            "41": 65,
            "42": 66,
            "50": 80,
            "51": 81,
            "64": 100,
            "65": 101,
        }

ADRESSEES_0x64= {
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
        # Соответствия адресов двоичнае - шестнадцатиричные
        validation = self.__validation_input(
            [
                i2c,
                name,
                adress,
                registr,
            ]
        )
        logger_i2c.info(validation)

        # Записываем шестнадцатиричные адреса
        self.bus = validation["i2c"]
        self.name = validation["name"]
        self.adress = validation["adress"]
        self.registr = validation["registr"]
        super().__init__(self.bus, force)
        logger_i2c.info(f"INIT - {type(self.adress)}, {type(self.registr)}")

    def __validation_input(self, validation_list: list = []):
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
                    # Если пытаетесь использовать не 1ю шину i2c
                    result["i2c"] = value
                    logger_i2c.info(f"Не стандартный номер шины i2c {value}")
                    print(f"Не стандартный номер шины i2c {value}")
                else:
                    logger_i2c.info(value)
                    result["i2c"] = value
            
            elif i == 1:
                if 0 < len(f"{value}") < 101:
                    result["name"] = value
                else:
                    raise ValueError("Имя не должно быть пустым и не длиннее 100 символов")
            
            elif i == 2:
                if value > 255:
                    raise ValueError("Адрес не должен быть больше 255")
                else:
                    logger_i2c.info(value)
                    result["adress"] = MATRIX_ADRESS[f"{value}"]
            
            else:
                if value > 255:
                    raise ValueError("Адрес не должун быть больше 255")
                else:
                    logger_i2c.info(value)
                    try:
                        # Пробуем подставить шестнадцатиричный адрес
                        result["registr"] = MATRIX_ADRESS[f"{value}"]
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

        if self.adress in [100, 101]:
            # Включение устройств на платах с адресоь 6х
            dict_result = self.__device_maintenance_12_V(reg)
            self.registr = dict_result["address"]
            level = dict_result["level"]

        if reg:
            self.registr = MATRIX_ADRESS[f"{reg}"]
            logger_i2c.info(f"if reg = {self.registr}")

        for attempt in range(2):
            try:
                self.write_byte_data(self.address, self.register, level)
                logger_i2c.info("Успешная запись в I2C")
                return 1
            except OSError as e:
                logger_i2c.warning(f"Попытка {attempt + 1} не удалась: {e}")
            
        raise RuntimeError(f"Не удалось записать в I2C по адресу {self.address}")

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

        if self.adress in [100, 101]:
            # Включение устройств на платах с адресом 6х
            dict_result = self.__device_maintenance_12_V(reg)
            self.registr = dict_result["address"]

        if reg:
            self.registr = MATRIX_ADRESS[f"{reg}"]
            logger_i2c.info(f"if reg = {self.registr}")

        for attempt in range(2):
            try:
                self.write_byte_data(self.address, self.register, level)
                logger_i2c.info("Успешная запись в I2C")
                return 1
            except OSError as e:
                logger_i2c.warning(f"Попытка {attempt + 1} не удалась: {e}")
            
        raise RuntimeError(f"Не удалось записать в I2C по адресу {self.address}")

        try:
            self.write_byte_data(self.adress, self.registr, level)
            return 0

        except IOError:
            self.write_byte_data(self.adress, self.registr, level)
            return 0

        finally:
            logger_i2c.info("Хм, че-то получилось")

    def __device_maintenance_12_V(self, reg: int) -> dict:
        """Включение устройств на платах с адресоь 6х
        доп регистр для установки шестнадцатиричного
        адреса

        Args:
            reg (int): входной номер устройства

        Returns:
            dict: словарь с номером регистра и его значением
        """        
        result = {}

        try:
            if reg < 9:
                # ячейка памяти
                result["address"] = 16
                # значение, которое нужно записать
                result["level"] = ADRESSEES_0x64[reg]  # type: ignore
            else:
                # ячейка памяти
                result["address"] = 17
                # значение, которое нужно записать
                result["level"] = ADRESSEES_0x64[reg]  # type: ignore
        except IOError:
            result["address"] = 16
            result["level"] = 1

        return result
