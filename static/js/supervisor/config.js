var Gpio;
try {
  Gpio = require("pigpio").Gpio;
  // const complexbus = require('aerp-service-transport')();
} catch (e) {}

const pinmap = {
  _boost: 7,
  arm1: 6,
  arm2: 12,
  cameras: 25,
  bigcups: 4,
  lift1: 22,
  lift2: 9,
  lift3: 24,
  light: 27,
  milksys: 11,
  os: 17,
  pump: 16,
  sirups: 5,
  smallcups: 23,
  wifi: 26,
  neonglow: 13,
};

module.exports = {
  Gpio,
  // complexbus,
  pinmap,
};
