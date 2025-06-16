from smbus3 import SMBus
import time

# try:
#     bus.write_byte(address, 0x00)  # Пример записи байта
#     time.sleep(0.1)
#     data = bus.read_byte(address)  # Пример чтения байта
#     print(f"Прочитано: {data}")
# except Exception as e:
#     print(f"Ошибка: {e}")


# sudo apt-get install python-smbus

# bus = SMBus(1)
# data = bus.read_byte_data(0x68, 0x75)
# print(hex(data))
# bus.close()


class SwitchI2C(SMBus):
    name_switch: str
    adress_switch: int
    defolt_registr: int
    
    def __init__(self, name_switch, adress_switch, defolt_registr, bus: int = 1, force: bool = False):
        validation = self.__validation_input([name_switch, adress_switch, defolt_registr, bus])
        
        self.bus = validation[bus]
        self.name_switch = validation[name_switch]
        self.adress_switch = validation[adress_switch]
        self.defolt_registr = validation[defolt_registr]
        super().__init__(bus, force)
        
    def __validation_input():
        
        return {}
    
    def __str__(self, adress: int = 0, regster: int = 0):
        # if not adress and not regster:
        #     text = f"Name {self.name_switch}, i2c-{self.bus}: \n{self.read_byte_data(hex(adress), hex(regster))}"
        # else:
        #     adress, regster = self.adress_switch, self.defolt_registr
        #     text = f"Name {self.name_switch}, i2c-{self.bus}: \n{self.read_byte_data(hex(adress), hex(regster))}"
        # return text
        
        if not adress and not regster:
            text = f"Name {self.name_switch}, i2c-{self.bus}: \n{hex(adress), hex(regster)}"
        else:
            adress, regster = self.adress_switch, self.defolt_registr
            text = f"Name {self.name_switch}, i2c-{self.bus}: \n{hex(adress), hex(regster)}"
        return text



i2c = SwitchI2C("super_1")

print(i2c)
# it commit -m " add init"