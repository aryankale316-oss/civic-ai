import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

export default function VoiceInputButton({ onTranscriptChange, onListeningChange, disabled }) {
  const { isSupported, isListening, error, start, stop } = useSpeechRecognition({
    onTranscriptChange,
    onListeningChange,
  });

  if (!isSupported) return null;

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (isListening ? stop() : start())}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 ${
          isListening
            ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400'
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'}`} />
        {isListening ? 'Listening… tap to stop' : 'Speak description'}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}
