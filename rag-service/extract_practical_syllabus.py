
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

TEXT_FILE = (
    ROOT
    / "data/miet_crawl/current_syllabus/"
    / "CSE_AIML_CS_Batch_2024_Sem1-2.txt"
)
JSON_FILE = ROOT / "data/syllabus/cse_batch_2024_details.json"

text = TEXT_FILE.read_text(encoding="utf-8", errors="replace")
data = json.loads(JSON_FILE.read_text(encoding="utf-8"))

# Actual course sections verified in the extracted PDF.
sections = {
    "ESC-111": (801, 875),
    "COM-111": (875, 976),
    "NCC-101": (976, 1062),
}

lines = text.splitlines()

def extract_outcomes(section_text):
    outcomes = []
    lines = [line.strip() for line in section_text.splitlines()]
    i = 0

    while i < len(lines):
        # Handles both "CO1 description" and "CO1" on its own line.
        match = re.match(r"^CO\s*(\d+)\s*(.*)$", lines[i], re.IGNORECASE)

        if not match:
            i += 1
            continue

        number = match.group(1)
        description = match.group(2).strip()

        # If the description is on the following line, capture it.
        if not description and i + 1 < len(lines):
            description = lines[i + 1].strip()
            i += 1

        if description:
            outcomes.append({
                "code": f"CO{number}",
                "description": description,
            })

        i += 1

    return outcomes


def extract_activities(section_text):
    activities = []
    in_activities = False

    for line in section_text.splitlines():
        clean = line.strip()

        if re.search(r"List of Activities", clean, re.IGNORECASE):
            in_activities = True
            continue

        if not in_activities or not clean:
            continue

        # Skip table headings and page markers.
        if re.match(r"^(S\.?\s*No\.?\s*Activities|S\.?\s*No\.?|Activities)$",clean,re.IGNORECASE,):
            continue

        if re.match(r"^(--- PAGE|\d{1,3})$", clean):
            continue

        if re.match(r"^(Course Outcomes|Detailed Syllabus)$", clean, re.IGNORECASE):
            break

        # Keep actual activity text. PDF extraction may put the
        # activity number and description on separate lines.
        if re.match(r"^\d+$", clean):
            continue

        activities.append(clean)

    return activities

for sem in data["semesters"]:
    for subject in sem["subjects"]:
        code = subject["code"]

        if code not in sections:
            continue

        start_line, end_line = sections[code]
        section_text = "\n".join(lines[start_line - 1:end_line - 1])

        subject["outcomes"] = extract_outcomes(section_text)
        subject["activities"] = extract_activities(section_text)
        subject["details_found"] = bool(
            subject["outcomes"] or subject["activities"]
        )

JSON_FILE.write_text(
    json.dumps(data, indent=2, ensure_ascii=False),
    encoding="utf-8",
)

for sem in data["semesters"]:
    for subject in sem["subjects"]:
        if subject["code"] in sections:
            print(
                f'{subject["code"]}: '
                f'{len(subject.get("outcomes", []))} outcomes, '
                f'{len(subject.get("activities", []))} activity lines'
            )

print(f"\nUpdated: {JSON_FILE}")
