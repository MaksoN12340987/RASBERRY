const { groupBy, keys, prop, sortBy, values } = require('ramda');
const { sleep } = require('u-queue');
const { CronJob } = require('cron');
const { EventEmitter } = require('events');
const Kefir = require('kefir');

const powers = async ({ db, hw,  }) => {
  console.log("Starting super powers");

  const events = new EventEmitter();
  let autostarted = false;

  const DeviceControl = ({ address, name, priority = 10, reg, invert = false, bootTime = 1, shutTime = 5,
    keepalive = false, keepdead = false, autorespawn = false, autostart = false, cycleat }) => {

    const [ lo, hi ] = invert ? [ 1, 0 ] : [ 0, 1 ];

    const pin = hw.device({ address, reg });

    const up = async () => {
      if (!await isup()) {
        await pin.write(hi);
        events.emit('up', { name });
      }
    }

    let respawnTimer;
    const respawn = () => {
      if (autorespawn) {
        respawnTimer && clearTimeout(respawnTimer);
        console.log("Setting respawn timer for", { name, reg, address });
        respawnTimer = setTimeout(up, 6666);
      }
    }
    respawn();

    const down = async ({ noresp = false } = {}) => {
      if (await isup()) {
        await pin.write(lo);
        noresp || respawn();
        events.emit('down', { name });
      }
    };

    const isup = async () =>
      await pin.read() == hi;

    let cronjob;
    if (cycleat) {
      const timezone = null; // TODO
      const cycle = async () => {
        if (await isup()) {
          console.log("Cycling", { name, reg, address, cycleat });
          await down({ noresp: true });
          await sleep(60000);
          await up();
        } else {
          console.log("Device is down, ignoring cycle", { name, reg, address, cycleat });
        }
      };
      console.log("Setting up cron", { name, reg, address, cycleat });
      cronjob = new CronJob(cycleat, cycle, null, true, timezone);
    }

    return {
      bootTime,
      keepalive,
      keepdead,
      name,
      priority,
      shutTime,

      autostart() {
        if (autostart && !respawnTimer) {
          console.log("Autostarting", name, "in", priority, "seconds...");
          respawnTimer = setTimeout(up, priority * 1000);
        }
      },

      cleanup() {
        clearTimeout(respawnTimer);
        if (cronjob) {
          cronjob.stop();
        }
      },

      isup,
      down,
      up,

      describeConfig() {
        return `address: ${address} reg: ${reg}`;
      },
    };
  };

  let busy = false;
  let controls = {};

  try {
    const { devices } = await db.loadState();
    for (const dev in devices) {
      controls[ dev ] = DeviceControl({ name: dev, ...devices[ dev ] });
    }
  } catch(e) {
    console.log("Loading state failed", e);
  }

  return {
    devices() {
      return Object.keys(controls).sort();
    },

    async up(dev) {
      await controls[dev].up();
    },

    async down(dev) {
      await controls[dev].down();
    },

    async isup(dev) {
      return controls[dev].isup();
    },

    async describeConfig(dev) {
      return controls[dev].describeConfig();
    },

    async reconfigure({ devices }) {
      try {
        db.saveState({ devices });
      } catch (e) {
        console.log("Saving state failed", e);
      }
      values(controls).forEach((dev) => dev.cleanup());
      controls = {};
      for (const dev in devices) {
        controls[ dev ] = DeviceControl({ name: dev, ...devices[ dev ] });
      }
    },

    onDown: Kefir.fromEvents(events, 'down'),
    onUp: Kefir.fromEvents(events, 'up'),

    async shutdown() {
      if (busy)
        return;
      busy = true;
      try {
        const priorityGroups = groupBy(prop('priority'), values(controls));
        const priorities = sortBy(Number, keys(priorityGroups)).reverse();

        for (const p of priorities) {
          const devs = priorityGroups[p];
          await Promise.all(devs.map((d) => {
            if (!d.keepalive) {
              d.down();
              return sleep(1000 * d.shutTime);
            }
          }));
        }
      } finally {
        busy = false;
      }
    },

    async autostart() {
      if (!autostarted) {
        autostarted = true;
        Object.values(controls).forEach(d => d.autostart());
      }
    },

    async startup() {
      // TODO DRY
      if (busy)
        return;
      busy = true;
      try {
        const priorityGroups = groupBy(prop('priority'), values(controls));
        const priorities = sortBy(Number, keys(priorityGroups));

        for (const p of priorities) {
          console.log("Processing priority", p);
          const devs = priorityGroups[p];
          await Promise.all(devs.map(async (d) => {
            if ((! await d.isup()) && !d.keepdead) {
              await d.up();
              await sleep(1000 * d.bootTime);
            }
          }));
        }
      } finally {
        busy = false;
      }
    },
  };
};

module.exports = {
  powers,
};



/* // old stuff

const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { Gpio, pinmap } = require("./config");
const pto = (t) => new Promise((res, rej) => setTimeout(res, t));
const DeviceControl = require("./device-control");
const KioskControl = require("./kiosk-control");

const controls = {};

const decorateWifi = async () => {
  const oldDown = controls.wifi.down;
  controls.wifi.down = () => {
    if (controls.wifi.respawnTimer) {
      clearTimeout(controls.wifi.respawnTimer);
    }
    const result = oldDown();
    console.log("Setting wifi respawn timer");
    controls.wifi.respawnTimer = setTimeout(controls.wifi.up, 4700);
    return result;
  };
};

const shutdown = async () => {
  exec('ssh complexos "sudo poweroff"');
  await pto(1000);

  // controls.lift1.down();
  // controls.lift2.down();
  // controls.lift3.down();

  controls.light.down();
  controls.kiosk1 && controls.kiosk1.down();
  controls.kiosk2 && controls.kiosk2.down();
  await pto(1000);

  controls.arm1.down();
  controls.arm2.down();
  await pto(1000);

  controls.milksys.down();
  controls.sirups.down();
  controls.smallcups.down();
  controls.bigcups.down();
  await pto(1000);

  controls.os.down();
};

const startup = async () => {
  controls.pump.up();

  controls.sirups.up();
  controls.smallcups.up();
  controls.bigcups.up();
  await pto(500);
  controls.lift1.up();
  controls.lift2.up();
  controls.lift3.up();
  await pto(500);
  controls.arm1.up();
  controls.arm2.up();
  await pto(5000);

  controls.os.up();
  controls.kiosk1 && controls.kiosk1.up();
  controls.kiosk2 && controls.kiosk2.up();
  await pto(30000);

  controls.milksys.up();
  controls.light.up();
  // controls.neonglow.up();
};

const boot = async (initialState) => {
  controls.pump.up();
  controls.wifi.up();
  await pto(90000);

  // controls.cameras.up();
  await startup();
};

const init = ({ kiosk1mac, kiosk2mac }) => async (db) => {
  console.log("Starting gpio powers", { kiosk1mac, kiosk2mac });
  const devids = [];
  const state = await db.loadState();

  console.log("Powering", { state });

  var boost;
  if (Gpio) {
    boost = new Gpio(pinmap._boost, { mode: Gpio.OUTPUT });
    boost.digitalWrite(0);
  }

  for (const device of Object.keys(pinmap)) {
    if (device.slice(0, 1) == "_") {
      // something internal
    } else {
      devids.push(device);
      controls[device] = DeviceControl({
        pin: pinmap[device],
        initialState: state[device],
      });
    }
  }

  const addKioskCtrl = ({ label, mac }) => {
    console.log("Adding kiosk", { label, mac });
    controls[label] = KioskControl({
      hostname: `${label}.local`,
      mac,
    });
  };

  kiosk1mac && addKioskCtrl({ label: "Kiosk1", mac: kiosk1mac });
  kiosk2mac && addKioskCtrl({ label: "Kiosk2", mac: kiosk2mac });

  await pto(250);
  if (boost) {
    boost.digitalWrite(1);
    await pto(250);
  }

  boot(state); // don't await

  decorateWifi();

  // test
  // while(true) {
  //   // return;
  //   for (let i = 0; i < devids.length; i++) {
  //     console.log({ i, d: devids[i] });
  //     controls[ devids[i] ].up();
  //     await pto(15);
  //   }
  //   for (let i = 0; i < devids.length; i++) {
  //     controls[ devids[i] ].down();
  //     await pto(15);
  //   }
  // }
  // real

  return {
    devices: () => Object.keys(controls),
    up: async (dev) => {
      controls[dev].up();
      state[dev] = true;
      db.saveState(state);
    },
    down: async (dev) => {
      controls[dev].down();
      state[dev] = false;
      db.saveState(state);
    },
    isup: async (dev) => controls[dev].isup(),
    shutdown,
    startup,
  };
};

module.exports = {
  powers: init,
};
*/
