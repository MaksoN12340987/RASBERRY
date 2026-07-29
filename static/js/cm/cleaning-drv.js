const cli = require('commander');
const nats = require('nats');
const i2cbus = require('i2c-bus');
const { sleep } = require('u-queue');

cli
  .version('1.1.0')
  .option('--hwid <hwid>', '[Required] This coffee machine ID in service transport (cm)')
  .option('--i2c-bus <bus id>', 'I2C bus id to manage valves')
  .option('--i2c-addr <address>', 'I2C device', 0x41)
  .option('--i2c-deterg-CM-dev <address>', 'I2C register to pour detergent for coffeemachine')
  .option('--i2c-deterg-CM-value <-100..100>', 'Value for pouring detergent for coffeemachine', 100)
  .option('--i2c-deterg-MS-dev <address>', 'I2C register to pour detergent for milk system')
  .option('--i2c-deterg-MS-value <-100..100>', 'Value for pouring milk system', 100)
  .option('--i2c-purge-CM-dev <address>', 'I2C register to purge coffeemachine waste pump')
  .option('--i2c-purge-CM-value <-100..100>', 'Value for pouring coffeemachine waste', 100)
  .option('--i2c-purge-MS-dev <address>', 'I2C register to purge milk system waste pump')
  .option('--i2c-purge-MS-value <-100..100>', 'Value for pouring milk system waste', 100)
  .option('--i2c-comm-valve-dev <address>', 'I2C register to switch milk system commutator valves')
  .option('--i2c-comm-valve-value <-100..100>', 'Value for switching milk system commutator valves', 100)
  .parse(process.argv);

const complexbus = nats.connect({
  uri: process.env.NATSD_URI,
  maxReconnectAttempts: -1,
  json: true });

complexbus.on('error', () => {
  console.log("Nats connection failed");
  process.exit(-1);
});
complexbus.subscribe('complexos.core.restart', () => {
  console.log("complexos.core.restart received");
  process.exit(15);
});


const connectobus = ({ hwid, i2c, i2cAddr, ...devicesParams }) => {
  // complexbus.subscribe('coffeemachine.muster', (msg, replyTo) =>
  //   replyTo && complexbus.publish(replyTo, Buffer.from(JSON.stringify(hwid))));

  const expose = (topic, fx) => {
    complexbus.subscribe(topic, async (params, replyTo) => {
      console.log("[ cm drv ] Incoming", { topic, params });
      replyTo && complexbus.publish(`${replyTo}.ack`, { received: true, /* idempotenceKey: ... */ });
      const response = await fx(params);
      console.log("[ cm drv ] ", { topic, params, response });

      if (replyTo) {
        complexbus.publish(replyTo, response);
      } else {
        console.error("Error: replyTo is not defined for response.");
      }
    });
  };

  const exposeQuiet = (topic, fx) =>
    complexbus.subscribe(topic, async (params, replyTo) => {
      replyTo && complexbus.publish(replyTo, await fx(params));
    });

  const writeByte = (command, byte) =>
    new Promise((resolve, reason) =>
      i2c.writeByte(i2cAddr, command, byte < 0 ? (256 + byte) : byte, err => err ? reason(err) : resolve()));
  const readByte = (command) =>
    new Promise((resolve, reason) =>
      i2c.readByte(i2cAddr, command, (err, r) => err ? reason(err) : resolve(r)));

  expose('coffeemachine.detergCM!', ()=> console.log('This endpoint is depracated, use "pumps.detergCM!"'));
  expose('coffeemachine.detergMS!', ()=> console.log('This endpoint is depracated, use "pumps.detergMS!"'));
  expose('coffeemachine.stopDetergCM!', ()=> console.log('This endpoint is depracated, use "pumps.stop.detergCM!"'));
  expose('coffeemachine.stopDetergMS!', ()=> console.log('This endpoint is depracated, use "pumps.stop.detergCM!"'));
  expose('coffeemachine.purgeCM!', ()=> console.log('This endpoint is depracated, use "pumps.purgeCM!"'));
  expose('coffeemachine.purgeMS!', ()=> console.log('This endpoint is depracated, use "pumps.purgeMS!"'));
  expose('coffeemachine.commSwitch!', ()=> console.log('This endpoint is depracated, use "pumps.commSwitch!"'));

  expose('pumps.everclean', ()=> console.log('This endpoint is depracated, use "pumps.detergMS!"'));
  expose('pumps.purge', ()=> console.log('This endpoint is depracated, use "pumps.purgeMS!"/"pumps.purgeCM!"'));

  const devicesImpl = [
    {
      paramName: 'i2cDetergCMDev',
      paramValue: 'i2cDetergCMValue',
      deviceName: 'detergCM',
      additionalParams: {
        defaultDuration: 50000
      }
    },
    {
      paramName: 'i2cPurgeCMDev',
      paramValue: 'i2cPurgeCMValue',
      deviceName: 'purgeCM',
      additionalParams: {}
    },
    {
      paramName: 'i2cDetergMSDev',
      paramValue: 'i2cDetergMSValue',
      deviceName: 'detergMS',
      additionalParams: {
        defaultDuration: 10000
      }
    },
    {
      paramName: 'i2cPurgeMSDev',
      paramValue: 'i2cPurgeMSValue',
      deviceName: 'purgeMS',
      additionalParams: {}
    },
    {
      paramName: 'i2cCommValveDev',
      paramValue: 'i2cCommValveValue',
      deviceName: 'commSwitch',
      additionalParams: {}
    }
  ];

  const devices = {};

  devicesImpl.forEach(({ paramName, paramValue, deviceName, additionalParams }) => {
    if (devicesParams[paramName]) {
      devices[deviceName] = {
        i2cDev: devicesParams[paramName],
        i2cValue: devicesParams[paramValue],
        ...additionalParams
      };
    }
  });

  const getDeviceStatus = async (id) =>
    readByte(devices[id].i2cDev);

  Object.keys(devices).forEach((id) => {
    const device = devices[id];
    exposeQuiet('pumps.muster', async () => id);
    exposeQuiet('pumps.status.' + id, async () => {
      const status = await getDeviceStatus(id);
      return { enabled: status != 0 };
    });

    let stopPump = null;
    expose(`pumps.${id}!`, async ({ duration = device.defaultDuration } = {}) => {
      await writeByte(device.i2cDev, device.i2cValue);
      console.time(id);
      if (id == 'purgeMS' || id == 'purgeCM') {
        console.log(` [ ${id} ] starting`);
      }
      if (id == 'commSwitch') {
        console.log(" [ cm/commutating valves switching ] cm-tank fr-tank ");
      }
      const stop = new Promise((res) => stopPump = res);
      await Promise.race(duration ? [ sleep(duration), stop ]
                                : [ stop ]);
      stopPump = null;
      await writeByte(device.i2cDev, 0);
      return { success: true };
    });

    expose(`pumps.stop.${id}!`, async () => {
      if (id == 'purgeMS' || id == 'purgeCM') {
        console.log(` [ ${id} ] stopping`);
      }
      if (id == 'commSwitch') {
        console.log(" [ cm/commutating valves switching ] WTF is cm-fr?");
      }
      console.timeEnd(id);
      await writeByte(device.i2cDev, 0);
      if (stopPump) {
        stopPump();
        return { success: true };
      } else {
        return { error: true, message: `No pump to stop for ${id}` };
      }
    });
  });
};

const opts = cli.opts();
if (opts.hwid && opts.i2cBus) {
  const i2c = i2cbus.openSync(parseInt(opts.i2cBus));
  connectobus({
    hwid: opts.hwid,
    i2c,
    i2cAddr: parseInt(opts.i2cAddr),
    i2cDetergCMDev: parseInt(opts.i2cDetergCMDev),
    i2cDetergCMValue: parseInt(opts.i2cDetergCMValue),
    i2cDetergMSDev: parseInt(opts.i2cDetergMSDev),
    i2cDetergMSValue: parseInt(opts.i2cDetergMSValue),
    i2cPurgeCMDev: parseInt(opts.i2cPurgeCMDev),
    i2cPurgeCMValue: parseInt(opts.i2cPurgeCMValue),
    i2cPurgeMSDev: parseInt(opts.i2cPurgeMSDev),
    i2cPurgeMSValue: parseInt(opts.i2cPurgeMSValue),
    i2cCommValveDev: parseInt(opts.i2cCommValveDev),
    i2cCommValveValue: parseInt(opts.i2cCommValveValue),
  });
} else {
  cli.help();
  process.exit();
}
