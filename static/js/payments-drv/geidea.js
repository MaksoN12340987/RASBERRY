// @ts-check
const { logger } = require('./config');
const { sleep } = require('u-queue');
const { EventEmitter } = require("events");
const ReconnectingWebSocket = require('reconnecting-websocket');
const WS = require('ws');
const fs = require('fs');

// NATSD_URI=nats://complexos.local:4222 node payments-drv.js --hwid=kiosk1 -f geidea --ws=http://localhost:7000/messages

module.exports = ({ url }) => {
  logger.info(null, "Starting Geidea payments drv", { url });

  let cfg;
  try {
    cfg = fs.readFileSync('geidea.json', { encoding: 'utf8' });
  } catch (err) {
    logger.warn(null, "Loading config failed", err);
    logger.warn(null, "Creating blank config file");
    fs.writeFileSync('geidea.json', JSON.stringify({
      connection: {
        ConnectionMode: "COM",
        ComName: "/dev/ttyACM0",
        BraudRate: 38400,
        DataBits: 8,
        Parity: "none"
      }
    }, null, 2));
    logger.warn(null, "vi geidea.json before next launch");
    process.exit();
  }
  try {
    cfg = JSON.parse(cfg);
    logger.info(null, "[ geidea ] loadede config", cfg);
  } catch (err) {
    logger.warn(null, "Config parsing failed", err);
    process.exit();
  }

  let responses = new EventEmitter();
  const waitFor = (event, duration = 2500) => {
    const ac = new AbortController();
    sleep(duration).then(() => ac.abort());
    return EventEmitter
            .once(responses, event, { signal: ac.signal })
            .catch(() => Promise.reject(`[ WMF ] ${event} timeout`));
  }

  const ws = new ReconnectingWebSocket(url, [], { WebSocket: WS });
  ws.addEventListener('message', (msg) => {
    console.log("[ geidea ] incoming", msg.data);
    msg = JSON.parse(msg.data);
    if (msg.Event) {
      responses.emit(msg.Event.toLowerCase(), msg);
      if (msg.EventName) {
        responses.emit(`${msg.Event.toLowerCase()}.${msg.EventName.toLowerCase()}`, msg);
      }
    }
  });

  const gsend = (msg) => {
    console.log("[ geidea ] sending", msg);
    ws.send(JSON.stringify(msg));
  };

  let setReady;
  let ready = new Promise(res => setReady = res);
  ws.addEventListener('open', () => {
    console.log("[ geidea ] ws opened, connecting terminal");
    reconnect();
  });

  const reconnect = () => {
    gsend({ Event: "CONNECTION", Operation: "CONNECT", ...cfg.connection });
  }
  const handleConn = msg => {
    if (msg.IsConnected == "True") {
      console.log('[ geidea ] ready by connection');
      setReady(true);
    } else {
      ready = new Promise(res => setReady = res);
      console.log("[ geidea ] terminal not connected, connecting");
      sleep(5000).then(reconnect);
    }
  };
  responses.addListener('onconnect', handleConn);
  responses.addListener('ondisconnect', handleConn);
  responses.addListener('onerror', async (msg) => {
    if (msg.Message =="'PortName' cannot be set while the port is open.") {
      console.log('[ geidea ] ready by error');
      setReady(true);
    } else {
      await sleep(5000);
      if (!await Promise.race([ready, sleep(1).then(() => false)])) {
        reconnect();
      }
    }
  });

  responses.addListener('onterminalaction', msg => {
    if (msg.TerminalAction == 'USER_CANCELLED_AND_TIMEOUT') {
      responses.emit('cancelbutton', msg);
    }
  });


  const charge = async ({ meta, amount }) => {
    logger.info(meta, "[ geidea ] Charging", amount);

    if (!await Promise.race([ready, sleep(30000).then(() => false)])) {
      return { error: true, details: 'terminal not connected' };
    }

    ws.send(JSON.stringify({
      Event: "TRANSACTION",
      Operation: "PURCHASE",
      Amount: amount,
      ECRNumber: Date.now().toString().slice(0, 12),
      PrintSettings: "1",
      AppId: "11"
    }));

    const parseResponse = response => {
      let stats;
      try {
        stats = JSON.parse(response.JsonResult);
      } catch (e) {
        console.log("[ geidea ] Bad terminal response json", e);
      }
      if (stats?.TransactionResponseEnglish == 'SUCCESS') {
        return ({ success: true, version: 'geidea-1.0', stats });
      } else {
        return ({ error: true, version: 'geidea-1.0-error', code: 'bad-response', stats, response });
      }
    };

    const result = await Promise.race([
      waitFor('ondatareceive.terminal_response', 300000)
        .then(parseResponse,
              err => ({ error: true, version: 'geidea-1.0-error', code: 'failed', stats: err })),
      waitFor('cancelbutton', 300000)
        .then(stats => ({ error: true, version: 'geidea-1.0-error', code: 'cancelled', stats }),
              err => ({ error: true, stats: err })),
      waitFor('onerror', 250000)
        .then(stats => ({ error: true, version: 'geidea-1.0-error', code: 'error', stats })),
    ]);
    console.log("[ geidea ] charge result", result);
    return result;
  };


  const check = async ({ meta, ...params } = {}) => {
    logger.info(meta, "[ geidea ] Checking", params);

    if (!await Promise.race([ready, sleep(1).then(() => false)])) {
      return { success: true, ready: false };
    }

    ws.send(JSON.stringify({
      Event: "TRANSACTION",
      Operation: "CHECK_STATUS"
    }));

    return await Promise.race([
      waitFor('onterminalstatus', 3000).then(stats => ({ success: true, ready: true }),
                                          err => ({ error: true, ...err })),
      waitFor('onerror', 2500).then(err => ({ error: true, ...err })),
    ]);
  }


  const commit = async ({ meta, ...params } = {}) => {
    logger.info(meta, "[ geidea ] Noop: commit", params);

    return {
      success: true,
    };
  };


  const refund = async ({ meta, amount, RRNNumber, TransactionDate } = {}) => {
    logger.info(meta, "[ geidea ] Refunding", ref);

    if (!await Promise.race([ready, sleep(30000).then(() => false)])) {
      return { error: true, details: 'terminal not connected' };
    }

    ws.send(JSON.stringify({
      Event: "TRANSACTION",
      Operation: "REFUND",
      Amount: amount,
      ECRNumber: Date.now().toString().slice(0, 12),
      PrintSettings: "1",
      AppId: "11",
      RRNNumber,
      TransactionDate,
    }));

    const parseResponse = stats => {
      ({ success: true, stats })
    };

    const result = await Promise.race([
      waitFor('ondatareceive.terminal_response', 3000)
        .then(parseResponse,
              err => ({ error: true, ...err })),
      waitFor('onerror', 2500)
        .then(err => ({ error: true, version: 'geidea-1.0-error', ...err })),
    ]);
    console.log("[ geidea ] refund result", result);
    return result;
  };


  const toString = () => 'geidea';

  const status = () => ({ success: true })

  return { charge, check, commit, refund, status, toString };
};
