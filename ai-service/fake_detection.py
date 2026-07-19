"""
Heuristic "does this text look like a genuine complaint" check. There is no
labeled fake/genuine dataset in this deployment, so this looks for surface
signals of gibberish/low-effort text (keyboard mashing, no real word shapes,
extreme repetition) rather than trying to judge truthfulness. Combined in the
backend with the existing spam score and duplicate/repeated-submission
detection (embedding-based, see backend/src/routes/complaints.js) into a
single fake_score.
"""
import re

MIN_WORDS_FOR_CHECK = 3

_WORD_PATTERN = re.compile(r"[a-zA-Z']+")
_CONSONANT_CLUSTER_PATTERN = re.compile(r"[^aeiou\s]{5,}")


def _tokenize(text):
    return _WORD_PATTERN.findall(text.lower())


def check_gibberish(text):
    words = _tokenize(text)
    reasons = []

    if len(words) < MIN_WORDS_FOR_CHECK:
        return 0.0, reasons  # too short to judge; the spam check already flags short text

    score = 0.0

    no_vowel_words = [w for w in words if len(w) > 2 and not re.search(r"[aeiou]", w)]
    if len(no_vowel_words) / len(words) > 0.25:
        reasons.append("many words contain no vowels")
        score += 0.4

    consonant_cluster_words = [w for w in words if _CONSONANT_CLUSTER_PATTERN.search(w)]
    if len(consonant_cluster_words) / len(words) > 0.2:
        reasons.append("unusual consonant clusters")
        score += 0.3

    avg_len = sum(len(w) for w in words) / len(words)
    if avg_len < 2.2 or avg_len > 14:
        reasons.append("unusual average word length")
        score += 0.2

    if len(words) >= 6:
        unique_ratio = len(set(words)) / len(words)
        if unique_ratio < 0.3:
            reasons.append("highly repetitive wording")
            score += 0.3

    return round(min(score, 1.0), 2), reasons
