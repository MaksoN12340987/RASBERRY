from smbus3 import SMBus
import time
import logging


logger_i2c = logging.getLogger(__name__)
file_handler = logging.FileHandler(f"log/{__name__}.log", mode="w", encoding="UTF8")
file_formatter = logging.Formatter(
    "\n%(asctime)s %(levelname)s %(name)s \n%(funcName)s %(lineno)d: \n%(message)s",
    datefmt="%H:%M:%S %d-%m-%Y",
)
file_handler.setFormatter(file_formatter)
logger_i2c.addHandler(file_handler)
logger_i2c.setLevel(logging.INFO)


# sudo apt-get install python-smbus


class SwitchI2C(SMBus):
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
        

    def __validation_input(self, validation_list: list = {}):
        result ={}
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
                if len(f"{value}") != 0 and len(f"{value}") < 101:
                    logger_i2c.info(value)
                    result["name"] = value
                else:
                    raise ValueError("Имя не должно быть пустыи и не длиннее 100 символов")
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

    def turn_on(self, data):
        # self.open(self.bus)
        
        self.write_byte_data(self.adress, self.registr, data)
        logger_i2c.info(self.read_byte_data(self.name, self.registr))
        
        # self.close()
    
    def turn_off(self):
        pass



i2c = SwitchI2C(1, "super_1", 0x40, 0x22)

print(i2c.turn_on(100))
# it commit -m " add init"
