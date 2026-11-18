import { useMemo, useState } from "react";
import "./ResumeReviewer.css";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 20;

const skillTerms = [
  { label: "JavaScript", aliases: ["javascript"] },
  { label: "TypeScript", aliases: ["typescript"] },
  { label: "Python", aliases: ["python"] },
  { label: "Java", aliases: ["java"] },
  { label: "C++", aliases: ["c\\+\\+"] },
  { label: "C#", aliases: ["c#"] },
  { label: "SQL", aliases: ["sql"] },
  { label: "HTML", aliases: ["html"] },
  { label: "CSS", aliases: ["css"] },
  { label: "React", aliases: ["react"] },
  { label: "Node.js", aliases: ["node\\.js", "nodejs"] },
  { label: "Express", aliases: ["express"] },
  { label: "FastAPI", aliases: ["fastapi"] },
  { label: "Flask", aliases: ["flask"] },
  { label: "REST APIs", aliases: ["rest\\s+apis?", "restful\\s+apis?"] },
  { label: "MongoDB", aliases: ["mongodb"] },
  { label: "PostgreSQL", aliases: ["postgresql", "postgres"] },
  { label: "AWS", aliases: ["aws", "amazon web services"] },
  { label: "Azure", aliases: ["azure"] },
  { label: "Google Cloud", aliases: ["google cloud", "gcp"] },
  { label: "Docker", aliases: ["docker"] },
  { label: "Kubernetes", aliases: ["kubernetes", "k8s"] },
  { label: "Git", aliases: ["git"] },
  { label: "Data structures & algorithms", aliases: ["data structures?(?:\\s+and\\s+algorithms)?", "algorithms", "\\bdsa\\b"] },
  { label: "Linux", aliases: ["linux"] },
  { label: "Excel", aliases: ["excel", "spreadsheets?"] },
  { label: "Power BI", aliases: ["power\\s*bi"] },
  { label: "Tableau", aliases: ["tableau"] },
  { label: "Networking", aliases: ["networking", "computer networks?"] },
  { label: "Troubleshooting", aliases: ["troubleshooting", "technical support"] },
  { label: "Machine learning", aliases: ["machine learning", "\\bml\\b"] },
  { label: "Data analysis", aliases: ["data analysis", "data analytics"] },
  { label: "TensorFlow", aliases: ["tensorflow"] },
  { label: "PyTorch", aliases: ["pytorch"] },
  { label: "LangChain", aliases: ["langchain"] },
  { label: "ChromaDB", aliases: ["chromadb"] },
  { label: "Communication", aliases: ["communication"] },
  { label: "Problem solving", aliases: ["problem[- ]solving"] },
  { label: "Agile", aliases: ["agile"] }
];

const resumeSections = [
  { label: "Contact details", pattern: /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i },
  { label: "Education", pattern: /\beducation\b/i },
  { label: "Skills", pattern: /\bskills?\b/i },
  { label: "Projects", pattern: /\bprojects?\b/i },
  { label: "Experience", pattern: /\b(experience|employment|internships?)\b/i }
];

const roleSkillProfiles = [
  {
    match: /\b(application support|support engineer|technical support)\b/i,
    skills: ["SQL", "Linux", "Networking", "Troubleshooting", "Communication"],
    label: "application support"
  },
  {
    match: /\b(data science|data analyst|data analysis|analyst)\b/i,
    skills: ["SQL", "Python", "Data analysis", "Excel", "Communication"],
    label: "data and analyst roles"
  },
  {
    match: /\b(ai|machine learning|ml|robotics|agent engineer)\b/i,
    skills: ["Python", "Machine learning", "Data analysis", "SQL", "Problem solving"],
    label: "AI and machine-learning roles"
  },
  {
    match: /\bjava\b/i,
    skills: ["Java", "SQL", "REST APIs", "Git", "Data structures & algorithms"],
    label: "Java development roles"
  },
  {
    match: /\b(full[\s-]?stack)\b/i,
    skills: ["JavaScript", "React", "Node.js", "SQL", "REST APIs", "Git"],
    label: "full-stack development roles"
  },
  {
    match: /\b(front[\s-]?end|ui developer)\b/i,
    skills: ["JavaScript", "TypeScript", "React", "HTML", "CSS", "Git"],
    label: "front-end development roles"
  },
  {
    match: /\b(back[\s-]?end)\b/i,
    skills: ["Java", "Python", "SQL", "REST APIs", "Git", "Data structures & algorithms"],
    label: "back-end development roles"
  },
  {
    match: /\b(software|sde|developer|engineer)\b/i,
    skills: ["Java", "Python", "JavaScript", "SQL", "Git", "Data structures & algorithms"],
    label: "software development roles"
  },
  {
    match: /\bintern(ship)?\b/i,
    skills: ["Communication", "Problem solving", "Git"],
    label: "internship roles"
  }
];

function findTerms(text, terms) {
  const normalized = text.toLowerCase();
  return terms.filter((term) =>
    term.aliases.some((alias) =>
      new RegExp(`(^|[^a-z0-9])${alias}($|[^a-z0-9])`, "i").test(normalized)
    )
  );
}

function getRoleSkillProfile(role) {
  const profile = roleSkillProfiles.find((item) => item.match.test(role || ""));
  if (!profile) {
    return {
      label: "general early-career roles",
      skills: ["Communication", "Problem solving", "Git"]
    };
  }
  return profile;
}

function inspectResume(resumeText, jobDescription, role) {
  const presentSections = resumeSections
    .filter((section) => section.pattern.test(resumeText))
    .map((section) => section.label);
  const missingSections = resumeSections
    .filter((section) => !section.pattern.test(resumeText))
    .map((section) => section.label);
  const wordCount = resumeText.trim().split(/\s+/).filter(Boolean).length;
  const hasMetrics = /\b\d+(?:\.\d+)?\s*(?:%|percent|users|customers|projects|hours|days|weeks|months|years|x)\b/i.test(resumeText);
  const requirements = findTerms(jobDescription, skillTerms);
  const resumeTerms = findTerms(resumeText, skillTerms);
  const resumeLabels = new Set(resumeTerms.map((term) => term.label));
  const titleProfile = getRoleSkillProfile(role);
  const titleSkills = titleProfile.skills.filter((skill) =>
    skillTerms.some((term) => term.label === skill)
  );
  const directRequirements = requirements.map((term) => term.label);
  const requirementLabels = new Set(directRequirements);
  const inferredTitleSkills = titleSkills.filter((skill) => !requirementLabels.has(skill));
  const roleSkills = [...new Set([...directRequirements, ...inferredTitleSkills])];
  const matched = roleSkills.filter((skill) => resumeLabels.has(skill));
  const missing = roleSkills.filter((skill) => !resumeLabels.has(skill));

  return {
    wordCount,
    presentSections,
    missingSections,
    hasMetrics,
    titleProfile: titleProfile.label,
    roleSkills,
    matched,
    missing,
    matchedDescription: directRequirements.filter((skill) => resumeLabels.has(skill)),
    missingDescription: directRequirements.filter((skill) => !resumeLabels.has(skill)),
    inferredTitleSkills,
    matchedTitle: inferredTitleSkills.filter((skill) => resumeLabels.has(skill)),
    missingTitle: inferredTitleSkills.filter((skill) => !resumeLabels.has(skill))
  };
}

async function extractResumeText(file) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Please choose a file smaller than 5 MB.");
  }

  if (file.type === "text/plain" || /\.txt$/i.test(file.name)) {
    const text = await file.text();
    if (!text.trim()) throw new Error("The selected text file is empty.");
    return text;
  }

  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
    throw new Error("Choose a PDF or plain text (.txt) resume.");
  }

  const [pdfjsLib, workerModule] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
  const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() });
  const pages = [];
  let pdf;
  try {
    pdf = await loadingTask.promise;
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(`This PDF has ${pdf.numPages} pages. Please use a resume of ${MAX_PDF_PAGES} pages or fewer.`);
    }

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  const text = pages.join("\n").trim();
  if (!text) {
    throw new Error("No selectable text was found. This may be a scanned PDF; use a text-based PDF or paste the resume text into a .txt file.");
  }
  return text;
}

export default function ResumeReviewer({ opportunities, initialOpportunityId }) {
  const [selectedId, setSelectedId] = useState(initialOpportunityId || "");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  const selectedOpportunity = useMemo(
    () => opportunities.find((item) => item.id === selectedId),
    [opportunities, selectedId]
  );
  const descriptionHasContent = jobDescription.trim().length > 0;

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError("");
    setAnalysis(null);
    setResumeName("");
    setResumeText("");
    if (!file) return;

    setReading(true);
    try {
      const text = await extractResumeText(file);
      setResumeText(text);
      setResumeName(file.name);
    } catch (fileError) {
      setError(fileError.message || "Unable to read this resume file.");
      event.target.value = "";
    } finally {
      setReading(false);
    }
  }

  function reviewResume(event) {
    event.preventDefault();
    setError("");
    setAnalysis(null);

    if (!resumeText) {
      setError("Choose a readable PDF or text resume first.");
      return;
    }
    if (!selectedOpportunity) {
      setError("Choose the company and role you want to review this resume for.");
      return;
    }
    if (descriptionHasContent && jobDescription.trim().length < 30) {
      setError("Please paste more of the job description, or leave it blank to review against the role title only.");
      return;
    }

    setAnalysis(inspectResume(
      resumeText,
      jobDescription.trim(),
      selectedOpportunity.role
    ));
  }

  return (
    <div className="resume-review-page">
      <header className="resume-review-heading">
        <p className="placement-eyebrow">PRIVATE, IN-BROWSER REVIEW</p>
        <h2>Resume reviewer</h2>
        <p>Get practical feedback for a selected PI360 role. Your resume is read in this browser and is not uploaded.</p>
      </header>

      <div className="resume-privacy-note" role="note">
        <span aria-hidden="true">🔒</span>
        <p>Your resume text stays on this device. It is not sent to the server or saved after you leave this page.</p>
      </div>

      <form className="resume-review-form" onSubmit={reviewResume}>
        <label className="resume-field">
          <span>Company and role</span>
          <select
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setAnalysis(null);
            }}
          >
            <option value="">Choose a PI360 opportunity</option>
            {opportunities.map((item) => (
              <option value={item.id} key={item.id}>
                {item.companyName} — {item.role}
              </option>
            ))}
          </select>
        </label>

        {selectedOpportunity && (
          <div className="resume-selected-role">
            Reviewing for <strong>{selectedOpportunity.companyName}</strong>
            <span>{selectedOpportunity.role}</span>
          </div>
        )}

        <label className="resume-field">
          <span>Job description <span className="resume-optional">(optional)</span></span>
          <textarea
            value={jobDescription}
            onChange={(event) => {
              setJobDescription(event.target.value);
              setAnalysis(null);
            }}
            placeholder="Paste the official PI360 job description here to compare the skills it lists with your resume."
            rows={7}
          />
        </label>

        {!descriptionHasContent && (
          <p className="resume-limitation">
            No job description provided. Skill suggestions will be inferred from the selected role title and are not confirmed company requirements.
          </p>
        )}

        <label className="resume-field">
          <span>Resume file <span className="resume-optional">PDF or TXT, up to 5 MB</span></span>
          <input
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            onChange={handleFileChange}
          />
        </label>

        {resumeName && <p className="resume-file-ready">Ready to review: {resumeName}</p>}
        {reading && <p className="resume-file-status" role="status">Reading resume locally…</p>}
        {error && <p className="resume-error" role="alert">{error}</p>}

        <button className="placement-primary-button resume-submit" type="submit" disabled={reading || !resumeText}>
          Review resume
        </button>
      </form>

      {analysis && (
        <section className="resume-results" aria-live="polite">
          <div className="resume-results-heading">
            <p className="placement-eyebrow">YOUR REVIEW</p>
            <h3>{selectedOpportunity
              ? `${selectedOpportunity.companyName} · ${selectedOpportunity.role}`
              : "Resume feedback"}
            </h3>
            <p>{analysis.wordCount} words extracted from {resumeName}.</p>
          </div>

          <div className="resume-result-card resume-match-summary">
            <p className="placement-eyebrow">ROLE MATCH SUMMARY</p>
            <h4>{analysis.matched.length} of {analysis.roleSkills.length} role-related skill keywords found</h4>
            <p>
              {descriptionHasContent
                ? `Compared with skills recognized in the job description and common ${analysis.titleProfile} keywords.`
                : `Compared with common ${analysis.titleProfile} keywords inferred from the role title.`}
              {" "}This is guidance—not an employer score or a PI360-confirmed requirement list.
            </p>
          </div>

          <div className="resume-result-card">
            <h4>Skills to highlight for {selectedOpportunity.role}</h4>
            <p className="resume-skill-source">
              {descriptionHasContent
                ? "The first group comes from the pasted description; additional suggestions are inferred from the role title."
                : "These are common skills for this role type, inferred from the title—not confirmed company requirements."}
            </p>
            {descriptionHasContent && (
              <div className="resume-source-group">
                <span className="resume-match-label">Recognized in the job description</span>
                <div className="resume-skill-tags">
                  {analysis.matchedDescription.map((skill) => <span className="resume-skill-tag found" key={skill}>{skill}</span>)}
                  {analysis.missingDescription.map((skill) => <span className="resume-skill-tag missing" key={skill}>{skill} · not found</span>)}
                  {analysis.matchedDescription.length === 0 && analysis.missingDescription.length === 0 && (
                    <span className="resume-muted">No supported skill keywords were recognized in the pasted description.</span>
                  )}
                </div>
              </div>
            )}
            <div className="resume-source-group">
              <span className="resume-match-label">
                Common {analysis.titleProfile} keywords inferred from title
              </span>
              <div className="resume-skill-tags">
                {analysis.matchedTitle.map((skill) => <span className="resume-skill-tag found" key={skill}>{skill}</span>)}
                {analysis.missingTitle.map((skill) => <span className="resume-skill-tag missing" key={skill}>{skill} · not found</span>)}
                {analysis.inferredTitleSkills.length === 0 && (
                  <span className="resume-muted">The role title doesn’t provide enough context for more skill suggestions.</span>
                )}
              </div>
            </div>
            <p className="resume-caveat">
              “Not found” only means the term wasn’t detected in the extracted text. It may be described differently; only add skills you can genuinely demonstrate.
            </p>
          </div>

          <div className="resume-result-card">
            <h4>What to work on next</h4>
            <ol className="resume-action-list">
              {analysis.matched.length > 0 && (
                <li>
                  <strong>Bring your strongest match forward.</strong>
                  <span>Put {analysis.matched.slice(0, 3).join(", ")} near the top of your skills section and show where you used them in a project or experience bullet.</span>
                </li>
              )}
              {descriptionHasContent && analysis.missingDescription.length > 0 && (
                <li>
                  <strong>Review the skills recognized in the job description.</strong>
                  <span>
                    These terms were not detected: {analysis.missingDescription.slice(0, 4).join(", ")}. Check for synonyms, and add a skill only if you can demonstrate it.
                  </span>
                </li>
              )}
              {analysis.missingTitle.length > 0 && (
                <li>
                  <strong>Build evidence for common role skills.</strong>
                  <span>
                    {descriptionHasContent ? "These are general suggestions inferred from the title, not stated company requirements: " : "For this role title, consider gaining evidence for: "}
                    {analysis.missingTitle.slice(0, 4).join(", ")}. If you have not used these yet, try a small project or focused practice.
                  </span>
                </li>
              )}
              {!analysis.hasMetrics && (
                <li>
                  <strong>Make project and experience bullets more specific.</strong>
                  <span>For each relevant bullet, state what you built or improved, the tools you used, and the result. Add numbers only when you can verify them.</span>
                </li>
              )}
              {analysis.missingSections.length > 0 && (
                <li>
                  <strong>Make important sections easy to find.</strong>
                  <span>Add clearly labeled {analysis.missingSections.join(", ")} sections where relevant to your background.</span>
                </li>
              )}
              {analysis.wordCount < 250 && (
                <li>
                  <strong>Check that the extracted resume is complete.</strong>
                  <span>Only {analysis.wordCount} words were read; confirm your education, projects, and experience are included in the file.</span>
                </li>
              )}
              {analysis.matched.length === 0 && analysis.missing.length === 0 && analysis.missingSections.length === 0 && analysis.hasMetrics && (
                <li>
                  <strong>Tailor your top section to the role.</strong>
                  <span>Lead with the most relevant experience and connect each listed skill to a concrete project or result.</span>
                </li>
              )}
            </ol>
          </div>

          <div className="resume-result-card resume-structure-card">
            <h4>Resume sections detected</h4>
            <div className="resume-section-tags">
              {analysis.presentSections.map((section) => (
                <span className="resume-section-tag" key={section}>✓ {section}</span>
              ))}
              {analysis.presentSections.length === 0 && (
                <span className="resume-muted">No standard section headings were detected.</span>
              )}
              {analysis.hasMetrics && (
                <span className="resume-section-tag">✓ Measurable example detected</span>
              )}
            </div>
          </div>
          <p className="resume-disclaimer">Automated feedback can miss context and formatting. Review it yourself and follow the placement office’s instructions.</p>
        </section>
      )}
    </div>
  );
}
