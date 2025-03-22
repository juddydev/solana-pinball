const express = require("express");
const mongoose = require("mongoose");
const cron = require("node-cron");
const cors = require("cors");
require("dotenv").config();
const TokenDistributor = require('./tokenDistributor');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Player Schema
const playerSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true },
  score: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

const Player = mongoose.model("Player", playerSchema);

const tokenDistributor = new TokenDistributor();

// API Routes

// 1️⃣ Add or update a player's score
app.post("/update-score", async (req, res) => {
  const { address, score } = req.body;

  if (!address || typeof score !== "number") {
    return res.status(400).json({ error: "Invalid input" });
  }

  const tokenBalance = await tokenDistributor.getTokenBalance(address);

  if (tokenBalance === 0) {
    return res.status(400).json({ error: "Don't have any token to join the game" });
  }

  try {
    const existingPlayer = await Player.findOne({ address });
    
    if (!existingPlayer || score > existingPlayer.score) {
      const player = await Player.findOneAndUpdate(
        { address },
        {
          score,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );
      return res.json({ 
        message: "Score updated", 
        player,
        improved: existingPlayer ? true : false
      });
    } else {
      return res.json({ 
        message: "Score not updated, current score is higher", 
        player: existingPlayer,
        improved: false
      });
    }
  } catch (err) {
    console.error("Error updating score:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// 2️⃣ Get a player's score
app.get("/player/:address", async (req, res) => {
  try {
    const player = await Player.findOne({ address: req.params.address });
    if (!player) return res.status(404).json({ error: "Player not found" });

    res.json({ address: player.address, score: player.score });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// 3️⃣ Get all player scores
app.get("/leaderboard", async (req, res) => {
  try {
    const players = await Player.find().sort({ score: -1 }); // Sort by highest score
    
    // Get token balance for each player
    const playersWithTokenBalance = await Promise.all(
      players.map(async (player) => {
        const tokenBalance = await tokenDistributor.getTokenBalance(player.address);
        return {
          ...player.toObject(),
          tokenBalance: tokenBalance.balance
        };
      })
    );
    
    res.json(playersWithTokenBalance);
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// 4️⃣ Distribute rewards & Reset scores at midnight (Server Time)
// 0 0 * * *
cron.schedule("0 0 * * *", async () => {
  console.log("Distributing rewards...");
  const players = await Player.find().sort({ score: -1 });
  await tokenDistributor.distributeRewards(players);
  console.log("Rewards distributed.");
  console.log("Resetting all player scores...");
  await Player.updateMany({}, { $set: { score: 0 } });
  console.log("All scores reset to 0.");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
