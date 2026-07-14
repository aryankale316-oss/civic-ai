import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

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
      setError(event.error === 'not-allowed' ? 'Microphone access denied' : 'Speech recognition error');
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
