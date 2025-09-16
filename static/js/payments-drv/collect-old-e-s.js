const fs = require('fs');
const path = require('path');
const { Iconv }  = require('iconv');

const proot = '/home/foodtronics/payments';

const all = [];

const iconv = new Iconv('KOI8-R', 'UTF-8');

fs.readdirSync(proot).forEach((pmt) => {
  try {
    const data = fs.readFileSync(path.join(proot, pmt, 'e'));
    all.push([pmt].concat(iconv.convert(data).toString().split(/\n/)));
  } catch(e) {
    console.log("Skipping", pmt, e);
  }
})

console.log(all);

fs.writeFileSync('all.json', JSON.stringify(all));
