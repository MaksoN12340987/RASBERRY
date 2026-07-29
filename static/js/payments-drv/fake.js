const { logger } = require('./config');
const { sleep } = require('u-queue');

module.exports = () => {
  logger.info(null, "Starting fake payments drv");

  let ready = true;

  const charge = async ({ meta, amount }) => {
    logger.info(meta, "[ payments-drv/fake ] Charging", amount);
    ready = false;
    await sleep(4500);
    setTimeout(() => { ready = true }, 1000);
    return {
      success: true,
      stats: { fake: true }
    };
  };

  const check = async ({ meta, ...params } = {}) => {
    logger.info(meta, "[ payments-drv/fake ] Checking", params);
    await sleep(50);
    return {
      success: true,
      fake: true,
      ready,
    };
  }

  const commit = async ({ meta, ...params } = {}) => {
    logger.info(meta, "[ payments-drv/fake ] Commiting all payments", params);
    await sleep(1500);
    return {
      success: true,
      stats: { fake: true }
    };
  };

  const refund = async ({ meta, ...params } = {}) => {
    logger.info(meta, "[ payments-drv/fake ] Refunding", params);
    await sleep(1500);
    return {
      success: true,
      stats: { fake: true }
    };
  };

  const toString = () => 'fake';

  const status = () => ({success: true})

  return { charge, check, commit, refund, status, toString };
};
