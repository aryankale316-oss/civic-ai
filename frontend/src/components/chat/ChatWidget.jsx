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
    <div className="fixed bottom-6 right-6 z-[1200]">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="mb-3 flex h-[30rem] w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-paper-line bg-white shadow-xl dark:border-board-line dark:bg-board sm:w-96"
          >
            <div className="flex items-center justify-between bg-civic px-4 py-3 text-white">
              <div><span className="text-sm font-semibold">Civic AI Assistant</span><p className="text-[10px] text-white/75">Automated process support</p></div>
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
                className="flex-1 rounded-md border border-paper-line bg-white px-3 py-2 text-sm text-ink focus:border-civic focus:outline-none focus:ring-2 focus:ring-civic/15 dark:border-board-line dark:bg-board-line dark:text-paper"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="rounded-md bg-civic px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-civic-bright disabled:opacity-50"
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
        className="flex h-14 w-14 items-center justify-center rounded-full bg-civic text-2xl text-white shadow-lg hover:bg-civic-bright"
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
      >
        {open ? '✕' : '💬'}
      </motion.button>
    </div>
  );
}
