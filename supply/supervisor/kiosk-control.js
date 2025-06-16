const util = require("util");
const exec = util.promisify(require("child_process").exec);

const KioskControl = ({ hostname, mac }) => {
  // TODO arping
  let state = 0;

  const up = () => {
    exec(`wakeonlan ${mac}`);
    state = 1;
  };
  const down = () => {
    exec(`ssh ${hostname} "sudo poweroff"`);
    state = 0;
  };
  const isup = () => state == 1;
  const toggle = () => (isup() ? down() : up());

  return {
    up,
    down,
    toggle,
    isup,
  };
};

module.exports = KioskControl;
