const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../frontend/dist");
const host = process.env.PLAYWRIGHT_HOST || "127.0.0.1";
const port = Number(process.env.PLAYWRIGHT_PORT || "4173");

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

const server = http.createServer((req, res) => {
  const filePath = resolvePath(req.url || "/");
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.end("server error");
      return;
    }
    res.setHeader("Content-Type", mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream");
    res.end(data);
  });
});

server.listen(port, host, () => {
  process.stdout.write(`static-preview http://${host}:${port}\n`);
});
