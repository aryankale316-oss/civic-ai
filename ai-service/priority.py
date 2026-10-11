CRITICAL_KEYWORDS = [
    "fire", "live wire", "exposed wire", "collapse", "collapsing", "flooding",
    "flood", "sewage overflow", "gas leak", "accident", "explosion", "electrocut",
]

HIGH_KEYWORDS = [
    "sparking", "leaning dangerously", "no water", "contaminated", "bit a child",
    "dengue", "outbreak", "unsafe building", "danger", "hazard", "overflowing",
    "blocked", "burst",
]

DEFAULT_PRIORITY_BY_CATEGORY = {
    "Electricity and Streetlights": "Medium",
    "Sewerage and Drainage": "Medium",
    "Water Supply": "Medium",
    "Roads and Footpaths": "Medium",
    "Solid Waste and Garbage": "Low",
    "Public Transport": "Low",
}


def predict_priority(text: str, category: str) -> str:
    lowered = text.lower()

    if any(keyword in lowered for keyword in CRITICAL_KEYWORDS):
        return "Critical"
    if any(keyword in lowered for keyword in HIGH_KEYWORDS):
        return "High"

    return DEFAULT_PRIORITY_BY_CATEGORY.get(category, "Medium")
