import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ChatTableRow {
  name: string;
  city: string;
  status: string;
  services: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  rows?: ChatTableRow[];
  columns?: string[];
  count?: number;
}

const SUGGESTIONS = [
  'Summarize churn risk across canceled accounts',
  'Which accounts are Full Service?',
  'List accounts with no visit logged yet',
];

export default function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    const history = [...messages, { role: 'user' as const, text }];
    setMessages(history);
    setInput('');
    setThinking(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { messages: history.map((m) => ({ role: m.role, content: m.text })) },
      });
      setThinking(false);
      if (error) {
        setMessages((m) => [...m, { role: 'assistant', text: `Request failed: ${error.message}` }]);
        return;
      }
      if (data?.notConfigured) {
        setNotConfigured(true);
        return;
      }
      setMessages((m) => [...m, {
        role: 'assistant',
        text: data?.text || 'No response.',
        rows: data?.rows,
        columns: data?.columns,
        count: data?.count,
      }]);
    } catch (e) {
      setThinking(false);
      setMessages((m) => [...m, { role: 'assistant', text: 'Could not reach the chat service. Please try again.' }]);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          {notConfigured && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Chat isn't connected yet — add an ANTHROPIC_API_KEY secret to enable real answers.</span>
            </div>
          )}

          {messages.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <Sparkles className="w-8 h-8 mx-auto text-primary" />
              <h2 className="text-xl font-semibold">Ask about your accounts</h2>
              <p className="text-sm text-muted-foreground">
                Ask about accounts, territories, churn, or routes.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
              >
                {m.text}
              </div>

              {!!m.rows?.length && (
                <div className="mt-2 w-full border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-[28%]" />
                      <col className="w-[18%]" />
                      <col className="w-[14%]" />
                      <col className="w-[40%]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-muted/70 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        {(m.columns || ['Name', 'City', 'Status', 'Services']).map((col) => (
                          <th key={col} className="text-left px-3 py-2 font-medium">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {m.rows.map((row, ri) => (
                        <tr key={ri} className="border-t border-border">
                          <td className="px-3 py-2 break-words">{row.name}</td>
                          <td className="px-3 py-2 text-muted-foreground break-words">{row.city}</td>
                          <td className="px-3 py-2 text-muted-foreground break-words">{row.status}</td>
                          <td className="px-3 py-2 text-muted-foreground break-words">{row.services}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {typeof m.count === 'number' && m.count > m.rows.length && (
                    <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/40 border-t border-border">
                      Showing {m.rows.length} of {m.count} total
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {thinking && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-xl px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Thinking…
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about accounts, territories, churn or routes…"
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button size="icon" className="h-11 w-11 flex-shrink-0" disabled={thinking || !input.trim()} onClick={() => send(input)}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
