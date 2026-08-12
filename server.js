// Minimal, zero-dependency Node.js server that puts a login (HTTP Basic Auth)
// in front of the static HFpEF calculator.
//
// Credentials are read from environment variables LOGIN_USERNAME / LOGIN_PASSWORD
// on Render, so they can be changed without touching code. Falls back to the
// testing credentials below if the env vars aren't set.

const http = require("http");
const fs = require("fs");
const path = require("path");

const USERNAME = process.env.LOGIN_USERNAME || "heartfailure";
const PASSWORD = process.env.LOGIN_PASSWORD || "preserved";
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function isAuthorized(req) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const sepIndex = decoded.indexOf(":");
  if (sepIndex === -1) return false;
  const user = decoded.slice(0, sepIndex);
  const pass = decoded.slice(sepIndex + 1);
  return user === USERNAME && pass === PASSWORD;
}

function requireAuth(res) {
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="HFpEF Calculator", charset="UTF-8"',
    "Content-Type": "text/plain",
  });
  res.end("Authentication required.");
}

function serveFile(req, res) {
  let reqPath = decodeURIComponent(req.url.split("?")[0]);
  if (reqPath === "/") reqPath = "/index.html";

  // prevent path traversal
  const safePath = path.normalize(path.join(PUBLIC_DIR, reqPath));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(safePath, (err, data) => {
    if (err) {
      // fall back to index.html for unknown routes (single-page app style)
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(data2);
      });
      return;
    }
    const ext = path.extname(safePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (!isAuthorized(req)) {
    requireAuth(res);
    return;
  }
  serveFile(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
