import express from "express";
import Chat from "../models/Chat.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({
      userId: req.userId
    }).sort({ createdAt: -1 });

    res.json({
      chats
    });
  } catch (error) {
    res.status(500).json({
      error: "Unable to fetch chat history."
    });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { question, answer, sources = [] } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        error: "Question and answer are required."
      });
    }

    const chat = await Chat.create({
      userId: req.userId,
      question,
      answer,
      sources
    });

    res.status(201).json({
      message: "Chat saved successfully.",
      chat
    });
  } catch (error) {
    res.status(500).json({
      error: "Unable to save chat."
    });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!chat) {
      return res.status(404).json({
        error: "Chat not found."
      });
    }

    res.json({
      message: "Chat deleted successfully."
    });
  } catch (error) {
    res.status(500).json({
      error: "Unable to delete chat."
    });
  }
});

export default router;