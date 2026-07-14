import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
import joblib
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "seed_complaints.csv")
MODEL_PATH = os.path.join(BASE_DIR, "model.joblib")


def train():
    df = pd.read_csv(DATA_PATH)

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, stop_words="english")),
        ("clf", LogisticRegression(max_iter=1000)),
    ])
    pipeline.fit(df["text"], df["category"])

    joblib.dump(pipeline, MODEL_PATH)
    print(f"Trained on {len(df)} examples across {df['category'].nunique()} categories.")
    print(f"Model saved to {MODEL_PATH}")


if __name__ == "__main__":
    train()
