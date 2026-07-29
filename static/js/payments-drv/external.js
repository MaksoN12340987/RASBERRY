const { logger } = require('./config');


module.exports = ({ barcode }) => {
  logger.info(null, "Starting external payments drv");

  const charge = async ({ meta, amount }) => {
    logger.info(meta, "[ payments-drv/external ] Charging", amount);
    return {
      success: true,
      stats: {
        real: true,
        version: 'external',
        confirmed: false,
        barcode,
      }
    };
  };

  const check = async ({ meta, ...params } = {}) => {
    logger.info(meta, "[ payments-drv/external ] Checking", params);
    return {
      success: true,
      ready: true,
    };
  }

  const commit = async ({ meta, ...params } = {}) => {
    logger.info(meta, "[ payments-drv/external ] Commiting all payments", params);
    return {
      success: true,
    };
  };

  const refund = async ({ meta, ...params } = {}) => {
    logger.info(meta, "[ payments-drv/external ] Refunding", params);
    return {
      success: true,
    };
  };

  const toString = () => 'external';

  const status = () => ({ success: true })

  return { charge, check, commit, refund, status, toString };
};
