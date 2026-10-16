
import json
from pathlib import Path

path = Path("data/miet_crawl/manifest.json")

data = json.loads(path.read_text(encoding="utf-8"))

print("Manifest type:", type(data).__name__)

if isinstance(data, dict):
    print("Top-level keys:", list(data.keys()))

    for key, value in data.items():
        print(f"\nKey: {key}")
        print("Value type:", type(value).__name__)

        if isinstance(value, list):
            print("Item count:", len(value))
            if value:
                print("First item:", json.dumps(
                    value[0], indent=2, ensure_ascii=False
                )[:2500])
        elif isinstance(value, dict):
            print("Sample:", json.dumps(
                dict(list(value.items())[:2]),
                indent=2, ensure_ascii=False
            )[:2500])
        else:
            print("Value:", str(value)[:500])

elif isinstance(data, list):
    print("Item count:", len(data))
    if data:
        print("First item:", json.dumps(
            data[0], indent=2, ensure_ascii=False
        )[:2500])
