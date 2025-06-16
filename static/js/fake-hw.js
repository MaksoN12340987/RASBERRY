const { values } = require("ramda");

module.exports.makeFakehw = async () => {
  console.log("Starting fake hardware");

  return {
    defaultConfig: {
      devices: {
        lift1:              { address: 0x401 },
        os:                 { address: 0x402 },
        m1:                 { address: 0x403 },
        lights:             { address: 0x404 },
        milksys:            { address: 0x405 },
        ethernet:           { address: 0x406, autorespawn: true },
        wifi:               { address: 0x407, autorespawn: true },
      }
    },

    device({ address, reg }) {
      let state = 0;
      return {
        async write(level) {
          console.log("[ super/fakehw ] writing", { level });
          state = level;
        },

        async read() {
          return state;
        }
      }
    }
  }
};
