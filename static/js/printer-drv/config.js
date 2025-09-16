const transport = require('aerp-service-transport')();
const logger = require('logger').createLogger({
  module: "printer-drv",
  level: process.env.LOG_LEVEL,
  transport
});

module.exports = { transport, logger };
