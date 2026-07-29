const { Gpio } = require("./config");

const DeviceControl = ({ pin }) => {
  const gpio = Gpio && new Gpio(pin, { mode: Gpio.OUTPUT });
  let state = 0;

  const ss = (v) => {
    gpio && gpio.digitalWrite(1 - v);
    state = v;
  };

  const up = () => ss(1);
  const down = () => ss(0);
  const toggle = () => ss(1 - state);
  const isup = () => state == 1;

  return {
    up,
    down,
    toggle,
    isup,
  };
};

module.exports = DeviceControl;
