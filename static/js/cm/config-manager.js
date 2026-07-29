const { assocPath, pathOr, split } = require("ramda");


const createConfigManager = (defaultConfig = {}) => {
  let config = { ...defaultConfig };
  const splitDot = split('.')
  const get = (path, defaultValue) => pathOr(defaultValue, splitDot(path), config);

  const set = (path, value) => assocPath(splitDot(path), value, config);
  const update = async (newconfig) => {
    console.log('[ cleaning-drv ] update config requested', { oldconfig: config, newconfig });
    config = { ...config, ...newconfig };
  };
  return {
    get,
    set,
    dump: () => config,
    update
  };

}

module.exports = { createConfigManager };
