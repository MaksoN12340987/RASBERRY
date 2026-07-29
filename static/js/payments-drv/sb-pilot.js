// @ts-check
const fs = require('fs');
const { ulid } = require('ulid');
const path = require('path');
const shell = require('shelljs');
const { Iconv }  = require('iconv');

const { logger } = require('./config');

// some docs here
// https://support.ucs.ru/ru/book/export/html/7527

// ln -s /dev/ttyACM0 /dev/ttyS99

module.exports = ({ exec, paydir }) => {
  console.log("Starting sb pilot", exec, "in", paydir);

  let ready = true;

  const inuniqdir = (fx) => {
    const dir = path.join(paydir, [new Date().toISOString(), ulid()].join('-'));
    shell.mkdir('-p', dir);
    shell.pushd(dir);
    const sbPilotDir = path.dirname(exec);
    shell.cp(path.join(sbPilotDir, 'pinpad.ini'), dir);
    shell.cp('-P', path.join(sbPilotDir, 'ttyS99'), dir);
    shell.ln('-s', path.join(sbPilotDir, 'upnixmn.out'), path.join(dir, 'upnixmn.out'));
    try {
      ready = false;
      fx(dir);
    } finally {
      ready = true;
      shell.rm(path.join(dir, 'pinpad.ini'));
      shell.rm(path.join(dir, 'ttyS99'));
      shell.rm(path.join(dir, 'upnixmn.out'));
      shell.popd();
    }
  }

  const charge = ({ meta, amount }) => new Promise((reply) =>
    inuniqdir((dir) => {
      logger.info(meta, 'charging', { amount });
      // - оплата = sb_pilot 1 <sum in kopeyx>
      const sbpilotres = shell.exec(`${exec} 1 ${Math.round(100 * amount)}`);
      logger.info(meta, 'sbpilotres', { sbpilotres });
      // if (sbpilotres.code == 0) { // fucking curly handed assholes always return 0
      if (sbpilotres.stdout.indexOf('return:0') >= 0) {
        logger.info(meta, 'charge successful', { amount });
        var data, version;
        try {
          data = new Iconv('KOI8-R', 'UTF-8')
              .convert(fs.readFileSync(path.join(dir, 'e')))
              .toString()
              .split(/\n/);
          version = 'sb-pilot-1.0';
        } catch (e) {
          try {
            data = new Iconv('KOI8-R', 'UTF-8')
                .convert(fs.readFileSync(path.join(path.dirname(exec), 'e')))
                .toString()
                .split(/\n/);
            version = 'sb-pilot-1.0';
          } catch (e2) {
            logger.error(meta, 'stats collection failed', e2);
            data = e;
            version = 'sb-pilot-1.0-error';
          }
        }
        const stats = {
          real: true,
          data,
          version,
        };
        reply({
          success: true,
          stats
        });
      } else {
        logger.error(meta, 'charge failed');
        reply({ error: true });
      }
    }));

  const check = async ({}) => ({
      success: true,
      ready,
    });

  const commit = ({ meta }) => new Promise((reply) =>
    inuniqdir(() => {
      // - сверка (раз в день) = sb_pilot 7
      if (shell.exec(`${exec} 7`).code == 0) {
        logger.info(meta, 'Commit successful');
        reply({ success: true });
      } else {
        logger.error(meta, 'Commit failed');
        reply({ error: true });
      }
    }));

  const refund = ({ meta, amount, cardType = 0, ref }) => new Promise((reply) =>
    inuniqdir((dir) => {
      // - refund = sb_pilot 3 [Сумма [тип карты [трек2\QSELECT [номер ссылки]]]]
      const sbpilotres = ref ?
          shell.exec(`${exec} 3 ${Math.round(100 * amount)} ${cardType} QSELECT ${ref}`) :
          shell.exec(`${exec} 8 ${Math.round(100 * amount)}`);
      logger.info(meta, 'Refund response', { sbpilotres });
      // if (sbpilotres.code == 0) { // fucking curly handed assholes always return 0
      if (sbpilotres.stdout.indexOf('return:0') >= 0) {
        logger.info(meta, 'Refund successful');
        var data, version;
        try {
          data = new Iconv('KOI8-R', 'UTF-8')
              .convert(fs.readFileSync(path.join(dir, 'e')))
              .toString()
              .split(/\n/);
          version = 'sb-pilot-1.0';
        } catch (e) {
          logger.error(meta, 'Stats collection failed', e);
          data = e;
          version = 'sb-pilot-1.0-error';
        }
        const stats = {
          real: true,
          data,
          version,
        };
        reply({
          success: true,
          stats
        });
      } else {
        logger.info(meta, 'Cancel failed');
        reply({ error: true });
      }
    }));

  const status = ()=> {
    const sbpilotres = shell.exec(`${exec} 26`);
    if(sbpilotres.stdout.indexOf('return:0') >= 0) {
      return {success: true, code: 0}
    }
    return {
      error: true,
      code: parseInt(sbpilotres.stdout.match(/return:(\d+)/)?.[1] || '-1')
    }
  }

  const toString = () => 'sb-pilot';

  return { charge, check, commit, refund, status, toString };
};
