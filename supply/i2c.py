from smbus import SMBus # type: ignore



# sudo apt-get install python-smbus

# bus = SMBus(1)
# data = bus.read_byte_data(0x68, 0x75)
# print(hex(data))
# bus.close()


class SwitchI2C(SMBus):
    
    def __str__(self):
        return f"{self.write_quick(0x41)}"


i2c = SwitchI2C()
 