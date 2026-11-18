import { useState } from "react";
import "./Classes.css";
import { timetables } from "./timetableData";

export default function Classes({ initialTimetableId = "semester-7" }) {
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(initialTimetableId);
  const visibleTimetables = timetables.filter(
    (timetable) =>
      semesterFilter === "all" || timetable.semester === semesterFilter,
  );
  const selectedTimetable =
    visibleTimetables.find((timetable) => timetable.id === selectedId) ||
    visibleTimetables[0];

  return (
    <section className="classes-page">
      <header className="classes-header">
        <div>
          <div className="classes-eyebrow">ACADEMIC RESOURCES</div>
          <h1>Class Timetables</h1>
          <p>Choose your semester to view or download its timetable.</p>
        </div>
        <label className="classes-filter">
          <span>Semester</span>
          <select
            value={semesterFilter}
            onChange={(event) => setSemesterFilter(event.target.value)}
          >
            <option value="all">All semesters</option>
            <option value="1">Semester 1</option>
            <option value="3">Semester 3</option>
            <option value="5">Semester 5</option>
            <option value="7">Semester 7</option>
          </select>
        </label>
      </header>

      <div className="classes-layout">
        <nav className="timetable-list" aria-label="Available timetables">
          {visibleTimetables.map((timetable) => (
            <button
              className={`timetable-option ${
                selectedTimetable.id === timetable.id ? "active" : ""
              }`}
              key={timetable.id}
              type="button"
              aria-pressed={selectedTimetable.id === timetable.id}
              onClick={() => setSelectedId(timetable.id)}
            >
              <span className="timetable-option-semester">
                Semester {timetable.semester}
              </span>
              <span className="timetable-option-title">{timetable.title}</span>
              <span className="timetable-option-branches">
                {timetable.branches}
              </span>
            </button>
          ))}
        </nav>

        <article className="timetable-viewer">
          <div className="timetable-viewer-header">
            <div>
              <h2>{selectedTimetable.title}</h2>
              <p>{selectedTimetable.branches}</p>
            </div>
            <a
              className="timetable-open-link"
              href={selectedTimetable.file}
              target="_blank"
              rel="noreferrer"
            >
              Open PDF ↗
            </a>
          </div>
          <iframe
            className="timetable-pdf"
            src={`${selectedTimetable.file}#view=FitH`}
            title={`${selectedTimetable.title} timetable`}
          />
        </article>
      </div>
    </section>
  );
}
