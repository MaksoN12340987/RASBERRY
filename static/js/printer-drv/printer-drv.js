// @ts-check
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
  console.log(reason.stack);
});

const { Command } = require('commander');
const fake = require('./fake');

const { transport } = require('./config');
const { forEach } = require('ramda');

transport.err(() => process.exit(1));
transport.subscribe('complexos.core.restart', () => {
  console.log("complexos.core.restart received");
  process.exit(75);
});

const connectToTransport = async ({ hwid, impl }) => {
  try {
    transport.def('complexos.printer.muster', async () => hwid);
    transport.def(`complexos.printer.status.${hwid}`, async () => {
      const stat = await impl().status();
      if (stat.workday == 'expired') {
        console.log("auto closing workday");
        impl().commit();
        transport.requestOne('complexos.payments.commit.' + hwid, {});
      }
      return stat;
    });
    transport.def(`complexos.printer.commit.${hwid}`, async (args) => await impl().commit(args));
    transport.def(`complexos.printer.print-cheque.${hwid}`, async (args) => await impl().printCheque(args));
    transport.def(`complexos.printer.print-refund.${hwid}`, async (args) => await impl().printRefund(args));
  } catch (err) {
    console.log("Miserable failure encountered", err);
    process.exit(1);
  }
};

const cli = new Command()
  .version(require('./package.json').version)
  .option('--hwid <hwid...>', '[Required] This printer ID(s) in service transport')
  .option('-f, --format <format>', 'Fake/semifake (atol but discard checks)/atol/barcode')
  .option('-p, --port <path>', 'Path to printer serial port')
  .option('--agent', 'Set commision agent requisites for OFD (atol only)')
  .option('--fake', 'Deprecated, use --format=fake instead')
  .option('--semifake', 'Deprecated, use --format=semifake instead')
  .parse(process.argv);


const opts = cli.opts();
console.log("Starting printer-drv", opts);

if (opts.fake || opts.semifake) {
  console.log("Replace deprecated command line args with new ones");
  cli.help();
  process.exit(1);
}

if (!opts.hwid) {
  console.log("--hwid is required");
  cli.help();
  process.exit(1);
}

let debugImpl, normalImpl;

if (opts.format == 'fake') {
  debugImpl = normalImpl = fake();
} else if (opts.format == 'atol' || opts.format == 'semifake') {
  if (!opts.port) {
    console.log("--port is required for atol");
    process.exit(1);
  }
  // defer requireing serial port
  const atol = require('./atol');
  const implsFactory = atol({ port: opts.port, agent: opts.agent });
  debugImpl = implsFactory.semifake();
  normalImpl = opts.format == 'semifake' ? debugImpl : implsFactory.fiscal();
} else if (opts.format == 'barcode') {
  if (!opts.port) {
    console.log("--port is required for barcode");
    process.exit(1);
  }
  const barcode = require('./barcode');
  debugImpl = normalImpl = barcode({ port: opts.port, hwid: opts.hwid });
}

if (!debugImpl || !normalImpl) {
  console.log("Initiailization failed");
  cli.help();
  process.exit(1);
} else {
  let mode = 'normal';
  const impl = () => mode == 'debug' ? debugImpl : normalImpl;
  const chooseImpl = ({ mode: newMode }) => {
    mode = newMode;
    console.log(opts.hwid, 'Choosing implementation on mode change', { mode, impl: impl().toString() });
  };
  transport.requestOneWithRetries('complexos.core.status').then(chooseImpl);
  transport.subscribe('complexos.bus.operatingModeChanged', chooseImpl);
  forEach(hwid => connectToTransport({ hwid, impl }), opts.hwid);
}
