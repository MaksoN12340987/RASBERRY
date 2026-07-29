// @ts-check

const EventEmitter = require('events');
const { SerialPort } = require('serialport');
const { throttlingQueueFactory, sleep } = require('u-queue');

const crcPolynomTable = [
    0x0000,0xc0c1,0xc181,0x0140,0xc301,0x03c0,0x0280,0xc241,
    0xc601,0x06c0,0x0780,0xc741,0x0500,0xc5c1,0xc481,0x0440,
    0xcc01,0x0cc0,0x0d80,0xcd41,0x0f00,0xcfc1,0xce81,0x0e40,
    0x0a00,0xcac1,0xcb81,0x0b40,0xc901,0x09c0,0x0880,0xc841,
    0xd801,0x18c0,0x1980,0xd941,0x1b00,0xdbc1,0xda81,0x1a40,
    0x1e00,0xdec1,0xdf81,0x1f40,0xdd01,0x1dc0,0x1c80,0xdc41,
    0x1400,0xd4c1,0xd581,0x1540,0xd701,0x17c0,0x1680,0xd641,
    0xd201,0x12c0,0x1380,0xd341,0x1100,0xd1c1,0xd081,0x1040,
    0xf001,0x30c0,0x3180,0xf141,0x3300,0xf3c1,0xf281,0x3240,
    0x3600,0xf6c1,0xf781,0x3740,0xf501,0x35c0,0x3480,0xf441,
    0x3c00,0xfcc1,0xfd81,0x3d40,0xff01,0x3fc0,0x3e80,0xfe41,
    0xfa01,0x3ac0,0x3b80,0xfb41,0x3900,0xf9c1,0xf881,0x3840,
    0x2800,0xe8c1,0xe981,0x2940,0xeb01,0x2bc0,0x2a80,0xea41,
    0xee01,0x2ec0,0x2f80,0xef41,0x2d00,0xedc1,0xec81,0x2c40,
    0xe401,0x24c0,0x2580,0xe541,0x2700,0xe7c1,0xe681,0x2640,
    0x2200,0xe2c1,0xe381,0x2340,0xe101,0x21c0,0x2080,0xe041,
    0xa001,0x60c0,0x6180,0xa141,0x6300,0xa3c1,0xa281,0x6240,
    0x6600,0xa6c1,0xa781,0x6740,0xa501,0x65c0,0x6480,0xa441,
    0x6c00,0xacc1,0xad81,0x6d40,0xaf01,0x6fc0,0x6e80,0xae41,
    0xaa01,0x6ac0,0x6b80,0xab41,0x6900,0xa9c1,0xa881,0x6840,
    0x7800,0xb8c1,0xb981,0x7940,0xbb01,0x7bc0,0x7a80,0xba41,
    0xbe01,0x7ec0,0x7f80,0xbf41,0x7d00,0xbdc1,0xbc81,0x7c40,
    0xb401,0x74c0,0x7580,0xb541,0x7700,0xb7c1,0xb681,0x7640,
    0x7200,0xb2c1,0xb381,0x7340,0xb101,0x71c0,0x7080,0xb041,
    0x5000,0x90c1,0x9181,0x5140,0x9301,0x53c0,0x5280,0x9241,
    0x9601,0x56c0,0x5780,0x9741,0x5500,0x95c1,0x9481,0x5440,
    0x9c01,0x5cc0,0x5d80,0x9d41,0x5f00,0x9fc1,0x9e81,0x5e40,
    0x5a00,0x9ac1,0x9b81,0x5b40,0x9901,0x59c0,0x5880,0x9841,
    0x8801,0x48c0,0x4980,0x8941,0x4b00,0x8bc1,0x8a81,0x4a40,
    0x4e00,0x8ec1,0x8f81,0x4f40,0x8d01,0x4dc0,0x4c80,0x8c41,
    0x4400,0x84c1,0x8581,0x4540,0x8701,0x47c0,0x4680,0x8641,
    0x8201,0x42c0,0x4380,0x8341,0x4100,0x81c1,0x8081,0x4040
  ];

const everqueue = throttlingQueueFactory({ delay: 250 });

const evertwobytes = (x) => [x & 0xFF, x >> 8];
const everbyte = (x) => [x & 0xFF];

const crcEver = (data) => {
  var checksum = 0xFFFF;
  for (const x of data) {
    checksum = (checksum >> 8) ^ crcPolynomTable[(checksum ^ x) & 0xFF];
  }
  return evertwobytes(checksum);
}

const processDumpRow = (raw) => ({
  day: raw[0],
  month: raw[1],
  year: 2000 + raw[2],
  second: raw[3],
  minute: raw[4],
  hour: raw[5],
  cakePressBefore: raw[6] | (raw[7] << 8),
  cakePressAfter: raw[8] | (raw[9] << 8),
  cakePressFinal: raw[10] | (raw[11] << 8),
  cakePressHub: raw[12] | (raw[13] << 8),
  nozzle: raw[14] == 0 ? 'left' : 'right',
  powderQty: raw[15],
  pwdrQntyCtrl: raw[16] == 0 ? 'off' : 'on',
  extractTime: raw[17] | (raw[18] << 8),
  waterQnty: raw[19] | (raw[20] << 8),
  waterTemp: raw[21] | (raw[22] << 8),
  prodType: raw[23],
  doubleProd: raw[24],
  keyId: raw[25],
  beanHopp: raw[26],
  outSide: raw[27] === 0 ? 'left' : 'right',
  stopped: raw[28] != 0,
  grindAdjustLeft: raw[29] | (raw[30] << 8),
  grindAdjustRight: raw[31] | (raw[32] << 8),
  refExtractTime: raw[33],
  milkTemp: raw[34],
  steamPress: raw[35],
  milkTime: raw[36] | (raw[37] << 8),
  rpmFoam: raw[38] | (raw[39] << 8),
  rpmMilk: raw[40] | (raw[41] << 8),
  boilerTemp: raw[42] | (raw[43] << 8),
  mctTempFoam: raw[44],
  mctTempMilk: raw[45],
  mctTimeFoam: raw[46] | (raw[47] << 8),
  mctTimeMilk: raw[48] | (raw[49] << 8),
  milkInputTemp: raw[50],
  airQuantity: raw[51],
});

// const crcEver = (data) =>
//   evertwobytes(data.reduce((checksum, x) =>
//     (checksum >> 8) ^ crcPolynomTable[(checksum ^ x) & 0xFF], 0xFFFF));

// const packetHeader = () => [0x00, 0x6C, 0x02,0x42, 0x41];
const packetHeader = ({ pip = 0, pie, pn, sa = 0x42, da = 0x41 }) =>
    [pip, pie, pn, sa, da];
// const dataHeader = () => [0x0, 0x00, 0x00, 0x00];
const dataHeader = ({ mi, mp = 0, data = [] }) =>
    [mi]
      .concat(evertwobytes(mp))
      .concat(evertwobytes(data.length))
      .concat(data);

const SOH_e = 0x01, // Start of Header (begin of packet)
      ETB_e = 0x17, // End of Transmit Block (end of packet)
      DLE_e = 0x10, // Shift Character (next character has to be XORed)
      NUL_e = 0x00, // NULL char
      STX_e = 0x02, // Start of Text
      ETX_e = 0x03, // End of Text
      EOT_e = 0x04, // End of Transmission
      LF_e = 0x0A, // Line Feed
      CR_e = 0x0D, // Carriage Return
      ModemEsc_e = 0x2B, // Standard Modem Escape Character
      ShiftXOR_e = 0x40,
      specialChars = [ SOH_e, ETB_e, NUL_e, STX_e, ETX_e, EOT_e, LF_e, CR_e, DLE_e, ModemEsc_e, ShiftXOR_e ].reduce((acc, x) => {acc[x] = [DLE_e, x ^ ShiftXOR_e]; return acc }, {});

const PACKET_TYPE = {
    Data_e: 0,
    Reserved_e: 1, // reserved for future use
    PosAck_e: 2,
    NegAck_e: 3,
    Request_e: 4
};

const CMD = {
    GetApiVersion_e: 0,
    GetStatus_e: 1,
    DoProduct_e: 2,
    DoRinse_e: 3,
    StartCleaning_e: 4,
    GrinderAdjust_e: 5,
    Grind_e: 6,
    ResetNextCleanDate_e: 7,
    ScreenRinse_e: 8,
    CPUInputTest_e: 9,
    GetExtractionTime_e: 10,
    Stop_e: 11,
    GetRequests_e: 12,
    GetInfoMessages_e: 13,
    MilkOutletRinse_e: 14,
    DisplayAction_e: 15,
    GetProductDump_e: 16,
    GetSensorValues_e: 17,
    DoEtcCalibration_e: 18,
}

const timeoutPromise = (t, promise) => new Promise((res, rej) => {
  const timer = setTimeout(() => rej(new Error('eversys timeout')), t);
  promise.then((rez) => {
    clearTimeout(timer);
    res(rez);
  })
});

const shiftandstuff = (msg) => [].concat.apply([],
    msg.map((x) => specialChars[x] || [x]));

const unstuff = (buffer) => {
  const res = [];
  var inv = false;
  for (const x of buffer) {
    if (inv) {
       res.push(x ^ ShiftXOR_e);
       inv = false;
    } else if (x == DLE_e) {
      inv = true;
    } else {
      res.push(x);
    }
  }
  return Buffer.from(res);
};

const receiveTelegram = (buffer, emitter) => {
  const raw = unstuff(buffer.slice(1, -1)),
      parity = raw[0] >> 6,
      protocolVersion = raw[0] & 0x3F,
      pie = raw[1],
      isEncrypted = raw[1] >> 7,      // ???
      appPort = (raw[1] >> 3) & 0xF,  // ???
      packetType = raw[1] & 0x7,       // ???
      sequenceNumber = raw[2],
      source = raw[3],
      destination = raw[4];

  // console.log("[ Eversys ] ", raw.toString('hex'));

  // TODO check incoming parity
  if (crcEver) {
    emitter.emit('telegram', {
      parity,
      pie,
      protocolVersion,
      isEncrypted,
      appPort,
      packetType,
      sequenceNumber,
      source,
      destination,
      raw
    });
  }
}

const processPacket = (buffer, emitter) => {
  const sohindex = buffer.indexOf(SOH_e);
  if (sohindex > -1) {
    buffer = buffer.slice(sohindex);
    const eotindex = buffer.indexOf(EOT_e) + 1;
    if (eotindex > 0) {
      receiveTelegram(buffer.slice(0, eotindex), emitter);
      return processPacket(buffer.slice(eotindex), emitter);
    } else {
      return buffer;
    }
  } else {
    return null;
  }
};

const eversysFactory = ({ portName, milkFactor = 1, waterFactors = [1, 1] }) => {
  const port = new SerialPort({
    path: portName,
    baudRate: 115200
  });

  let reconnect_promise = Promise.resolve('idle');
  const reconnect = async () => {
    let state = await Promise.race([ reconnect_promise, sleep(1).then(() => 'progress')]);
    if (state == 'idle') {
      const impl = async () => {
        console.log("[ Eversys ] Reconnecting to serial port");
        if (port.isOpen) {
          port.close();
          await sleep(300);
        }
        port.open();
        await sleep(300);
        return 'idle';
      };
      reconnect_promise = impl();
    }
    await reconnect_promise;
  };

  port.on('error', (e) => {
    // TODO throw error to higher level
    console.log("[ Eversys ] SerialPort horror", e);
    if (!port.isOpen) {
      setTimeout(reconnect, 444);
    }
  });
  port.on('close', (e) => {
    console.log("[ Eversys ] SerialPort closed", e);
    setTimeout(reconnect, 444);
  });

  let pnCounter = 0;
  const incoming = new EventEmitter();
  // incoming.on('telegram', (t) => console.log('tgm!', t))

  console.log('[ Eversys ] connected to', portName);


  let recBuffer = null;
  port.on('readable', () => {
    const packet = port.read();
    if (recBuffer) {
      recBuffer = processPacket(Buffer.concat([recBuffer, packet]), incoming);
    } else {
      recBuffer = processPacket(packet, incoming);
    }
  });

  const singleSend = (pn, command) => everqueue(() => {
    let cleanup;
    return Promise.race([
      new Promise((res, rej) => {
        const ackListener = ({ sequenceNumber, pie, packetType, raw }) => {
          if (sequenceNumber == pn) {
            if (packetType == PACKET_TYPE.PosAck_e) {
              // console.log('[ Eversys ] ACK received for pn=', pn);
              // incoming.removeListener('telegram', ackListener);
              if (command.onlyack) {
                res();
              }
            } else if (packetType == PACKET_TYPE.NegAck_e) {
              console.log('[ Eversys ] NACK :( for pn=', pn);
              cleanup && cleanup();
              rej('NACK!');
            } else if (pie == 0x68) {
              // console.log('[ Eversys ] Response received for pn=', pn, raw.slice(5));
              res(raw.slice(5));
            }
          }
        };
        cleanup = () => {
          incoming.removeListener('telegram', ackListener);
        };
        incoming.on('telegram', ackListener);

        const ph = packetHeader({
          pie: command.pie,
          pn
        });
        const dh = dataHeader(command);
        const body = ph.concat(dh).concat(crcEver(ph.concat(dh)));
        var msg = [SOH_e].concat(shiftandstuff(body)).concat([EOT_e]);

        // console.log("[ Eversys ] Sending", Buffer.from(msg).toString('hex'));
        port.write(Buffer.from(msg));
      }),

      sleep(2000).then(() => {
        cleanup && cleanup();
        return Promise.reject('toulong');
      })
    ]);
  });

  const executeCommand = (command) => {
    const packetnumber = pnCounter ++;
    if (pnCounter == 255) {
      pnCounter = 0;
    }

    return singleSend(packetnumber, command)
      .catch((err) => {
        console.log("[ Eversys ] retrying", { packetnumber, command }, err);
        return singleSend(packetnumber, command)
      }).catch(async (err) => {
        console.log("[ Eversys ] Closing/openning conn", err);
        await reconnect();
        console.log("[ Eversys ] retrying #2", { packetnumber, command });
        return singleSend(packetnumber, command)
      });
  };
      // sleep(1500).then(() => Promise.reject('timout'))

  //// public api
  const nozzleDumpsQueue = new EventEmitter();
  const nowCooking = {};
  const trackCooking = (nozzle, recipe, promise) => {
    nowCooking[nozzle] = recipe;
    const markdone = () => delete nowCooking[nozzle];
    promise.then(markdone, markdone);
  };

  const crawlDumps = async () => {
    while (true) {
      let dump;
      try {
        dump = await dumpProducts();
      } catch(e) {
        console.log("[ Eversys ] dump failed", e);
      }
      if (dump) {
        console.log("[ Eversys ] Product ready, posting to queue", dump);
        nozzleDumpsQueue.emit(dump.nozzle, dump);
      } else {
        await sleep(Object.keys(nowCooking).length ? 888 : 7777);
      }
    }
  };
  setTimeout(crawlDumps, 111);

  const getApiVersion = async () => {
    const raw = await executeCommand({ pie: 0x6C, mi: CMD.GetApiVersion_e });
    const apiVersion = raw.slice(5, 8);
    return apiVersion;
  }

  const getStatus = async () => {
    const raw1 = await executeCommand({ pie: 0x6C, mi: CMD.GetStatus_e });
    const raw = raw1.slice(5);
    const [ machineStatus,
            leftNozzleStatus, rightNozzleStatus,
            leftSteamStatus, rightSteamStatus,
            hotWaterStatus,
            leftNozzleProcess, rightNozzleProcess,
            leftSteamProcess, rightSteamProcess,
            hotWaterProcess ] = raw;
    return {
      machineStatus,
      nozzles: [
        {
          status: leftNozzleStatus & 0xF,
          action: leftNozzleStatus >> 4,
          process: leftNozzleProcess
        },
        {
          status: rightNozzleStatus & 0xF,
          action: rightNozzleStatus >> 4,
          process: rightNozzleProcess
        },
      ],
      leftSteamStatus, rightSteamStatus,
      hotWaterStatus,
      leftSteamProcess, rightSteamProcess,
      hotWaterProcess,
      raw
    };
  };
  const getInfoMessages = async () => {
    const raw = await executeCommand({ pie: 0x6C, mi: CMD.GetInfoMessages_e, data: [0, 0, 0] });
    var p = 5;
    const warnings = raw.slice(p + 1, p + 1 + raw[p]);
    p += 1 + raw[p];
    const stops = raw.slice(p + 1, p + 1 + raw[p]);
    p += 1 + raw[p];
    const errors = raw.slice(p + 1, p + 1 + raw[p]);
    p += 1 + raw[p];
    return { warnings, stops, errors, raw };
  }
  const displayAction = async (action) => {
    console.log('[ Eversys ] display action', action);
    await executeCommand({
      pie: 0x68,
      mi: CMD.DisplayAction_e,
      mp: action,
      onlyack: true});
    return true;
  };

  let suspiciousDumpsHistory = {};
  let suspiciousKeysQueue = [];
  const cleanupSuspiciousDumps = () => suspiciousDumpsHistory = {};
  const dumpProducts = async () => {
    const raw = await executeCommand({ pie: 0x6C, mi: CMD.GetProductDump_e });
    if (raw.length < 8) {
      // console.log("[ Eversys ] corrupted dump, ignoring", raw);
      return null;
    }
    const parsed = processDumpRow(raw.slice(5));
    const key = [
      parsed.year,
      parsed.month,
      parsed.day,
      parsed.hour,
      parsed.minute,
      parsed.second,
      `nozzle-${parsed.nozzle}`,
    ].join(':');
    if (suspiciousDumpsHistory[key]) {
      console.log("[ Eversys ] Ignoring existing dump", { key, old: suspiciousDumpsHistory[key], new: parsed });
      return null;
    } else {
      suspiciousKeysQueue.push(key);
      while (suspiciousKeysQueue.length > 100) {
        delete suspiciousDumpsHistory[suspiciousKeysQueue.shift()];
      }
      suspiciousDumpsHistory[key] = parsed;
      console.log('[ Eversys ] Dumping products', { parsed });
      return parsed;
    }
  };

  const doProduct = async(nozzle, {
    productType = 2,
    productProcess = 0,
    waterQuantity = 0,
    beanHopper = 1,
    cakeThickness = 120,
    tamping = 64,
    preInfusion = 2,
    relaxTime = 8,
    secondTamping = 0,
    milkQuantity = 0,
    milkTemperature = 0,
    milkPercent = 30,
    milkSequence = 0,
    latteMacchiatoTime = 10,
    foamSequence = 1,
    steamTime = 0,
    steamTemperature = 80,
    everfoamMode = 0,
    airStopTemperature = 90,
    airStopTime = 100,
    pumpSpeedMilk = 100,
    pumpSpeedFoam = 100,
    airQuantity = 50,
    milkCoffeeDelayTime = 20,
    hotWaterQuantity = 0,
    bypass = 0,
    milkSort = 0,
    originalMilkSort,
  }) => {
    const waterFactor = waterFactors[nozzle % waterFactors.length];

    console.log('[ Eversys ] doing product', { productType, nozzle, waterFactor, milkFactor });
    let cookingStarted = false;
    let attempt = 0;
    while (!cookingStarted && attempt < 20) {
      await executeCommand({
        pie: 0x68,
        mi: CMD.DoProduct_e,
        mp: nozzle,
        onlyack: true,
        data: everbyte(productType)
                .concat(everbyte(productProcess))
                .concat(evertwobytes(waterQuantity))
                .concat(everbyte(beanHopper))
                .concat(evertwobytes(cakeThickness))
                .concat(everbyte(tamping))
                .concat(everbyte(preInfusion))
                .concat(everbyte(relaxTime))
                .concat(everbyte(secondTamping))
                .concat(evertwobytes(Math.round(milkQuantity * milkFactor)))
                .concat(everbyte(milkTemperature))
                .concat(everbyte(milkPercent))
                .concat(everbyte(milkSequence))
                .concat(everbyte(latteMacchiatoTime))
                .concat(everbyte(foamSequence))
                .concat(evertwobytes(steamTime))
                .concat(everbyte(steamTemperature))
                .concat(everbyte(everfoamMode))
                .concat(everbyte(airStopTemperature))
                .concat(evertwobytes(airStopTime))
                .concat(evertwobytes(pumpSpeedMilk))
                .concat(evertwobytes(pumpSpeedFoam))
                .concat(everbyte(airQuantity))
                .concat(evertwobytes(milkCoffeeDelayTime))
                .concat(evertwobytes(Math.round(hotWaterQuantity) * waterFactor))
                .concat(everbyte(Math.round(bypass) * waterFactor))
                .concat(everbyte(milkSort))
      });
      await sleep(3210);
      const status = await getStatus();
      cookingStarted = status.nozzles[nozzle].action != 0;
      attempt += 1;
    }

    const historyDump = new Promise((resolve) =>
      nozzleDumpsQueue.once(nozzle == 0 ? 'left' : 'right', resolve));

    const idleTooLong = async () => {
      await sleep(5000);
      let cooked = false;
      while (!cooked) {
        await sleep(1000);
        try {
          const status = await getStatus();
          // console.log(JSON.stringify(status, null, 2));
          // cooked = status.nozzles[nozzle].status == 1 || status.nozzles[nozzle].action == 3;
          cooked = status.nozzles[nozzle].action == 0;
        } catch(e) {
          console.log('[ Eversys ] waiting failure', e);
        }
      }
      await sleep(5000);
      return {
        success: true,
        undumped: true,
      };
    };

    const pacedeath = sleep(3*60*1000).then(() => ({ error: true, reason: 'time is out' }));

    const result = Promise.race([
      historyDump,
      idleTooLong(),
      pacedeath,
    ]);
    trackCooking(nozzle, { productType, productProcess, waterQuantity, beanHopper, cakeThickness, tamping, preInfusion, relaxTime, secondTamping, milkQuantity, milkTemperature, milkPercent, milkSequence, latteMacchiatoTime, foamSequence, steamTime, steamTemperature, everfoamMode, airStopTemperature, airStopTime, pumpSpeedMilk, pumpSpeedFoam, airQuantity, milkCoffeeDelayTime, hotWaterQuantity, bypass, milkSort, originalMilkSort }, result);
    return await result;
  };

  const doRinse = (nozzle) => executeCommand({
      pie: 0x68,
      mi: CMD.DoRinse_e,
      mp: nozzle,
      onlyack: true,
    }).then(() => sleep(2000));
  const doMilkRinse = (nozzle, { tubes = false, outlet = false, withSteam = false, tubesLength = 90 }) =>
    // console.log("[Eversys] Performing Milk Rinse", { nozzle, tubes, outlet, withSteam, tubesLength }) ||
    executeCommand({
      pie: 0x68,
      mi: CMD.MilkOutletRinse_e,
      mp: nozzle,
      onlyack: true,
      data: everbyte(withSteam ? 3 : (tubes ? (outlet ? 0 : 2) : 1)).concat(evertwobytes(tubesLength || 0))
    });
  const doScreenRinse = (nozzle, { cycles, repetitions }) => executeCommand({
      pie: 0x68,
      mi: CMD.ScreenRinse_e,
      mp: nozzle,
      onlyack: true,
      data: everbyte(cycles).concat(everbyte(repetitions))
    });
  const doStartCleaning = async () => {
    cleanupSuspiciousDumps();
    // console.log("[Eversys] Performing Milk Rinse", { nozzle, tubes, outlet, withSteam, tubesLength }) ||
    return await executeCommand({
      pie: 0x68,
      mi: CMD.StartCleaning_e,
      mp: 0,
      onlyack: true,
    });
  }

  const doEtcCalibration = (beanHopper) => executeCommand({
      pie: 0x68,
      mi: CMD.DoEtcCalibration_e,
      onlyack: true,
      data: everbyte(beanHopper)
    });

  const stop = (mp) => executeCommand({
      pie: 0x68,
      mi: CMD.Stop_e,
      mp,
      onlyack: true,
    });

  //// exports

  // setInterval(async () => {
  //   console.log(' ping ', await getStatus());
  // }, 5000)

  return {
    displayAction,
    doEtcCalibration,
    doProduct,

    doRinse,
    doMilkRinse,
    doScreenRinse,
    doStartCleaning,

    dumpProducts,
    getInfoMessages,
    getStatus,
    getApiVersion,

    stop,

    nowCooking() {
      return nowCooking;
    }
  };
};

module.exports = eversysFactory;
