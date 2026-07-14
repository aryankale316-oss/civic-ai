import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import apiClient from '../../api/client';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open && !loadedHistory) {
      apiClient
        .get('/chatbot/history')
        .then(({ data }) => {
          const hydrated = data.flatMap((row) => [
            { role: 'user', content: row.message },
            { role: 'bot', content: row.reply },
          ]);
          setMessages(hydrated);
        })
        .catch(() => {})
        .finally(() => setLoadedHistory(true));
    }
  }, [open, loadedHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setSending(true);

    const typingDelay = new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const [{ data }] = await Promise.all([apiClient.post('/chatbot/message', { message: text }), typingDelay]);
      setMessages((prev) => [...prev, { role: 'bot', content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', content: "Sorry, I couldn't process that — please try again." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="mb-3 w-80 sm:w-96 h-[28rem] bg-white dark:bg-board border border-paper-line dark:border-board-line flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-ink text-paper">
              <span className="text-sm font-display uppercase tracking-wide">Civic AI Assistant</span>
              <button onClick={() => setOpen(false)} className="text-paper/70 hover:text-paper text-sm" aria-label="Close chat">
                ✕
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {messages.length === 0 && !sending && (
                <p className="text-xs text-ink-soft text-center mt-4">
                  Ask me to track a complaint, explain departments, or guide you through submitting one.
                </p>
              )}
              {messages.map((m, i) => (
                <ChatMessage key={i} role={m.role} content={m.content} onNavigate={() => setOpen(false)} />
              ))}
              {sending && <TypingIndicator />}
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-paper-line dark:border-board-line p-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-1.5 text-sm border border-ink/30 dark:border-paper-line/30 bg-white dark:bg-board text-ink dark:text-paper focus:outline-none focus:ring-2 focus:ring-brass placeholder:text-ink-soft"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="px-3 py-1.5 text-sm bg-ink text-paper hover:bg-ink/90 transition-colors disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-ink text-paper text-2xl hover:bg-ink/90 flex items-center justify-center"
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
      >
        {open ? '✕' : '💬'}
      </motion.button>
    </div>
  );
}
