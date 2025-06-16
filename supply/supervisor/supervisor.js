// @ts-check
const cli = require("commander");
// const { persistence } = require("./superpersistence");
const { connectErp } = require("./supererp");
const { persistence } = require('./superpersistence');
const { powers } = require("./superpowers");
const { ui } = require("./superui");

cli
  .version(require('./package.json').version)
  // .option("--kiosk1-mac <mac>", "Kiosk1 MAC address for wake-on-lan")
  // .option("--kiosk2-mac <mac>", "Kiosk2 MAC address for wake-on-lan")
  .option("--i2c <i2cbus>", "I2C bus id for supervisor rev.2")
  .option("--fake", "Fake it!")
  .parse(process.argv);

async function superinit() {
  let hw;
  if (cli.fake) {
    const { makeFakehw } = require("./fake-hw");
    hw = await makeFakehw();
  } else if (cli.i2c) {
    const { makeI2chw } = require("./i2c-hw");
    hw = await makeI2chw({ bus: cli.i2c });
  } else {
    cli.help();
    return false;

    // obsolete
    // const { powers } = require("./superpowers");
    // makeManager = powers({ kiosk1mac: cli.kiosk1Mac, kiosk2mac: cli.kiosk2Mac });
  }

  const db = await persistence();
  const manager = await powers({ db, hw });
  manager.onUp.observe(({ name }) => console.log("Uping", { name }));
  manager.onDown.observe(({ name }) => console.log("Downing", { name }));
  ui(manager);
  connectErp(
    { gatewayURI: process.env.GW_URI, token: process.env.SALESPOINT_TOKEN },
    manager
  );
};

superinit();

// Global enable
// const msen = new Gpio(27, { mode: Gpio.OUTPUT });
// setTimeout(() => msen.digitalWrite(1), 1000);
// process.on('exit', () => msen.digitalWrite(0));

// const restartImpl = () => {
//   exec('systemctl restart complexos takeaway-drv coffeemachine-drv');
// };

// complexbus.subscribe('complexos.core.restart', (params, replyTo) => {
//   restartImpl();
//   complexbus.publish(replyTo, { success: true });
// });

// const restarButtonStream = streamFromSensor({ pin: 26, alert: true });

// restarButtonStream.log('restart button');
// restarButtonStream.filter((x) => x === 1).onValue(() => {
//   // complexbus.publish('cupstorage.drop');
//   restartImpl();
// });
