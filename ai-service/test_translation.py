import unittest
from unittest.mock import patch

from translation import detect_language, prepare_text


class FakeTokenizer:
    def __call__(self, text, **kwargs):
        return {"input_ids": FakeTokenIds(), "text": text}

    def decode(self, output, **kwargs):
        return "The drain is blocked near the school."


class FakeTokenIds:
    shape = (1, 8)


class FakeModel:
    def generate(self, **kwargs):
        return ["translated-output"]


class TranslationPreparationTests(unittest.TestCase):
    def test_english_is_passed_through_without_translation(self):
        text = "The drain is blocked near the school."
        result = prepare_text(text)
        self.assertEqual(result["source_language"], "en")
        self.assertEqual(result["analysis_text"], text)
        self.assertFalse(result["translation_used"])

    def test_devanagari_complaint_uses_translation_for_analysis(self):
        hindi = "स्कूल के पास नाली बंद है।"
        with patch("translation._load_model", return_value=(FakeTokenizer(), FakeModel())):
            result = prepare_text(hindi)
        self.assertEqual(result["source_language"], "hi")
        self.assertEqual(result["analysis_text"], "The drain is blocked near the school.")
        self.assertTrue(result["translation_used"])
        self.assertEqual(result["translation_model"], "Helsinki-NLP/opus-mt-hi-en")

    def test_english_and_devanagari_language_detection(self):
        self.assertEqual(detect_language("The road has a pothole."), "en")
        self.assertEqual(detect_language("सड़क पर गड्ढा है।"), "hi")


if __name__ == "__main__":
    unittest.main()
