// @ts-check
const { promisify } = require("util");
const fs = require("fs");

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const dbFile = "superstate.json";

const persistence = async () => {
  console.log("Initialized state persistence");

  const loadState = async () => {
    try {
      const state = JSON.parse(await readFile(dbFile, { encoding: "utf8" }));
      console.log('Loaded', dbFile, state);
      return state;
    } catch (err) {
      console.log(err.message);
      return {};
    }
  };

  const saveState = async (state) => {
    try {
      await writeFile(dbFile, JSON.stringify(state), "utf8");
      console.log('Saved', dbFile, state);
    } catch (err) {
      console.log(err.message);
    }
  };

  return {
    loadState,
    saveState,
  };
};

module.exports = {
  persistence,
};
