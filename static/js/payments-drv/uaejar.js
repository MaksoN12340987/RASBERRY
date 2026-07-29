// @ts-check
const fs = require('fs');
const { ulid } = require('ulid');
const path = require('path');
const shell = require('shelljs');

const { logger } = require('./config');

const Rcptr = (filename) => {
  let r;
  try {
    const rj = fs.readFileSync(filename, 'utf8');
    r = JSON.parse(rj).rcpt;
  } catch (err) {
    console.log("Reading ßaved rcpt failed", err);
    r = 1;
  }
  return {
    get rcpt() {
      return r;
    },

    set rcpt(v) {
      r = v;
      try {
        fs.writeFileSync(filename, JSON.stringify({ rcpt: r }));
      } catch (err) {
        console.log("Saving rcpt failed", err);
      }
    }
  }
};

module.exports = ({ exec, paydir }) => {
  const uaejarDir = path.dirname(exec);
  const uaejarExe = path.basename(exec);

  let rcptr = Rcptr(path.resolve('rcpt.json'));
  console.log("Starting uaejar", { uaejarDir, uaejarExe, paydir, rcpt: rcptr.rcpt });

  let ready = true;

  const inuniqdir = (fx) => {
    const dir = path.join(paydir, [new Date().toISOString(), ulid()].join('-'));
    shell.pushd(uaejarDir);
    try {
      shell.mkdir('-p', dir);
      ready = false;
      fx(dir);
    } finally {
      shell.popd();
      ready = true;
    }
  }

  const charge = ({ meta, amount }) => new Promise((reply) =>
    inuniqdir((dir) => {
      const rcpt = rcptr.rcpt;
      const uaejarRes = shell.exec(`./${uaejarExe} charge --rcpt=${rcpt} ${Math.round(100 * amount)}`);
      logger.info(meta, 'uaejarRes', { rcpt, uaejarRes });
      rcptr.rcpt += 1;
      try {
        shell.mv(path.join(uaejarDir, 'result.json'), dir);
        const data = JSON.parse(fs.readFileSync(path.join(dir, 'result.json'), 'utf8'));
        if (uaejarRes.code == 0) {
          logger.info(meta, 'charge successful', data);
          reply({
            success: true,
            stats: {
              real: true,
              data,
              version: 'uaejar-1.0',
            }
          });
        } else {
          logger.error(meta, 'charge failed', data);
          reply({
            error: true,
            stats: {
              real: true,
              data,
              version: 'uaejar-1.0-error',
            }
          });
        }
      } catch (e) {
        console.log("Exception happened", e);
        logger.error(meta, 'uaejar failed');
        reply({ error: true });
      }
    }));

  const check = async ({}) => ({
      success: true,
      ready,
    });

  const commit = ({ meta }) => new Promise((reply) =>
    inuniqdir(() => {
      if (shell.exec(`./${uaejarExe} commit`).code == 0) {
        logger.info(meta, 'Commit successful');
        rcptr.rcpt = 1;
        reply({ success: true });
      } else {
        logger.error(meta, 'Commit failed');
        reply({ error: true });
      }
    }));

  const refund = ({ meta, amount, rrn, messnum, rcpt }) => new Promise((reply) =>
    inuniqdir((dir) => {
      let uaejarRes;
      // if (rrn) {
      //   uaejarRes = shell.exec(`./${uaejarExe} refund --messnum=${messnum} --rcpt=${rcptr.rcpt} --rrn=${rrn} ${Math.round(100 * amount)}`);
      //   rcptr.rcpt += 1;
      // } else
      if (rcpt) {
        uaejarRes = shell.exec(`./${uaejarExe} void --messnum=${messnum} --rcpt=${rcpt} ${Math.round(100 * amount)}`);
      } else {
        reply({
          error: true,
          message: "No rcpt for void or rrn for refund given"
        });
        return;
      }
      logger.info(meta, 'Refund response', { uaejarRes });
      try {
        shell.mv(path.join(uaejarDir, 'result.json'), dir);
        const data = JSON.parse(fs.readFileSync(path.join(dir, 'result.json'), 'utf8'));
        if (uaejarRes.code == 0) {
          logger.info(meta, 'Refund successful');
          reply({
            success: true,
            stats: {
              real: true,
              data,
              version: 'uaejar-1.0',
            }
          });
        } else {
          logger.error(meta, 'Refund error', data);
          reply({
            error: true,
            stats: {
              real: true,
              data,
              version: 'uaejar-1.0-error',
            }
          });
        }
      } catch (e) {
        console.log("Exception happened", e);
        logger.info(meta, 'uaejar failed');
        reply({ error: true });
      }
    }));

  const status = () => {
    shell.pushd(uaejarDir);
    try {
      let uaejarRes = shell.exec(`./${uaejarExe} ping`);
      if (uaejarRes.code == 0) {
        return {
          success: true,
          code: uaejarRes.code,
        };
      } else {
        return {
          error: true,
          code: uaejarRes.code,
        };
      }
    } finally {
      shell.popd();
    }
  }

  const toString = () => 'uaejar';

  return { charge, check, commit, refund, status, toString };
};
