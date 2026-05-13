const mineflayer = require("mineflayer");
const express = require("express");

// ─── CONFIG ────────────────────────────────────────────────────────────────
const HOST = "Alpheus0.aternos.me"; // ← Replace with your Aternos address
const PORT = 44710;
const USERNAME = "AFKBot"; // ← Bot's username (use a cracked/offline name)
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
 
  // Move randomly every 45 seconds
  const moveInterval = setInterval(() => {
    if (!bot.entity) return;
    const controls = ["forward", "back", "left", "right"];
    const move = controls[Math.floor(Math.random() * controls.length)];
    bot.setControlState(move, true);
    setTimeout(() => bot.setControlState(move, false), 1500);
  }, 45000);
 
  // Jump every 90 seconds
  const jumpInterval = setInterval(() => {
    if (!bot.entity) return;
    bot.setControlState("jump", true);
    setTimeout(() => bot.setControlState("jump", false), 500);
  }, 90000);
 
  function cleanup() {
    clearInterval(moveInterval);
    clearInterval(jumpInterval);
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
    let parsed = reason;
    try { parsed = JSON.parse(reason)?.text || reason; } catch {}
 
    // If throttled, wait the maximum time before trying again
    if (parsed.toLowerCase().includes("throttl")) {
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
