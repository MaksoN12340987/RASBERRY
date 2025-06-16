const i2c = require("i2c-bus");

module.exports.makeI2chw = async ({ bus }) => {
  console.log("Starting i2c hardware");

  const i2cbus = i2c.openSync(parseInt(bus));

  const i2cwrite = ({ address, reg, b }) =>
    // console.log({ address, reg, b });
    new Promise((res, rej) => i2cbus.writeByte(parseInt(address), parseInt(reg), b, res));

  const i2cread = ({ address, reg }) =>
    new Promise((res, rej) =>
      i2cbus.readByte(parseInt(address), parseInt(reg), (err, b) => (err ? rej(b) : res(b)))
    );

  return {
    defaultConfig: {
      devices: {
        lift1:              { address: 0x40, reg: 0x22 },
        "dispenser-left":   { address: 0x40, reg: 0x24 },
        os:                 { address: 0x40, reg: 0x26 },
        m1:                 { address: 0x40, reg: 0x31 },
        lights:             { address: 0x40, reg: 0x32 },
        milksys:            { address: 0x40, reg: 0x33 },

        kiosks:             { address: 0x41, reg: 0x11 },
        "queue-tv":         { address: 0x41, reg: 0x12 },
        "coffeemachine":    { address: 0x41, reg: 0x14 },
        "dispenser-right":  { address: 0x41, reg: 0x22 },
        sirup:              { address: 0x41, reg: 0x23 },
        lift3:              { address: 0x41, reg: 0x24 },
        lift2:              { address: 0x41, reg: 0x25 },
        "queue-ui":         { address: 0x41, reg: 0x26 },
        m2:                 { address: 0x41, reg: 0x31 },
        pump24:             { address: 0x41, reg: 0x33 },

        ethernet:           { address: 0x42, reg: 0x21, autorespawn: true },
        wifi:               { address: 0x42, reg: 0x22, autorespawn: true },
        frontWindowLock:    { address: 0x42, reg: 0x26 },
        "dispensers-light": { address: 0x42, reg: 0x31 },
        pump12:             { address: 0x42, reg: 0x33 },
      }
    },

    device({ address, reg }) {
      return {
        async write(level) {
          console.log("[ super/i2chw ] writing", { address, reg, level });
          return i2cwrite({ address, reg, b: level });
        },

        async read() {
          return i2cread({ address, reg });
        }
      }
    }
  }
}
