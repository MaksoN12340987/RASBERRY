// @ts-check
const { DOMImplementation, XMLSerializer } = require('xmldom');
const JsBarcode = require('jsbarcode');
const sharp = require('sharp');
const { queueFactory, sleep } = require('u-queue');
const { transport } = require('./config');

function render(barcode, label) {
  const document = new DOMImplementation().createDocument('http://www.w3.org/1999/xhtml', 'html', null);
  function appendLabel(parent, label) {
    const text = document.createElement("text");
    text.setAttribute("x", "112");
    text.setAttribute("y", "112");
    text.setAttribute("fill", "black");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("style", "font: 20px monospace");
    text.textContent = label;
    parent.appendChild(text);
  }

  const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svgNode, barcode, {
    format: "CODE128",
    xmlDocument: document,
    // text: 'hello',
    height: 70,
    marginBottom: 40,
  });

  const textg = svgNode.getElementsByTagName("text").item(0)?.parentNode;
  if (textg) {
    appendLabel(textg, label);
  } else {
    console.log("[ barcode ] failed to appent order numnber: <text> not found");
  }

  const xmlSerializer = new XMLSerializer();
  return xmlSerializer.serializeToString(svgNode);
  // console.log(svgText);
}

module.exports = ({ port, hwid }) => {
  let PrinterClient;
  import('niimbotjs').then(nimb => {
    PrinterClient = nimb.PrinterClient;
  });

  let q = queueFactory();
  let pingtimer;
  const ping = () => q(async () => {
    if (PrinterClient) {
      const client = new PrinterClient();
      try {
        await client.open(port);
        console.log("[ barcode ] heart response", await client.getHeartBeat());
      } catch (err) {
        console.log("[ barcode ] heart failure", err);
        transport.publish('complexos.bus.supervise',
          { deviceId: `${hwid}-printer`, action: 'powercycle', downtime: 4000 });
        await sleep(5000);
      } finally {
        client.close();
      }
    }
    pingtimer = setTimeout(ping, 3333);
  });
  pingtimer = setTimeout(ping, 3333);

  return {
    async commit() {
      return { success: true };
    },
    async status() {
      return { workday: 'open' };
    },
    async printCheque({ barcode, ordernumber }) {
      return q(async () => {
        console.log("[ barcode ] printing", { barcode });
        if (!PrinterClient) {
          console.log("[ barcode ] print failed");
          return { error: true, message: "PrinterClient not imported" }
        }
        clearTimeout(pingtimer);
        if (barcode && String(barcode).trim().length) {
          const svg = render(barcode, `Заказ #${ordernumber}`);
          const image = sharp(Buffer.from(svg), { density: 100 })
            // .threshold()
            .sharpen()
            .sharpen();

          const client = new PrinterClient();
          try {
            await client.open(port);
            const res = await client.print(image, { density: 3 });
            console.log("[ barcode ] Print success, result", res);
          } catch (error) {
            console.error("[ barcode ] Print failed", error);
            return { error: true, message: error.toString() };
          } finally {
            client.close();
            pingtimer = setTimeout(ping, 3333);
          }
          return { success: true };
        }
      });
    },
    async printRefund() {
      return { success: true };
    },
    toString: () => `barcode printer`,
  };
}
