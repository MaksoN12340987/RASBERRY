const { logger } = require('./config');

module.exports = () => {
  logger.info(null, "Starting fake printer drv");

  let workday = 'open';
  let checkNumber = 0;

  return {
    commit: async (params = {}) => {
      logger.info(params.meta, "Commiting", params);
      workday = 'closed';
      return { success: true };
    },
    printCheque: async (params = {}) => {
      workday = 'open';
      checkNumber += 1;
      logger.info(params.meta, "Printing cheque", params);
      return { success: true };
    },
    printRefund: async (params = {}) => {
      workday = 'open';
      checkNumber += 1;
      logger.info(params.meta, "Printing refund", params);
      return { success: true };
    },
    status: async () => ({ workday, checkNumber, }),
    toString: () => 'fake',
  };
};
