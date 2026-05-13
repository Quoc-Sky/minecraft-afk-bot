const mineflayer = require("mineflayer");
const express = require("express");

// ─── CONFIG ────────────────────────────────────────────────────────────────
const HOST = "Alpheus0.aternos.me"; // ← Replace with your Aternos address
const PORT = 44710;
const USERNAME = "AFKBot"; // ← Bot's username (use a cracked/offline name)
const RECONNECT_DELAY_MS = 10000; // Wait 10s before reconnecting
// ───────────────────────────────────────────────────────────────────────────

// Keep-alive web server so Glitch doesn't shut the project down
const app = express();
app.get("/", (req, res) => res.send("AFK Bot is running!"));
app.listen(process.env.PORT || 3000, () => console.log("Keep-alive web server started"));

function createBot() {
  const bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,
    version: false,      // Auto-detect server version
    auth: "offline",     // Use "microsoft" if your server requires a real account
  });

  bot.on("login", () => {
    console.log(`[${new Date().toLocaleTimeString()}] Bot logged in as ${bot.username}`);
  });

  // Move around randomly every 30 seconds to avoid AFK kick
  setInterval(() => {
    if (!bot.entity) return;
    const controls = ["forward", "back", "left", "right"];
    const move = controls[Math.floor(Math.random() * controls.length)];
    bot.setControlState(move, true);
    setTimeout(() => bot.setControlState(move, false), 1500);
  }, 30000);

  // Jump every 60 seconds as extra anti-AFK
  setInterval(() => {
    if (!bot.entity) return;
    bot.setControlState("jump", true);
    setTimeout(() => bot.setControlState("jump", false), 500);
  }, 60000);

  bot.on("kicked", (reason) => {
    console.log(`[${new Date().toLocaleTimeString()}] Bot was kicked: ${reason}`);
    console.log(`Reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`);
    setTimeout(createBot, RECONNECT_DELAY_MS);
  });

  bot.on("error", (err) => {
    console.log(`[${new Date().toLocaleTimeString()}] Error: ${err.message}`);
    setTimeout(createBot, RECONNECT_DELAY_MS);
  });

  bot.on("end", () => {
    console.log(`[${new Date().toLocaleTimeString()}] Bot disconnected. Reconnecting...`);
    setTimeout(createBot, RECONNECT_DELAY_MS);
  });
}

createBot();
