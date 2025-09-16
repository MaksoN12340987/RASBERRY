const eversysFactory = require('./eversys');
var fs = require('fs');

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
});

const eversys = eversysFactory({ portName: '/dev/ttyXRUSB0' });

const get = () => {
  console.log('Get status:');
  eversys.getStatus().then(console.log);
};

const dump = () => {
  console.log('Dump:');
  const d = eversys.dumpProducts();
  d.then(console.log);
  d.then((msg) => {
    fs.writeFile("dump-products", new Buffer(msg), function(err) {
      if(err) {
          return console.log(err);
      }

      console.log("The file was saved!");
    });
  });
};

var i = 0;
const ping = async () => {
  // await eversys.doMilkRinse(i % 2, { cycles: 3, repetitions: 4, outlet: false, tubes: true, withSteam: false, tubesLength: 350 });
  // await eversys.doEtcCalibration(0);
  const dumpResults = await eversys.dumpProducts();
  const xtime = dumpResults[22] + (dumpResults[23] << 8);

  console.log({ xtime });
  // console.log();
  // i += 1;
  // if (i == 5) {
  //   i = 0;
  //   dump();
  // } else {
  //   get();
  // }
  // console.log();
  // console.log();
  eversys.dumpProducts().then((b) => console.log(b.toString('hex')));
  // eversys(port, { mi: 0x03 }); // sliv

  // port.write([0x01, 0x10, 0x40, 0x6C, 0x13, 0x42, 0x41, 0x10, 0x41, 0x10, 0x40, 0x10, 0x40, 0x10, 0x40, 0x10, 0x40, 0x9C, 0xC9, 0x04]);
  // port.write([0x01, 0x10, 0x40, 0x68, 0x10, 0x41, 0x42, 0x41, 0x10, 0x43, 0x10, 0x40, 0x10, 0x40, 0x10, 0x40, 0x10, 0x40, 0x57, 0x1C, 0x04]);
  if (i == 3)
    process.exit();
}

// port.on('data', function (data) {
//   console.log('Data:', data);
// });

// setTimeout(() => {
//   eversys.doProduct();
// }, 500)

setInterval(ping, 3003);

// setTimeout(() => process.exit(), 12000);
