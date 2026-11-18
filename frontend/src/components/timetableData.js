export const timetables = [
  {
    id: "semester-1",
    semester: "1",
    title: "Semester 1 · Batch 2026",
    branches: "B.E. first-year classes",
    file: "/timetables/semester-1-2026.pdf",
  },
  {
    id: "semester-3",
    semester: "3",
    title: "Semester 3",
    branches: "CSE · AI-ML · Cyber Security",
    file: "/timetables/semester-3.pdf",
  },
  {
    id: "semester-5-cse",
    semester: "5",
    title: "Semester 5 · CSE",
    branches: "Computer Science and Engineering",
    file: "/timetables/semester-5-cse.pdf",
  },
  {
    id: "semester-5-aiml",
    semester: "5",
    title: "Semester 5 · AI-ML",
    branches: "Artificial Intelligence and Machine Learning",
    file: "/timetables/semester-5-aiml.pdf",
  },
  {
    id: "semester-5-cybersecurity",
    semester: "5",
    title: "Semester 5 · Cyber Security",
    branches: "Cyber Security",
    file: "/timetables/semester-5-cyber-security.pdf",
  },
  {
    id: "semester-7",
    semester: "7",
    title: "Semester 7",
    branches: "CSE · AI-ML · Cyber Security",
    file: "/timetables/semester-7.pdf",
  },
];

export const branchNames = {
  cse: "CSE",
  aiml: "AI-ML",
  cybersecurity: "Cyber Security",
  general: "First-year (common)",
};

export function getTimetableId(profile) {
  if (!profile?.semester) return null;
  if (profile.semester === "1") {
    return profile.branch === "general" ? "semester-1" : null;
  }
  if (profile.semester === "5") {
    return profile.branch ? `semester-5-${profile.branch}` : null;
  }
  if (["3", "7"].includes(profile.semester) && profile.branch) {
    return `semester-${profile.semester}`;
  }
  return null;
}

export function getTimetableById(id) {
  return timetables.find((timetable) => timetable.id === id) || null;
}
