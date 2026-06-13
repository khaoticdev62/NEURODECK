import { useState, useCallback, useRef } from 'react';
import { listenBridge } from '../../../services/bridgeAdapter';
import { neurodeckApi } from '../../../services/bridgeAdapter';

export interface MentorMessage {
  role: 'student' | 'mentor';
  content: string;
}

interface UseMentorChatReturn {
  messages: MentorMessage[];
  streaming: boolean;
  streamBuffer: string;
  send: (question: string) => Promise<void>;
  clear: () => void;
}

export function useMentorChat(context: string): UseMentorChatReturn {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const activeRef = useRef(false);

  const send = useCallback(async (question: string) => {
    if (activeRef.current || !question.trim()) return;
    activeRef.current = true;

    const history = [...messages];
    setMessages((prev) => [...prev, { role: 'student', content: question }]);
    setStreaming(true);
    setStreamBuffer('');

    let accumulated = '';

    const unsubToken = listenBridge('mentor:token', (msg: unknown) => {
      const token = (msg as Record<string, string>)?.token ?? '';
      if (token) {
        accumulated += token;
        setStreamBuffer((prev) => prev + token);
      }
    });

    const cleanup = (finalContent: string) => {
      unsubToken();
      unsubDone();
      unsubError();
      if (finalContent) {
        setMessages((prev) => [...prev, { role: 'mentor', content: finalContent }]);
      }
      setStreamBuffer('');
      setStreaming(false);
      activeRef.current = false;
    };

    const unsubDone = listenBridge('mentor:done', () => {
      cleanup(accumulated);
    });

    const unsubError = listenBridge('mentor:error', (msg: unknown) => {
      const err = (msg as Record<string, string>)?.error ?? 'Mentor unavailable';
      cleanup(`⚠ ${err}`);
    });

    try {
      await neurodeckApi.academy.mentorQuery({
        context,
        question,
        history: history.map((m) => ({ role: m.role, content: m.content })),
      });
    } catch {
      cleanup('⚠ Could not reach Alex — make sure the sidecar is running.');
    }
  }, [context, messages]);

  const clear = useCallback(() => {
    setMessages([]);
    setStreamBuffer('');
  }, []);

  return { messages, streaming, streamBuffer, send, clear };
}
