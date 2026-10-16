
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TEXT_FILE = ROOT / "data/miet_crawl/current_syllabus/CSE_AIML_CS_Batch_2024_Sem1-2.txt"
CATALOG_FILE = ROOT / "data/syllabus/cse_batch_2024.json"
OUTPUT_FILE = ROOT / "data/syllabus/cse_batch_2024_details.json"

text = TEXT_FILE.read_text(encoding="utf-8", errors="replace")
catalog = json.loads(CATALOG_FILE.read_text(encoding="utf-8"))

subjects = {
    s["code"]: s
    for sem in catalog["semesters"]
    for s in sem["subjects"]
}

# Reset any results from previous runs.
for subject in subjects.values():
    subject["units"] = []
    subject["details_found"] = False

# Each course has a course-outcome block followed by Detailed Syllabus.
# Identify these blocks by the order of the known course headers.
header_pattern = re.compile(
    r"(?m)^[ \t]*("
    + "|".join(re.escape(c) for c in sorted(subjects, key=len, reverse=True))
    + r")[ \t]+[^\n]*$"
)

headers = list(header_pattern.finditer(text))
details = list(re.finditer(r"Detailed Syllabus", text, re.IGNORECASE))

unit_pattern = re.compile(
    r"(?im)^\s*UNIT\s*(\d+)\s*:\s*(.*?)(?="
    r"^\s*UNIT\s*\d+\s*:|"
    r"^\s*Section\s*[- ]?[AB]\s*$|"
    r"\Z)",
    re.MULTILINE | re.DOTALL,
)

for detail in details:
    # Choose the latest course header before this detailed syllabus.
    previous_headers = [h for h in headers if h.start() < detail.start()]
    if not previous_headers:
        continue

    header = previous_headers[-1]
    code = header.group(1)

    # Skip if another course header occurs between this header and
    # the Detailed Syllabus heading.
    if any(
        h.start() > header.start() and h.start() < detail.start()
        for h in headers
    ):
        continue

    # End at the next Detailed Syllabus or course header, whichever comes first.
    later_details = [d.start() for d in details if d.start() > detail.start()]
    later_headers = [h.start() for h in headers if h.start() > header.start()]

    boundaries = later_details + later_headers
    end = min(boundaries) if boundaries else len(text)

    section = text[detail.end():end]
    units = []

    for match in unit_pattern.finditer(section):
        content = re.sub(r"\s+", " ", match.group(2)).strip()
        if content:
            units.append({
                "unit": int(match.group(1)),
                "content": content,
            })

    if units and not subjects[code]["units"]:
        subjects[code]["units"] = units
        subjects[code]["details_found"] = True

OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE.write_text(
    json.dumps(catalog, indent=2, ensure_ascii=False),
    encoding="utf-8",
)

for sem in catalog["semesters"]:
    print(f"\nSEMESTER {sem['semester']}")
    for subject in sem["subjects"]:
        print(
            f"{subject['code']:10} "
            f"{len(subject['units'])} units | {subject['name']}"
        )

print(f"\nSaved: {OUTPUT_FILE}")
