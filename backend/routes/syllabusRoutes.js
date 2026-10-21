
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");

const FILES = {
  early: "cse_batch_2024_details.json",
  later: "cse_batch_2023_2027_semesters_3_8.json",
  aiml: "cse_aiml_syllabus.json",
  cybersecurity: "cse_cybersecurity_syllabus.json",
  llb: "llb_syllabus_full_6_semesters.json",
  bca: "bca_syllabus.json",
  bba: "bba_syllabus.json",
  mtech_cse: "mtech_cse_syllabus.json",
  mtech_other: "mtech_other_specializations_syllabus.json",
  ece: "ece_syllabus.json",
};

const SUPPORTED_PROGRAMS = [
  "cse",
  "ece",
  "aiml",
  "cybersecurity",
  "llb",
  "bca",
  "bba",
  "mtech_cse",
  "mtech_other",
];

function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Syllabus file not found: ${filename}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to parse ${filename}: ${error.message}`);
  }
}

// ------------------------------------------
// CSE: Early batch
// ------------------------------------------
function normalizeEarlySemesters(data) {
  return (data.semesters || []).map((semester) => ({
    semester: semester.semester,
    subjects: (semester.subjects || []).map((subject) => ({
      code: subject.code || null,
      name: subject.name,
      type: subject.type || subject.category || null,
      details_found: subject.details_found ?? false,
      unit_count: subject.units?.length ?? 0,
      units: subject.units || [],
      course_outcomes: subject.course_outcomes || [],
      activities: subject.activities || [],
    })),
  }));
}

// ------------------------------------------
// CSE: Later batch
// ------------------------------------------
function normalizeLaterSemesters(data) {
  return (data.semesters || []).map((semester) => {
    const subjects = [];

    for (const scheme of semester.schemes || []) {
      for (const category of scheme.categories || []) {
        for (const subject of category.subjects || []) {
          subjects.push({
            code: subject.code || null,
            name: subject.name,
            type: category.name || null,
            scheme: scheme.name || null,
            details_found: subject.details_found ?? false,
            unit_count: subject.units?.length ?? 0,
            units: subject.units || [],
          });
        }
      }
    }

    return {
      semester: semester.semester,
      subjects,
      schemes: semester.schemes || [],
    };
  });
}

function loadAllSemesters() {
  const early = readJson(FILES.early);
  const later = readJson(FILES.later);

  // The later file also contains early-semester entries, but its normalizer
  // reads only the scheme/category format used in Semesters 3-8. Keep the
  // detailed subject arrays from the early file for Semesters 1-2.
  const semesters = [
    ...normalizeEarlySemesters(early).filter(
      (semester) => Number(semester.semester) <= 2
    ),
    ...normalizeLaterSemesters(later).filter(
      (semester) => Number(semester.semester) >= 3
    ),
  ];

  semesters.sort(
    (a, b) => Number(a.semester) - Number(b.semester)
  );

  return {
    source: {
      early: early.source || FILES.early,
      later: later.source || FILES.later,
    },
    selectedProgram: "cse",
    selectedBatch: "all",
    semesters,
  };
}

function loadRequestedData(batch) {
  if (batch === "all") {
    return loadAllSemesters();
  }

  if (batch === "2024") {
    const data = readJson(FILES.early);

    return {
      source: data.source || FILES.early,
      selectedProgram: "cse",
      selectedBatch: batch,
      semesters: normalizeEarlySemesters(data),
    };
  }

  if (batch === "2023-2027") {
    const data = readJson(FILES.later);

    return {
      source: data.source || FILES.later,
      selectedProgram: "cse",
      selectedBatch: batch,
      semesters: normalizeLaterSemesters(data),
    };
  }

  throw new Error(
    `Unsupported batch "${batch}". Use batch=all, batch=2024, or batch=2023-2027.`
  );
}

// ------------------------------------------
// Other programmes, including ECE
// ------------------------------------------
function normalizeProgramSubject(subject) {
  return {
    ...subject,
    code: subject.code || null,
    name: subject.name,
    type: subject.category || subject.type || null,
    details_found:
      subject.details_found ??
      (Array.isArray(subject.units) && subject.units.length > 0),
    unit_count: subject.units?.length ?? 0,
    units: subject.units || [],
    course_outcomes: subject.course_outcomes || [],
    activities: subject.activities || [],
  };
}

function loadProgramData(program) {
  if (!SUPPORTED_PROGRAMS.includes(program) || program === "cse") {
    return null;
  }

  const filename = FILES[program];
  const data = readJson(filename);

  const semesters = (data.semesters || []).map((semester) => ({
    ...semester,
    status: semester.status || "available",
    verificationNote: semester.verificationNote || null,

    subjects: (semester.subjects || []).map(
      normalizeProgramSubject
    ),
    
    provisionalSubjects: semester.provisionalSubjects
      ? {
          ...semester.provisionalSubjects,
          subjects: (
            semester.provisionalSubjects.subjects || []
          ).map(normalizeProgramSubject),
        }
      : null,

    // Preserve schemes used by ECE Semesters 7 and 8.
    schemes: (semester.schemes || []).map((scheme) => ({
      ...scheme,
      name: scheme.name || scheme.scheme || scheme.title || null,

      subjects: (scheme.subjects || []).map(
        normalizeProgramSubject
      ),

      categories: (scheme.categories || []).map((category) => ({
        ...category,
        subjects: (category.subjects || []).map(
          normalizeProgramSubject
        ),
      })),
    })),
  }));

  semesters.sort(
    (a, b) => Number(a.semester) - Number(b.semester)
  );

  return {
    source: data.source || filename,
    selectedProgram: data.selectedProgram || program,
    programName: data.programName || program,
    batch: data.batch || null,
    availability: data.availability || null,
    semesters,
  };
}

// Collect subjects from both ordinary semester arrays and schemes.
function getSemesterSubjects(semester) {
  const subjects = [...(semester.subjects || [])];

  for (const scheme of semester.schemes || []) {
    for (const subject of scheme.subjects || []) {
      subjects.push({
        ...subject,
        scheme: subject.scheme || scheme.name || null,
      });
    }

    for (const category of scheme.categories || []) {
      for (const subject of category.subjects || []) {
        subjects.push({
          ...subject,
          type: subject.type || category.name || null,
          scheme: subject.scheme || scheme.name || null,
        });
      }
    }
  }

  return subjects;
}

function getBatch(req) {
  return String(req.query.batch || "all");
}

// ------------------------------------------
// GET /api/syllabus?program=cse&batch=all
// GET /api/syllabus?program=cse&batch=2024
// GET /api/syllabus?program=ece
// GET /api/syllabus?program=aiml
// ------------------------------------------
router.get("/", (req, res) => {
  try {
    const program = String(
      req.query.program || "cse"
    ).toLowerCase();

    if (!SUPPORTED_PROGRAMS.includes(program)) {
      return res.status(400).json({
        error: "Unsupported program.",
        supportedPrograms: SUPPORTED_PROGRAMS,
      });
    }

    if (program === "cse") {
      return res.json(loadRequestedData(getBatch(req)));
    }

    const programData = loadProgramData(program);

    if (!programData) {
      return res.status(400).json({
        error: "Unable to load the requested programme.",
        supportedPrograms: SUPPORTED_PROGRAMS,
      });
    }

    return res.json(programData);
  } catch (error) {
    console.error("Syllabus loading error:", error.message);

    const status =
      error.message.startsWith("Unsupported batch") ? 400 : 500;

    return res.status(status).json({
      error: "Unable to load syllabus.",
      details: error.message,
    });
  }
});

// ------------------------------------------
// GET /api/syllabus/COURSE-CODE?program=ece
// GET /api/syllabus/COURSE-CODE?program=cse&batch=2024
// ------------------------------------------
router.get("/:code", (req, res) => {
  try {
    const program = String(
      req.query.program || "cse"
    ).toLowerCase();

    if (!SUPPORTED_PROGRAMS.includes(program)) {
      return res.status(400).json({
        error: "Unsupported program.",
        supportedPrograms: SUPPORTED_PROGRAMS,
      });
    }

    const data =
      program === "cse"
        ? loadRequestedData(getBatch(req))
        : loadProgramData(program);

    const requestedCode = String(req.params.code).toUpperCase();

    for (const semester of data.semesters || []) {
      const subject = getSemesterSubjects(semester).find(
        (item) =>
          item.code &&
          String(item.code).toUpperCase() === requestedCode
      );

      if (subject) {
        return res.json({
          selectedProgram: program,
          selectedBatch: data.selectedBatch || null,
          semester: semester.semester,
          source: data.source,
          subject,
        });
      }
    }

    return res.status(404).json({
      error: `Subject code ${requestedCode} was not found.`,
      note:
        "Some subjects may not have verified course codes or detailed units.",
    });
  } catch (error) {
    console.error("Syllabus loading error:", error.message);

    const status =
      error.message.startsWith("Unsupported batch") ? 400 : 500;

    return res.status(status).json({
      error: "Unable to load syllabus.",
      details: error.message,
    });
  }
});

export default router;
