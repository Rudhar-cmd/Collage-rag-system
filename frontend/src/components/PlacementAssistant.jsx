import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ResumeReviewer from "./ResumeReviewer";
import "./PlacementAssistant.css";

const prepTracks = [
  {
    title: "Aptitude & assessment",
    description: "Build a steady approach to timed online assessments.",
    topics: ["Quantitative aptitude", "Logical reasoning", "Verbal communication"]
  },
  {
    title: "Technical interviews",
    description: "Refresh the core concepts commonly covered in engineering interviews.",
    topics: ["Data structures and algorithms", "Projects and design decisions", "Role-specific fundamentals"]
  },
  {
    title: "HR & communication",
    description: "Prepare concise, authentic examples from your own experience.",
    topics: ["Tell me about yourself", "Strengths and growth areas", "Teamwork and problem solving"]
  }
];

const interviewSkillTerms = [
  { label: "JavaScript", pattern: /\bjavascript\b/i },
  { label: "TypeScript", pattern: /\btypescript\b/i },
  { label: "Python", pattern: /\bpython\b/i },
  { label: "Java", pattern: /\bjava\b/i },
  { label: "C++", pattern: /\bc\+\+(?=[^a-z0-9]|$)/i },
  { label: "C#", pattern: /\bc#(?=[^a-z0-9]|$)/i },
  { label: "SQL", pattern: /\bsql\b/i },
  { label: "React", pattern: /\breact(?:\.js)?\b/i },
  { label: "Node.js", pattern: /\bnode(?:\.js|js)\b/i },
  { label: "REST APIs", pattern: /\brest(?:ful)?\s+apis?\b/i },
  { label: "MongoDB", pattern: /\bmongodb\b/i },
  { label: "PostgreSQL", pattern: /\bpostgres(?:ql)?\b/i },
  { label: "AWS", pattern: /\baws\b|amazon web services/i },
  { label: "Azure", pattern: /\bazure\b/i },
  { label: "Docker", pattern: /\bdocker\b/i },
  { label: "Kubernetes", pattern: /\bkubernetes\b|\bk8s\b/i },
  { label: "Git", pattern: /\bgit\b/i },
  { label: "Linux", pattern: /\blinux\b/i },
  { label: "Networking", pattern: /\bnetwork(?:ing|s)?\b/i },
  { label: "Troubleshooting", pattern: /\btroubleshooting\b/i },
  { label: "Machine learning", pattern: /\bmachine learning\b|\bml\b/i },
  { label: "Data analysis", pattern: /\bdata analys(?:is|t)\b|\bdata analytics\b/i },
  { label: "TensorFlow", pattern: /\btensorflow\b/i },
  { label: "PyTorch", pattern: /\bpytorch\b/i },
  { label: "Excel", pattern: /\bexcel\b/i },
  { label: "Power BI", pattern: /\bpower\s*bi\b/i },
  { label: "Tableau", pattern: /\btableau\b/i },
  { label: "Agile", pattern: /\bagile\b/i }
];

const skillQuestionPrompts = {
  JavaScript: "How does JavaScript handle asynchronous work? Explain the event loop and give an example using a promise or async/await.",
  TypeScript: "How do TypeScript types help prevent bugs? Give an example of a type or interface you would use in an application.",
  Python: "When would you use a list, tuple, or dictionary in Python? Explain your choice with a practical example.",
  Java: "What is the difference between an interface and an abstract class in Java, and when would you choose each?",
  "C++": "What is the difference between stack and heap memory in C++? How do you manage an object's lifetime?",
  "C#": "What is the difference between a value type and a reference type in C#? Give an example of each.",
  SQL: "How would you join data from two related tables and summarize it? Explain which join and aggregate functions you would use.",
  React: "How do props and state differ in React? Describe how you would update a component when a user interacts with it.",
  "Node.js": "How does Node.js handle many I/O requests without blocking? When might CPU-heavy work cause a problem?",
  "REST APIs": "How would you design an update endpoint in a REST API? Discuss the HTTP method, status codes, and input validation.",
  MongoDB: "How would you model related data in MongoDB, and what factors would guide embedding versus referencing documents?",
  PostgreSQL: "What is an index in PostgreSQL, and how can it improve or hurt query performance?",
  AWS: "How would you deploy a small web application on AWS and keep its credentials and configuration secure?",
  Azure: "How would you deploy a small web application on Azure and monitor whether it is running correctly?",
  Docker: "What problem does Docker solve? Walk through how you would package an application and its dependencies in an image.",
  Kubernetes: "What is the role of a Kubernetes Deployment and Service when running an application?",
  Git: "How would you resolve a merge conflict in Git and verify that the final changes are correct?",
  Linux: "A service is running slowly on a Linux machine. Which commands or logs would you inspect first, and why?",
  Networking: "A web application is unreachable from a user's machine. How would you narrow down whether the issue is DNS, network, or application related?",
  Troubleshooting: "A user reports an issue that you cannot reproduce immediately. How would you gather evidence and work toward a fix?",
  "Machine learning": "How would you check whether a machine-learning model is overfitting, and what would you try next?",
  "Data analysis": "How would you check a new dataset for quality issues before using it to answer a business question?",
  TensorFlow: "How would you determine whether a TensorFlow model is learning effectively during training?",
  PyTorch: "What is the purpose of a training loop in PyTorch, and which steps does it usually contain?",
  Excel: "How would you use Excel to summarize a large table and check the results for errors?",
  "Power BI": "How would you prepare data and create a useful dashboard in Power BI for a non-technical audience?",
  Tableau: "How would you choose a Tableau chart that clearly communicates a trend without misleading the viewer?",
  Agile: "How do you handle a change in requirements during a sprint while keeping the team aligned?"
};

const aptitudeQuestions = [
  {
    prompt: "A product priced at ₹800 is offered at a 15% discount. What is the sale price?",
    answer: "15% of ₹800 is ₹120, so the sale price is ₹680."
  },
  {
    prompt: "A team has 32 people. The ratio of developers to testers is 3:5. How many are developers?",
    answer: "There are 8 equal parts, so each part is 4 people. Developers: 3 × 4 = 12."
  },
  {
    prompt: "Find the next number: 2, 6, 12, 20, 30, __.",
    answer: "42. The differences are 4, 6, 8, 10, so the next difference is 12."
  }
];

function createInterviewPractice(opportunity, description) {
  const sentences = description
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.replace(/^[\s•*\-\d.)]+/, "").trim())
    .filter((sentence) => sentence.length >= 30 && sentence.length <= 280);
  const responsibilities = sentences.filter((sentence) =>
    /\b(responsible|develop|build|design|implement|maintain|analy[sz]e|support|test|deploy|collaborat|deliver|manage|create|work with|experience with|required|proficien(?:t|cy))\b/i.test(sentence)
  );
  const skills = interviewSkillTerms
    .filter((skill) => skill.pattern.test(description))
    .slice(0, 6);

  const technical = skills.map((skill) => ({
    topic: skill.label,
    prompt: skillQuestionPrompts[skill.label] ||
      `How would you use ${skill.label} to solve a problem in this role? Describe your approach and how you would check that it worked.`
  }));
  responsibilities.slice(0, 3).forEach((responsibility) => {
    technical.push({
      topic: "Role responsibility",
      excerpt: responsibility,
      prompt: "How would you approach this work? Walk through your first steps, how you would collaborate, and how you would check the result."
    });
  });

  const hr = [
    {
      prompt: `What interests you about the ${opportunity.role} role at ${opportunity.companyName}?`,
      guidance: "Connect your genuine interests and experience to the role. Avoid relying on claims that aren’t in the official posting."
    },
    {
      prompt: "Tell me about a time you worked with others to solve a difficult problem. What was your contribution?",
      guidance: "Use a concise situation, task, action, and result structure; be specific about your own actions."
    },
    {
      prompt: "What is one skill you are currently improving, and what are you doing to improve it?",
      guidance: "Choose a real development area and describe a concrete step you have taken."
    }
  ];
  if (responsibilities.length > 0) {
    hr.push({
      prompt: `Which experience best prepares you for this responsibility: “${responsibilities[0]}”`,
      guidance: "Choose a real example and explain what you did, what you learned, and what you would bring to this role."
    });
  }

  return {
    role: opportunity.role,
    company: opportunity.companyName,
    technical,
    aptitude: aptitudeQuestions,
    hr
  };
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  const monthName = date.toLocaleString(undefined, { month: "short" });
  return `${date.getDate()} ${monthName}, ${year}`;
}

function formatDateRange(opportunity) {
  return `${formatDate(opportunity.startDate)} – ${formatDate(opportunity.endDate)}`;
}

function getOpportunityStatus(opportunity) {
  if (opportunity.status === "closed") return "closed";
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (opportunity.endDate && opportunity.endDate < todayKey) return "closed";
  if (opportunity.startDate && opportunity.startDate > todayKey) return "upcoming";
  return opportunity.status === "active" ? "active" : "closed";
}

function OpportunityCard({ opportunity, expanded, onToggle, onPrepare, onReviewResume }) {
  const status = getOpportunityStatus(opportunity);
  const statusLabel = status === "active" ? "OPEN" : status === "upcoming" ? "UPCOMING" : "CLOSED";

  return (
    <article className="placement-opportunity-card">
      <div className="placement-company-mark" aria-hidden="true">
        {opportunity.companyName?.slice(0, 1) || "C"}
      </div>
      <div className="placement-opportunity-content">
        <div className="placement-opportunity-topline">
          <div>
            <p className="placement-company-sector">{opportunity.opportunityType}</p>
            <h3>{opportunity.role}</h3>
            <p className="placement-company-name">{opportunity.companyName}</p>
          </div>
          <span className={`placement-status placement-status-${status}`}>
            {statusLabel}
          </span>
        </div>

        <div className="placement-opportunity-facts">
          <span>{formatDateRange(opportunity)}</span>
        </div>

        {expanded && (
          <div className="placement-opportunity-details">
            <div>
              <span className="placement-fact-label">Listing dates</span>
              <p>{formatDateRange(opportunity)}</p>
            </div>
            <p className="placement-detail-note">
              Eligibility requirements and recruitment stages were not visible in the screenshots provided.
            </p>
          </div>
        )}

        <div className="placement-card-actions">
          <button type="button" className="placement-text-button" onClick={onToggle}>
            {expanded ? "Hide details" : "View details"}
          </button>
          <button type="button" className="placement-primary-button" onClick={onPrepare}>
            Prepare for interview
          </button>
          <button type="button" className="placement-secondary-button" onClick={onReviewResume}>
            Review resume
          </button>
        </div>
      </div>
    </article>
  );
}

export default function PlacementAssistant({ apiUrl, onUnauthorized }) {
  const [opportunities, setOpportunities] = useState([]);
  const [sourceNote, setSourceNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All types");
  const [expandedId, setExpandedId] = useState(null);
  const [resumeTargetId, setResumeTargetId] = useState("");
  const [prepOpportunityId, setPrepOpportunityId] = useState("");
  const [prepDescription, setPrepDescription] = useState("");
  const [prepConfirmedOfficial, setPrepConfirmedOfficial] = useState(false);
  const [practiceSet, setPracticeSet] = useState(null);
  const [prepError, setPrepError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("token");

    if (!token) {
      onUnauthorized();
      return () => controller.abort();
    }

    async function loadOpportunities() {
      try {
        const response = await axios.get(`${apiUrl}/api/placements`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        setOpportunities(response.data.opportunities || []);
        setSourceNote(response.data.notice || "");
      } catch (requestError) {
        if (axios.isCancel(requestError)) return;
        if (requestError.response?.status === 401) {
          onUnauthorized();
          return;
        }
        setError(requestError.response?.data?.error || "Unable to load placement opportunities.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadOpportunities();
    return () => controller.abort();
  }, [apiUrl, onUnauthorized]);

  const activeOpportunities = useMemo(
    () => opportunities.filter((item) => getOpportunityStatus(item) === "active"),
    [opportunities]
  );
  const upcomingOpportunities = useMemo(
    () => opportunities
      .filter((item) => getOpportunityStatus(item) === "upcoming")
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [opportunities]
  );
  const latestOpportunities = useMemo(
    () => [...opportunities].sort((a, b) => b.startDate.localeCompare(a.startDate)).slice(0, 3),
    [opportunities]
  );
  const featuredOpportunities = useMemo(
    () => activeOpportunities.slice(0, 2),
    [activeOpportunities]
  );
  const opportunityTypes = useMemo(
    () => ["All types", ...new Set(opportunities.map((item) => item.opportunityType).filter(Boolean))],
    [opportunities]
  );
  const filteredOpportunities = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...opportunities].filter((item) => {
      const matchesType = sectorFilter === "All types" || item.opportunityType === sectorFilter;
      const matchesQuery = !query || [
        item.companyName,
        item.role,
        item.opportunityType,
        getOpportunityStatus(item)
      ].some((value) => value?.toLowerCase().includes(query));
      return matchesType && matchesQuery;
    }).sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [opportunities, search, sectorFilter]);

  function showOpportunities() {
    setActiveSection("opportunities");
  }

  function showInterviewPrep(opportunityId = "") {
    setActiveSection("prep");
    if (opportunityId) {
      setPrepOpportunityId(opportunityId);
      setPrepDescription("");
      setPrepConfirmedOfficial(false);
      setPracticeSet(null);
      setPrepError("");
    }
  }

  function showResumeReviewer(opportunityId = "") {
    setResumeTargetId(opportunityId);
    setActiveSection("resume");
  }

  function generatePracticeQuestions(event) {
    event.preventDefault();
    setPrepError("");
    setPracticeSet(null);

    const opportunity = opportunities.find((item) => item.id === prepOpportunityId);
    if (!opportunity) {
      setPrepError("Choose the company and role you are preparing for.");
      return;
    }
    if (prepDescription.trim().length < 50) {
      setPrepError("Paste the relevant official job description (at least 50 characters) to create role-specific questions.");
      return;
    }
    if (!prepConfirmedOfficial) {
      setPrepError("Confirm that the text is from an official company or PI360 posting.");
      return;
    }

    setPracticeSet(createInterviewPractice(opportunity, prepDescription.trim()));
  }

  return (
    <section className="placement-page">
      <div className="placement-page-header">
        <div>
          <p className="placement-eyebrow">CAREER CENTER</p>
          <h1>Placement &amp; Career Assistant</h1>
          <p className="placement-page-intro">Explore campus opportunities and get ready for your next interview.</p>
        </div>
        <div className="placement-header-actions">
          <button
            type="button"
            className={`placement-tab-button ${activeSection === "overview" ? "active" : ""}`}
            onClick={() => setActiveSection("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className={`placement-tab-button ${activeSection === "opportunities" ? "active" : ""}`}
            onClick={showOpportunities}
          >
            Opportunities
          </button>
          <button
            type="button"
            className={`placement-tab-button ${activeSection === "prep" ? "active" : ""}`}
            onClick={showInterviewPrep}
          >
            Interview prep
          </button>
          <button
            type="button"
            className={`placement-tab-button ${activeSection === "resume" ? "active" : ""}`}
            onClick={() => showResumeReviewer()}
          >
            Resume review
          </button>
        </div>
      </div>

      {sourceNote && (
        <div className="placement-sample-notice" role="note">
          <span aria-hidden="true">i</span>
          <p>{sourceNote}</p>
        </div>
      )}

      {error && <div className="placement-error" role="alert">{error}</div>}

      {loading ? (
        <div className="placement-loading" role="status">Loading placement opportunities...</div>
      ) : activeSection === "overview" ? (
        <div className="placement-dashboard">
          <div className="placement-stat-grid">
            <article className="placement-stat-card">
              <span className="placement-stat-icon">▦</span>
              <p>Total companies</p>
              <strong>{new Set(opportunities.map((item) => item.companyName)).size}</strong>
              <span>Across listed roles</span>
            </article>
            <article className="placement-stat-card">
              <span className="placement-stat-icon">↗</span>
              <p>Active opportunities</p>
              <strong>{activeOpportunities.length}</strong>
              <span>Currently accepting applications</span>
            </article>
            <article className="placement-stat-card">
              <span className="placement-stat-icon">◷</span>
              <p>Upcoming drives</p>
              <strong>{upcomingOpportunities.length}</strong>
              <span>Dates listed by placement office</span>
            </article>
          </div>

          <div className="placement-dashboard-grid">
            <section className="placement-panel placement-recommendations">
              <div className="placement-section-heading">
                <div>
                  <p className="placement-eyebrow">A GOOD PLACE TO START</p>
                  <h2>Open opportunities</h2>
                </div>
                <button type="button" className="placement-text-button" onClick={showOpportunities}>View all</button>
              </div>
              {featuredOpportunities.length ? featuredOpportunities.map((item) => (
                <div className="placement-recommended-row" key={item.id}>
                  <div className="placement-company-mark small" aria-hidden="true">{item.companyName?.slice(0, 1) || "C"}</div>
                  <div className="placement-recommended-copy">
                    <strong>{item.role}</strong>
                    <span>{item.companyName} · {item.opportunityType}</span>
                    <small>{formatDateRange(item)}</small>
                  </div>
                  <button
                    type="button"
                    className="placement-icon-button"
                    aria-label={`View ${item.role} details`}
                    onClick={() => {
                      setExpandedId(item.id);
                      showOpportunities();
                    }}
                  >
                    →
                  </button>
                </div>
              )) : (
                <p className="placement-empty-copy">There are no currently open listings in the screenshots provided.</p>
              )}
            </section>

            <section className="placement-panel placement-notices-panel">
              <div className="placement-section-heading">
                <div>
                  <p className="placement-eyebrow">STAY IN THE LOOP</p>
                  <h2>Latest opportunities</h2>
                </div>
                <button type="button" className="placement-text-button" onClick={showOpportunities}>All listings</button>
              </div>
              {latestOpportunities.length ? latestOpportunities.map((item) => (
                <article className="placement-notice-row" key={item.id}>
                  <span className="placement-notice-dot" aria-hidden="true" />
                  <div>
                    <strong>{item.companyName}</strong>
                    <p>{item.role} · {item.opportunityType}</p>
                    <small>{formatDateRange(item)} · {getOpportunityStatus(item).toUpperCase()}</small>
                  </div>
                </article>
              )) : (
                <p className="placement-empty-copy">No listings are available.</p>
              )}
            </section>
          </div>

          <section className="placement-panel placement-upcoming-panel">
            <div className="placement-section-heading">
              <div>
                <p className="placement-eyebrow">PLAN AHEAD</p>
                <h2>Upcoming placement drives</h2>
              </div>
              <button type="button" className="placement-text-button" onClick={showOpportunities}>Explore opportunities</button>
            </div>
            {upcomingOpportunities.length ? (
              <div className="placement-drive-list">
                {upcomingOpportunities.slice(0, 4).map((item) => (
                  <div className="placement-drive-row" key={item.id}>
                    <div className="placement-drive-date">
                      <strong>{formatDate(item.startDate).split(" ")[0]}</strong>
                      <span>{formatDate(item.startDate).split(" ")[1].replace(",", "")}</span>
                    </div>
                    <div className="placement-drive-copy">
                      <strong>{item.companyName}</strong>
                      <span>{item.role} · {item.opportunityType}</span>
                    </div>
                    <span className="placement-drive-full-date">{formatDateRange(item)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="placement-empty-copy">Upcoming drives will appear here when the placement office posts them.</p>
            )}
          </section>

          <button type="button" className="placement-prep-banner" onClick={showInterviewPrep}>
            <span className="placement-prep-symbol" aria-hidden="true">✦</span>
            <span>
              <strong>Make interview prep part of your plan</strong>
              <small>Explore focused practice tracks, topics, and a simple preparation checklist.</small>
            </span>
            <span className="placement-prep-arrow" aria-hidden="true">→</span>
          </button>

          <button type="button" className="placement-resume-banner" onClick={() => showResumeReviewer()}>
            <span className="placement-prep-symbol" aria-hidden="true">▤</span>
            <span>
              <strong>See how your resume reads for a role</strong>
              <small>Compare resume keywords with an official job description, privately in your browser.</small>
            </span>
            <span className="placement-prep-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      ) : activeSection === "opportunities" ? (
        <div className="placement-opportunities-page">
          <div className="placement-listing-heading">
            <div>
              <p className="placement-eyebrow">COMPANIES &amp; ROLES</p>
              <h2>Explore opportunities</h2>
              <p>Browse PI360 listings by company, role, opportunity type, and date range.</p>
            </div>
            <span className="placement-result-count">{filteredOpportunities.length} {filteredOpportunities.length === 1 ? "role" : "roles"}</span>
          </div>
          <div className="placement-filters">
            <label className="placement-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search companies, roles, status..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="placement-sector-select">
              <span className="sr-only">Filter by opportunity type</span>
              <select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)}>
                {opportunityTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
          </div>
          {filteredOpportunities.length ? (
            <div className="placement-opportunity-list">
              {filteredOpportunities.map((item) => (
                <OpportunityCard
                  key={item.id}
                  opportunity={item}
                  expanded={expandedId === item.id}
                  onToggle={() => setExpandedId((current) => current === item.id ? null : item.id)}
                  onPrepare={() => showInterviewPrep(item.id)}
                  onReviewResume={() => showResumeReviewer(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="placement-empty-state">
              <span aria-hidden="true">⌕</span>
              <h3>No matching opportunities</h3>
              <p>Try a different search or opportunity type.</p>
              <button type="button" className="placement-text-button" onClick={() => { setSearch(""); setSectorFilter("All types"); }}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      ) : activeSection === "prep" ? (
        <div className="placement-prep-page">
          <div className="placement-listing-heading">
            <div>
              <p className="placement-eyebrow">PRACTICE WITH PURPOSE</p>
              <h2>Interview preparation</h2>
              <p>Start with aptitude and assessment practice, then work through technical and HR preparation. Actual company round order can vary; follow the official placement notice.</p>
            </div>
          </div>
          <section className="placement-panel placement-question-generator">
            <div className="placement-section-heading">
              <div>
                <p className="placement-eyebrow">ROLE-SPECIFIC PRACTICE</p>
                <h2>Build interview questions from a job description</h2>
              </div>
            </div>
            <p className="placement-generator-intro">
              Paste the official posting to create technical prompts grounded in its listed skills and responsibilities, plus general aptitude and HR practice. The current PI360 screenshots don’t include job descriptions.
            </p>
            <form className="placement-generator-form" onSubmit={generatePracticeQuestions}>
              <label className="placement-generator-field">
                <span>Company and role</span>
                <select
                  value={prepOpportunityId}
                  onChange={(event) => {
                    setPrepOpportunityId(event.target.value);
                    setPracticeSet(null);
                    setPrepError("");
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
              <label className="placement-generator-field">
                <span>Official job description</span>
                <textarea
                  value={prepDescription}
                  onChange={(event) => {
                    setPrepDescription(event.target.value);
                    setPracticeSet(null);
                    setPrepError("");
                  }}
                  placeholder="Paste the official role requirements and responsibilities here."
                  rows={7}
                  maxLength={12000}
                />
              </label>
              <label className="placement-source-confirm">
                <input
                  type="checkbox"
                  checked={prepConfirmedOfficial}
                  onChange={(event) => {
                    setPrepConfirmedOfficial(event.target.checked);
                    setPracticeSet(null);
                    setPrepError("");
                  }}
                />
                <span>I confirm this text comes from an official company or PI360 job posting.</span>
              </label>
              <p className="placement-generator-privacy">
                Source note: the app can’t independently verify pasted text. It uses the text only in this browser to create practice prompts; it isn’t uploaded or saved.
              </p>
              {prepError && <p className="placement-generator-error" role="alert">{prepError}</p>}
              <button type="submit" className="placement-primary-button placement-generate-button">
                Generate practice questions
              </button>
            </form>

            {practiceSet && (
              <div className="placement-generated-questions" aria-live="polite">
                <div className="placement-generated-heading">
                  <p className="placement-eyebrow">PRACTICE SET</p>
                  <h3>{practiceSet.company} · {practiceSet.role}</h3>
                  <p>Practice in this order: aptitude, technical, then HR. Technical prompts cite the pasted description; aptitude questions are general placement practice. The company’s actual round order may differ.</p>
                </div>
                <section className="placement-question-section">
                  <div>
                    <h4>Aptitude</h4>
                    <p>General practice; these questions are not derived from this company’s posting.</p>
                  </div>
                  <ol className="placement-question-list">
                    {practiceSet.aptitude.map((question, index) => (
                      <li key={question.prompt}>
                        <span>Practice question {index + 1}</span>
                        <p>{question.prompt}</p>
                        <details>
                          <summary>Show answer and explanation</summary>
                          <p>{question.answer}</p>
                        </details>
                      </li>
                    ))}
                  </ol>
                </section>
                <section className="placement-question-section">
                  <div>
                    <h4>Technical</h4>
                    <p>Grounded in skills and responsibilities named in the posting.</p>
                  </div>
                  {practiceSet.technical.length ? (
                    <ol className="placement-question-list">
                      {practiceSet.technical.map((question, index) => (
                        <li className="placement-technical-question" key={`${question.topic}-${index}`}>
                          <span className="placement-question-topic">{question.topic}</span>
                          {question.excerpt && (
                            <blockquote className="placement-question-excerpt">{question.excerpt}</blockquote>
                          )}
                          <p>{question.prompt}</p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="placement-empty-copy">
                      No supported technical skills or responsibility statements were recognized. Paste the complete requirements and responsibilities section for more specific prompts.
                    </p>
                  )}
                </section>
                <section className="placement-question-section">
                  <div>
                    <h4>HR &amp; communication</h4>
                    <p>Practice authentic answers using your own experience.</p>
                  </div>
                  <ol className="placement-question-list">
                    {practiceSet.hr.map((question, index) => (
                      <li key={`${question.prompt}-${index}`}>
                        <span>Practice question {index + 1}</span>
                        <p>{question.prompt}</p>
                        <small>{question.guidance}</small>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            )}
          </section>
          <div className="placement-prep-grid">
            {prepTracks.map((track, index) => (
              <article className="placement-prep-card" key={track.title}>
                <span className="placement-prep-card-number">0{index + 1}</span>
                <h3>{track.title}</h3>
                <p>{track.description}</p>
                <ul>{track.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
              </article>
            ))}
          </div>
          <section className="placement-panel placement-checklist-panel">
            <div className="placement-section-heading">
              <div>
                <p className="placement-eyebrow">BEFORE THE DRIVE</p>
                <h2>Your interview checklist</h2>
              </div>
            </div>
            <ul className="placement-checklist">
              <li><span>01</span> Read the job description and confirm the eligibility criteria.</li>
              <li><span>02</span> Prepare a clear walkthrough of one or two relevant projects.</li>
              <li><span>03</span> Practise explaining your approach out loud, not just the final answer.</li>
              <li><span>04</span> Check the drive schedule and follow the placement office instructions.</li>
            </ul>
          </section>
          <button type="button" className="placement-resume-banner" onClick={() => showResumeReviewer()}>
            <span className="placement-prep-symbol" aria-hidden="true">▤</span>
            <span>
              <strong>Review your resume for a specific opportunity</strong>
              <small>Use an official job description for a role-specific keyword comparison.</small>
            </span>
            <span className="placement-prep-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      ) : (
        <ResumeReviewer
          opportunities={opportunities}
          initialOpportunityId={resumeTargetId}
        />
      )}
    </section>
  );
}
