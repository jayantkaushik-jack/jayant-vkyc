import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { cn } from '@vkyc/shared/lib/cn';
import { useOpsAssistant } from '@admin/features/admin/ops/OpsAssistantContext';
import { getSuggestedQuestions } from '@admin/features/admin/ops/opsAssistant';

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-text-muted/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export function OpsAssistant() {
  const { open, messages, typing, toggle, close, send } = useOpsAssistant();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => getSuggestedQuestions(), []);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing, open]);

  const submit = (text: string) => {
    send(text);
    setInput('');
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close assistant overlay"
          className="fixed inset-0 z-[88] bg-black/20 backdrop-blur-[1px]"
          onClick={close}
        />
      )}
      {open && (
        <aside className="fixed right-0 top-0 bottom-0 z-[89] w-[400px] max-w-[95vw] flex flex-col bg-surface border-l border-border shadow-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-white">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
              </span>
              <span className="font-semibold text-sm">Operations Assistant</span>
            </div>
            <button type="button" onClick={close} aria-label="Close assistant" className="hover:opacity-80">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug whitespace-pre-wrap',
                      m.role === 'user'
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-bg text-text border border-border rounded-bl-sm',
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="bg-bg border border-border rounded-2xl rounded-bl-sm">
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border p-3 space-y-2 bg-surface">
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => submit(q)}
                    className="text-left text-[11px] px-2 py-1 rounded-full border border-border text-text-muted hover:bg-primary-soft hover:text-primary transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); submit(input); }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about stats or an agent…"
                  className="flex-1 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="submit"
                  aria-label="Send"
                  className="p-2 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-40"
                  disabled={!input.trim()}
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </aside>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label="Ops Assistant"
        className="group fixed bottom-6 right-6 z-[90] flex items-center gap-2 h-14 rounded-full bg-primary text-white shadow-card hover:bg-primary-hover transition-all px-4"
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
        {!open && (
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[140px] transition-all duration-300 text-sm font-medium">
            Ops Assistant
          </span>
        )}
      </button>
    </>
  );
}
