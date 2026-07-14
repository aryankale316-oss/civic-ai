import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';

function ChatLink({ href, children, onNavigate }) {
  const navigate = useNavigate();
  const isInternal = href?.startsWith('/');

  return (
    <a
      href={href}
      target={isInternal ? undefined : '_blank'}
      rel={isInternal ? undefined : 'noreferrer'}
      className="underline text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
      onClick={(e) => {
        if (!isInternal) return;
        e.preventDefault();
        onNavigate?.();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}

export default function ChatMessage({ role, content, onNavigate }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose-chat">
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <ChatLink href={href} onNavigate={onNavigate}>
                    {children}
                  </ChatLink>
                ),
                p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                code: ({ children }) => (
                  <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-600 font-mono text-xs">{children}</code>
                ),
                pre: ({ children }) => (
                  <pre className="p-2 rounded bg-slate-800 dark:bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto mb-1.5">
                    {children}
                  </pre>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
