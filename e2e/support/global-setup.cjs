const http = require("http");
const { startStaticServer } = require("./static-server.cjs");

const host = process.env.PLAYWRIGHT_HOST || "127.0.0.1";
const port = Number(process.env.PLAYWRIGHT_PORT || "4173");
const baseURL = `http://${host}:${port}`;

function isAvailable() {
  return new Promise((resolve) => {
    const req = http.get(baseURL, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

module.exports = async function globalSetup() {
  if (await isAvailable()) {
    return undefined;
  }

  const instance = await startStaticServer({ host, port });
  return async () => {
    await instance.close();
  };
};
