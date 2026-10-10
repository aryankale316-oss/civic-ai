import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useLanguage } from '../context/LanguageContext';

export default function VoiceInputButton({ onTranscriptChange, onListeningChange, disabled }) {
  const { language, speechLocale, t } = useLanguage();
  const { isSupported, isListening, error, start, stop } = useSpeechRecognition({
    onTranscriptChange,
    onListeningChange,
    language: speechLocale,
  });

  if (!isSupported) return null;

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (isListening ? stop() : start())}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border transition-colors disabled:opacity-50 ${
          isListening
            ? 'bg-paper-warm dark:bg-board-line border-stamp-red text-stamp-red'
            : 'bg-white dark:bg-board border-paper-line dark:border-board-line text-ink-soft hover:border-brass'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-stamp-red animate-pulse' : 'bg-ink-soft'}`} />
        {isListening ? t('Listening… tap to stop') : t('Speak description')}
      </button>
      {error && <span className="text-xs text-stamp-red">{language === 'en' ? error : t(error)}</span>}
    </span>
  );
}
