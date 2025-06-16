// @ts-check
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
