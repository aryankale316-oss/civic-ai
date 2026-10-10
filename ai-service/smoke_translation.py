"""Run one real Hindi-to-English translation (downloads model weights if needed)."""

import sys

from translation import prepare_text, translate_text


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    result = prepare_text("स्कूल के पास नाली बंद है और सड़क पर पानी जमा है।")
    print(f"Detected language: {result['source_language']}")
    print(f"Translation used: {result['translation_used']}")
    print(f"Analysis text: {result['analysis_text']}")
    print(f"Note: {result['translation_note']}")
    if not result["translation_used"]:
        raise SystemExit("Hindi translation did not run successfully")

    hindi_reply = translate_text("The drain is blocked near the school.", "en", "hi")
    print(f"English-to-Hindi chatbot reply: {hindi_reply}")
    if not any("\u0900" <= character <= "\u097f" for character in hindi_reply):
        raise SystemExit("English-to-Hindi translation did not return Devanagari text")
