// @ts-check

const https = require('https');
const { path, sum, times } = require('ramda');
const { sleep } = require('u-queue');
const { createConfigManager } = require('./config-manager')
// some more requires() in module.exports

const CHUNK_SIZE = 500 * 1024;

function slack(msg) {
  const req = https.request({
    hostname: 'hooks.slack.com',
    path: '/services/T63P9PD5F/B6N5NUQLW/l55SaTL3LPlDh4Q9p1qz1Bn3',
    method: 'POST'
  }, (response) => 1);
  req.write(JSON.stringify(msg));
  req.on('error', (e) => {
    console.error("Failed to slack", e);
  });
  req.end();
}

const warningsReactions = {
  18: (eversys) => eversys.displayAction(4),  // finish product
  24: (eversys) => eversys.displayAction(6),  // finish product
  34: (eversys) => eversys.displayAction(1),  // bean hopper refilled
  35: (eversys) => eversys.displayAction(1),  // bean hopppr refilled
  36: (eversys) => eversys.displayAction(3),
  43: (eversys) => eversys.displayAction(9),  // restart display
};

const stopsReactions = {
  10: (eversys) => eversys.displayAction(1),  // bean hopper refilled
  11: (eversys) => eversys.displayAction(1),  // bean hopper refilled
  12: (eversys) => eversys.displayAction(1),  // bean hopper refilled
  14: (eversys) => eversys.doRinse(0).then(() => sleep(5000)),
  // 17: (eversys) => eversys.displayAction(3),  // continue
  21: (eversys) => eversys.displayAction(0),  // grounds emptied
  24: (eversys) => eversys.displayAction(2),  // milk tank cleaned
  26: (eversys) => eversys.doStartCleaning().then(() => eversys.displayAction(3)), // continue cleaning
  // 105: (eversys) => eversys.doRinse(1).then(() => sleep(5000)),
};

const errorsReactions = {
  103: (eversys) => eversys.displayAction(9),  // reboot
};

module.exports = ({ hwid, i2cValvesBus, i2cValvesAddr, i2cPumpsAddr = i2cValvesAddr[0], i2cValvesVersion, port,
                  detergFlowmeterI2cAddr, detergFlowmeterTicksPerLiter, detergFlowmeterTicksCM, detergFlowmeterTicksMS,
                  milkFactor = 1, waterFactors = [1, 1],
                  commonValve, valvesCount,
                  pressureThreshold = 55, hysteresis = 10, pressureDump = 0, gearPump, separateCleaning, purgeTime = 150000 }, complexbus) => {
  console.log('Starting real coffee machine drv');

  const i2c = require('i2c-bus');
  const eversysFactory = require('./eversys');
  const valvesFactory = i2cValvesVersion == 2 ? require('./valves-v2') : require('./valves-v1');

  const logIncident = (incdnt) =>
    complexbus.publish('complexos.bus.incidentDetected', { ...incdnt, hwid });

  const valves = valvesFactory({
                              i2cValvesBus,
                              i2cValvesAddr,
                              logIncident,
                              valvesCount,
                              commonValve,
                              onSwitch: (params) => complexbus.publish('complexos.valves.switched', params),
                              });

  const config = createConfigManager({
    startCleaningPurgeDelay: 150000,
    preAfterCleaningWash: 50000,
    postAfterCleaningWash: 150000,
    drainCleaningPurgeDelay: 300000,
    evercleanWorkTime: 10000,
    rinsaWorkTime: 50000,
  });

  const CleaningStatuses = {
    regular: {
      IDLE: "idle",
      PREWASHING: "prewashing",
      MSCLEANING: "MSCleaning",
      RINSING: "rinsing",
    },
    separate: {
      IDLE: "idle",
      PREWASHING: "prewashing",
      PREPARING: "preparing",
      MSCLEANING: "MSCleaning",
      RINSING: "rinsing"
    },
    quick: {
      IDLE: "idle",
      QUICKCLEANING: "quickCleaning",
      PUMPINGOUT: "postwashDraining",
      READYTOBREW: "postwashDraining (can brew)"
    }
  }

  /** @type {{ lastCleaningAt: number | null, lastCleaningDuration: number | null , cleaningName: string }} */
  let lastCleaningInfo = {
    lastCleaningAt: null,
    lastCleaningDuration: null,
    cleaningName: '',
  }

  const withTimingAndReport = (cleaningName = "Unknown cleaning", fn) => async ({ reporting = true } = {}, ...args) => {
    if (!reporting) {
      return fn(...args);
    }
    let startedAt = Date.now();
    try {
      complexbus.publish('complexos.devices.coffeemachine.cleaning-started', { cleaningName });
      const result = await fn(...args);
      return result;
    } catch (error) {
      console.error(`Error during ${cleaningName}: `, error);
    } finally {
      while (cleaningStatus !== CleaningStatuses.regular.IDLE) {
        await sleep(5000);
      }
      let endedAt = Date.now();
      lastCleaningInfo.lastCleaningDuration = endedAt - startedAt;
      lastCleaningInfo.lastCleaningAt = endedAt;
      complexbus.publish('complexos.devices.coffeemachine.cleaning-ended', { cleaningName, dur: lastCleaningInfo.lastCleaningDuration });
    }
  };

  const i2cbus = i2c.openSync(parseInt(i2cValvesBus));

  const i2cwrite = ({ addr, reg, b }) =>
    new Promise((res, rej) => i2cbus.writeByte(addr, parseInt(reg), parseInt(b), res));

  // TODO read getRequests from CM
  const setPressureThreshold = async ({ pressureThreshold }) =>
    i2cwrite({ addr: i2cPumpsAddr, reg: 0x71, b: pressureThreshold });

  const setHysteresis = async ({ hysteresis }) =>
    i2cwrite({ addr: i2cPumpsAddr, reg: 0x72, b: hysteresis });

  const setPressureDump = async ({ pressureDump }) =>
    i2cwrite({ addr: i2cPumpsAddr, reg: 0x78, b: pressureDump });

  const setFlowmeterTicksPerLiter = async ({ flowmeterI2cAddr, flowmeterTicksPerLiter }) => {
    i2cwrite({ addr: flowmeterI2cAddr, reg: 0x0d, b: (flowmeterTicksPerLiter & 0xff) });
    i2cwrite({ addr: flowmeterI2cAddr, reg: 0x0d + 1, b: ((flowmeterTicksPerLiter >> 8) & 0xff) });
  }

  let J3210_REG = 0x71;
  let J3220_REG = 0x78;
  let J3210_ON = 223;
  let J3210_OFF = 22;
  let J3220_ON = 1;
  let J3220_OFF = 0;

  const pumpOn = async ({ nozzleId }) => {
    if (nozzleId == 1) {
      i2cwrite({ addr: i2cPumpsAddr, reg: J3220_REG, b: J3220_ON });
    } else {
      i2cwrite({ addr: i2cPumpsAddr, reg: J3210_REG, b: J3210_ON });
    }
  }

  const pumpOff = async ({ nozzleId }) => {
    if (nozzleId == 1) {
      i2cwrite({ addr: i2cPumpsAddr, reg: J3220_REG, b: J3220_OFF });
    } else {
      i2cwrite({ addr: i2cPumpsAddr, reg: J3210_REG, b: J3210_OFF });
    }
  }

  //TODO use transport
  const timeout = (delay) => {
    let timer;
    const err = new Error('timeout');
    const promise = new Promise((_, rej) => {
      timer = setTimeout(() => rej(err), delay);
    });
    const cancel = () => clearTimeout(timer);
    return { promise, cancel };
  };

  const requestOneWithoutTimeout = (name, params = {}) =>
    new Promise((resolve, reject) => {
      let recvbuf, recvcnt = 0;
      const sid = complexbus.request(name, params, (response) => {
        if (response && response.hasOwnProperty('__chunk__')) {
          recvbuf = recvbuf || Buffer.alloc(response.__size__);
          Buffer.from(response.__data__, 'hex').copy(recvbuf, response.__chunk__ * CHUNK_SIZE);
          recvcnt += 1;
          if (recvcnt * CHUNK_SIZE >= response.__size__) {
            unsubscribe(sid);
            resolve(JSON.parse(recvbuf.toString()));
          }
        } else {
          unsubscribe(sid);
          resolve(response);
        }
      })
    });

  const requestOneWithRetries = (name, params, retryOptions = {}) => {
    const { retriesCount = 100, timeout: delay = 20000 } = retryOptions;
    const retry = async (count) => {
      try {
        const { promise: timeoutPromise } = timeout(delay);
        const response = await Promise.race([requestOneWithoutTimeout(name, params), timeoutPromise]);
        return response
      } catch (error) {
        if (count < 1) {
          throw error;
        }
        console.log('[SERVICE TRANSPORT] Request failed, retrying', { name, count, error });
        return retry(count - 1);
      }
    }
    return retry(retriesCount);
  };

  const requestWithAckAndRetry = async (name, params, retryOptions = {}) => {
    const { retriesCount = 100, timeout: delay = 5000 } = retryOptions;
    let count = retriesCount;
    const inbox = 'aerp-inbox';
    const ackChannel = `${inbox}.ack`;

    const ackPromise = new Promise((resolve) => {
      complexbus.subscribe(ackChannel, { max: 1 }, () => {
        console.log("ACK received!");
        resolve({ type: 'ack' });
      });
    });

    const resultPromise = new Promise((resolve) => {
      complexbus.subscribe(inbox, { max: 1 }, result => {
        console.log("RESULT received!");
        resolve({ type: 'done', result });
      });
    });

    complexbus.publish(name, params, inbox);

    const { promise: timeoutPromise, cancel: cancelTimeout } = timeout(delay);

    let racers = [
                  ackPromise,
                  timeout(500).promise.catch(() => ({ type: 'nack' })),
                  timeoutPromise.catch(() => ({ type: 'timeout' })),
                  resultPromise
                 ];
    do {
      try {
        const result = await Promise.race(racers);
        if (result.type == 'done') {
          return result.result;
        } else if (result.type == 'nack') {
          console.log('[SERVICE TRANSPORT] Request failed, retrying', { name, count });
          complexbus.publish(name, params, inbox);
          racers = [
                    ackPromise,
                    timeout(500).promise.catch(() => ({ type: 'nack' })),
                    timeoutPromise.catch(() => ({ type: 'timeout' })),
                    resultPromise
                   ];
          count -= 1;
        } else if (result.type == 'ack') {
          cancelTimeout();
          racers = [
                    resultPromise,
                    timeoutPromise.catch(() => ({ type: 'timeout' }))
                   ];
        } else if (result.type == 'timeout') {
          console.log('wtf');
          throw new Error('request timed out');
        }
      } catch (error) {
        console.error('An error occurred:', error);
      }
    } while (count > 0);
    console.log('No more retries left');
    throw new Error(`No listener for ${name}`);
  };

  // publish message
  const publish = (name, message) => complexbus.publish(name, message);
  // subscribe to messages
  const subscribe = (name, callback) => complexbus.subscribe(name, callback);
  const unsubscribe = (sid) => complexbus.unsubscribe(sid);

  /**
   * @param {{ on?: boolean, off?: boolean }} options
   */
  const purgeCM = async ({ on, off } = { on: false, off: false }) => {
    if (on) {
      await requestWithAckAndRetry('pumps.purgeCM!',
        {},
        { retriesCount: 2, timeout: 2500 })
        .catch((err) => {
          console.log('CM Purge pump was not switched on', err);
          return { error: true, timeout: true };
        });
    }
    if (off) {
      await requestWithAckAndRetry('pumps.stop.purgeCM!',
        {},
        { retriesCount: 2, timeout: 2500 })
        .catch((err) => {
          console.log('CM Purge pump was not switched off', err);
          return { error: true, timeout: true };
        });
    }
  }

  /**
   * @param {{ on?: boolean, off?: boolean }} options
   */
  const purgeMS = async ({ on, off } = { on: false, off: false }) => {
    if (on) {
      await requestWithAckAndRetry('pumps.purgeMS!',
        {},
        { retriesCount: 2, timeout: 2500 })
        .catch((err) => {
          console.log('MS Purge pump was not switched on', err);
          return { error: true, timeout: true };
        });
    }
    if (off) {
      await requestWithAckAndRetry('pumps.stop.purgeMS!',
        {},
        { retriesCount: 2, timeout: 2500 })
        .catch((err) => {
          console.log('MS Purge pump was not switched off', err);
          return { error: true, timeout: true };
        });
    }
  }

  /**
   * @param {{ on?: boolean, off?: boolean }} options
   */
  const commSwitch = async ({ on, off } = { on: false, off: false }) => {
    if (on) {
      await requestWithAckAndRetry('pumps.commSwitch!',
        {},
        { retriesCount: 2, timeout: 2500 })
        .catch((err) => {
          console.log('Commutating valves were not switched on', err)
          return { error: true, timeout: true }
        });
    }
    if (off) {
      await requestWithAckAndRetry('pumps.stop.commSwitch!',
        {},
        { retriesCount: 2, timeout: 2500 })
        .catch((err) => {
          console.log('Commutating valves were not switched off', err)
          return { error: true, timeout: true }
        });
    }
  }

  // helpers
  const read32 = (addr, reg) =>
    new Promise((res, rej) => {
      let buf = Buffer.alloc(4);
      const cb = (err, recvLength, recvBuf) => err ? rej(err) : res(buf.readInt32LE());
      i2cbus.readI2cBlock(addr, reg, 4, buf, cb)
    });

  const commit = () => i2cwrite({ addr: detergFlowmeterI2cAddr, reg: 0xE0, b: 0x77 });
  const readFlowmeter = (valve) => read32(detergFlowmeterI2cAddr, 0x90 + valve * 4);

  /**
   * @param {{ ms?: boolean, cm?: boolean }} options
   */
  const deterg = async ({ ms, cm } = { ms: false, cm: false }) => {
    if (ms) {
      const dt = config.get('rinsaWorkTime');
      const detergResult = requestWithAckAndRetry('pumps.detergMS!',
        { duration: dt },
        { retriesCount: 2, timeout: (dt + 2500) })
        .catch((err) => {
          console.log('Detergent was not added into MS canister', err)
          return { error: true, timeout: true }
        });

      if (detergFlowmeterI2cAddr) {
        try {
          await commit();
          let spillage = 0;
          let deterging = true;
          while (deterging && spillage < detergFlowmeterTicksMS) {
            spillage = await readFlowmeter(0);
            await sleep(300);
            console.log('[deterg] MS', { spillage, detergFlowmeterTicksMS });
            deterging = await Promise.race([
              detergResult.then(() => false, () => false),
              sleep(1).then(() => Promise.resolve(true))
            ]);
          }
          if (deterging) {
            requestWithAckAndRetry('pumps.stop.detergMS!', {});
          }
          complexbus.publish('complexos.bus.helpNeeded',
            {
              text: `При мойке молочной системы за ${dt}мс налилось ${spillage} тиков омывателя из ${detergFlowmeterTicksMS} положенных${spillage < detergFlowmeterTicksMS ? ', похоже трубы горят' : ' 👌🏻'}`
              , icon_emoji: ':soap:'
            });
        } catch (e) {
          console.log("Flowmeter dosing failed", e);
        }
      }
    }
    if (cm) {
      const dt = config.get('evercleanWorkTime');
      const detergResult = requestWithAckAndRetry('pumps.detergCM!',
        { duration: dt },
        { retriesCount: 2, timeout: (dt + 2500) })
        .catch((err) => {
          console.log('Detergent was not added into CM canister', err)
          return { error: true, timeout: true }
        });

      if (detergFlowmeterI2cAddr) {
        try {
          await commit();
          let spillage = 0;
          let deterging = true;
          while (deterging && spillage < detergFlowmeterTicksCM) {
            spillage = await readFlowmeter(0);
            console.log('[deterg] CM', { spillage, detergFlowmeterTicksCM });
            await sleep(300);
            deterging = await Promise.race([
              detergResult.then(() => false, () => false),
              sleep(1).then(() => Promise.resolve(true))
            ]);
          }
          if (deterging) {
            requestWithAckAndRetry('pumps.stop.detergCM!', {});
          }
          complexbus.publish('complexos.bus.helpNeeded',
            {
              text: `При мойке кофемашины за ${dt}мс налилось ${spillage} тиков омывателя из ${detergFlowmeterTicksCM} положенных${spillage < detergFlowmeterTicksCM ? ', похоже трубы горят' : ' 👌🏿'}`
              , icon_emoji: ':soap:'
            });
        } catch (e) {
          console.log("Flowmeter dosing failed", e);
        }
      }
    }
  }

  console.log('Setting purge time to  ', purgeTime, ' ms');

  // const eversys = eversysFactory({ portName: '/dev/tty.usbserial' });
  const eversys = eversysFactory({ portName: port, milkFactor, waterFactors });
  if (!gearPump) {
    console.log('Setting pressure threshold to  ', pressureThreshold);
    setPressureThreshold({ pressureThreshold });
    console.log('Setting hysteresis to  ', hysteresis);
    setHysteresis({ hysteresis });
    console.log('Setting pressure dump to  ', pressureDump);
    setPressureDump({ pressureDump });
  }
  else {
    pumpOff({ nozzleId: 0 });
    pumpOff({ nozzleId: 1 });
  };

  if (detergFlowmeterI2cAddr) {
    setFlowmeterTicksPerLiter({ flowmeterI2cAddr: detergFlowmeterI2cAddr, flowmeterTicksPerLiter: detergFlowmeterTicksPerLiter });
    console.log('Setting detergent flowmeter TicksPerLiter to  ', detergFlowmeterTicksPerLiter);
  };

  // TODO wait until stops are cleared
  const brewimpl = async ({ nozzleId, coffeeRecipe }) => {
    await valves.on({ nozzleId, coffeeRecipe });
    let valvesOn, response;
    try {
      // pumpOn({ nozzleId });
      valvesOn = await valves.read();
      response = await eversys.doProduct(nozzleId, coffeeRecipe);
    } finally {
      await valves.off({ nozzleId, coffeeRecipe });
      // pumpOff({ nozzleId });
    }
    if (response) {
      return {
        ...response,
        valvesOn,
        valvesOff: await valves.read(),
      };
    } else {
      throw new Error("Empty response");
    }
  };

  const getridofwarnings = async () => {
    // console.log('getting rid of warning');
    try {
      const { warnings, stops, errors, raw } = await eversys.getInfoMessages();

      (warnings.length || stops.length || errors.length) && console.log({ warnings, stops, errors, raw });
      const react = async ({ stimuli, reactions, category }) => {
        for (const s of stimuli) {
          if (reactions[s]) {
            slack({
              text: `${process.env.COMPLEXSYSNAME} coffee machine driver is reacting to ${category} ${s}. Now brewing: ${JSON.stringify(eversys.nowCooking(), null, 2)}`,
              icon_emoji: ':confounded:',
            });
            await reactions[s](eversys);
          }
        }
      };
      await react({ stimuli: warnings, reactions: warningsReactions, category: 'warning' });
      await react({ stimuli: stops, reactions: stopsReactions, category: 'stop' });
      await react({ stimuli: errors, reactions: errorsReactions, category: 'error' });
    } catch (e) {
      console.error("Getting rid of warnings falied", e);
    }
    setTimeout(getridofwarnings, 4222);
  };
  setTimeout(getridofwarnings, 555);

  const status = async () => {
    const [
      { warnings, stops, errors },
      valvesStatus, apiVersion,
    ] = await Promise.all([eversys.getInfoMessages(), valves.read(), eversys.getApiVersion()]);
    const { machineStatus, nozzles, leftSteamStatus, rightSteamStatus, hotWaterStatus, leftSteamProcess, rightSteamProcess, hotWaterProcess } = await eversys.getStatus();
    return {
      machineStatus, nozzles, leftSteamStatus, rightSteamStatus, hotWaterStatus, leftSteamProcess, rightSteamProcess, hotWaterProcess,
      warnings: [...warnings],
      stops: [...stops],
      errors: [...errors],
      valves: valvesStatus,
      separateCleaning: separateCleaning,
      cleaningStatus: cleaningStatus,
      cleaningInfo: lastCleaningInfo,
      APIVersion: apiVersion.join(['.']),
      retrievedAt: new Date().toISOString(),
    };
  };

  // TODO move it to os
  const maxvalve = Math.trunc(sum(valvesCount) / 2) - (commonValve ? 1 : 0);
  const postWashingRinse = async (tubesLength = 5500) => {
    for (let v = 0; v < maxvalve; v += 1) {
      await Promise.all(times((nozzleId) =>
                                  milkrinse({ nozzleId,
                                              tubes: true,
                                              tubesLength,
                                              valves: commonValve
                                                    ? [ v + (maxvalve + 1)*nozzleId, maxvalve + (maxvalve + 1)*nozzleId ]
                                                    : [ v + maxvalve*nozzleId ] })
                        , 2));
    }
    if (gearPump) {
      await Promise.all(times((nozzleId) =>
                                  milkrinse({ nozzleId, tubes: true, tubesLength, valves: [ ] })
                        , 2));
    }
  };

  const pumpWashingRinse = async ({ washTime = 60000 }) => {
    for (let v = 0; v < maxvalve; v += 1) {
      await Promise.all(times((nozzleId) =>
                                  pumpRinse({ nozzleId,
                                              washTime,
                                              valves: commonValve
                                                    ? [ v + (maxvalve + 1)*nozzleId, maxvalve + (maxvalve + 1)*nozzleId ]
                                                    : [ v + maxvalve*nozzleId ] })
                        , 2));
    }
  };

  let lastStatus = {};
  (() => {
    // TODO move it to os
    const microMilkRinse = async () => {
      await Promise.all([
        milkrinse({ nozzleId: 0, tubes: true, tubesLength: 1500, valves: [] }),
        sleep(250).then(() => milkrinse({ nozzleId: 1, tubes: true, tubesLength: 1500, valves: [] }))]);
      await sleep(150);
      await Promise.all([
        milkrinse({ nozzleId: 0, tubes: true, tubesLength: 1500, valves: [] }),
        sleep(250).then(() => milkrinse({ nozzleId: 1, tubes: true, tubesLength: 1500, valves: [] }))]);
    };
    // setTimeout(microMilkRinse, 150);

    const isCleaning = (status) =>
      (path(['nozzles', 0, 'process'], status) == 5) && (path(['nozzles', 1, 'process'], status) == 5);

    const afterCleaningWash = () => {
      let done = false;
      cleaningStatus = CleaningStatuses.regular.RINSING;
      (async () => {
        console.log('[ cleaning ][ RINSING ] Sleep for 10000 ms.');
        await sleep(10000);
        purgeCM({ on: true });
        await sleep(config.get('preAfterCleaningWash'));
        await postWashingRinse();
        await sleep(config.get('postAfterCleaningWash'));
        purgeCM({ off: true });
        await sleep(5000);
        done = true;
      })();

      return async () => {
        if (done) {
          cleaningStatus = CleaningStatuses.regular.IDLE;
          return workNormally();
        }
      };
    };

    const continueQuickMoiko = async () => {
      let done = false;
      cleaningStatus = CleaningStatuses.quick.PUMPINGOUT;
      (async () => {
        commSwitch({ off: true });
        cleaningStatus = CleaningStatuses.quick.READYTOBREW;
        purgeCM({ on: true });
        await sleep(config.get('drainCleaningPurgeDelay'));
        purgeCM({ off: true });
        console.timeEnd('SCQuick');
        quick = false;
        await sleep(5000);
        done = true;
      })();

      return async () => {
        if (done) {
          cleaningStatus = CleaningStatuses.regular.IDLE;
          return workNormally();
        }
      };
    };

    const bigCleaning = () => {
      let cooldown = 20;
      if (separateCleaning) {
        if (quick) {
          return async (status) => {
            if (isCleaning(status)) {
              cooldown = 20;
            } else {
              if (cooldown > 0) {
                cooldown -= 1;
              } else {
                return continueQuickMoiko();
              }
            }
          }
        }
      } else {
        cleaningStatus = CleaningStatuses.regular.MSCLEANING;
        valves.washever();

        return async (status) => {
          if (isCleaning(status)) {
            cooldown = 20;
          } else {
            if (cooldown > 0) {
              cooldown -= 1;
            } else {
              await valves.dontWash();
              return afterCleaningWash();
            }
          }
        }
      }
    };

    const workNormally = () => async (status) => {
      if (isCleaning(status)) {
        return bigCleaning();
      }
    };

    let cleaningWorkflow = workNormally();
    const monitorCleaning = async () => {
      try {
        lastStatus = await status();
        // console.log({ lastStatus});
        cleaningWorkflow = (await cleaningWorkflow(lastStatus)) || cleaningWorkflow;
      } catch (err) {
        console.log("status() failed", err);
      } finally {
        setTimeout(monitorCleaning, 1111);
      }
    };
    setTimeout(monitorCleaning, 1111);
  })();

  // eversys.getStatus().then(console.log);

  // valves.washever();

  const rinse = ({ nozzleId }) =>
    eversys.doRinse(nozzleId);

  const milkrinse = async ({ nozzleId, tubes = true, outlet = true, withSteam = false, tubesLength = 0, valves: mask }) => {
    if (mask) {
      await valves.on({ nozzleId, coffeeRecipe: { valves: mask } });
    }
    const result = await eversys.doMilkRinse(nozzleId, { tubes, outlet, withSteam, tubesLength });
    await sleep(2000);
    while (path(['nozzles', nozzleId, 'status'], lastStatus) != 1) {
      await sleep(800);
    }
    // await sleep(1000);
    if (mask) {
      await valves.off({ nozzleId, coffeeRecipe: { valves: mask } });
    }
    return result;
  };

  const pumpRinse = async ({ nozzleId, washTime = 1000, valves: mask }) => {
    if (mask) {
      console.log('[pmpwsh] pump-washing at nozzle ', nozzleId, ', valves ', { valves: mask }, ' for ', washTime, ' at ', new Date().toISOString());
      await valves.on({ nozzleId, coffeeRecipe: { valves: mask } });
      pumpOn({ nozzleId });
    }
    await sleep(washTime);
    if (mask) {
      await valves.off({ nozzleId, coffeeRecipe: { valves: mask } });
      pumpOff({ nozzleId });
    }
    return true;
  };

  const screenrinse = ({ nozzleId, cycles, repetitions }) =>
    eversys.doScreenRinse(nozzleId, { cycles, repetitions });

  const bigmoiko = withTimingAndReport('Big Wash', async () => {
    if (separateCleaning) {
      quick = false;
      console.time('Separate Cleaning');
      await separateCleaningPreWash({ reporting: false });
      await separateCleaningPrepare({ reporting: false });
      await separateCleaningPumpWash({ reporting: false });
      await separateCleaningWashAway({ reporting: false });
      console.timeEnd('Separate Cleaning');
      return true;
    } else {
      cleaningStatus = CleaningStatuses.regular.PREWASHING;
      console.log('[ cleaning ][ Big Wash ] Sleep for 10000 ms.');
      await sleep(10000);
      purgeCM({ on: true });
      await postWashingRinse();
      await postWashingRinse();
      await sleep(config.get('startCleaningPurgeDelay'));
      purgeCM({ off: true });
      deterg({ cm: true });
      await eversys.doStartCleaning();
      return true;
    }
  });
  let moitso = false;
  let quick = false;
  let cleaningStatus = CleaningStatuses.regular.IDLE;

  const quickMoiko = withTimingAndReport('Quick Wash', async () => {
    if(separateCleaning){
      cleaningStatus = CleaningStatuses.quick.QUICKCLEANING
      quick = true;
      console.time('SCQuik');
      console.log('[ cleaning ][ Quick Wash ] Sleep for 10000 ms.');
      await sleep(10000);
      deterg({ cm: true });
      commSwitch({ on: true });
      console.log('quickMoiko send moiko');
      await eversys.doStartCleaning();
    } else {
      console.log('Separate cleaning is not supported. Quick moiko rejected.');
    }
  });

  const separateCleaningPreWash = withTimingAndReport('Prewash', async () => {
    if(separateCleaning){
      cleaningStatus = CleaningStatuses.separate.PREWASHING;
      console.time('SCPreWash');
      console.log('[ cleaning ][ Prewash ] Sleep for 10000 ms.');
      await sleep(10000);
      purgeMS({ on: true });
      await postWashingRinse(5000);
      await sleep(config.get('startCleaningPurgeDelay'));
      purgeMS({ off: true });
      console.timeEnd('SCPreWash');
      cleaningStatus = CleaningStatuses.separate.IDLE;
    } else {
      console.log('Separate cleaning is not supported. SCPreWash rejected.');
    }
  });

  const separateCleaningPrepare = withTimingAndReport('Prepare', async () => {
    if (separateCleaning) {
      cleaningStatus = CleaningStatuses.separate.PREPARING;
      console.time('SCPrepare');
      console.log('[ cleaning ][ Prepare ] Sleep for 10000 ms.');
      await sleep(10000);
      await deterg({ cm: true });
      await sleep(5000);
      await deterg({ ms: true });
      await postWashingRinse(5500);
      commSwitch({ on: true });
      await eversys.doStartCleaning();
      console.timeEnd('SCPrepare');
      cleaningStatus = CleaningStatuses.separate.IDLE;
    } else {
      console.log('Separate cleaning is not supported. SCPrepare rejected.');
    }
  });

  const separateCleaningPumpWash = withTimingAndReport('MSwash', async () => {
    if(separateCleaning){
      cleaningStatus = CleaningStatuses.separate.MSCLEANING;
      console.time('SCPumpWash');
      await pumpWashingRinse({ washTime: 60000 });
      console.log('[ cleaning ][ MSWash ] Sleep for 10000 ms.');
      await sleep(10000);
      purgeCM({ on: true });
      purgeMS({ on: true });
      await sleep(config.get('startCleaningPurgeDelay'));
      purgeCM({ off: true });
      purgeMS({ off: true });
      commSwitch({ off: true });
      console.timeEnd('SCPumpWash');
      cleaningStatus = CleaningStatuses.separate.IDLE;
    } else {
      console.log('Separate cleaning is not supported. SCPumpWash rejected.');
    }
  });

  const separateCleaningWashAway = withTimingAndReport('Postwash', async () => {
    if(separateCleaning){
      cleaningStatus = CleaningStatuses.separate.RINSING;
      console.log('[ cleaning ][ washAway ] Sleep for 10000 ms.');
      await sleep(10000);
      console.time('SCWashAway');
      purgeMS({ on: true });
      await postWashingRinse(15000);
      await sleep(config.get('drainCleaningPurgeDelay'));
      purgeMS({ off: true });
      console.timeEnd('SCWashAway');
      cleaningStatus = CleaningStatuses.separate.IDLE;
    } else {
      console.log('Separate cleaning is not supported. SCWashAway rejected.');
    }
  });

  const continueBigmoiko = async () => {
    if (moitso) {
      return false;
    }
    moitso = true;
    try {
      await eversys.displayAction(3); // due to eversys API bug there is a need to send continue in both ways
      await eversys.doStartCleaning()
      await valves.wash();
    } finally {
      moitso = false;
    }
    return true;
  };

  const brew = async (msg) => {
    try {
      console.log('brew request', msg);
      const brewResult = await brewimpl(msg);

      // TODO make sure it's last product
      console.log('Brewed!', { brewResult });

      if (brewResult.stopped) {
        return {
          error: true,
          result: brewResult,
        };
      } else {
        return {
          success: true,
          result: brewResult,
        };
      }
    } catch (err) {
      return {
        error: true,
        result: { stopped: true, fatal: true },
      };
    }
  };

  const debugValvesOn = async ({ nozzleId, valves: mask }) =>
    valves.on({ nozzleId, coffeeRecipe: { valves: mask } });
  const debugValvesOff = async ({ nozzleId, valves: mask }) =>
    valves.off({ nozzleId, coffeeRecipe: { valves: mask } });

  return {
    debugValvesOn,
    debugValvesOff,
    bigmoiko,
    quickMoiko,
    separateCleaningPreWash,
    separateCleaningPrepare,
    separateCleaningPumpWash,
    separateCleaningWashAway,
    pumpWashingRinse,
    continueBigmoiko,
    brew,
    milkrinse,
    rinse,
    screenrinse,
    stop: async ({ mp }) => eversys.stop(mp),
    status: async () => lastStatus,
    config,
  };
};
