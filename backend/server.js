
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";
import Chat from "./models/Chat.js";
import syllabusRoutes from "./routes/syllabusRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");

const app = express();

const PORT = process.env.PORT || 8003;
const FLASK_RAG_URL =
  process.env.FLASK_RAG_URL || "http://127.0.0.1:5001";

// --------------------------------------------------
// Middleware and routes
// --------------------------------------------------

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/syllabus", syllabusRoutes);

// --------------------------------------------------
// MongoDB connection
// --------------------------------------------------

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB Atlas Connected");
  })
  .catch((error) => {
    console.error(
      "MongoDB Atlas Connection Error:",
      error.message
    );
  });

// --------------------------------------------------
// Load syllabus data
// --------------------------------------------------

function loadSyllabusData(filename) {
  const filePath = path.join(DATA_DIR, filename);

  return JSON.parse(
    fs.readFileSync(filePath, "utf8")
  );
}

// --------------------------------------------------
// Detect semester number
// Supports:
// "3rd semester syllabus"
// "Semester 3rd Syllabus"
// "third sem"
// "semester 5"
// "5th sem CSE"
// --------------------------------------------------

function detectSemesterNumber(question) {
  const q = question.toLowerCase();

  const semesterMatch = q.match(
    /\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th|seventh|7th|eighth|8th|[1-8])\s*(?:semester|sem)\b|\b(?:semester|sem)\s*(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th|seventh|7th|eighth|8th|[1-8])\b/i
  );

  if (!semesterMatch) {
    return null;
  }

  const value = (
    semesterMatch[1] || semesterMatch[2]
  ).toLowerCase();

  const semesterNumbers = {
    first: 1,
    "1st": 1,
    "1": 1,
    second: 2,
    "2nd": 2,
    "2": 2,
    third: 3,
    "3rd": 3,
    "3": 3,
    fourth: 4,
    "4th": 4,
    "4": 4,
    fifth: 5,
    "5th": 5,
    "5": 5,
    sixth: 6,
    "6th": 6,
    "6": 6,
    seventh: 7,
    "7th": 7,
    "7": 7,
    eighth: 8,
    "8th": 8,
    "8": 8
  };

  return semesterNumbers[value] ?? null;
}

// --------------------------------------------------
// Detect syllabus questions
// --------------------------------------------------

function isSyllabusQuestion(question) {
  return /\b(syllabus|course content|course outline|units in|topics in)\b/i.test(
    question
  );
}

function detectSyllabusProgramme(question) {
  const q = question.toLowerCase();

  
  if (/\bm\.?\s*tech\b|\bmtech\b|master of technology/.test(q)) {
    return "mtech";
  }

  if (/\bbba\b|bachelor of business administration/.test(q)) {
    return "bba";
  }

  if (/\bbca\b|bachelor of computer applications/.test(q)) {
    return "bca";
  }

  if (/\bllb\b|\blaw syllabus\b/.test(q)) {
    return "llb";
  }

  if (/\bb\.?\s*tech\b|\bbachelor of technology\b|\bb\.?\s*e\.?\b/.test(q)) {
    return "btech";
  }

  if (/\bcse\b|computer science/.test(q)) {
    return "cse";
  }

  return null;
}


// --------------------------------------------------
// Format subject details from the 2024 dataset
// --------------------------------------------------

function formatDetailedSemester(semester) {
  return (semester.subjects || [])
    .map((subject) => {
      const units = subject.units || [];

      const unitContent = units.length
        ? units
            .map(
              (unit) =>
                `#### Unit ${unit.unit}\n\n${unit.content}`
            )
            .join("\n\n")
        : "Detailed unit contents are not available in the current dataset.";

      return (
        `### ${subject.code} — ${subject.name}\n\n` +
        `${unitContent}`
      );
    })
    .join("\n\n");
}

// --------------------------------------------------
// Format scheme-based subjects from the 2023-2027
// screenshot-transcribed dataset
// --------------------------------------------------

function formatSchemeSemester(semester) {
  return (semester.schemes || [])
    .map((scheme) => {
      const categories = (scheme.categories || [])
        .map((category) => {
          const subjects = (category.subjects || [])
            .map((subject) => `- ${subject.name}`)
            .join("\n");

          return (
            `#### ${category.name}\n\n` +
            `${subjects || "No subjects listed."}`
          );
        })
        .join("\n\n");

      return (
        `### ${scheme.name}\n\n` +
        `${categories}`
      );
    })
    .join("\n\n");
}

// --------------------------------------------------
// Format source and verification note
// --------------------------------------------------

function formatSourceNote(data) {
  return (
    `\n\n**Source:** ${data.source?.title || "Syllabus dataset"}\n\n` +
    `**Verification note:** ${
      data.source?.verification_note ||
      "Verify the syllabus against the applicable official document."
    }`
  );
}

// --------------------------------------------------
// Answer syllabus questions using the correct dataset
// --------------------------------------------------

function answerSyllabusQuestion(question) {
  const programme = detectSyllabusProgramme(question);

  // This local dataset contains CSE syllabus data only.
  // Let Flask RAG handle other programmes.
  if (programme && programme !== "cse" && programme !== "btech") {
    return null;
  }
  
  if (!isSyllabusQuestion(question)) {
    return null;
  }

  const semesterNumber = detectSemesterNumber(question);

  const codeMatch = question.match(
    /\b(?:bsc|esc|com|hsmc|ncc|mcc)-\d{3}\b/i
  );

  // Semesters 1-2 use the existing 2024 dataset.
  // Semesters 3-8 use the screenshot-transcribed dataset.
  const useNewDataset =
    semesterNumber !== null && semesterNumber >= 3;

  const filename = useNewDataset
    ? "cse_batch_2023_2027_semesters_3_8.json"
    : "cse_batch_2024_details.json";

  try {
    const data = loadSyllabusData(filename);
    const semesters = data.semesters || [];

    // ----------------------------------------------
    // Subject-code lookup
    // ----------------------------------------------

    if (codeMatch) {
      const code = codeMatch[0].toUpperCase();

      for (const semester of semesters) {
        for (const subject of semester.subjects || []) {
          if (subject.code?.toUpperCase() === code) {
            const unitContent = (subject.units || [])
              .map(
                (unit) =>
                  `### Unit ${unit.unit}\n\n${unit.content}`
              )
              .join("\n\n");

            const answer =
              `## ${subject.code} — ${subject.name}\n\n` +
              `**Semester:** ${semester.semester}\n\n` +
              `${
                unitContent ||
                "Detailed unit contents are not available in the current dataset."
              }` +
              formatSourceNote(data);

            return {
              answer,
              sources: [
                {
                  source: data.source?.document || filename
                }
              ]
            };
          }
        }
      }

      if (useNewDataset) {
        return {
          answer:
            `I couldn't verify course code ${code} in the available Semester 3–8 dataset. ` +
            `The current data contains subject names and categories, but not verified course codes or unit-wise contents.` +
            formatSourceNote(data),
          sources: [
            {
              source: data.source?.title || filename
            }
          ]
        };
      }
    }

    // ----------------------------------------------
    // Semester-specific lookup
    // ----------------------------------------------

    if (semesterNumber !== null) {
      const semester = semesters.find(
        (item) => item.semester === semesterNumber
      );

      if (!semester) {
        return {
          answer:
            `Semester ${semesterNumber} was not found in the selected syllabus dataset.`,
          sources: [
            {
              source: data.source?.document || filename
            }
          ]
        };
      }

      const subjectContent = semester.subjects
        ? formatDetailedSemester(semester)
        : formatSchemeSemester(semester);

      const answer =
        `## Semester ${semesterNumber} Syllabus\n\n` +
        `${subjectContent || "No subjects are listed for this semester."}` +
        formatSourceNote(data);

      return {
        answer,
        sources: [
          {
            source: data.source?.document || filename
          }
        ]
      };
    }

    // ----------------------------------------------
    // General syllabus question
    // ----------------------------------------------

    const semesterList = semesters
      .map((semester) => {
        const content = semester.subjects
          ? (semester.subjects || [])
              .map(
                (subject) =>
                  `- ${subject.code} — ${subject.name}`
              )
              .join("\n")
          : formatSchemeSemester(semester);

        return (
          `### Semester ${semester.semester}\n\n` +
          `${content || "No subjects listed."}`
        );
      })
      .join("\n\n");

    return {
      answer:
        `## Available Syllabus Overview\n\n` +
        `${semesterList}` +
        formatSourceNote(data),
      sources: [
        {
          source: data.source?.document || filename
        }
      ]
    };
  } catch (error) {
    console.error(
      "Syllabus lookup failed:",
      error.message
    );

    return null;
  }
}

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/api/health", async (_req, res) => {
  try {
    const response = await fetch(
      `${FLASK_RAG_URL}/health`
    );

    const data = await response.json();

    res.json({
      backend: "ok",
      database:
        mongoose.connection.readyState === 1
          ? "connected"
          : "disconnected",
      ragService: data
    });
  } catch (error) {
    res.status(503).json({
      backend: "ok",
      database:
        mongoose.connection.readyState === 1
          ? "connected"
          : "disconnected",
      ragService: "unavailable",
      error: error.message
    });
  }
});

// --------------------------------------------------
// Main chatbot query
// --------------------------------------------------

app.post("/api/query", authMiddleware, async (req, res) => {
  const { question, top_k = 3 } = req.body;

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({
      error: "Question is required."
    });
  }

  const cleanQuestion = question.trim();

  try {
    // Send syllabus questions directly to Flask first.
    const isSyllabusQuestion =
      /\bsyllabus\b|semester-wise subjects|subject list/i.test(
        cleanQuestion
      );

    if (isSyllabusQuestion) {
      console.log("Syllabus question:", cleanQuestion);
      console.log("Flask URL:", FLASK_RAG_URL);

      const response = await fetch(`${FLASK_RAG_URL}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: cleanQuestion,
          top_k
        })
      });

      const data = await response.json();

      console.log(
        "Flask answer received:",
        (data.answer || "").slice(0, 200)
      );
      console.log("Flask sources:", data.sources);

      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      const answer = data.answer || "";
      const sources = data.sources || [];

      const chat = await Chat.create({
        userId: req.userId,
        question: cleanQuestion,
        answer,
        sources
      });

      return res.json({
        answer,
        sources,
        chatId: chat._id
      });
    }

    // Keep the existing Node-side handler for other questions.
    const syllabusResult = answerSyllabusQuestion(cleanQuestion);

    if (syllabusResult) {
      const chat = await Chat.create({
        userId: req.userId,
        question: cleanQuestion,
        answer: syllabusResult.answer,
        sources: syllabusResult.sources
      });

      return res.json({
        answer: syllabusResult.answer,
        sources: syllabusResult.sources,
        chatId: chat._id
      });
    }

    // Non-syllabus questions use Flask RAG.
    const response = await fetch(`${FLASK_RAG_URL}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: cleanQuestion,
        top_k
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const answer = data.answer || "";
    const sources = data.sources || [];

    const chat = await Chat.create({
      userId: req.userId,
      question: cleanQuestion,
      answer,
      sources
    });

    return res.json({
      answer,
      sources,
      chatId: chat._id
    });
  } catch (error) {
    console.error("Query processing failed:", error);

    return res.status(503).json({
      error: "Unable to process the question.",
      details: error.message
    });
  }
});


// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(
    `Backend running at http://127.0.0.1:${PORT}`
  );
});
