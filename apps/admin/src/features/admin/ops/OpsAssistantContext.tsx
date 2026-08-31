import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { answerOpsQuestion } from '@admin/features/admin/ops/opsAssistant';

export interface OpsMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface OpsAssistantValue {
  open: boolean;
  messages: OpsMessage[];
  typing: boolean;
  toggle: () => void;
  close: () => void;
  send: (text: string) => void;
}

const GREETING: OpsMessage = {
  id: 'greeting',
  role: 'assistant',
  text:
    "Hello! I'm your Operations Assistant. I can help you with real-time stats and agent "
    + 'performance. What would you like to know?',
};

const OpsAssistantContext = createContext<OpsAssistantValue | null>(null);

export function OpsAssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<OpsMessage[]>([GREETING]);
  const [typing, setTyping] = useState(false);
  const counter = useRef(0);

  const nextId = () => `msg-${counter.current++}`;

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: trimmed }]);
    setTyping(true);

    const answer = answerOpsQuestion(trimmed);
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: answer }]);
      setTyping(false);
    }, 1000);
  }, []);

  const toggle = useCallback(() => setOpen((o) => !o), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <OpsAssistantContext.Provider value={{ open, messages, typing, toggle, close, send }}>
      {children}
    </OpsAssistantContext.Provider>
  );
}

export function useOpsAssistant(): OpsAssistantValue {
  const ctx = useContext(OpsAssistantContext);
  if (!ctx) throw new Error('useOpsAssistant must be used within OpsAssistantProvider');
  return ctx;
}
