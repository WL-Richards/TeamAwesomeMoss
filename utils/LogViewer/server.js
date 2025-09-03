import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import net from "net";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = process.env.HOST || "172.26.115.9";        // match your Python example
const TCP_PORT = parseInt(process.env.TCP_PORT || "18194", 10);
const WEB_PORT = parseInt(process.env.WEB_PORT || "3000", 10);

const app = express();
app.use(express.static(path.join(__dirname, "public")));
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: "*" } });

// Broadcast helper
function emitLog(line, meta = {}) {
  // Expected format: [Category] [Something] [file:func:line] message...
  // Per your note: the TEXT BETWEEN THE FIRST [] IS THE CATEGORY.
  const match = line.match(/^\s*\[([^\]]*)\]\s*(?:\[([^\]]*)\]\s*)?(?:\[([^\]]*)\]\s*)?(.*)$/);
  const category = match?.[1] ?? "uncategorized";
  const group3 = match?.[2] ?? "";
  const message = (match?.[3] ?? line).trim();

  io.emit("log", {
    raw: line,
    category,
    group3,       // often "file:func:line"
    message,
    ...meta
  });
}

// ---- TCP Server (like your Python example) ----
const tcpServer = net.createServer((socket) => {
  const clientIP = socket.remoteAddress?.replace(/^::ffff:/, "") || "unknown";
  const clientPort = socket.remotePort || 0;
  const banner = `---- Connection from ${clientIP} at ${new Date().toISOString()} ----`;
  console.log(banner);
  emitLog(`[SYSTEM] [${clientIP}:${clientPort}:0] ${banner}`);

  // Per-connection log file
  const logFile = path.join(__dirname, `${clientIP}_${clientPort}.log`);
  const writeStream = fs.createWriteStream(logFile, { flags: "a" });

  socket.on("data", (buf) => {
    const now = new Date();
    // Handle partial frames by splitting on newlines
    const chunk = buf.toString("utf8");
    const lines = chunk.split(/\r?\n/);
    for (const raw of lines) {
      if (!raw.trim()) continue;
      const stamped = `${raw}`;
      console.log(stamped);
      writeStream.write(stamped + "\n");
      emitLog(stamped, { clientIP, clientPort, ts: now.toISOString() });
    }
  });

  socket.on("close", () => {
    const msg = `---- Console ${clientIP} disconnected from log server at ${new Date().toISOString()}! ----`;
    console.log(msg);
    emitLog(`[SYSTEM] [${clientIP}:${clientPort}:0] ${msg}`);
    writeStream.end();
  });

  socket.on("error", (err) => {
    const msg = `Socket error from ${clientIP}:${clientPort} -> ${err.message}`;
    console.error(msg);
    emitLog(`[SYSTEM] [${clientIP}:${clientPort}:0] ${msg}`);
  });
});

// Start servers
tcpServer.listen({ host: HOST, port: TCP_PORT }, () => {
  console.log(`TCP server listening on ${HOST}:${TCP_PORT}`);
});

httpServer.listen(WEB_PORT, () => {
  console.log(`Web UI available at http://localhost:${WEB_PORT}`);
});