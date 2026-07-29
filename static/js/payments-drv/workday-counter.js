const { promisify } = require("util");
const fs = require("fs");

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

module.exports = ({ filename }) => {

  const ask = async () => {
    try {
      const state = JSON.parse(await readFile(filename, { encoding: "utf8" }));
      return state.resetAt;
    } catch (err) {
      console.log(err);
      await reset();
      return new Date();
    }
  };

  const reset = async () => {
    try {
      await writeFile(filename, JSON.stringify({ resetAt: Date.now() }), "utf8");
    } catch (err) {
      console.log(err);
    }
  };

  return {
    reset,
    ask,
  };

};
