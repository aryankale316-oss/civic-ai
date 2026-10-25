import sys
import os
import json
import unicodedata
import pandas as pd
import numpy as np

# Ensure UTF-8 output in Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

CSV_PATH = r"C:\Users\rushi\civic-ai\civic_complaints_en_hi_encoding_fixed.csv"

def inspect():
    print("=" * 60)
    print("TASK 1: DATASET INSPECTION & INTEGRITY AUDIT")
    print("=" * 60)
    
    # Check encoding & delimiter
    with open(CSV_PATH, "rb") as f:
        first_bytes = f.read(16)
        has_bom = first_bytes.startswith(b"\xef\xbb\xbf")
    print(f"File path: {CSV_PATH}")
    print(f"File size: {os.path.getsize(CSV_PATH):,} bytes")
    print(f"Has UTF-8 BOM: {has_bom}")
    encoding = "utf-8-sig" if has_bom else "utf-8"
    
    df = pd.read_csv(CSV_PATH, encoding=encoding)
    print(f"Loaded successfully with encoding: {encoding}, delimiter: comma (',')")
    print(f"Total Rows: {len(df)}")
    print(f"Total Columns: {len(df.columns)}")
    print(f"Columns: {list(df.columns)}")
    
    print("\n--- Missing / Null Values per Column ---")
    null_counts = df.isnull().sum()
    for col, count in null_counts.items():
        pct = (count / len(df)) * 100
        print(f"  {col}: {count} missing ({pct:.1f}%)")
        
    print("\n--- Core Column Identification ---")
    print("  Complaint Text Column : 'complaint_text'")
    print("  Department Label Col : 'department_label'")
    print("  Language Column       : 'language'")
    print("  Script Column         : 'script'")
    print("  Issue Label Column    : 'issue_label'")
    print("  Group Columns         : 'split_group', 'pair_group_id'")
    print("  Existing Split Column : 'split'")
    
    print("\n--- Department Label Value Counts ---")
    dept_counts = df['department_label'].value_counts(dropna=False)
    for dept, cnt in dept_counts.items():
        print(f"  {dept}: {cnt}")
        
    print("\n--- Language Value Counts ---")
    lang_counts = df['language'].value_counts(dropna=False)
    for lang, cnt in lang_counts.items():
        print(f"  {lang}: {cnt}")

    print("\n--- Script Value Counts ---")
    script_counts = df['script'].value_counts(dropna=False)
    for sc, cnt in script_counts.items():
        print(f"  {sc}: {cnt}")

    print("\n--- Source Type & Review Status ---")
    print(df['source_type'].value_counts(dropna=False).to_dict())
    print(df['review_status'].value_counts(dropna=False).to_dict())

    print("\n--- Cross-tabulation: Department x Language ---")
    crosstab = pd.crosstab(df['department_label'], df['language'])
    print(crosstab)

    # Unicode & Mojibake Check
    print("\n--- Unicode & Hindi Script Integrity Check ---")
    hi_df = df[df['language'] == 'hi']
    en_df = df[df['language'] == 'en']
    
    devanagari_chars = 0
    total_hi_chars = 0
    has_replacement_char = False
    
    for text in hi_df['complaint_text']:
        if '\ufffd' in text:
            has_replacement_char = True
        for ch in text:
            if not ch.isspace() and not unicodedata.category(ch).startswith('P'):
                total_hi_chars += 1
                # Devanagari unicode block: U+0900 to U+097F
                if '\u0900' <= ch <= '\u097f':
                    devanagari_chars += 1
                    
    dev_pct = (devanagari_chars / total_hi_chars * 100) if total_hi_chars > 0 else 0
    print(f"  Hindi complaints checked: {len(hi_df)}")
    print(f"  Devanagari characters: {devanagari_chars:,} / {total_hi_chars:,} non-punctuation ({dev_pct:.2f}%)")
    print(f"  Presence of replacement char (\\ufffd): {has_replacement_char}")
    
    # Text length & empty checks
    print("\n--- Text Length & Empty/Near-Empty Check ---")
    df['text_len'] = df['complaint_text'].astype(str).str.strip().str.len()
    df['word_count'] = df['complaint_text'].astype(str).str.strip().str.split().str.len()
    
    short_rows = df[df['text_len'] < 10]
    print(f"  Rows with stripped length < 10 chars: {len(short_rows)}")
    print(f"  Min character length: {df['text_len'].min()}")
    print(f"  Max character length: {df['text_len'].max()}")
    print(f"  Median character length: {df['text_len'].median():.1f}")
    print(f"  Median word count: {df['word_count'].median():.1f}")

    # Duplicates Analysis
    print("\n--- Duplicate Text Analysis ---")
    exact_dups = df[df.duplicated(subset=['complaint_text'], keep=False)]
    print(f"  Total rows involved in exact string duplicates: {len(exact_dups)}")
    
    df['norm_text'] = df['complaint_text'].astype(str).str.strip().str.lower()
    norm_dups = df[df.duplicated(subset=['norm_text'], keep=False)]
    print(f"  Total rows involved in normalized (lower+stripped) duplicates: {len(norm_dups)}")

    # Check for label conflicts (same text, different department)
    label_conflicts = df.groupby('norm_text')['department_label'].nunique()
    conflicting_texts = label_conflicts[label_conflicts > 1]
    print(f"  Normalized texts associated with multiple different department labels: {len(conflicting_texts)}")

    # Existing split analysis
    print("\n--- Existing Split Analysis & Leakage Check ---")
    print("Existing split distribution:")
    print(df['split'].value_counts())
    
    print("\nExisting split x Language:")
    print(pd.crosstab(df['split'], df['language']))
    
    print("\nExisting split x Department:")
    print(pd.crosstab(df['department_label'], df['split']))

    # Check split_group mechanics
    print("\nSplit Group Analysis:")
    print(f"  Total unique split_groups: {df['split_group'].nunique()}")
    split_group_splits = df.groupby('split_group')['split'].nunique()
    leaking_groups = split_group_splits[split_group_splits > 1]
    print(f"  Split groups spanning multiple splits (train/val/test leakage): {len(leaking_groups)}")
    
    # Check if exact/norm texts appear in multiple splits
    text_splits = df.groupby('norm_text')['split'].nunique()
    leaking_texts = text_splits[text_splits > 1]
    print(f"  Normalized complaint texts appearing across multiple splits: {len(leaking_texts)}")

    # Check pair_group_id
    pair_nonnull = df[df['pair_group_id'].notnull()]
    print(f"  Rows with non-null pair_group_id: {len(pair_nonnull)} (across {pair_nonnull['pair_group_id'].nunique()} pairs)")
    pair_splits = pair_nonnull.groupby('pair_group_id')['split'].nunique()
    leaking_pairs = pair_splits[pair_splits > 1]
    print(f"  Pair groups spanning multiple splits: {len(leaking_pairs)}")

    # Sample rows for each department and language
    print("\n--- Sample Complaints (2 per department: 1 EN, 1 HI) ---")
    for dept in sorted(df['department_label'].unique()):
        print(f"\n[Department: {dept}]")
        en_sample = df[(df['department_label'] == dept) & (df['language'] == 'en')].iloc[0]
        hi_sample = df[(df['department_label'] == dept) & (df['language'] == 'hi')].iloc[0]
        print(f"  (EN - id: {en_sample['record_id']}) {en_sample['complaint_text']}")
        print(f"  (HI - id: {hi_sample['record_id']}) {hi_sample['complaint_text']}")

if __name__ == "__main__":
    inspect()
