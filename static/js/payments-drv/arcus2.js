// @ts-check
const fs = require('fs');
const { ulid } = require('ulid');
const path = require('path');
const shell = require('shelljs');
const { Iconv }  = require('iconv');

const { logger } = require('./config');

module.exports = ({ exec, paydir }) => {
  const arcusDir = path.dirname(exec);
  const arcusExe = path.basename(exec);

  console.log("Starting arcus2", arcusDir, arcusExe, "in", paydir);

  let ready = true;

  const inuniqdir = (fx) => {
    const dir = path.join(paydir, [new Date().toISOString(), ulid()].join('-'));
    shell.mkdir('-p', dir);
    shell.pushd(dir);
    shell.cp(exec, dir);
    shell.cp(path.join(arcusDir, 'libarccom.so'), dir);
    shell.cp(path.join(arcusDir, 'cashreg.ini'), dir);
    shell.cp(path.join(arcusDir, 'ops.ini'), dir);
    shell.cp(path.join(arcusDir, 'rc_conv.ini'), dir);
    shell.cp(path.join(arcusDir, 'rc_res.ini'), dir);
    // shell.cp('-P', path.join(arcusDir, 'ttyS99'), dir);
    // shell.ln('-s', path.join(arcusDir, 'upnixmn.out'), path.join(dir, 'upnixmn.out'));
    try {
      ready = false;
      fx(dir);
    } finally {
      shell.popd();
      ready = true;
      shell.rm(path.join(dir, arcusExe));
      shell.rm(path.join(dir, 'libarccom.so'));
      shell.rm(path.join(dir, 'cashreg.ini'));
      shell.rm(path.join(dir, 'ops.ini'));
      shell.rm(path.join(dir, 'rc_conv.ini'));
      shell.rm(path.join(dir, 'rc_res.ini'));
    }
  }

  const charge = ({ meta, amount }) => new Promise((reply) =>
    inuniqdir((dir) => {
      const arcus2res = shell.exec(`./${arcusExe} /o1 /a${Math.round(100 * amount)} /c643`);
      logger.info(meta, 'arcus2res', { arcus2res });
      try {
        // for commandlinetool v2.1
        const data = new Iconv('CP1251', 'UTF-8')
            .convert(fs.readFileSync(path.join(dir, 'output.dat')))
            .toString()
            .split(/\n/);
        const cheq = new Iconv('CP1251', 'UTF-8')
            .convert(fs.readFileSync(path.join(dir, 'cheq.out')))
            .toString();
        const rrn = cheq.match(/RRN:(\d+)/)?.[1];
        if (rrn) {
          data[5] = rrn;
        }
        const transactionId = cheq.match(/ID.*:\s*(\d+)\n/)?.[1];
        if (transactionId) {
          data[15] = transactionId;
        }
        if (data[0].startsWith('00')) {
          logger.info(meta, 'charge successful', data);
          reply({
            success: true,
            stats: {
              real: true,
              data,
              version: 'arcus2-1.0',
            }
          });
        } else {
          logger.error(meta, 'charge failed', data);
          reply({
            error: true,
            stats: {
              real: true,
              data,
              version: 'arcus2-1.0-error',
            }
          });
        }
      } catch (e) {
        logger.error(meta, 'arcus failed');
        reply({ error: true });
      }
    }));

  const check = async ({}) => ({
      success: true,
      ready,
    });

  const commit = ({ meta }) => new Promise((reply) =>
    inuniqdir(() => {
      if (shell.exec(`./${arcusExe} /o65`).code == 0) {
        logger.info(meta, 'Commit successful');
        reply({ success: true });
      } else {
        logger.error(meta, 'Commit failed');
        reply({ error: true });
      }
    }));

  const refund = ({ meta, amount, cardType = 0, ref }) => new Promise((reply) =>
    inuniqdir((dir) => {
      const arcus2res = ref ?
          shell.exec(`./${arcusExe} /o3 /a${Math.round(100 * amount)} /c643 /x${ref}`) :
          shell.exec(`./${arcusExe} /o3 /a${Math.round(100 * amount)} /c643`);
      logger.info(meta, 'Refund response', { arcus2res });
      try {
        const data = new Iconv('CP1251', 'UTF-8')
            .convert(fs.readFileSync(path.join(dir, 'output.dat')))
            .toString()
            .split(/\n/);
        if (data[0].startsWith('00')) {
          logger.info(meta, 'Refund successful');
          reply({
            success: true,
            stats: {
              real: true,
              data,
              version: 'arcus2-1.0',
            }
          });
        } else {
          logger.error(meta, 'Refund error', data);
          reply({
            error: true,
            stats: {
              real: true,
              data,
              version: 'arcus2-1.0-error',
            }
          });
        }
      } catch (e) {
        logger.info(meta, 'arcus failed');
        reply({ error: true });
      }
    }));

  const toString = () => 'arcus2';

  const status = ()=> {
    return { success: true, code: 0 };
  }

  return { charge, check, commit, refund, status, toString };
};
