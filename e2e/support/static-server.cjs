const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../frontend/dist");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function resolvePath(urlPath) {
  const normalized = path.normalize(urlPath.split("?")[0]).replace(/^(\.\.[/\\])+/, "");
  const filePath = normalized === "/" ? path.join(root, "index.html") : path.join(root, normalized);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath;
  }
  return path.join(root, "index.html");
}

function createStaticServer() {
  const server = http.createServer((req, res) => {
    const filePath = resolvePath(req.url || "/");
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.end("server error");
        return;
      }
      res.setHeader("Content-Type", mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream");
      res.setHeader("Connection", "close");
      res.end(data);
    });
  });

  const sockets = new Set();

  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  server.on("error", (err) => {
    console.error("Static server error:", err.message);
  });

  return {
    server,
    close() {
      return new Promise((resolve) => {
        server.close(() => resolve());
        for (const socket of sockets) {
          socket.destroy();
        }
        setTimeout(resolve, 1000).unref();
      });
    },
  };
}

function startStaticServer(options = {}) {
  const host = options.host || process.env.PLAYWRIGHT_HOST || "127.0.0.1";
  const port = Number(options.port || process.env.PLAYWRIGHT_PORT || "4173");
  const instance = createStaticServer();

  return new Promise((resolve, reject) => {
    const onError = (err) => {
      instance.server.off("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      instance.server.off("error", onError);
      process.stdout.write(`static-preview http://${host}:${port}\n`);
      resolve(instance);
    };
    instance.server.once("error", onError);
    instance.server.once("listening", onListening);
    instance.server.listen(port, host);
  });
}

async function shutdownAndExit(instance) {
  await instance.close();
  process.exit(0);
}

if (require.main === module) {
  startStaticServer().then((instance) => {
    process.on("SIGINT", () => shutdownAndExit(instance));
    process.on("SIGTERM", () => shutdownAndExit(instance));
    process.on("SIGBREAK", () => shutdownAndExit(instance));
  }).catch((err) => {
    console.error("Static server error:", err.message);
    process.exit(1);
  });
}

module.exports = {
  createStaticServer,
  startStaticServer,
};
