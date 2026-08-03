import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ===== DATABASE CONNECTION =====
const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;
if (DATABASE_URL) {
  pool = new pg.Pool({ connectionString: DATABASE_URL });
  pool.on("error", (err) => {
    console.error("Unexpected database pool error:", err.message);
  });
  console.log("Database connection pool created.");
} else {
  console.warn("DATABASE_URL not set. Stats will use fallback values.");
}

// ===== START TIME FOR UPTIME =====
const startTime = Date.now();

// ===== STATS API ENDPOINT =====
app.get("/stats", async (req, res) => {
  const stats = {
    status: "online",
    uptime: "0h 0m",
    guilds: 0,
    users: 0,
    total_wallet: 0,
    total_bank: 0,
    games_played: 0,
    jackpot_active: false,
    jackpot_prize: 0,
    global_multiplier: 1.0,
    version: "2.0.0",
    maintenance: false,
    updated_at: new Date().toISOString()
  };

  // Calculate uptime
  const uptimeMs = Date.now() - startTime;
  const hours = Math.floor(uptimeMs / 3600000);
  const minutes = Math.floor((uptimeMs % 3600000) / 60000);
  stats.uptime = `${hours}h ${minutes}m`;

  if (!pool) {
    res.json(stats);
    return;
  }

  const client = await pool.connect();
  try {
    // Total registered users
    const userResult = await client.query("SELECT COUNT(*)::int FROM users");
    stats.users = userResult.rows[0].count;

    // Total coins in circulation
    const walletResult = await client.query("SELECT COALESCE(SUM(wallet), 0)::bigint FROM users");
    stats.total_wallet = Number(walletResult.rows[0].coalesce);

    const bankResult = await client.query("SELECT COALESCE(SUM(bank), 0)::bigint FROM users");
    stats.total_bank = Number(bankResult.rows[0].coalesce);

    // Active jackpot
    const jackpotResult = await client.query(
      "SELECT total_prize FROM jackpot WHERE is_active = TRUE ORDER BY id DESC LIMIT 1"
    );
    if (jackpotResult.rows.length > 0) {
      stats.jackpot_active = true;
      stats.jackpot_prize = Number(jackpotResult.rows[0].total_prize);
    }

    // Games played (transaction log)
    try {
      const gamesResult = await client.query("SELECT COUNT(*)::int FROM transaction_log");
      stats.games_played = gamesResult.rows[0].count;
    } catch (e) {
      stats.games_played = 0;
    }

    // Global multiplier
    try {
      const multResult = await client.query(
        "SELECT value FROM settings WHERE key = 'global_multiplier'"
      );
      if (multResult.rows.length > 0) {
        stats.global_multiplier = parseFloat(multResult.rows[0].value);
      }
    } catch (e) {
      // multiplier not found, use default
    }

  } catch (err) {
    console.error("Stats query error:", err.message);
  } finally {
    client.release();
  }

  res.json(stats);
});

// ===== SPA ROUTES =====
// Serve static files from the root directory
app.use(express.static(__dirname));

// Serve index.html for all other requests (SPA-like fallback)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`CasinoForge server running on http://0.0.0.0:${PORT}`);
});
