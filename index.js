const mineflayer = require("mineflayer");
const express = require("express");

// ─── CONFIG ────────────────────────────────────────────────────────────────
const HOST = "your-server.aternos.me"; // ← Your Aternos address
const PORT = 25565;
const USERNAME = "AFKBot";
const MIN_RECONNECT_MS = 60000;   // Wait at least 60s before reconnecting
const MAX_RECONNECT_MS = 600000;  // Cap at 10 minutes max wait
// ───────────────────────────────────────────────────────────────────────────

// Keep-alive web server
const app = express();
app.get("/", (req, res) => res.send("AFK Bot is running!"));
app.listen(process.env.PORT || 3000, () => console.log("Keep-alive server started"));

let reconnectDelay = MIN_RECONNECT_MS;
let reconnectTimeout = null;

function createBot() {
  // Clear any pending reconnect
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  console.log(`[${new Date().toLocaleTimeString()}] Connecting to ${HOST}...`);

  const bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,
    version: false,
    auth: "offline",
    hideErrors: false,
    checkTimeoutInterval: 30000,
  });

  bot.on("login", () => {
    console.log(`[${new Date().toLocaleTimeString()}] ✅ Bot logged in as ${bot.username}`);
    reconnectDelay = MIN_RECONNECT_MS; // Reset delay on successful login
  });

  // Human-like movement: random direction, random duration, random interval
  function randomMove() {
    if (!bot.entity) return;
    const controls = ["forward", "back", "left", "right", "forward", "forward"]; // bias forward
    const move = controls[Math.floor(Math.random() * controls.length)];
    const duration = 500 + Math.random() * 2000; // move for 0.5s to 2.5s
    bot.setControlState(move, true);

    // Sometimes jump while moving
    if (Math.random() > 0.5) {
      setTimeout(() => {
        if (!bot.entity) return;
        bot.setControlState("jump", true);
        setTimeout(() => bot.setControlState("jump", false), 300);
      }, Math.random() * duration);
    }

    setTimeout(() => {
      bot.setControlState(move, false);
      // Schedule next move after a random delay (20s to 60s)
      const nextMove = 20000 + Math.random() * 40000;
      moveTimeout = setTimeout(randomMove, nextMove);
    }, duration);
  }

  // Randomly look around
  function randomLook() {
    if (!bot.entity) return;
    const yaw = (Math.random() * 2 - 1) * Math.PI;
    const pitch = (Math.random() - 0.5) * Math.PI / 2;
    bot.look(yaw, pitch, true);
    const nextLook = 15000 + Math.random() * 30000;
    lookTimeout = setTimeout(randomLook, nextLook);
  }

  let moveTimeout = setTimeout(randomMove, 5000);
  let lookTimeout = setTimeout(randomLook, 8000);

  function cleanup() {
    clearTimeout(moveTimeout);
    clearTimeout(lookTimeout);
  }

  function scheduleReconnect(reason) {
    cleanup();
    console.log(`[${new Date().toLocaleTimeString()}] ⚠️  ${reason}`);
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 Reconnecting in ${reconnectDelay / 1000}s...`);
    reconnectTimeout = setTimeout(() => {
      // Exponential backoff: double the delay each time, up to the max
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS);
      createBot();
    }, reconnectDelay);
  }

  bot.on("kicked", (reason) => {
    // Reason can be a string, object, or JSON — safely convert to string
    let parsed = reason;
    try {
      if (typeof reason === "object") {
        parsed = reason.text || reason.translate || JSON.stringify(reason);
      } else {
        parsed = JSON.parse(reason)?.text || reason;
      }
    } catch {}
    const parsedStr = String(parsed).toLowerCase();

    // If throttled, wait the maximum time before trying again
    if (parsedStr.includes("throttl")) {
      reconnectDelay = MAX_RECONNECT_MS;
    }

    scheduleReconnect(`Kicked: ${parsed}`);
  });

  bot.on("error", (err) => {
    // Ignore ECONNRESET noise — the 'end' event handles the reconnect
    if (err.code === "ECONNRESET") return;
    scheduleReconnect(`Error: ${err.message}`);
  });

  bot.on("end", () => {
    scheduleReconnect("Bot disconnected.");
  });
}

createBot();
