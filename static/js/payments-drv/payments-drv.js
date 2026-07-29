// @ts-check
const cli = require('commander');

const { transport } = require('./config');

const arcus2 = require('./arcus2');
const sbPilot = require('./sb-pilot');
const uaejar = require('./uaejar');
const fake = require('./fake');
const external = require('./external');

const path = require("path");
const makeWorkdayCounter = require('./workday-counter');
const { queueFactory, singleInstance } = require('u-queue');
const geidea = require('./geidea');

transport.err(() => process.exit(1));
transport.subscribe('complexos.core.restart', () => {
  console.log("complexos.core.restart received");
  process.exit(75);
});

const hour = 60 * 60 * 1000;
const memoize = (timeout) => (fx) => {
  let res;
  let expired = true;
  return (...args) => {
    if(!expired) {
      return res;
    }
    res = fx(...args);
    expired = false;
    setTimeout(() => { expired = true; }, timeout);
    return res;
  }
}


let allowSendSuccessReport = false;

const reportSuccessOnce = ({ hwid, result, method })=> {
  if(allowSendSuccessReport)
    transport.publish('complexos.bus.helpNeeded',{
        key: method ==='charge'
              ?  "payments-charge-success"
              : "payments-method-success"
      , args: { method, hwid }
    });

    transport.publish('watchdog.payments.success.' + method, {
      driver: cli.format,
      hwid,
      result
  });

  allowSendSuccessReport = false;
}

const reportError = ({hwid, result, err, method})=> {
  transport.publish('watchdog.payments.error.' + method, {
      driver: cli.format,
      hwid,
      result,
      err
  });
  const body = {
      text: method ==='charge'
            ? `Ошибка оплаты на терминале ${hwid}`
            : `Payment-drv failed ${method} ${hwid}`,
      err,
      result,
      hwid,
      icon_emoji: ':roll_of_paper:'
  };
  transport.publish('complexos.bus.helpNeeded', {
      key: method ==='charge'
              ?  "payments-charge-fail"
              : "payments-method-fail"
      , args: { method, hwid }});
  transport.publish('complexos.logger.report-incident', { type: `payment-drv.${method}.error`, ...body }),
  allowSendSuccessReport = true;
}

const connectToTransport = async ({ hwid, normalImpl, debugImpl }) => {
  const queue = queueFactory();
  const queued = (fx) => (...args) => queue(() => fx(...args));

  try {
    let impl = normalImpl;
    const workdayCounter = makeWorkdayCounter({ filename: path.resolve('workday-status.json') });

    const chooseImpl = ({ mode }) => {
      impl = mode == 'debug' ? debugImpl : normalImpl;
      console.log('Choosing implementation on mode change', { mode, impl: impl.toString() });
    }

    const loggedImpl = (method) => async (args) => {
      try {
        const result = await impl[method](args);
        if(result.success) {
          reportSuccessOnce({hwid, method, result})
        } else {
          reportError({hwid, method, result, err: undefined})
        }
        return result;
      } catch (err) {
        reportError({hwid, result: undefined, err, method})
        throw err;
      }
    }

    const commit = async () => {
      const commitResult = await loggedImpl('commit')({});
      if (commitResult?.success) {
        workdayCounter.reset();
      }
      return commitResult;
    }

    transport.requestOneWithRetries('complexos.core.status').then(chooseImpl);
    transport.subscribe('complexos.bus.operatingModeChanged', chooseImpl);
    const memoizedStatus = memoize(120000)(impl.status);
    transport.def('complexos.payments.muster', () => Promise.resolve(hwid));
    transport.def(`complexos.payments.status.${hwid}`, singleInstance(queued(async () => {
      const openedAt = await workdayCounter.ask();
      const res = memoizedStatus();
      if (Date.now() - openedAt < 24 * hour) {
        return {
          ...res,
          workday: 'open',
          openedAt,
        };
      } else {
        console.log("auto closing workday");
        commit();
        return {
          ...res,
          workday: 'expired'
        };
      }
    })));
    transport.def('complexos.payments.charge.' + hwid, queued(loggedImpl('charge')));
    transport.def('complexos.payments.check.' + hwid, queued(async (args) => impl.check(args)));
    transport.def('complexos.payments.commit.' + hwid, queued(commit));
    transport.def('complexos.payments.refund.' + hwid, queued(loggedImpl('refund')));
  } catch (err) {
    console.log("Miserable failure encountered", err);
    process.exit(1);
  }
};

cli
  .version(require('./package.json').version)
  .option('--fake', 'Emulate payment terminal')
  .option('--hwid <hwid>', '[Required] This printer ID in service transport')
  .option('-f, --format <path>', 'sb_pilot (default) | arcus2 | geidea | uaejar | external', 'sb_pilot')
  .option('-x, --exec <path>', 'Path to sb_pilot.exe / commandlinetool.exe / uaejar.exe')
  .option('-p, --paydir <path>', 'Path where all sb_pilot transactions will be executed and results stored')
  .option('--barcode', 'Print barcode')
  .option('-w, --ws <url>', 'Url to connect to Geidea')
  .parse(process.argv);


console.log("Starting payments drv...", cli.opts());

const exit = (msg) => {
  console.log(msg);
  cli.help();
  process.exit();
}

cli.hwid || exit("--hwid is required");

const debugImpl = fake();

let normalImpl;

if (cli.fake) {
  normalImpl = debugImpl;
} else if (cli.format == 'sb_pilot') {
  cli.exec || exit("--exec is required for sb_piot");
  normalImpl = sbPilot({ exec: cli.exec, paydir: cli.paydir });
} else if (cli.format == 'arcus2') {
  cli.exec || exit("--exec is required for arcus2");
  normalImpl = arcus2({ exec: cli.exec, paydir: cli.paydir });
} else if (cli.format == 'geidea') {
  cli.ws || exit("--ws is required for geidea");
  normalImpl = geidea({ url: cli.ws });
} else if (cli.format == 'uaejar') {
  cli.exec || exit("--exec is required for uaejar");
  normalImpl = uaejar({ exec: cli.exec, paydir: cli.paydir });
} else if (cli.format == 'external') {
  normalImpl = external({ barcode: cli.barcode });
}

if (normalImpl) {
  connectToTransport({
    hwid: cli.hwid,
    debugImpl,
    normalImpl,
  });
} else {
  cli.help();
}
