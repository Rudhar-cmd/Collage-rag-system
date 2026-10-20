import { useEffect, useState, useRef } from "react";

import axios from "axios";

import Login from "./pages/Login";

import Register from "./pages/Register";

import collegeLogo from "../college-logo.png";

import deleteIcon from "../bin.png";

import graduated from "../graduated.png";

import rules from "../rules.png";

import school from "../school.png";

import test from "../test.png";

import historyIcon from "../history.png";

import ReactMarkdown from "react-markdown";

import remarkGfm from "remark-gfm";

import "./App.css";

import { API_URL } from "./api";

const suggestions = [

  {

    icon: school,

    title: "Attendance",

    text: "What is the minimum attendance requirement?",

  },

  {

    icon: test,

    title: "Examinations",

    text: "What are the examination eligibility rules?",

  },

  {

    icon: graduated,

    title: "Student Services",

    text: "What student services are available?",

  },

  {

    icon: rules,

    title: "Academic Rules",

    text: "What are the academic rules?",

  },

];

const syllabusPrograms = [

  { name: "B.Tech / B.E.", description: "Undergraduate engineering", branches: [

    "Computer Science Engineering (Core CSE)",

    "Artificial Intelligence & Machine Learning",

    "Cyber Security",

    "Electronics & Communication Engineering (ECE)"

  ]},

  { name: "BCA", description: "Bachelor of Computer Applications", branches: ["Computer Applications"] },

  { name: "BBA", description: "Bachelor of Business Administration", branches: ["Business Administration"] },

  { name: "LLB", description: "Law", branches: ["Law"] },

  { name: "M.Tech", description: "Postgraduate engineering", branches: ["Computer Science", "Other Specializations"] }

];

export default function App() {

  // Authentication

  const [user, setUser] = useState(null);

  const [authPage, setAuthPage] = useState("login");

  // Chat

  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState([]);

  const [history, setHistory] = useState([]);

  const [showHistory, setShowHistory] = useState(false);

  const [loading, setLoading] = useState(false);

  // Syllabus

  const [showSyllabus, setShowSyllabus] = useState(false);

  const [syllabusData, setSyllabusData] = useState(null);

  const [syllabusProgramData, setSyllabusProgramData] = useState(null);

  const [selectedSemester, setSelectedSemester] = useState(1);

  const [selectedSubject, setSelectedSubject] = useState(null);

  const [selectedProgram, setSelectedProgram] = useState(null);

  const [selectedBranch, setSelectedBranch] = useState(null);

  const [subjectDetails, setSubjectDetails] = useState(null);

  const [syllabusLoading, setSyllabusLoading] = useState(false);

  const [syllabusError, setSyllabusError] = useState("");

  // Theme

  const [darkMode, setDarkMode] = useState(() => {

    const savedTheme = localStorage.getItem("theme");

    return savedTheme === "dark";

  });

  // Restore logged-in user

  useEffect(() => {

    const savedUser = localStorage.getItem("user");

    if (savedUser) {

      try {

        setUser(JSON.parse(savedUser));

      } catch {

        localStorage.removeItem("user");

      }

    }

  }, []);

  // Save theme

  useEffect(() => {

    localStorage.setItem(

      "theme",

      darkMode ? "dark" : "light"

    );

  }, [darkMode]);

  const messagesEndRef = useRef(null);

useEffect(() => {

  messagesEndRef.current?.scrollIntoView({

    behavior: "smooth",

    block: "end",

  });

}, [messages, loading]);

  // --------------------------------------------------

  // CHAT HISTORY

  // --------------------------------------------------

  async function loadHistory() {
    const token = localStorage.getItem("token");
    if (!token) return;
  
    try {
      const response = await axios.get(
        `${API_URL}/api/chats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      console.log("Loaded chats:", response.data.chats?.length);
      setHistory(response.data.chats || []);
    } catch (error) {
      console.error("Unable to load history:", error);
      if (error.response?.status === 401) {
        logout();
      }
    }
  }

  // --------------------------------------------------

  // AUTHENTICATION

  // --------------------------------------------------

  function handleLogin(loggedInUser) {

    setUser(loggedInUser);

    setAuthPage("login");

    loadHistory();

  }

  function handleRegister(registeredUser) {

    setUser(registeredUser);

    setAuthPage("login");

    loadHistory();

  }

  function logout() {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    setUser(null);

    setMessages([]);

    setHistory([]);

    setQuestion("");

    setShowHistory(false);

    setShowSyllabus(false);

    setSelectedSubject(null);

    setSubjectDetails(null);

    setSyllabusError("");

  }

  // --------------------------------------------------

  // ASK CHATBOT

  // --------------------------------------------------

  async function askQuestion(text = question) {

    const cleanQuestion = text.trim();

    if (!cleanQuestion || loading) return;

    const token = localStorage.getItem("token");

    if (!token) {

      logout();

      return;

    }

    setQuestion("");

    setLoading(true);

    setShowHistory(false);

    setShowSyllabus(false);

    setMessages((prev) => [

      ...prev,

      {

        role: "user",

        content: cleanQuestion,

      },

    ]);

    try {

      const response = await axios.post(

        `${API_URL}/api/query`,

        {

          question: cleanQuestion,

          top_k: 3,

        },

        {

          timeout: 200_000,

          headers: {

            Authorization: `Bearer ${token}`,

          },

        }

      );

      setMessages((prev) => [

        ...prev,

        {

          role: "assistant",

          content:

            response.data.answer ||

            "I could not find relevant information.",

          sources: response.data.sources || [],

        },

      ]);

      await loadHistory();

    } catch (error) {

      console.error("Question error:", error);

      if (error.response?.status === 401) {

        logout();

        return;

      }

      setMessages((prev) => [

        ...prev,

        {

          role: "assistant",

          error:

            error.response?.data?.error ||

            (error.code === "ECONNABORTED"
              ? "The AI service took too long to respond. Please try again in a moment."
              : "Unable to reach the AI service. Please try again in a moment."),

        },

      ]);

    } finally {

      setLoading(false);

    }

  }

  function handleSubmit(e) {

    e.preventDefault();

    askQuestion();

  }

  // --------------------------------------------------

  // CHAT NAVIGATION

  // --------------------------------------------------

  function newChat() {

    setMessages([]);

    setQuestion("");

    setShowHistory(false);

    setShowSyllabus(false);

    setSelectedSubject(null);

    setSubjectDetails(null);

    setSyllabusError("");

  }

  function openHistoryChat(chat) {

    setMessages([

      {

        role: "user",

        content: chat.question,

      },

      {

        role: "assistant",

        content: chat.answer,

        sources: chat.sources || [],

      },

    ]);

    setQuestion("");

    setShowHistory(false);

    setShowSyllabus(false);

  }

  async function deleteChat(chatId) {

    const token = localStorage.getItem("token");

    if (!token) {

      logout();

      return;

    }

    try {

      await axios.delete(

        `${API_URL}/api/chats/${chatId}`,

        {

          headers: {

            Authorization: `Bearer ${token}`,

          },

        }

      );

      setHistory((prev) =>

        prev.filter((chat) => chat._id !== chatId)

      );

      setMessages([]);

      setQuestion("");

      setShowSyllabus(false);

      setShowHistory(true);

    } catch (error) {

      console.error("Unable to delete chat:", error);

      if (error.response?.status === 401) {

        logout();

        return;

      }

      alert(

        error.response?.data?.error ||

          "Unable to delete chat."

      );

    }

  }

  function formatDate(date) {

    if (!date) return "";

    return new Date(date).toLocaleString(undefined, {

      dateStyle: "medium",

      timeStyle: "short",

    });

  }

  // --------------------------------------------------

  // SYLLABUS

  // --------------------------------------------------

async function openSyllabus() {

  setShowSyllabus(true);

  setShowHistory(false);

  setQuestion("");

  setSyllabusError("");

  setSelectedSubject(null);

  setSubjectDetails(null);

  setSelectedProgram(null);

  setSelectedBranch(null);

  setSelectedSemester(1);

  setSyllabusProgramData(null);

  if (syllabusData) return;

  setSyllabusLoading(true);

  try {

    const response = await axios.get(`${API_URL}/api/syllabus`);

    console.log("Default syllabus response:", response.data);

    setSyllabusData(response.data);

  } catch (error) {

    console.error("Unable to load syllabus:", error);

    setSyllabusError(

      "Unable to load the syllabus. Check that the backend is running and try again."

    );

  } finally {

    setSyllabusLoading(false);

  }

}

  async function openSubject(subject) {

    setSelectedSubject(subject);

    setSubjectDetails(null);

    setSyllabusError("");

    const isCoreCSE =

      selectedProgram === "B.Tech / B.E." &&

      selectedBranch === "Computer Science Engineering (Core CSE)";

    if (!isCoreCSE) {

      setSubjectDetails(subject);

      return;

    }

    if (!subject.code) {

      setSubjectDetails(subject);

      return;

    }

    setSyllabusLoading(true);

    try {

      const response = await axios.get(

        `${API_URL}/api/syllabus/${encodeURIComponent(subject.code)}`

      );

      setSubjectDetails(response.data.subject || subject);

    } catch (error) {

      console.error("Unable to load subject details:", error);

      setSyllabusError(

        `Unable to load details for ${subject.code}. Please try again.`

      );

    } finally {

      setSyllabusLoading(false);

    }

  }

  async function loadBranchSyllabus(branch) {
    setSelectedBranch(branch);
    setSelectedSemester(1);
    setSelectedSubject(null);
    setSubjectDetails(null);
    setSyllabusError("");
    setSyllabusProgramData(null);
  
    const programMap = {
      "Computer Science Engineering (Core CSE)": "cse",
      "Artificial Intelligence & Machine Learning": "aiml",
      "Cyber Security": "cybersecurity",
      "Electronics & Communication Engineering (ECE)": "ece",
      "Computer Applications": "bca",
      "Business Administration": "bba",
      "Law": "llb",
      "Computer Science": "mtech_cse",
      "Other Specializations": "mtech_other",
    };
  
    const program = programMap[branch];
  
    if (!program) {
      setSyllabusError(`No syllabus API mapping found for ${branch}.`);
      return;
    }
  
    setSyllabusLoading(true);
  
    try {
      const response = await axios.get(`${API_URL}/api/syllabus`, {
        params: program === "cse" ? {} : { program },
      });
  
      console.log(`Syllabus loaded for ${program}:`, response.data);
      setSyllabusProgramData(response.data);
    } catch (error) {
      console.error(
        "Unable to load branch syllabus:",
        error.response?.status,
        error.response?.data || error.message
      );
  
      setSyllabusError(
        error.response?.data?.details ||
          error.response?.data?.error ||
          `Unable to load the ${branch} syllabus.`
      );
    } finally {
      setSyllabusLoading(false);
    }
  }

  function backToSubjects() {

    setSelectedSubject(null);

    setSubjectDetails(null);

    setSyllabusError("");

  }

  function toggleTheme() {

    setDarkMode((prev) => !prev);

  }

  // --------------------------------------------------

  // LOGIN / REGISTER SCREEN

  // --------------------------------------------------

  if (!user) {

    if (authPage === "login") {

      return (

        <Login

          onLogin={handleLogin}

          onShowRegister={() =>

            setAuthPage("register")

          }

        />

      );

    }

    return (

      <Register

        onRegister={handleRegister}

        onShowLogin={() =>

          setAuthPage("login")

        }

      />

    );

  }

  // --------------------------------------------------

  // MAIN APPLICATION

  // --------------------------------------------------

  return (

    <div

      className={`chat-app ${

        darkMode ? "dark-mode" : ""

      }`}

    >

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="sidebar-top">

          <div className="brand">

            <img

              src={collegeLogo}

              alt="College AI"

              className="brand-logo"

            />

            <div>

              <div className="brand-name">

                College AI

              </div>

              <div className="brand-subtitle">

                Student Assistant

              </div>

            </div>

          </div>

          <button

            className="new-chat"

            onClick={newChat}

          >

            <span className="plus-icon">+</span>

            <span>New chat</span>

          </button>

        </div>

        {/* CHAT HISTORY NAVIGATION */}

        <div className="sidebar-section">

          <div className="sidebar-label">

            YOUR CHATS

          </div>

          <button

            className={`sidebar-item ${

              showHistory ? "active" : ""

            }`}

            onClick={() => {

              setShowHistory(true);

              setShowSyllabus(false);

              loadHistory();

            }}

          >

            <span className="sidebar-icon">

              <img

                src={historyIcon}

                alt="History"

                className="history-icon"

              />

            </span>

            Chat history

          </button>

        </div>

        {/* KNOWLEDGE BASE NAVIGATION */}

        <div className="sidebar-section">

          <div className="sidebar-label">

            KNOWLEDGE BASE

          </div>

          <div className="sidebar-item">

            <span className="sidebar-icon">

              ◈

            </span>

            College Documents

          </div>

          <div className="sidebar-item">

            <span className="sidebar-icon">

              ✓

            </span>

            Academic Rules

          </div>

          <div className="sidebar-item">

            <span className="sidebar-icon">

              ▣

            </span>

            Student Services

          </div>

          {/* NEW SYLLABUS BUTTON */}

          <button

            className={`sidebar-item ${

              showSyllabus ? "active" : ""

            }`}

            onClick={openSyllabus}

          >

            <span className="sidebar-icon">

              ▤

            </span>

            Syllabus

          </button>

        </div>

        {/* SIDEBAR FOOTER */}

        <div className="sidebar-bottom">

          <div className="user-profile">

            <div className="profile-avatar">

              {user.name

                ?.charAt(0)

                .toUpperCase()}

            </div>

            <div className="profile-info">

              <div className="profile-name">

                {user.name}

              </div>

              <div className="profile-email">

                {user.email}

              </div>

            </div>

          </div>

          <button

            className="logout-button"

            onClick={logout}

          >

            <span>↪</span>

            Logout

          </button>

          <div className="status">

            <span className="status-dot"></span>

            RAG system online

          </div>

          <div className="powered">

            LangChain · ChromaDB · Gemini

          </div>

        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main className="main">

        {/* TOP BAR */}

        <header className="topbar">

          <div className="mobile-brand">

            <img

              src={collegeLogo}

              alt="College AI"

              className="mobile-logo"

            />

            <span>College AI</span>

          </div>

          <div className="model-selector">

            <span>

              {showSyllabus

                ? "Syllabus Browser"

                : showHistory

                  ? "Chat History"

                  : "College Assistant"}

            </span>

            <span className="model-arrow">▾</span>

          </div>

          <button

            className={`theme-toggle ${

              darkMode ? "dark" : ""

            }`}

            onClick={toggleTheme}

            title={

              darkMode

                ? "Switch to light mode"

                : "Switch to dark mode"

            }

            aria-label={

              darkMode

                ? "Switch to light mode"

                : "Switch to dark mode"

            }

          >

            <span className="theme-toggle-track">

              <span className="theme-toggle-icon">

                {darkMode ? "☾" : "☀"}

              </span>

            </span>

          </button>

        </header>

        {/* CONVERSATION / HISTORY / SYLLABUS */}

        <div

          className={`conversation ${

            messages.length === 0 &&

            !showHistory &&

            !showSyllabus

              ? "empty"

              : ""

          }`}

        >

          {/* =========================

              SYLLABUS PAGE

          ========================= */}

          {showSyllabus ? (

          <div className="syllabus-page">

            <div className="syllabus-header">

              <div>

                <div className="syllabus-eyebrow">ACADEMIC RESOURCES</div>

                <h1>

                  {!selectedProgram

                    ? "All Syllabus & Courses"

                    : selectedBranch

                      ? `${selectedProgram} — ${selectedBranch}`

                      : selectedProgram}

                </h1>

                <p>

                  {!selectedProgram

                    ? "Choose a program to explore its branches and syllabus."

                    : !selectedBranch

                      ? "Choose a branch or specialization."

                      : "Browse semesters, subjects, and available course details."}

                </p>

              </div>

              {(selectedProgram || selectedBranch || selectedSubject) && (

                <button

                  className="syllabus-back-button"

                  type="button"

                  onClick={() => {

                    if (selectedSubject) {

                      backToSubjects();

                    } else if (selectedBranch) {

                      setSelectedBranch(null);

                      setSelectedSemester(1);

                      setSelectedSubject(null);

                      setSubjectDetails(null);

                      setSyllabusProgramData(null);

                    } else {

                      setSelectedProgram(null);

                    }

                  }}

                >

                  ← {selectedSubject

                    ? "All subjects"

                    : selectedBranch

                      ? "All branches"

                      : "All programs"}

                </button>

              )}

            </div>

            {syllabusLoading && (

              <div className="syllabus-message">Loading syllabus...</div>

            )}

            {syllabusError && (

              <div className="syllabus-error">

                <span>{syllabusError}</span>

                <button

                  type="button"

                  onClick={() =>

                    selectedBranch

                      ? loadBranchSyllabus(selectedBranch)

                      : openSyllabus()

                  }

                >

                  Retry

                </button>

              </div>

            )}

            {!syllabusLoading && !syllabusError && syllabusData && (

              <>

                {!selectedProgram && (

                  <div className="syllabus-program-grid">

                    {syllabusPrograms.map((program) => (

                      <button

                        type="button"

                        className="syllabus-program-card"

                        key={program.name}

                        onClick={() => {

                          setSelectedProgram(program.name);

                          setSelectedBranch(null);

                          setSelectedSubject(null);

                          setSelectedSemester(1);

                          setSyllabusProgramData(null);

                        }}

                      >

                        <span className="syllabus-program-icon">▤</span>

                        <h2>{program.name}</h2>

                        <p>{program.description}</p>

                        <span className="syllabus-program-meta">

                          {program.branches.length}{" "}

                          {program.branches.length === 1 ? "branch" : "branches"}{" "}

                          <span>→</span>

                        </span>

                      </button>

                    ))}

                  </div>

                )}

                {selectedProgram && !selectedBranch && (

                  <div className="syllabus-branch-grid">

                    {(syllabusPrograms.find(

                      (program) => program.name === selectedProgram

                    )?.branches || []).map((branch) => (

                      <button

                        type="button"

                        className="syllabus-branch-card"

                        key={branch}

                        onClick={() => loadBranchSyllabus(branch)}

                      >

                        <span className="syllabus-branch-icon">◇</span>

                        <span>{branch}</span>

                        <span className="syllabus-card-arrow">→</span>

                      </button>

                    ))}

                  </div>

                )}

                {selectedProgram && selectedBranch && (() => {

                  const isCoreCSE =

                    selectedProgram === "B.Tech / B.E." &&

                    selectedBranch === "Computer Science Engineering (Core CSE)";

                  const activeData = syllabusProgramData;

                  const semesters = activeData?.semesters || [];

                  return (

                    <>

                      <div className="syllabus-source-note">

                        <strong>Data availability</strong>

                        {isCoreCSE ? (

                          <p>

                            The existing CSE Core catalogue is retained. Some later-semester entries are overview-only; check the available details for each subject.

                          </p>

                        ) : activeData?.source?.status ? (

                          <p>{activeData.source.status}</p>

                        ) : (

                          <p>

                            A verified semester-wise syllabus has not yet been connected for this program and branch.

                          </p>

                        )}

                      </div>

                      {!activeData || semesters.length === 0 ? (

                        <div className="syllabus-empty-details">

                          <h3>Official syllabus not added yet</h3>

                          <p>

                            {activeData?.source?.note ||

                              `No verified semester-wise subject list is available for ${selectedProgram} — ${selectedBranch}. Add the official syllabus before displaying subjects.`}

                          </p>

                        </div>

                      ) : (

                        <>

                          <div className="semester-selector">

                            {semesters.map((semester) => (

                              <button

                                key={semester.semester}

                                type="button"

                                className={

                                  Number(selectedSemester) === Number(semester.semester)

                                    ? "semester-tab active"

                                    : "semester-tab"

                                }

                                onClick={() => {

                                  setSelectedSemester(Number(semester.semester));

                                  setSelectedSubject(null);

                                  setSubjectDetails(null);

                                }}

                              >

                                Semester {semester.semester}

                              </button>

                            ))}

                          </div>

                          {!selectedSubject ? (

                            (() => {

                              const currentSemester = semesters.find(

                                (semester) => Number(semester.semester) === Number(selectedSemester)

                              );

const regularSubjects = currentSemester?.subjects || [];

const schemeSubjects = (currentSemester?.schemes || []).flatMap((scheme) =>

  (scheme.subjects || []).map((subject) => ({

    ...subject,

    schemeName: scheme.scheme || scheme.name || scheme.title || "",

  }))

);

const provisionalSubjects =

  currentSemester?.provisionalSubjects?.subjects || [];

const subjects =

  regularSubjects.length > 0

    ? [...regularSubjects, ...schemeSubjects]

    : schemeSubjects.length > 0

      ? schemeSubjects

      : provisionalSubjects;

                              return currentSemester?.status === "pending_official_syllabus" &&

                              provisionalSubjects.length === 0 ? (

                                <div className="syllabus-empty-details">

                                  <h3>Official syllabus pending</h3>

                                  <p>

                                    {currentSemester.verificationNote ||

                                      `The official syllabus for Semester ${selectedSemester} has not been added yet.`}

                                  </p>

                                </div>

                              ) : subjects.length === 0 ? (

                                <div className="syllabus-empty-details">

                                  <h3>No subjects listed</h3>

                                  <p>No subjects are available for this semester yet.</p>

                                </div>

                              ) : (

                                <>

                                  {provisionalSubjects.length > 0 && (

                                  <div className="syllabus-empty-details">

                                    <h3>Provisional reference subjects</h3>

                                    <p>

                                      These are general CSE reference subjects, not a verified

                                      Cyber Security-specific syllabus.

                                    </p>

                                  </div>

                                )}

                                <div className="syllabus-subject-count">

                                    {subjects.length} listed subjects

                                  </div>

                                  <div className="syllabus-subject-grid">

                                    {subjects.map((subject, index) => (

                                      <button

                                        key={`${subject.code || subject.name}-${index}`}

                                        type="button"

                                        className="syllabus-subject-card"

                                        onClick={() => openSubject(subject)}

                                        disabled={!subject.code && !subject.name}

                                      >

                                        <div className="syllabus-subject-top">

                                          <span className="syllabus-code">{subject.code || "COURSE"}</span>

                                          <span className="syllabus-card-arrow">→</span>

                                        </div>

                                        <h3>{subject.name}</h3>

                                        <div className="syllabus-subject-footer">

                                          <span>{subject.type || "Course"}</span>

                                          <span>

                                            {subject.unit_count > 0

                                              ? `${subject.unit_count} units`

                                              : subject.details_found

                                                ? "Details available"

                                                : "Overview only"}

                                          </span>

                                        </div>

                                      </button>

                                    ))}

                                  </div>

                                </>

                              );

                            })()

                          ) : (

                            <div className="syllabus-detail">

                              <div className="syllabus-detail-heading">

                                <span className="syllabus-code">{selectedSubject.code || "COURSE"}</span>

                                <h2>{selectedSubject.name}</h2>

                                <p>Semester {selectedSemester} · {selectedSubject.type || "Course"}</p>

                              </div>

                              {subjectDetails?.units?.length > 0 ? (

                                <div className="syllabus-units">

                                  {subjectDetails.units.map((unit, index) => (

                                    <article className="syllabus-unit" key={`${unit.unit}-${index}`}>

                                      <h3>Unit {unit.unit}</h3>

                                      <p>{unit.content}</p>

                                    </article>

                                  ))}

                                </div>

                              ) : (

                                <div className="syllabus-empty-details">

                                  <h3>Detailed syllabus not available</h3>

                                  <p>This subject is listed in the catalogue, but detailed unit information has not been extracted.</p>

                                </div>

                              )}

                            </div>

                          )}

                        </>

                      )}

                    </>

                  );

                })()}

              </>

            )}

          </div>

        ) : showHistory ? (

            <div className="history-page">

              <div className="history-header">

                <div className="history-title-row">

                  <div className="history-title-icon">

                    <img

                      src={historyIcon}

                      alt="History"

                      className="history-icon"

                    />

                  </div>

                  <div>

                    <h1>Chat history</h1>

                    <p>

                      Your previous conversations

                    </p>

                  </div>

                </div>

                <button

                  className="history-new-button"

                  onClick={newChat}

                >

                   New chat

                </button>

              </div>

              {history.length === 0 ? (

                <div className="empty-history">

                  <div className="empty-history-icon">

                    <img

                      src={historyIcon}

                      alt="History"

                      className="history-icon"

                    />

                  </div>

                  <h2>No conversations yet</h2>

                  <p>

                    Ask your first question and

                    your conversation will appear

                    here.

                  </p>

                  <button onClick={newChat}>

                    Start a new chat

                  </button>

                </div>

              ) : (

                <div className="history-list">

                  {history.map((chat) => (

                    <div

                      className="history-item"

                      key={chat._id}

                    >

                      <button

                        className="history-chat-button"

                        onClick={() =>

                          openHistoryChat(chat)

                        }

                      >

                        <div className="history-item-icon">

                          <img

                            src={historyIcon}

                            alt="History"

                            className="history-icon"

                          />

                        </div>

                        <div className="history-content">

                          <div className="history-question">

                            {chat.question}

                          </div>

                          <div className="history-date">

                            {formatDate(chat.createdAt)}

                          </div>

                        </div>

                        <span className="history-arrow">

                          →

                        </span>

                      </button>

                      <button

                        className="history-delete-button"

                        onClick={(e) => {

                          e.stopPropagation();

                          deleteChat(chat._id);

                        }}

                        title="Delete chat"

                        aria-label="Delete chat"

                      >

                        <img

                          src={deleteIcon}

                          alt="Delete"

                          className="delete-icon"

                        />

                      </button>

                    </div>

                  ))}

                </div>

              )}

            </div>

          ) : messages.length === 0 ? (

            <div className="welcome">

              <img

                src={collegeLogo}

                alt="College AI"

                className="welcome-logo"

              />

              <div className="welcome-badge">

                AI-powered college assistant

              </div>

              <h1>How can I help you?</h1>

              <p>

                Ask questions about college rules,

                examinations, attendance, academics,

                or student services.

              </p>

              <div className="suggestion-grid">

                {suggestions.map((item) => (

                  <button

                    key={item.title}

                    className="suggestion-card"

                    onClick={() =>

                      askQuestion(item.text)

                    }

                  >

                    <div className="suggestion-icon">

                      <img

                        src={item.icon}

                        alt={item.title}

                      />

                    </div>

                    <div className="suggestion-content">

                      <span className="suggestion-title">

                        {item.title}

                      </span>

                      <span className="suggestion-text">

                        {item.text}

                      </span>

                    </div>

                    <span className="suggestion-arrow">

                      →

                    </span>

                  </button>

                ))}

              </div>

              <div className="grounded-note">

                <span>✦</span>

                Answers are grounded in your college

                knowledge base.

              </div>

            </div>

          ) : (

            <div className="messages">

              {messages.map((message, index) => (

                <div

                  key={index}

                  className={`message-row ${message.role}`}

                >

                  {message.role === "assistant" && (

                    <div className="avatar assistant-avatar">

                      <img

                        src={collegeLogo}

                        alt="AI"

                      />

                    </div>

                  )}

                  <div className="message-content">

                    <div className="message-name">

                      {message.role === "user"

                        ? "You"

                        : "College AI"}

                    </div>

                    {message.error ? (

                      <div className="error-message">

                        {message.error}

                      </div>

                    ) : (

                      <div className="message-text">

                        {message.role === "assistant" ? (

                          <ReactMarkdown

                            remarkPlugins={[remarkGfm]}

                          >

                            {message.content || ""}

                          </ReactMarkdown>

                        ) : (

                          message.content

                        )}

                      </div>

                    )}



{message.role === "assistant" &&
  message.sources?.length > 0 && (
    <div className="sources">
      <div className="sources-title">
        <span>◈</span>
        Sources
      </div>

      <div className="source-list">
        {message.sources.map((source, i) => (
          <div className="source-card" key={i}>
            <div className="source-icon"></div>

            <div className="source-details">
              <div className="source-title">
                {source.source || "College document"}
              </div>

              <div className="source-meta">
                {source.page !== undefined && source.page !== null
                  ? `Page ${source.page}`
                  : "Document reference"}
              </div>

              {source.score !== undefined && source.score !== null && (
                <div className="source-meta source-distance-text">
                  Distance: {Number.isFinite(Number(source.score))
                    ? Number(source.score).toFixed(3)
                    : source.score}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="source-explanation">
        Lower distance generally indicates a closer vector match.
        This is a retrieval metric, not the probability that the answer is correct.
      </p>
    </div>
  )}



                  </div>

                  {message.role === "user" && (

                    <div className="avatar user-avatar">

                      {user.name

                        ?.charAt(0)

                        .toUpperCase()}

                    </div>

                  )}

                </div>

              ))}

              {loading && (

                <div className="message-row assistant">

                  <div className="avatar assistant-avatar">

                    <img

                      src={collegeLogo}

                      alt="AI"

                    />

                  </div>

                  <div className="message-content">

                    <div className="message-name">

                      College AI

                    </div>

                    <div className="typing">

                      <span></span>

                      <span></span>

                      <span></span>

                    </div>

                  </div>

                </div>

              )}

              <div ref={messagesEndRef} />

            </div>

          )}

        </div>

        {/* CHAT COMPOSER: HIDDEN ON HISTORY AND SYLLABUS */}

        {!showHistory && !showSyllabus && (

          <div className="composer-area">

            <form

              className="composer"

              onSubmit={handleSubmit}

            >

              <textarea

                value={question}

                onChange={(e) =>

                  setQuestion(e.target.value)

                }

                onKeyDown={(e) => {

                  if (

                    e.key === "Enter" &&

                    !e.shiftKey

                  ) {

                    e.preventDefault();

                    handleSubmit(e);

                  }

                }}

                placeholder="Ask anything about your college..."

                rows={1}

                disabled={loading}

              />

              <button

                className="send-button"

                type="submit"

                disabled={!question.trim() || loading}

              >

                ↑

              </button>

            </form>

            <div className="composer-note">

              College AI can make mistakes. Check

              important information against official

              college documents.

            </div>

          </div>

        )}

      </main>

    </div>

  );

}