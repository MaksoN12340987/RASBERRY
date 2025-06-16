// @ts-check
const { always, curry, prop, map, andThen } = require("ramda");
const { EventEmitter } = require('events');
const WebSocket = require('ws');
const { createRPC, tryParse } = require("food-rpc");

const connectErp = curry(({ gatewayURI, token }, manager) => {
  if (!gatewayURI || !token) {
    console.log("No ERP credentials given, using default config");
    manager.reconfigure(manager.defaultConfig);
    return;
  }

  // TODO extract
  let ws = new EventEmitter();
  let socket = null;
  let conntime = null;
  const wsUrl = gatewayURI.replace(/https?/, "ws") + "/xchg/supervisor/bus";
  // Create WebSocket connection
  const connect = () => {
    console.log(" [ WMF ] Connecting to", wsUrl);
    if (socket) {
      socket.onopen = () => {};
      socket.onclose = () => {};
      socket.onerror = () => {};
      socket.onmessage = () => {};
    }

    socket = new WebSocket(wsUrl);

    socket.onopen = async () => {
      if (conntime) {
        clearTimeout(conntime);
        conntime = null;
      }
      console.log(" [ WMF ] Socket opened at  ", wsUrl)
      ws.emit('open');
    }

    socket.onclose = async () => {
      console.log(" [ WMF ] Socket closed at  ", wsUrl, "at ", new Date().toISOString());
      if (!conntime) {
        conntime = setTimeout(connect, 1234);
      }
    }

    socket.onerror = async () => {
      console.log(" [ WMF ] Socket error at  ", wsUrl);
      if (!conntime) {
        conntime = setTimeout(connect, 2345);
      }
    };

    socket.onmessage = msg => ws.emit('message', msg);

    conntime = setTimeout(connect, 5678);

    return ws;
  }
  connect();
  // stop extracting

  const state = async () => {
    const normalizeDevice = async (deviceId) => ({
      deviceId,
      value: await manager.isup(deviceId),
    });

    const devices = await Promise.all(map(normalizeDevice, manager.devices()));

    return {
      success: true,
      payload: { devices },
    };
  };

  const startup = () => andThen(always({ success: true }), manager.startup());
  const shutdown = () => andThen(always({ success: true }), manager.shutdown());

  const up = ({ deviceId }) => andThen(always({ success: true }), manager.up(deviceId));
  const down = ({ deviceId }) => andThen(always({ success: true }), manager.down(deviceId));

  const reload = async () => {
    const { superconfig } = await rpc.request('superconfig');
    if (superconfig) {
      console.log("Received new config from erp", superconfig);
      await manager.reconfigure(superconfig);
      manager.autostart();
    }
  }

  const rpc = createRPC((x) => socket?.send(JSON.stringify(x)), {
    reload,
    state,
    startup,
    shutdown,
    down,
    up,
  });

  let pingTO = null;
  const cancelPing = () => pingTO && clearTimeout(pingTO);
  const schedulePing = () => {
    cancelPing();
    pingTO = setTimeout(() => socket ? rpc.request("ping").catch(console.log) : schedulePing(), 45000);
  };

  // ws.on("close", cancelPing);
  // ws.on("error", cancelPing);

  ws.on("message", (msg) => {
    const payload = tryParse(prop("data", msg));

    if (payload) {
      rpc.handle(payload);
    } else {
      console.log("unknown incoming trash", msg);
    }

    schedulePing();
  });

  ws.on("open", async () => {
    console.log("Connected to ERP xchg");

    const { success, error } = await rpc.request("auth", { token });

    if (!success) {
      console.log("[ supervisor ] auth failed!", error);
      process.exit(255);
    }

    await reload();
  });

  const reportAs = (type) => (devices) =>
    rpc.request('reportIncident',
                {
                  type,
                  receivedAt: new Date().getTime(),
                  devices
                });

  manager.onUp
    .bufferBy(manager.onUp.debounce(500))
    .observe(reportAs('supervisor.up'));
  manager.onDown
    .bufferBy(manager.onDown.debounce(500))
    .observe(reportAs('supervisor.down'));

  return rpc;
});

module.exports = { connectErp };
