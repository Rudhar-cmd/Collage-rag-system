import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    question: {
      type: String,
      required: true,
      trim: true
    },

    answer: {
      type: String,
      required: true
    },

    sources: [
      {
        source: String,
        page: mongoose.Schema.Types.Mixed,
        score: Number
      }
    ]
  },
  {
    timestamps: true
  }
);

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;