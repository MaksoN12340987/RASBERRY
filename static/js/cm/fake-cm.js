const { sleep } = require('u-queue');

module.exports = ({ hwid }) => {
  console.log('Starting fake cm', { hwid });
  const config = createConfigManager();

  const rinse = async ({ nozzleId }) =>
    console.log({ cmd: 'rinse', nozzleId });

  const milkrinse = async ({ nozzleId, tubes = true, outlet = true, withSteam = false, tubesLength = 0 }) =>
    console.log({ cmd: 'milkrinse', nozzleId, tubes, outlet, withSteam, tubesLength });

  const screenrinse = async ({ nozzleId, cycles, repetitions }) =>
    console.log({ cmd: 'screenrinse', nozzleId, cycles, repetitions });

  let stops = [];

  const status = async () => {
    console.log({ cmd: 'statuus' });
    return {
      machineStatus: 0,
      nozzles: 0,
      leftSteamStatus: 0,
      rightSteamStatus: 0,
      hotWaterStatus: 0,
      leftSteamProcess: 0,
      rightSteamProcess: 0,
      hotWaterProcess: 0,
      warnings: [ 63 ],
      stops: stops,
      errors: [ ],
    };
  };

  const brew = async (msg) => {
    console.log({ cmd: 'brew', msg });
    await sleep(1500);
    console.log('Brewed!');
  };

  const bigmoiko = async () => {
    stops.push(26);
  };

  const continueBigmoiko = async () => {
    await sleep(10000);
    while (stops.length)
      stops.pop();
  };

  return {
    bigmoiko,
    continueBigmoiko,
    brew,
    milkrinse,
    rinse,
    screenrinse,
    status,
    stop: async () => console.log('stopped'),
    debugValvesOn: () => sleep(1),
    debugValvesOff: () => sleep(1),
    config
  };
};
