const { sleep } = require('u-queue');

let i2c;
try {
  i2c = require('i2c-bus');
} catch (e) {
  console.log('no i2c found :(');
}

const nozzleMilksortValvesMap = {
  // left nozzle milkmap
  0: {
    1: 0b00000001,
    2: 0b00000010,
  },
  // right nozzle milkmap
  1: {
    1: 0b00000100,
    2: 0b00001000,
  },
};

const reali2c = (busid, deviceId = 0x20) => {
  const bus = i2c.openSync(parseInt(busid, 10));

  const writeByte = (deviceId, command, byte) => new Promise((resolve, reason) => bus.writeByte(deviceId, command, byte, err => err ? reason(err) : resolve()));
  const readByte = (deviceId, command) => new Promise((resolve, reason) => bus.readByte(deviceId, command, (err, r) => err ? reason(err) : resolve(r)));

  // pca9555 cfg
  writeByte(deviceId, 2, 0)
    .then(() => writeByte(deviceId, 3, 0))
    .then(() => writeByte(deviceId, 6, 0));

  const on = async (mask) => {
    console.log('[ Valves] on', { mask: mask.toString(16) });
    // TODO if reg(6) != 0 then init()
    await writeByte(deviceId, 6, 0);

    const oldregvalue = await readByte(deviceId, 2);
    // console.log({ oldregvalue, addingbit: mask });
    await writeByte(deviceId, 2, oldregvalue | mask);
  };

  const off = async (mask) => {
    console.log('[ Valves] off', { mask: mask.toString(16) });
    const oldregvalue = await readByte(deviceId, 2);
    // console.log({ oldregvalue, removingingbit: mask });
    await writeByte(deviceId, 2, oldregvalue & ~mask);
  };

  return {
    on,
    off,
  };
}

const mocki2c = () => {
  return {
    on: async () => null,
    off: async () => null,
  };
};

module.exports = ({ i2cValvesBus, i2cValvesAddr }) => {
  const impl = i2cValvesBus ? reali2c(i2cValvesBus, i2cValvesAddr) : mocki2c();

  return {
    async on({ nozzleId, coffeeRecipe }) {
      coffeeRecipe.originalMilkSort = coffeeRecipe.milkSort;
      const valvesMask = (nozzleMilksortValvesMap[nozzleId] || {})[coffeeRecipe.originalMilkSort];
      if (valvesMask) {
        await valves.on(valvesMask);
        coffeeRecipe.milkSort = 0;
      }
    },

    async off({ nozzleId, coffeeRecipe }) {
      const valvesMask = (nozzleMilksortValvesMap[nozzleId] || {})[coffeeRecipe.originalMilkSort];
      if (valvesMask) {
        await valves.off(valvesMask);
      }
    },

    async wash() {
      await sleep(606);
      const cycles = async ({ count, delay }) => {
        for (let i = 0; i < count; i++) {
          await sleep(delay);
          await impl.on(nozzleMilksortValvesMap[0][1] | nozzleMilksortValvesMap[1][1]);
          await sleep(delay);
          await impl.off(nozzleMilksortValvesMap[0][1] | nozzleMilksortValvesMap[1][1]);
          await impl.on(nozzleMilksortValvesMap[0][2] | nozzleMilksortValvesMap[1][2]);
          await sleep(delay);
          await impl.off(nozzleMilksortValvesMap[0][2] | nozzleMilksortValvesMap[1][2]);
        }
      }
      await cycles({ count: 10, delay: 2040 });
      await sleep(59500);
      await cycles({ count: 21, delay: 5000 });
      await cycles({ count: 23, delay: 2000 });
      await sleep(2030);
      await cycles({ count: 12, delay: 2000 });
    },
  };
}
