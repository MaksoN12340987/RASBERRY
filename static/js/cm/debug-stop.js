const nats = require('nats');

const complexbus = nats.connect({
  uri: process.env.NATSD_URI,
  maxReconnectAttempts: -1,
  json: true });


complexbus.request('coffeemachine.stop', { mp: process.argv[2] || 0 }, console.log);


function cleanup() {
  complexbus.close();
}

setTimeout(cleanup, 3000);
