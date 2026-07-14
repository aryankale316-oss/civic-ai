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
            className="mb-3 w-80 sm:w-96 h-[28rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white">
              <span className="text-sm font-medium">Civic AI Assistant</span>
              <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-white text-sm" aria-label="Close chat">
                ✕
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {messages.length === 0 && !sending && (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-4">
                  Ask me to track a complaint, explain departments, or guide you through submitting one.
                </p>
              )}
              {messages.map((m, i) => (
                <ChatMessage key={i} role={m.role} content={m.content} onNavigate={() => setOpen(false)} />
              ))}
              {sending && <TypingIndicator />}
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-700 p-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
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
        className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl shadow-lg shadow-blue-600/30 hover:opacity-90 flex items-center justify-center"
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
      >
        {open ? '✕' : '💬'}
      </motion.button>
    </div>
  );
}
