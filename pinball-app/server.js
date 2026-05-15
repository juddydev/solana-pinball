const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("@weirdorg/dotenv").config();

process.env.TZ = "UTC";

const TokenDistributor = require("./tokenDistributor");

const app = express();
const publicDir = path.join(__dirname, "public");

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false,
  })
);

app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const playerSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true },
  score: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

const Player = mongoose.model("Player", playerSchema);

let tokenDistributor = null;
let tokenDistributorInitError = null;

function getTokenDistributor() {
  if (tokenDistributor) return tokenDistributor;
  if (tokenDistributorInitError) return null;

  try {
    tokenDistributor = new TokenDistributor();
    console.log("TokenDistributor initialized");
    return tokenDistributor;
  } catch (err) {
    tokenDistributorInitError = err;
    console.warn(
      "TokenDistributor not available (check .env Solana keys):",
      err.message
    );
    return null;
  }
}

app.post("/update-score", async (req, res) => {
  let address;
  let score;
  try {
    ({ address, score } = req.body);
  } catch (error) {
    if (error) {
      console.log("Failed to parse request body in /update-score:", error.message);
    }
    return res.status(400).json({ error: "Invalid request body" });
  }

  if (!address || typeof score !== "number") {
    console.log("Validation failed in /update-score:", { address, score });
    return res.status(400).json({ error: "Invalid input" });
  }

  const distributor = getTokenDistributor();
  if (distributor) {
    let tokenBalance;
    try {
      tokenBalance = await distributor.getTokenBalance(address);
    } catch (error) {
      if (error) {
        console.log("Error while fetching token balance in /update-score:", error.message);
      }
      return res.status(500).json({ error: "Token balance fetch failed" });
    }

    if (tokenBalance && tokenBalance.error) {
      console.log("Token balance response included error:", tokenBalance.error);
    }

    const balance = tokenBalance?.balance ?? 0;
    if (balance === 0) {
      return res.status(400).json({ error: "Don't have any token to join the game" });
    }
  } else {
    console.warn("Skipping token balance check — Solana not configured in .env");
  }

  try {
    const existingPlayer = await Player.findOne({ address });

    if (!existingPlayer || score > existingPlayer.score) {
      const player = await Player.findOneAndUpdate(
        { address },
        {
          score,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
      return res.json({
        message: "Score updated",
        player,
        improved: true,
      });
    }

    return res.json({
      message: "Score not updated, current score is higher",
      player: existingPlayer,
      improved: false,
    });
  } catch (err) {
    console.error("Error updating score:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/player/:address", async (req, res) => {
  try {
    if (!req.params.address) {
      console.log("Missing address param in /player route");
      return res.status(400).json({ error: "Address is required" });
    }
    const player = await Player.findOne({ address: req.params.address });
    if (!player) return res.status(404).json({ error: "Player not found" });

    res.json({ address: player.address, score: player.score });
  } catch (err) {
    if (err) {
      console.log("Error occurred in /player route:", err.message);
    }
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/leaderboard", async (req, res) => {
  try {
    const players = await Player.find().sort({ score: -1 });

    const distributor = getTokenDistributor();
    const playersWithTokenBalance = await Promise.all(
      players.map(async (player) => {
        if (!distributor) {
          return { ...player.toObject(), tokenBalance: 0 };
        }
        const tokenBalance = await distributor.getTokenBalance(player.address);
        if (tokenBalance && tokenBalance.error) {
          console.log(`Token balance error for ${player.address}:`, tokenBalance.error);
        }
        return {
          ...player.toObject(),
          tokenBalance: tokenBalance?.balance ?? 0,
        };
      })
    );

    res.json(playersWithTokenBalance);
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/distribute-rewards", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log("Unauthorized distribute-rewards call detected");
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("Distributing rewards at", new Date().toISOString());
    const players = await Player.find().sort({ score: -1 });

    const distributor = getTokenDistributor();
    if (!distributor) {
      return res.status(503).json({
        success: false,
        error: "Solana rewards not configured. Set PROGRAM_ID, TOKEN_MINT_ADDRESS, and TREASURY_ACCOUNT in .env",
      });
    }

    const distributionResult = await distributor.distributeRewards(players);

    console.log("Rewards distributed.");
    console.log("Resetting all player scores...");

    await Player.updateMany({}, { $set: { score: 0 } });

    console.log("All scores reset to 0.");

    return res.status(200).json({
      success: true,
      message: "Rewards distributed and scores reset",
      distributionResult,
    });
  } catch (error) {
    if (error) {
      console.log("Caught error in /api/distribute-rewards:", error.message);
    }
    console.error("Error in distribute-rewards cron:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.use(express.static(publicDir));

app.get("*", (req, res, next) => {
  if (req.method !== "GET") return next();
  const filePath = path.join(publicDir, req.path);
  if (path.extname(req.path)) {
    return res.status(404).send("Not found");
  }
  const page = req.path.endsWith("leaderboard") ? "leaderboard.html" : "index.html";
  res.sendFile(path.join(publicDir, page));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API and frontend: http://localhost:${PORT}`);
});
