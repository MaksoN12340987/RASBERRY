const transport = require('aerp-service-transport')();
const logger = require('logger').createLogger({
  module: 'payments-drv',
  level: process.env.LOG_LEVEL,
  transport
});

module.exports = {
  transport,
  logger,
}
