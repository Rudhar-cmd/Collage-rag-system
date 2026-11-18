import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const placementsPath = path.join(__dirname, "../data/placements.json");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const data = JSON.parse(await readFile(placementsPath, "utf8"));
    res.json(data);
  } catch (error) {
    console.error("Unable to load placement opportunities:", error);
    res.status(500).json({
      error: "Unable to load placement opportunities."
    });
  }
});

export default router;
