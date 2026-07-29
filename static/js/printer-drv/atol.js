// @ts-check
const { always, call, ifElse, prop, map } = require('ramda');
const { queueFactory, sleep, singleInstance } = require('u-queue');

const Atol3 = require('./lib/atol3');

const { logger } = require('./config');

var listDevicesPromise, connectionPromise, clearingTimeout;
const connectKkm = async (kkm, port_TODO) => {
  listDevicesPromise = listDevicesPromise || kkm.listDevices();
  let atols = await listDevicesPromise;
  if (atols.length > 0) {
    console.log('connecting to', atols[0]);
    await sleep(1000);
    const port = atols[0][0];
    connectionPromise = connectionPromise || kkm.connect({ port });
    await connectionPromise;
  }
  clearingTimeout = clearingTimeout || setTimeout((() => {
    clearingTimeout = listDevicesPromise = connectionPromise = null;
  }), 330);
};

const reconnect = (kkm, port) => {
  kkm.disconnect(kkm);
  setTimeout(() => connectKkm(kkm, port), 220);
}

module.exports = ({ agent = false, port }) => {
  const queue = queueFactory();

  const kkm = new Atol3.KKM();
  const conp = connectKkm(kkm, port).then(() => {
    if (!kkm.transport) {
      console.log("No kkm transport found");
      process.exit();
    }
  });

  const commit = singleInstance(() => queue(async () => {
    try {
      console.log('[commit] cancelling mode');
      await kkm.cancelMode();
      console.log('[commit] set mode 3');
      await kkm.setMode({mode: 3, password: '30'});
      console.log('[commit] close workday');
      await kkm.closeWorkday();
      console.log('[commit] cleanup');
      await kkm.cancelMode();
      console.log('[commit] ko!');
      await openWorkDay();
      await kkm.cancelMode();
      return { success: true };
    } catch (err) {
      console.log("[commit] ☙ failure ❧", err);
      return { error: true };
    }
  }));

  const openWorkDay = async () => {
    try {
      console.log('[ openWorkDay ] cancelling mode');
      await kkm.cancelMode();
    } catch(err) {
      console.log("[ openWorkday ] cancelMode failed", err);
    }
    console.log('[ openWorkDay ] entering mode 1');
    await kkm.setMode({ mode: 1, password: '30' });
    console.log('[ openWorkDay ] opening workday');
    await kkm.openWorkday({ });
  };

  const hugeFont = require('./huge-font');
  const printHuge = async (nums) => {
    for (var h = 0; h < 8; h++) {
      console.log(nums[0], nums[1], nums[2]);
      if (nums[3]) {
        const s = [32, 9, 32]
          .concat(hugeFont[nums[0]][h])
          .concat([32])
          .concat(hugeFont[nums[1]][h])
          .concat([32])
          .concat(hugeFont[nums[2]][h])
          .concat([32])
          .concat(hugeFont[nums[3]][h]);
        await kkm.printString({ raw: s })
      } else {
        const s = [32, 9, 32, 9, 32, 9, 32, 9, 32]
          .concat(hugeFont[nums[0]][h])
          .concat([32])
          .concat(hugeFont[nums[1]][h])
          .concat([32])
          .concat(hugeFont[nums[2]][h]);
        await kkm.printString({ raw: s })
      }
    }
    await kkm.printString({ string: ' ' })
  };

  // const testHuge = async () => {
  //   if (!kkm.transport)
  //     return setTimeout(testHuge, 220);
  //   console.log('TestingHugeing');
  //   await kkm.cancelMode();
  //   await kkm.setMode({ mode: 1, password: '30' });
  //   await printHuge([0, 1, 2]);
  //   await printHuge([3, 4, 5]);
  //   await printHuge([6, 7, 8]);
  //   await printHuge([9, 9, 9]);
  //   for (var h = 2; h < 24; h++) {
  //     await kkm.printString({ string: ' ' })
  //   }
  // };
  // setTimeout(testHuge, 220);

  const printSemiCheque = ({ meta, name, customizations, discount, ordernumber, pwd, price, qrcode }) => queue(async () => {
    console.log("printSemiCheque", { meta, name, customizations, discount, ordernumber, pwd, price, qrcode });
    if (!kkm.transport) {
      return { error: true, message: 'No kkm transport' };
    }
    // console.log('canceling mode');
    try { await kkm.cancelMode(); } catch (err) {}
    // console.log('clearing previous checks 1');
    // try { await kkm.discardCheck(); } catch (err) {}
    logger.info(meta, 'getting status');
    const status = await kkm.status();
    logger.info(meta, 'atol status', { status });
    if (status.isWorkdayOpen) {
      logger.info(meta, 'workday is opened, checking how long...');
      const { status, value } = await kkm.getRegister({ reg: 0x12, major: 0, minor: 1 });
      const isSmenaTooLong = value[0] == 2;
      logger.info(meta, 'is smena too long', { isSmenaTooLong });
      if (isSmenaTooLong) {
        await commit();
        await openWorkDay();
      } else {
        logger.info(meta, 'entering mode 1');
        await kkm.setMode({ mode: 1, password: '30' });
      }
    } else {
      await openWorkDay();
    }
    try {
      logger.info(meta, 'opening check');
      await kkm.openCheck({ checkType: 1 });
      logger.info(meta, 'printing zakaz', { ordernumber });
      // await kkm.print({ string: "  Заказ #" + ordernumber });
      await printHuge(ordernumber);
      await kkm.print({ string: " " });
      await kkm.print({ string: " " });
      await kkm.print({ string: "  Ваш пин-код: " });
      await kkm.print({ string: " " });
      await printHuge(pwd);
      await kkm.print({ string: " " });
      await kkm.print({ string: " " });

      logger.info(meta, 'adding order line');
      await kkm.closeOrderLine({
        skipCashCheck: true,
        price: price,
        quantity: 1000,
        section: 0,
        paymentType: 4,
        lineType: 1,
        discount,
        name: '  ' + name
      });

      logger.info(meta, 'printing customizations');
      for (let cn in customizations) {
        await kkm.print({ string: `  ~ ${cn}: ${customizations[cn]}`.substring(0, 30) });
      }
      logger.info(meta, 'printing date');
      await kkm.print({ string: "  " + (new Date().toISOString()) });
      if (qrcode) {
        logger.info(meta, 'printing barcode');
        await kkm.print({ barCode: qrcode });
      }
    } catch (err) {
      logger.error(meta, 'error printing', err);
      return { error: true, details: err.toString() };
    } finally {
      logger.info(meta, 'discarding');
      await kkm.discardCheck();
      await kkm.cancelMode();
    }
    return { success: true };
    /*
    await kkm.print({ cliche: true });
    await kkm.print({ string: '  ' + name });
    await kkm.print({ string: JSON.stringify(customizations) })
    await kkm.print({ string: '  ' + (price / 100) + ' руб.' });
    await kkm.print({ barCode: qrcode });
    await kkm.print({ string: '  ' + qrcode });
    await kkm.print({ string: '  .    .' });
    await kkm.print({ string: '   ---' });
    for (var i = 0; i < 20; i++) {
      await kkm.print({ string: '  .  ' });
    }
    // await kkm.cutCheck({ partial: true });
    return { success: true };
    */
  });

  // const testSemicheck = async () => {
  //   if (!kkm.transport)
  //     return setTimeout(testSemicheck, 220);
  //   console.log('TestingSemicheck');
  //   await kkm.cancelMode();
  //   await kkm.setMode({ mode: 1, password: '30' });
  //   await printSemiCheque({ name: 'Капучино', customizations: {}, ordernumber: '939', price: 100, qrcode: '123' });
  //   await kkm.cancelMode();
  // };
  // setTimeout(testSemicheck, 220);

  const printFullCheque = ({ meta, name, customizations, discount, ordernumber, pwd, price, qrcode }) => queue(async () => {
    console.log("printFullCheque", { meta, name, customizations, discount, ordernumber, pwd, price, qrcode });
    if (!kkm.transport) {
      return { error: true, message: 'No kkm transport' };
    }
    // console.log('canceling mode');
    try {
      await kkm.cancelMode();
    } catch (err) {
      try {
        logger.error(meta, 'error cancelMode', err);
        try {
          await kkm.status();
        } catch(e) {
          console.log(e);
        }
        try {
          await kkm.discardCheck();
        } catch(e) {
          console.log(e);
        }
        try {
          await kkm.cancelMode();
        } catch(e) {
          console.log(e);
        }
      } catch (vashcheErr) {
        logger.error(meta, 'vashche error', vashcheErr);
        return { error: true };
      }
    }
    try {
      logger.info(meta, 'entering mode 1');
      await kkm.setMode({mode: 1, password: '30'});
      const status = await kkm.status();
      logger.info(meta, 'atol status', { status });
      if (!status.isWorkdayOpen) {
        logger.info(meta, 'opening workday');
        await kkm.openWorkday({ });
      }
      logger.info(meta, 'opening check');
      // await kkm.print({ cliche: true });
      await kkm.openCheck({ checkType: 1 });
      // console.log('adding order line');
      await kkm.beginOrderLine({ });
      if (agent) {
        await kkm.addRequisites({
          tlvs: [
            [ 1222, 1, 64 ],
            [ 1224, [[1225, 'ООО "Фудтроникс"'], [1171, '+79017606790']] ],
            [ 1226, '7703431250  ' ]
          ]});
      }
      await kkm.closeOrderLine({
        skipCashCheck: true,
        price: price,
        quantity: 1000,
        section: 0,
        paymentType: 4,
        lineType: 1,
        discount,
        name: '  ' + name
      });
      logger.info(meta, 'adding payment');
      await kkm.addCheckPayment({
        paymentType: 2,
        amount: price
      });

      await kkm.print({ string: " " });
      await kkm.print({ string: "                     ВАШ ЗАКАЗ"});
      await kkm.print({ string: " " });
      // await kkm.print({ string: " " });
      // await kkm.print({ string: "  Заказ #" + ordernumber });
      await printHuge(ordernumber);
      await kkm.print({ string: " " });
      await kkm.print({ string: "                     ВАШ ПИН-КОД"});
      // await kkm.print({ string: "  Ваш пин-код " + map((x) => String.fromCharCode(9) + x, pwd).join('') + " чтобы забрать" });
      await kkm.print({ string: " " });
      await printHuge(pwd);
      // await kkm.print({ string: "                     " + map((x) => String.fromCharCode(9) + x + ' ', pwd).join('') });
      await kkm.print({ string: " " });

      if (qrcode) {
        await kkm.print({ string: " " });
        await kkm.print({ barCode: qrcode, width: 12 });
      }
      // await kkm.discardCheck();
      await kkm.closeCheck({});
    } catch (err) {
      console.log(err);
      logger.error(meta, 'error print', err);
      try {
        await kkm.status();
      } catch(e) {
        console.log(e);
      }
      try {
        await kkm.discardCheck();
      } catch(e) {
        console.log(e);
      }
      return { error: true };
    } finally {
      await kkm.cancelMode();
    }
    return { success: true };
  });

  // const testFullCheck = async () => {
  //   if (!kkm.transport)
  //     return setTimeout(testFullCheck, 220);
  //   console.log('TestingFullcheck');
  //   await kkm.cancelMode();
  //   await kkm.setMode({ mode: 1, password: '30' });
  //   await printFullCheque({ name: 'Капучино', customizations: {}, ordernumber: '578', price: 129, qrcode: '123' });
  //   await kkm.cancelMode();
  // };
  // setTimeout(testFullCheck, 220);


  // DEBUG
  // conp.then(() => _5sec()).then(() => printCheque({
  //   price: 10000,
  //   name: 'debug',
  //   qrcode: 'axaxa'
  // }));

  const printRefund = ({ meta, name, discount, ordernumber, price }) => queue(async () => {
    console.log("printRefund", { meta, name, discount, ordernumber, price });
    if (!kkm.transport) {
      return { error: true, message: 'No kkm transport' };
    }
    // console.log('canceling mode');
    await kkm.cancelMode();
    try {
      logger.info(meta, '[ printer-drv/atol/refund ] entering mode 1');
      await kkm.setMode({mode: 1, password: '30'});
      const status = await kkm.status();
      logger.info(meta, '[ printer-drv/atol/refund ] atol status', { status });
      if (!status.isWorkdayOpen) {
        logger.info(meta, '[ printer-drv/atol/refund ] opening workday');
        await kkm.openWorkday({ });
      }
      logger.info(meta, '[ printer-drv/atol/refund ] opening check');
      // await kkm.print({ cliche: true });
      await kkm.openCheck({ checkType: 2 });
      // console.log('adding order line');
      await kkm.closeOrderLine({
        skipCashCheck: true,
        price: price,
        quantity: 1000,
        section: 0,
        paymentType: 4,
        lineType: 1,
        discount,
        name: '  ' + name
      });
      logger.info(meta, '[ printer-drv/atol/refund ] adding payment');
      await kkm.addCheckPayment({
        paymentType: 2,
        amount: price
      });

      // await kkm.discardCheck();
      await kkm.closeCheck({});
    } catch (err) {
      logger.error(meta, '[ printer-drv/atol/refund ] print error', err);
      await kkm.discardCheck();
    } finally {
      await kkm.cancelMode();
    }
  });

  let lastStatus = { workday: 'busy' }, lastStatusAt = 0;
  const status = async () => {
    const isidle = await Promise.race([ queue(always(true))
                                      , sleep(1).then(always(false))
                                      ]);
    if (isidle) {
      await queue(async () => {
        if (Date.now() - lastStatusAt > 60 * 1000) {
          const { value: reg18 } = await kkm?.getRegister({ reg: 18, minor: 1 });
          const workday = reg18?.[0] == 0 ? 'closed'
                        : reg18?.[0] == 1 ? 'open'
                        : reg18?.[0] == 2 ? 'expired'
                        : String(reg18?.[0]);

          let lastClosedAt = 0;
          if (reg18 && reg18.length > 6) {
            const [day, month, year, hour, minute, second] =
              map(n => Atol3.u.bcd2number([n]),
                  reg18.slice(1, 7));
            lastClosedAt = new Date(year, month, day, hour, minute, second).getDate();
          }
          const wst = await kkm.workdayStatus();
          lastStatus = { workday, lastClosedAt, checkNumber: wst.checkNumber };
          lastStatusAt = Date.now();
        }
      });
    }
    return lastStatus;
  };

  return {
    fiscal() {
      return {
        commit,
        status,
        printCheque: ifElse(prop('price'), printFullCheque, printSemiCheque),
        printRefund,
        toString: () => `fiscal atol ${agent ? '(agent mode)' : ''})`,
      }
    },

    semifake() {
      return {
        commit,
        status,
        printCheque: printSemiCheque,
        printRefund,
        toString: () => 'semifake atol',
      }
    },
  };
};
