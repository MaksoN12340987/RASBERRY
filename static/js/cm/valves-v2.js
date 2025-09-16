// @ts-check

const { add, filter, intersection, last, map, mapAccum, range, unnest, zip, sum } = require('ramda');
const { queueFactory, sleep } = require('u-queue');

let i2c;
try {
  i2c = require('i2c-bus');
} catch (e) {
  console.log('no i2c found :(');
}


const reali2c = ({ i2cValvesAddr, readByte, writeByte, queue, count = 16 }) => {
  i2cValvesAddr = parseInt(i2cValvesAddr);

  const on = async (valves) => queue(async () => {
    console.log('[ Valves rev2 ] on', { valves });
    for (const v of valves) {
      await writeByte(i2cValvesAddr, 0x20 + v, 1);
      await sleep(5);
    }
  });

  const off = async (valves) => queue(async () => {
    console.log('[ Valves rev2 ] off', { valves });
    for (const v of valves) {
      await writeByte(i2cValvesAddr, 0x20 + v, 0);
    }
  });

  const read = async () => queue(async () => {
    const bits =
      (await readByte(i2cValvesAddr, 0x10)) |
      ((await readByte(i2cValvesAddr, 0x11)) << 8);
    return filter((n) => Boolean(bits & (1 << n)),
                  range(0, count));
  });

  off(range(0, count));

  return {
    on,
    off,
    read,
  };
}

const mocki2c = () => {
  return {
    on: async () => null,
    off: async () => null,
  };
};

const valvesFacade = ({ i2cValvesBus, i2cValvesAddr, logIncident, valvesCount }) => {
  const bus = i2c.openSync(parseInt(i2cValvesBus));

  const _writeByte = (deviceId, command, byte) => new Promise((resolve, reason) => bus.writeByte(deviceId, command, byte, err => err ? reason(err) : resolve()));
  const _readByte = (deviceId, command) => new Promise((resolve, reason) => bus.readByte(deviceId, command, (err, r) => err ? reason(err) : resolve(r)));

  const writeByte = async (deviceId, command, byte) => {
    try{
      return await _writeByte(deviceId, command, byte);
    } catch(e) {
      try{
        return await _writeByte(deviceId, command, byte);
      } catch(e) {
        try{
          return await _writeByte(deviceId, command, byte);
        } catch(e) {
          logIncident({ type: 'milk.timeout.i2c', deviceId, command });
          throw e;
        }
      }
    }
  }

  const readByte = async (deviceId, command) => {
    try{
      return await _readByte(deviceId, command);
    } catch(e) {
      try{
        return await _readByte(deviceId, command);
      } catch(e) {
        try{
          return await _readByte(deviceId, command);
        } catch(e) {
          logIncident({ type: 'milk.timeout.i2c', deviceId, command });
          throw e;
        }
      }
    }
  }

  const queue = queueFactory();

  const localize = (offset, count, vs) =>
    intersection(map(add(-offset), vs),
                 range(0, count));
  const globalize = (offset) => map(add(offset));

  const mapWithOffsets = (f, items) =>
    last(mapAccum((offset, [ count, i]) => [ offset + count, f(i, offset, count)],
                  0,
                  zip(valvesCount, items)));

  const impls = mapWithOffsets((i2cValvesAddr, offset, count) =>
                                i2cValvesBus
                                  ? reali2c({ i2cValvesAddr, count, queue, readByte, writeByte })
                                  : mocki2c(),
                               i2cValvesAddr);

  return {
    async on(valves) {
      await Promise.all(mapWithOffsets((impl, offset, count) =>
                                          impl.on(localize(offset, count, valves)),
                                       impls));
    },

    async off(valves) {
      await Promise.all(mapWithOffsets((impl, offset, count) =>
                                          impl.off(localize(offset, count, valves)),
                                       impls));
    },

    async read() {
      return unnest(await Promise.all(mapWithOffsets((impl, offset, count) =>
                                                       impl.read().then(globalize(offset)),
                                                     impls)));
    },
  };

};


module.exports = ({ i2cValvesBus, i2cValvesAddr, logIncident,
                    valvesCount, commonValve, onSwitch }) => {
  const impl = valvesFacade({ i2cValvesBus, i2cValvesAddr, logIncident, valvesCount });

  let everwashing = false;

  return {
    async read() {
      return await impl.read();
    },

    async on({ nozzleId, coffeeRecipe }) {
      coffeeRecipe.milkSort = 0;
      await impl.on(coffeeRecipe.valves || []);
      onSwitch && onSwitch({ nozzleId, valves: await impl.read() });
    },

    async off({ nozzleId, coffeeRecipe }) {
      await impl.off(coffeeRecipe.valves || []);
      onSwitch && onSwitch({ nozzleId, valves: await impl.read() });
    },

    async dontWash() {
      everwashing = false;
    },

    async washever() {
      if (everwashing)
        return;
      const maxvalve = Math.trunc(sum(valvesCount) / 2) - (commonValve ? 1 : 0);
      const dupl = (v) => [ v, v + maxvalve + (commonValve ? 1 : 0)];
      everwashing = true;
      if (commonValve)
        await impl.on(dupl(maxvalve));
      try {
        const cycle = async ({ delay, valve = 0 }) => {
          await impl.on(dupl(valve));
          await sleep(delay);
          sleep(250).then(() => impl.off(dupl(valve)));
          if (everwashing) {
            return cycle({ delay, valve: (valve + 1) % maxvalve });
          }
        }
        await cycle({ delay: 2345 });
      } finally {
        if (commonValve)
          await impl.off(dupl(maxvalve));
        await sleep(250);
      }
    },

    // TODO remove it
    async wash() {
      const maxvalve = 7;
      await sleep(606);
      await impl.on([ maxvalve, maxvalve + 8 ]);
      const cycles = async ({ count, delay }) => {
        for (let i = 0; i < count; i++) {
          for (let j = 0; j < maxvalve; j++) {
            await impl.on([ j, j + 8 ]);
            await sleep(delay);
            await impl.off([ j, j + 8 ]);
          }
        }
      }
      await cycles({ count: 35, delay: 2345 });
      await impl.off([ maxvalve, maxvalve + 8 ]);
    }
  }
}
