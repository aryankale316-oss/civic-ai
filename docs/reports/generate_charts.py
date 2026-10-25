import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

assets_dir = Path(r"C:\Users\rushi\civic-ai\docs\reports\assets")
assets_dir.mkdir(parents=True, exist_ok=True)

# Set clean style
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['axes.edgecolor'] = '#cccccc'
plt.rcParams['axes.linewidth'] = 0.8

# -------------------------------------------------------------
# Chart 1: Text Classifier Held-Out Test Performance
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(8, 4.5), dpi=300)
departments = [
    "Electricity &\nStreetlights",
    "Public\nTransport",
    "Roads &\nFootpaths",
    "Sewerage &\nDrainage",
    "Solid Waste &\nGarbage",
    "Water\nSupply"
]
en_f1 = [98.4, 97.9, 98.4, 100.0, 96.1, 98.8]
hi_f1 = [96.7, 100.0, 83.2, 94.6, 90.6, 96.5]
overall_f1 = [97.5, 99.0, 91.2, 96.8, 92.7, 97.7]

x = np.arange(len(departments))
width = 0.25

rects1 = ax.bar(x - width, en_f1, width, label='English Test F1 (%)', color='#2b5c8f')
rects2 = ax.bar(x, hi_f1, width, label='Hindi Test F1 (%)', color='#e07a5f')
rects3 = ax.bar(x + width, overall_f1, width, label='Combined Test F1 (%)', color='#3d5a80')

ax.set_ylabel('F1 Score (%)', fontsize=11, fontweight='bold')
ax.set_title('Bilingual Text Classifier: Held-Out Test Performance by Department\n(LinearSVC on 6,000 Synthetic Complaints; Note Synthetic Benchmark Caveat)', fontsize=12, fontweight='bold', pad=12)
ax.set_xticks(x)
ax.set_xticklabels(departments, fontsize=9.5)
ax.set_ylim(70, 105)
ax.legend(frameon=True, facecolor='#ffffff', loc='lower right', fontsize=9.5)

for rects in [rects1, rects2, rects3]:
    for rect in rects:
        h = rect.get_height()
        ax.annotate(f'{h:.1f}%',
                    xy=(rect.get_x() + rect.get_width() / 2, h),
                    xytext=(0, 3), textcoords="offset points",
                    ha='center', va='bottom', fontsize=7.5)

plt.tight_layout()
chart1_path = assets_dir / "text_classifier_performance.png"
plt.savefig(chart1_path)
plt.close()
print(f"Saved Chart 1 to {chart1_path}")

# -------------------------------------------------------------
# Chart 2: YOLOv8 Held-Out Test Performance
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(8.5, 4.8), dpi=300)
image_classes = [
    "Roads &\nFootpaths",
    "Solid Waste &\nGarbage",
    "Water\nSupply",
    "Sewerage &\nDrainage",
    "Electricity &\nStreetlights"
]
precision = [36.85, 33.62, 21.37, 34.79, 30.42]
recall = [42.03, 40.88, 27.36, 23.45, 5.56]
map50 = [33.36, 29.93, 13.44, 21.06, 5.91]
map50_95 = [12.42, 17.57, 5.79, 6.56, 2.57]

x = np.arange(len(image_classes))
width = 0.20

r1 = ax.bar(x - 1.5*width, precision, width, label='Precision (%)', color='#457b9d')
r2 = ax.bar(x - 0.5*width, recall, width, label='Recall (%)', color='#e63946')
r3 = ax.bar(x + 0.5*width, map50, width, label='mAP@50 (%)', color='#2a9d8f')
r4 = ax.bar(x + 1.5*width, map50_95, width, label='mAP@50-95 (%)', color='#f4a261')

ax.set_ylabel('Metric Score (%)', fontsize=11, fontweight='bold')
ax.set_title('Civic AI YOLOv8n Held-Out Test Evaluation Results by Class\n(580 Test Images, 3,828 Annotations — Baseline Prototype Evaluation)', fontsize=12, fontweight='bold', pad=12)
ax.set_xticks(x)
ax.set_xticklabels(image_classes, fontsize=9.5)
ax.set_ylim(0, 52)
ax.axhline(20.74, color='#2a9d8f', linestyle='--', linewidth=1.2, label='Overall mAP@50 (20.74%)')
ax.legend(frameon=True, facecolor='#ffffff', loc='upper right', fontsize=9)

for rect in r3:
    h = rect.get_height()
    ax.annotate(f'{h:.1f}%',
                xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 3), textcoords="offset points",
                ha='center', va='bottom', fontsize=8, fontweight='bold', color='#1d3557')

plt.tight_layout()
chart2_path = assets_dir / "yolo_test_performance.png"
plt.savefig(chart2_path)
plt.close()
print(f"Saved Chart 2 to {chart2_path}")

# -------------------------------------------------------------
# Chart 3: System Pipeline Flowchart
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(10, 5.2), dpi=300)
ax.axis('off')

# Draw diagram boxes
boxes = [
    # Level 1: Users
    {"xy": (0.05, 0.72), "w": 0.22, "h": 0.20, "title": "Citizen Interface\n(React Web / Mobile)", "desc": "• Bilingual (EN / HI)\n• Form & Geolocation\n• Multi-photo upload", "color": "#e8f4f8", "border": "#2b5c8f"},
    {"xy": (0.73, 0.72), "w": 0.22, "h": 0.20, "title": "Admin Dashboard\n(React SPA)", "desc": "• Officer assignment\n• Status progression\n• Analytics & Hotspots", "color": "#fef6e4", "border": "#f582ae"},
    
    # Level 2: Backend
    {"xy": (0.36, 0.72), "w": 0.28, "h": 0.20, "title": "Express.js Backend & API", "desc": "• JWT Auth & RBAC\n• PostgreSQL Database\n• Image Storage (/uploads)\n• Notification Service", "color": "#f0f7f4", "border": "#2a9d8f"},
    
    # Level 3: AI Service
    {"xy": (0.15, 0.28), "w": 0.32, "h": 0.32, "title": "AI Service: Text Perception", "desc": "• LinearSVC Classifier (6 depts)\n• Opus-MT Translation (HI <-> EN)\n• MiniLM Embeddings & Duplicates\n• VADER Sentiment & Moderation", "color": "#eef4f8", "border": "#1d3557"},
    {"xy": (0.53, 0.28), "w": 0.32, "h": 0.32, "title": "AI Service: Vision Perception", "desc": "• YOLOv8n Civic Detector (5 depts)\n• COCO General Object Detector\n• OpenCV Classical Heuristics\n• Cross-check & Consistency Hint", "color": "#fdf0ed", "border": "#e76f51"},
    
    # Level 4: Decision & Review
    {"xy": (0.28, 0.04), "w": 0.44, "h": 0.16, "title": "Two-Tier Routing & Human Verification", "desc": "AI outputs are advisory suggestions ('is_suggestion: True').\nMunicipal staff must review & verify before official action.", "color": "#fcf8ec", "border": "#d4a373"}
]

from matplotlib.patches import FancyBboxPatch

for b in boxes:
    rect = FancyBboxPatch(b["xy"], b["w"], b["h"], facecolor=b["color"], edgecolor=b["border"], linewidth=1.8, boxstyle="round,pad=0.015")
    ax.add_patch(rect)
    cx = b["xy"][0] + b["w"] / 2
    cy = b["xy"][1] + b["h"] - 0.04
    ax.text(cx, cy, b["title"], ha='center', va='top', fontsize=10, fontweight='bold', color='#111111')
    ax.text(b["xy"][0] + 0.015, b["xy"][1] + b["h"] - 0.08, b["desc"], ha='left', va='top', fontsize=8, color='#333333', linespacing=1.3)

# Add connection arrows
arrow_props = dict(arrowstyle="->", color="#555555", lw=1.5, shrinkA=5, shrinkB=5)
ax.annotate("", xy=(0.36, 0.82), xytext=(0.27, 0.82), arrowprops=arrow_props)
ax.annotate("", xy=(0.73, 0.82), xytext=(0.64, 0.82), arrowprops=arrow_props)
ax.annotate("", xy=(0.31, 0.60), xytext=(0.44, 0.72), arrowprops=arrow_props)
ax.annotate("", xy=(0.69, 0.60), xytext=(0.56, 0.72), arrowprops=arrow_props)
ax.annotate("", xy=(0.42, 0.20), xytext=(0.31, 0.28), arrowprops=arrow_props)
ax.annotate("", xy=(0.58, 0.20), xytext=(0.69, 0.28), arrowprops=arrow_props)

plt.title("Civic AI End-to-End System Architecture and Decision Pipeline", fontsize=13, fontweight='bold', pad=15)
plt.tight_layout()
chart3_path = assets_dir / "system_architecture_diagram.png"
plt.savefig(chart3_path)
plt.close()
print(f"Saved Chart 3 to {chart3_path}")
