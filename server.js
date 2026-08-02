import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// ===== STATS API ENDPOINT =====
const demoStats = {
  status: "online",
  uptime: "12h 34m",
  guilds: 47,
  users: 1823,
  total_wallet: 2847392,
  total_bank: 5192847,
  games_played: 14753,
  jackpot_active: true,
  jackpot_prize: 48200,
  global_multiplier: 1.0,
  version: "2.0.0",
  maintenance: false,
  updated_at: new Date().toISOString()
};

app.get("/stats", (req, res) => {
  // Update the timestamp to current time
  demoStats.updated_at = new Date().toISOString();
  res.json(demoStats);
});

// Serve static files from the root directory
app.use(express.static(__dirname));

// Serve index.html for all other requests (SPA-like fallback)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
