import sys
import pandas as pd
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')
CSV_PATH = r"C:\Users\rushi\civic-ai\civic_complaints_en_hi_encoding_fixed.csv"

df = pd.read_csv(CSV_PATH, encoding='utf-8-sig')

print("=== Split Group Distribution ===")
sizes = df['split_group'].value_counts()
print(sizes.describe())

print("\n=== Sample Split Groups ===")
for sg in sizes.index[:3]:
    sub = df[df['split_group'] == sg]
    print(f"\nGroup: {sg} | Total Rows: {len(sub)} | Split: {sub['split'].unique()}")
    print(f"Departments: {sub['department_label'].unique().tolist()}")
    print(f"Languages: {sub['language'].value_counts().to_dict()}")
    print(f"Issue labels: {sub['issue_label'].unique().tolist()}")
    for idx, r in sub.head(4).iterrows():
        print(f"  [{r['language']}] ({r['issue_label']}): {r['complaint_text']}")

print("\n=== Check Department Distribution per Split ===")
p_dept_split = pd.crosstab(df['department_label'], df['split'], margins=True)
print(p_dept_split)

print("\n=== Check Language Distribution per Split ===")
p_lang_split = pd.crosstab(df['language'], df['split'], margins=True)
print(p_lang_split)

print("\n=== Check Department x Language Distribution per Split ===")
for s in ['train', 'validation', 'test']:
    sub = df[df['split'] == s]
    print(f"\n--- Split: {s} (N={len(sub)}) ---")
    ct = pd.crosstab(sub['department_label'], sub['language'])
    print(ct)

print("\n=== Near Duplicate / Paraphrase Leakage Check across Splits ===")
# Check n-gram overlap between train and val/test within English and Hindi
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

for lang in ['en', 'hi']:
    sub = df[df['language'] == lang].copy().reset_index(drop=True)
    vec = TfidfVectorizer(ngram_range=(1, 2), min_df=2)
    X = vec.fit_transform(sub['complaint_text'])
    
    train_idx = sub[sub['split'] == 'train'].index
    val_idx = sub[sub['split'] == 'validation'].index
    test_idx = sub[sub['split'] == 'test'].index
    
    # Check max similarity of test/val rows against train
    sim_test_train = cosine_similarity(X[test_idx], X[train_idx])
    max_sim_test = sim_test_train.max(axis=1)
    
    sim_val_train = cosine_similarity(X[val_idx], X[train_idx])
    max_sim_val = sim_val_train.max(axis=1)
    
    print(f"\nLanguage: {lang}")
    print(f"  Test rows with max cosine sim to Train > 0.90: {(max_sim_test > 0.90).sum()} / {len(test_idx)}")
    print(f"  Test rows with max cosine sim to Train > 0.80: {(max_sim_test > 0.80).sum()} / {len(test_idx)}")
    print(f"  Val rows with max cosine sim to Train > 0.90: {(max_sim_val > 0.90).sum()} / {len(val_idx)}")
    print(f"  Val rows with max cosine sim to Train > 0.80: {(max_sim_val > 0.80).sum()} / {len(val_idx)}")
    
    # Show any high-similarity example if > 0.90
    high_sim = (max_sim_test > 0.90).nonzero()[0]
    if len(high_sim) > 0:
        for i in high_sim[:3]:
            t_orig = sub.iloc[test_idx[i]]
            tr_orig = sub.iloc[train_idx[sim_test_train[i].argmax()]]
            print(f"  High sim ({max_sim_test[i]:.3f}):")
            print(f"    Test : [{t_orig['department_label']}] {t_orig['complaint_text']}")
            print(f"    Train: [{tr_orig['department_label']}] {tr_orig['complaint_text']}")
