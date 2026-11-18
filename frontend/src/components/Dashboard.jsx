import { getTimetableById, getTimetableId, branchNames } from "./timetableData";
import "./Dashboard.css";

const branches = [
  { value: "cse", label: "Computer Science (CSE)" },
  { value: "aiml", label: "Artificial Intelligence & Machine Learning" },
  { value: "cybersecurity", label: "Cyber Security" },
];

export default function Dashboard({
  user,
  profile,
  onProfileChange,
  onAskQuestion,
  onOpenTimetable,
}) {
  const timetableId = getTimetableId(profile);
  const timetable = getTimetableById(timetableId);
  const branchLabel = branchNames[profile.branch];

  function updateSemester(semester) {
    onProfileChange({
      semester,
      branch: semester === "1" ? "general" : "",
    });
  }

  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <div className="classes-eyebrow">YOUR COLLEGE, AT A GLANCE</div>
          <h1>Welcome, {user.name || "student"}</h1>
          <p>Set your semester and branch to personalize your class resources.</p>
        </div>
      </header>

      <section className="dashboard-profile">
        <div>
          <h2>Your academic profile</h2>
          <p>This preference is saved in this browser for your account.</p>
        </div>
        <div className="dashboard-profile-fields">
          <label className="classes-filter">
            <span>Semester</span>
            <select
              value={profile.semester}
              onChange={(event) => updateSemester(event.target.value)}
            >
              <option value="">Choose semester</option>
              <option value="1">Semester 1</option>
              <option value="3">Semester 3</option>
              <option value="5">Semester 5</option>
              <option value="7">Semester 7</option>
            </select>
          </label>
          <label className="classes-filter">
            <span>Branch</span>
            <select
              value={profile.branch}
              onChange={(event) =>
                onProfileChange({
                  ...profile,
                  branch: event.target.value,
                })
              }
              disabled={!profile.semester}
            >
              <option value="">Choose branch</option>
              {profile.semester === "1" ? (
                <option value="general">First-year (common)</option>
              ) : (
                branches.map((branch) => (
                  <option key={branch.value} value={branch.value}>
                    {branch.label}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
      </section>

      {!timetable ? (
        <div className="dashboard-empty">
          <span className="dashboard-empty-icon">▦</span>
          <h2>Choose your semester and branch</h2>
          <p>Your matching class timetable and schedule questions will appear here.</p>
        </div>
      ) : (
        <>
          <section className="dashboard-timetable">
            <div className="dashboard-section-heading">
              <div>
                <div className="classes-eyebrow">YOUR TIMETABLE</div>
                <h2>Semester {profile.semester} · {branchLabel}</h2>
                <p>{timetable.title}</p>
              </div>
              <button
                type="button"
                className="timetable-open-link dashboard-browse-button"
                onClick={() => onOpenTimetable(timetable.id)}
              >
                Browse timetables
              </button>
            </div>
            <iframe
              className="dashboard-pdf"
              src={`${timetable.file}#view=FitH`}
              title={`${timetable.title} timetable`}
            />
          </section>

          <section className="dashboard-ask">
            <div>
              <div className="classes-eyebrow">ASK COLLEGE AI</div>
              <h2>Need your schedule?</h2>
              <p>Ask about your classes by day using your selected profile.</p>
            </div>
            <div className="dashboard-day-actions">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
                (day) => (
                  <button
                    key={day}
                    type="button"
                    className="dashboard-day-button"
                    onClick={() =>
                      onAskQuestion(`What classes do I have on ${day}?`)
                    }
                  >
                    {day}
                  </button>
                ),
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
