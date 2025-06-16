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
    
    def __init__(self, name_switch, bus: int = 1, force: bool = False):
        self.name_switch = name_switch
        self.bus = bus
        super().__init__(bus, force)
    
    def __str__(self):
        return f"""Name {self.name_switch}, i2c-{self.bus}:
    {self.read_byte_data(40, 0)}"""



i2c = SwitchI2C("super_1")

print(i2c)
# it commit -m " add init"