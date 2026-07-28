import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

const ERROR_MESSAGES = {
  'not-allowed': 'Microphone access denied',
  'service-not-allowed': 'Microphone access denied',
  'audio-capture': 'No microphone found',
  'no-speech': "Didn't catch that — try again",
  network: 'No connection to the speech recognition service',
  'language-not-supported': 'Language not supported',
  'bad-grammar': 'Speech recognition error',
};

/**
 * Thin wrapper around the browser's Web Speech API. Callbacks are held in
 * refs so the underlying SpeechRecognition instance is created once and
 * isn't torn down/rebuilt on every parent re-render (which would otherwise
 * interrupt an in-progress recording).
 */
export function useSpeechRecognition({ onTranscriptChange, onListeningChange } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const onListeningChangeRef = useRef(onListeningChange);

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
    onListeningChangeRef.current = onListeningChange;
  }, [onTranscriptChange, onListeningChange]);

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      onTranscriptChangeRef.current?.(transcript);
    };

    recognition.onerror = (event) => {
      // 'aborted' fires when stop() is called intentionally (e.g. Chrome mid-utterance) —
      // not a real failure, so don't surface it as an error.
      if (event.error !== 'aborted') {
        setError(ERROR_MESSAGES[event.error] || `Speech recognition error (${event.error})`);
      }
      setIsListening(false);
      onListeningChangeRef.current?.(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      onListeningChangeRef.current?.(false);
    };

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setError('');
    try {
      recognitionRef.current.start();
      setIsListening(true);
      onListeningChangeRef.current?.(true);
    } catch {
      // Already running; ignore.
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { isSupported: !!SpeechRecognitionAPI, isListening, error, start, stop };
}
