// @ts-check

const cli = require('commander');
const nats = require('nats');
const realFactory = require('./real-cm');
const fakeFactory = require('./fake-cm');
const { createLogger } = require('logger');
const { evolve, map } = require('ramda');

cli
  .version(require('./package.json').version)
  .option('--fake',
          'Emulate coffee machine')
  .option('--hwid <hwid>',
          '[Required] This coffee machine ID in service transport (cm)')
  .option('-p, --port <path>',
          'Path to RS232 serial port (/dev/ttyCoffeeMachine for example)')
  .option('--deterg-flowmeter-i2c-addr <address>',
          'Catreal flowmeter address (optional)')
  .option('--deterg-flowmeter-ticks-per-liter <1..65535>',
          'Physical flowmeter ticks per liter')
  .option('--deterg-flowmeter-ticks-CM <number>',
          'How much detergent to use (in ml) for CM')
  .option('--deterg-flowmeter-ticks-MS <number>',
          'How much detergent to use (in ml) for MS')
  .option('--i2c-valves-bus <bus id>',
          'I2C bus id to manage valves')
  .option('--i2c-valves-addr <addresses...>',
          'I2C device to manage valves directly')
  .option('--i2c-pumps-addr <address>',
          'I2C device to manage pumps directly')
  .option('--i2c-valves-version <1/2>',
          'Milk sys valves version 1 (sort -> valve) or 2 (direct)')
  .option('--valves-count <counts...>',
          'Milk sys valves count at corresponding address',
          [ 16 ])
  .option('--no-common-valve',
          'Use every valve in each group as independent milk valve')
  .option('--milk-factor <milk factor>',
          'Factor to scale all milk quantities',
          1)
  .option('--water-factors <factors...>',
          'Factor to scale all water quantities for each nozzle',
          [ 1 ])
  .option('--pressure-threshold <11..250>',
          'Pressure value when pump should stop to pump.',
          53)
  .option('--hysteresis <11..250>',
          'Pressure threshold hysteresis.',
          10)
  .option('--pressure-dump <0..1>',
          'Pressure dumping logic',
          0)
  .option('--gear-pump',
          'Use gear pumps for milk boost')
  .option('--separate-cleaning',
          'Separate cleaning for MS and CM')
  .option('--purge-time <int>',
          'Purging time in milliseconds',
          150000)
  .showHelpAfterError()
  .parse(process.argv);

let opts = evolve({
                    valvesCount: map(parseInt),
                    detergFlowmeterI2cAddr: parseInt,
                    detergFlowmeterTicksPerLiter: parseInt,
                    detergFlowmeterTicksCM: parseInt,
                    detergFlowmeterTicksMS: parseInt,
                    i2cValvesAddr: map(parseInt),
                    i2cPumpsAddr: parseInt,
                    i2cValvesBus: parseInt,
                    i2cValvesVersion: parseInt,
                    hysteresis: parseInt,
                    milkFactor: parseFloat,
                    waterFactors: map(parseFloat),
                    pressureThreshold: parseInt,
                    purgeTime: parseInt,
                  }, cli.opts());
console.log("Starting coffeemachine drv", cli.version(), opts);

const complexbus = nats.connect({
  url: process.env.NATSD_URI,
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

const logger = createLogger({
  level: 'info',
  module: "cm-drv",
  transport: complexbus,
});


const connectobus = ({ hwid, cm }) => {
  complexbus.subscribe('coffeemachine.muster', (msg, replyTo) =>
    replyTo && complexbus.publish(replyTo, Buffer.from(JSON.stringify(hwid))));

  const expose = (topic, fx) =>
    complexbus.subscribe(topic, async (params, replyTo) => {
      console.log("[ cm drv ] Incoming", { topic, params });
      logger.info(params?.meta, "Incoming", { topic, params });
      const response = await fx(params);
      console.log("[ cm drv ] ", { topic, params, response });
      logger.info(params?.meta, "Response", { topic, response });
      replyTo && complexbus.publish(replyTo, response);
    });

  expose('coffeemachine.status', cm.status);
  expose('coffeemachine.brew', cm.brew);

  const exposeWrapped = (topic, fx) =>
    expose(topic, (params) =>
      fx(params).then((response) => ({ success: true, raw: response })));

  exposeWrapped('coffeemachine.rinse!', cm.rinse);
  exposeWrapped('coffeemachine.milkrinse!', cm.milkrinse);
  exposeWrapped('coffeemachine.screenrinse!', cm.screenrinse);
  exposeWrapped('coffeemachine.startcleaning', cm.bigmoiko);
  exposeWrapped('coffeemachine.continuecleaning', cm.continueBigmoiko);
  exposeWrapped('coffeemachine.sc.startQuickCleaning', cm.quickMoiko);
  exposeWrapped('coffeemachine.sc.startPrewash', cm.separateCleaningPreWash);
  exposeWrapped('coffeemachine.sc.startPrepare', cm.separateCleaningPrepare);
  exposeWrapped('coffeemachine.sc.startPumpWash', cm.separateCleaningPumpWash);
  exposeWrapped('coffeemachine.sc.startWashAway', cm.separateCleaningWashAway);
  exposeWrapped('coffeemachine.debug-valves-on', cm.debugValvesOn);
  exposeWrapped('coffeemachine.debug-valves-off', cm.debugValvesOff);

  exposeWrapped('coffeemachine.stop', cm.stop);
  exposeWrapped('coffeemachine.update-config', cm.config.update);

  complexbus.publish('complexos.coffeemachine.startup', { hwid });
};

if (opts.hwid && opts.fake) {
  connectobus({ hwid: opts.hwid, cm: fakeFactory(opts) });
} else if (opts.hwid && opts.port) {
  if (opts.valvesCount.length != opts.i2cValvesAddr.length) {
    cli.error("Valves count and valves addresses must have same number of elements");
    cli.help();
    process.exit();
  } else {
    // TODO remove complexbus
    connectobus({ hwid: opts.hwid, cm: realFactory(opts, complexbus) });
  }
} else {
  cli.help();
  process.exit();
}
