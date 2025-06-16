// @ts-check
const { curry } = require("ramda");
const bodyParser = require("koa-bodyparser");
const h = require("hastscript");
const Koa = require("koa");
const Router = require("koa-router");
const toHTML = require("hast-util-to-html");

const doctype = "<!DOCTYPE html>\n";

const ui = curry(async (powermanager) => {
  console.log("UIing");

  const app = new Koa();
  app.use(bodyParser());

  const router = new Router();

  const head = () => h("head", h("title", "Super Odmin"));

  const renderDevice = async (dev) =>
    h("div", [
      h("label",
        { style: "display: inline-block; width: 20em"},
        h("input.toggle", {
          type: "checkbox",
          name: dev,
          value: 1,
          checked: await powermanager.isup(dev),
          onclick: 'document.getElementById("devsform").submit()',
        }),
        dev),
      h("span",
        { style: "display: inline-block; color: #888; font-family: monospace;" },
        await powermanager.describeConfig(dev)),
    ]);

  const postBtn = ({ action, label }) =>
    h("form",
      { action, method: "post", style: "display: inline-block" },
      h("input", { type: "submit", value: label })
    );

  const main = async () =>
    h("div", [
      h("h2", "Typical usage"),
      postBtn({ action: "/startup", label: "Start Up" }),
      postBtn({ action: "/shutdown", label: "Shut Down" }),
      h("hr"),
      h("h2", "Low Level"),
      h(
        "form#devsform",
        { method: "post" },
        await Promise.all(powermanager.devices().map(renderDevice))
      ),
      h("script", "setInterval(() => document.location.reload(), 11000)"),
    ]);

  const body = async ({ location, user }) =>
    h("body", { style: "font-family: system-ui, sans-serif;"}, [await main({ location })]);

  router.get("/", async (ctx, next) => {
    // console.log(ctx)
    ctx.body = doctype + toHTML(h("html", head(ctx), await body(ctx)));
  });

  router.post("/", async (ctx, next) => {
    console.log(ctx.request.body);

    await Promise.all(
      powermanager.devices().map(async (dev) => {
        if (ctx.request.body[dev]) {
          if (!(await powermanager.isup(dev))) {
            console.log({ up: dev, v: ctx.request.body[dev] });
            await powermanager.up(dev);
          }
        } else {
          if (await powermanager.isup(dev)) {
            console.log({ down: dev, v: ctx.request.body[dev] });
            await powermanager.down(dev);
          }
        }
      })
    );

    ctx.redirect("/");
  });

  router.post("/shutdown", async (ctx, next) => {
    /* await */ powermanager.shutdown();
    ctx.redirect("/");
  });

  router.post("/startup", async (ctx, next) => {
    /* await */ powermanager.startup();
    ctx.redirect("/");
  });

  app.use(router.routes()).use(router.allowedMethods());

  app.listen(3000);
});

module.exports = {
  ui,
};
