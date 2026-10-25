import sys
import os
import json
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report

sys.stdout.reconfigure(encoding='utf-8')
CSV_PATH = r"C:\Users\rushi\civic-ai\civic_complaints_en_hi_encoding_fixed.csv"

df = pd.read_csv(CSV_PATH, encoding='utf-8-sig')

train_df = df[df['split'] == 'train'].copy().reset_index(drop=True)
val_df = df[df['split'] == 'validation'].copy().reset_index(drop=True)

print(f"Training rows: {len(train_df)}")
print(f"Validation rows: {len(val_df)}")

# Define candidate pipelines
def build_word_char_union():
    return FeatureUnion([
        ('word', TfidfVectorizer(
            analyzer='word',
            ngram_range=(1, 2),
            min_df=2,
            sublinear_tf=True
        )),
        ('char', TfidfVectorizer(
            analyzer='char_wb',
            ngram_range=(3, 5),
            min_df=3,
            sublinear_tf=True
        ))
    ])

def build_word_only():
    return TfidfVectorizer(
        analyzer='word',
        ngram_range=(1, 2),
        min_df=2,
        sublinear_tf=True
    )

candidates = {
    "LogReg_WordOnly": Pipeline([
        ('tfidf', build_word_only()),
        ('clf', LogisticRegression(C=1.0, max_iter=1000, random_state=42))
    ]),
    "LogReg_WordChar": Pipeline([
        ('tfidf', build_word_char_union()),
        ('clf', LogisticRegression(C=1.0, max_iter=1000, random_state=42))
    ]),
    "LinearSVC_WordOnly": Pipeline([
        ('tfidf', build_word_only()),
        ('clf', LinearSVC(C=1.0, max_iter=2000, random_state=42))
    ]),
    "LinearSVC_WordChar": Pipeline([
        ('tfidf', build_word_char_union()),
        ('clf', LinearSVC(C=1.0, max_iter=2000, random_state=42))
    ]),
    "LinearSVC_WordChar_C05": Pipeline([
        ('tfidf', build_word_char_union()),
        ('clf', LinearSVC(C=0.5, max_iter=2000, random_state=42))
    ]),
    "LogReg_WordChar_C2": Pipeline([
        ('tfidf', build_word_char_union()),
        ('clf', LogisticRegression(C=2.0, max_iter=1000, random_state=42))
    ]),
}

results = []

for name, pipe in candidates.items():
    print(f"\n--- Training {name} ---")
    pipe.fit(train_df['complaint_text'], train_df['department_label'])
    
    # Overall Validation
    y_pred_val = pipe.predict(val_df['complaint_text'])
    acc = accuracy_score(val_df['department_label'], y_pred_val)
    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(
        val_df['department_label'], y_pred_val, average='macro', zero_division=0
    )
    p_wt, r_wt, f1_wt, _ = precision_recall_fscore_support(
        val_df['department_label'], y_pred_val, average='weighted', zero_division=0
    )
    
    # Validation by Language
    val_en = val_df[val_df['language'] == 'en']
    val_hi = val_df[val_df['language'] == 'hi']
    
    y_pred_en = pipe.predict(val_en['complaint_text'])
    acc_en = accuracy_score(val_en['department_label'], y_pred_en)
    _, _, f1_en, _ = precision_recall_fscore_support(
        val_en['department_label'], y_pred_en, average='macro', zero_division=0
    )
    
    y_pred_hi = pipe.predict(val_hi['complaint_text'])
    acc_hi = accuracy_score(val_hi['department_label'], y_pred_hi)
    _, _, f1_hi, _ = precision_recall_fscore_support(
        val_hi['department_label'], y_pred_hi, average='macro', zero_division=0
    )
    
    print(f"  Val Overall Acc: {acc:.4f} | Macro-F1: {f1_macro:.4f} | Weighted-F1: {f1_wt:.4f}")
    print(f"  Val EN Acc: {acc_en:.4f} | Macro-F1: {f1_en:.4f}")
    print(f"  Val HI Acc: {acc_hi:.4f} | Macro-F1: {f1_hi:.4f}")
    
    results.append({
        "Model": name,
        "Val_Acc": acc,
        "Val_Macro_F1": f1_macro,
        "Val_Weighted_F1": f1_wt,
        "Val_EN_Acc": acc_en,
        "Val_EN_Macro_F1": f1_en,
        "Val_HI_Acc": acc_hi,
        "Val_HI_Macro_F1": f1_hi
    })

res_df = pd.DataFrame(results).sort_values(by="Val_Macro_F1", ascending=False)
print("\n=== Validation Comparison Summary ===")
print(res_df.to_string(index=False))
