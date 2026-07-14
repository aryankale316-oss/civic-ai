import re

# Deliberately a short, generic profanity list (common vulgarity), not a
# hate-speech/slur classifier — that's a different, more sensitive problem
# that would need its own careful review rather than a hardcoded list.
PROFANITY_WORDS = {
    "fuck", "fucking", "fucker", "shit", "bullshit", "asshole", "bastard",
    "bitch", "damn", "crap", "dick", "piss", "slut", "whore",
}

SPAM_PHRASES = [
    "click here", "buy now", "free money", "act now", "subscribe now",
    "limited time offer", "make money fast", "work from home", "viagra",
    "casino", "lottery winner", "congratulations you won",
]

URL_PATTERN = re.compile(r"https?://|www\.", re.IGNORECASE)
REPEATED_CHAR_PATTERN = re.compile(r"(.)\1{4,}")


def _tokenize(text):
    return re.findall(r"[a-zA-Z']+", text.lower())


def check_profanity(text):
    words = set(_tokenize(text))
    matches = sorted(words & PROFANITY_WORDS)
    return len(matches) > 0, matches


def check_spam(text):
    stripped = text.strip()
    signals = []
    score = 0.0

    if len(stripped) < 15:
        signals.append("too short to be a real complaint")
        score += 0.3

    letters = [c for c in stripped if c.isalpha()]
    if len(letters) >= 10:
        upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
        if upper_ratio > 0.7:
            signals.append("excessive capitalization")
            score += 0.2

    if REPEATED_CHAR_PATTERN.search(stripped):
        signals.append("repeated characters")
        score += 0.3

    if URL_PATTERN.search(stripped):
        signals.append("contains a link")
        score += 0.3

    non_alnum = sum(1 for c in stripped if not c.isalnum() and not c.isspace())
    if len(stripped) > 0 and non_alnum / len(stripped) > 0.5:
        signals.append("excessive symbols")
        score += 0.2

    lowered = stripped.lower()
    if any(phrase in lowered for phrase in SPAM_PHRASES):
        signals.append("promotional language")
        score += 0.4

    words = _tokenize(stripped)
    if len(words) >= 6:
        unique_ratio = len(set(words)) / len(words)
        if unique_ratio < 0.4:
            signals.append("repetitive text")
            score += 0.2

    score = min(score, 1.0)
    return score, signals


def moderate_text(text):
    is_profane, profanity_matches = check_profanity(text)
    spam_score, spam_signals = check_spam(text)
    return {
        "is_profane": is_profane,
        "profanity_matches": profanity_matches,
        "spam_score": round(spam_score, 2),
        "spam_signals": spam_signals,
        "is_likely_spam": spam_score >= 0.5,
    }
