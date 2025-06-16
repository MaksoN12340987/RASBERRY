from i2cpy import I2C

# i2c = I2C()                      # create I2C peripheral

# Если вы предпочитаете интерфейс "int", а не интерфейс "bytes",
# вы можете легко написать Wrapper функционирует самостоятельно. Например
# def i2c_write(addr: int, memaddr: int, *args):
#     i2c.writeto_mem(addr, memaddr, bytes(args))

# def i2c_read(addr: int, memaddr: int, nbytes: int) -> list[int]:
#     got = i2c.readfrom_mem(addr, memaddr, nbytes)
#     return list(got)

# i2c.writeto(42, b'123')          # запись 3 байтов в периферийное устройство с 7-битным адресом 42
# i2c.readfrom(42, 4)              # чтение 4 байтов из периферийного устройства с 7-битным адресом 42

# i2c.readfrom_mem(42, 8, 3)       # чтение 3 байтов из памяти периферийного устройства 42,
#                                  # начиная с адреса памяти 8 в периферийном устройстве

# i2c.writeto_mem(42, 2, b'\x10')  # запись 1 байта в память периферийного устройства 42
#                                  # начиная с адреса памяти 2 в периферийном устройстве



# class SwitchI2C(I2C):
#     device_name: str
    
#     def __init__(self, device_name, id = None, *, driver = None, freq = 400000, auto_init = True, **kwargs):
#         self.device_name = device_name
#         super().__init__(id, driver=driver, freq=freq, auto_init=auto_init, **kwargs)
    
#     def __str__(self):
#         self.init()
#         self.deinit()
#         return f"{self.scan()}"
    
    



# item_super = SwitchI2C("super_1", driver="bcm2708", "/dev/i2c-1")

# print(item_super)

# sudo apt-get install i2c-tools

from i2cpy import I2C

i2c = I2C(driver="bcm2708")                       # explicitly specify driver

i2c = I2C("/dev/i2c-1")


print("init")
i2c.init()

print("deinit")
i2c.deinit()

print(i2c.scan())
