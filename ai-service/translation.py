"""Local language detection and Hindi-to-English text preparation.

Original complaint text is stored by the backend. This module only creates an
English copy for the existing English-oriented analysis models.
"""

import re
import threading

_HINDI_SCRIPT = re.compile(r"[\u0900-\u097f]")
_model_lock = threading.Lock()
_models = {}

_MODEL_NAMES = {
    ("hi", "en"): "Helsinki-NLP/opus-mt-hi-en",
    ("en", "hi"): "Helsinki-NLP/opus-mt-en-hi",
}


def detect_language(text: str) -> str:
    """Detect Devanagari-script input as Hindi; otherwise use English."""
    return "hi" if _HINDI_SCRIPT.search(text or "") else "en"


def _load_model(source_language: str, target_language: str):
    key = (source_language, target_language)
    if key not in _models:
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        model_name = _MODEL_NAMES[key]
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        model.eval()
        _models[key] = (tokenizer, model)
    return _models[key]


def translate_text(text: str, source_language: str, target_language: str) -> str:
    if source_language == target_language or not (text or "").strip():
        return text
    key = (source_language, target_language)
    if key not in _MODEL_NAMES:
        raise ValueError("Unsupported translation direction")

    import torch

    with _model_lock:
        tokenizer, model = _load_model(source_language, target_language)
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        with torch.inference_mode():
            output = model.generate(**inputs, max_new_tokens=512)
        translated = tokenizer.decode(output[0], skip_special_tokens=True).strip()

    if not translated:
        raise ValueError("The translation model returned empty text")
    return translated


def prepare_text(text: str) -> dict:
    """Return analysis text plus explicit metadata; never replace source text."""
    source_language = detect_language(text)
    if source_language == "en" or not (text or "").strip():
        return {
            "source_language": source_language,
            "analysis_text": text,
            "translation_used": False,
            "translation_model": None,
            "translation_note": "English text analyzed directly.",
            "translation_available": True,
        }

    try:
        translated = translate_text(text, "hi", "en")
        return {
            "source_language": "hi",
            "analysis_text": translated,
            "translation_used": True,
            "translation_model": _MODEL_NAMES[("hi", "en")],
            "translation_note": "Experimental Hindi-to-English translation; civic terms may be mistranslated, so staff must review all AI results.",
            "translation_available": True,
        }
    except Exception as error:
        # Keep complaint submission available if the model cannot be downloaded
        # or loaded, but make the unsupported analysis state explicit.
        return {
            "source_language": "hi",
            "analysis_text": text,
            "translation_used": False,
            "translation_model": _MODEL_NAMES[("hi", "en")],
            "translation_note": f"Hindi translation unavailable; AI text analysis may be unreliable ({type(error).__name__}).",
            "translation_available": False,
        }
