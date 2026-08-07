// src/app/components/VisionChat.tsx
// AI chat panel Ã¢â‚¬â€ works as general gaming chat + image-aware mode
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';
import { apiVisionChat, isVisionProviderId, VISION_PROVIDER_STORAGE_KEY, type VisionProviderId, type VisionResult, type ChatMessage } from '../lib/api';

interface VisionChatProps {
  visionResult: VisionResult | null;
  provider?: VisionProviderId;
}

const GENERAL_SUGGESTIONS = [
  'What CS2 skins are trending?',
  'How do I level up fast in Valorant?',
  'Best games to buy this month?',
  'How does skin trading work on Steam?',
];

const IMAGE_SUGGESTIONS = [
  'What is this worth?',
  'Is this a good account to buy?',
  'How do I trade this?',
  'Tell me more about this item.',
];

export function VisionChat({ visionResult, provider }: VisionChatProps) {
  const hasContext = visionResult?.detected === true;

  const welcomeMsg: ChatMessage = {
    role: 'assistant',
    content: hasContext
      ? `I've analyzed your screenshot Ã¢â‚¬â€ it looks like a **${visionResult!.game}** ${visionResult!.type ?? 'screenshot'}${visionResult!.item ? ` (${visionResult!.item})` : ''}. Ask me anything about it!`
      : "Hi! I'm your gaming assistant. Upload a screenshot for image analysis, or just ask me anything about games, skins, trading, or pricing.",
  };

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMsg]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // When a new image is analyzed, prepend a context message instead of resetting
  const prevResultRef = useRef<VisionResult | null>(null);
  useEffect(() => {
    if (!visionResult || visionResult === prevResultRef.current) return;
    prevResultRef.current = visionResult;

    const intro: ChatMessage = {
      role: 'assistant',
      content: visionResult.detected
        ? `I've analyzed your screenshot Ã¢â‚¬â€ **${visionResult.game}** ${visionResult.type ?? ''}${visionResult.item ? ` Ã‚Â· ${visionResult.item}` : ''}. What would you like to know?`
        : `I couldn't detect a game in that screenshot. ${visionResult.description} Ask me anything!`,
    };
    setMessages(prev => [...prev, intro]);
    setInput('');
  }, [visionResult]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const saved = localStorage.getItem(VISION_PROVIDER_STORAGE_KEY);
      const storedProvider = saved && isVisionProviderId(saved) ? saved : undefined;
      const { reply } = await apiVisionChat(
        trimmed,
        visionResult,
        messages,
        provider ?? storedProvider,
      );
      setMessages([...nextHistory, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...nextHistory, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const suggestions = hasContext ? IMAGE_SUGGESTIONS : GENERAL_SUGGESTIONS;
  const showSuggestions = messages.length <= 2;

  return (
    <div
      className="vision-chat-panel flex flex-col rounded-3xl border overflow-hidden"
      style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface)', minHeight: 480, height: '100%' }}
    >
      {/* Header */}
      <div className="vision-chat-header flex items-center gap-3 px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--gs-border)' }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(59,130,246,0.12)' }}
        >
          <Bot className="size-4" style={{ color: 'var(--gs-accent)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--gs-text)' }}>AI Gaming Assistant</p>
          <p className="text-[11px] truncate" style={{ color: 'var(--gs-faint)' }}>
            {hasContext
              ? `Context: ${visionResult!.game} Ã‚Â· ${visionResult!.type}`
              : 'General chat Ã‚Â· upload a screenshot to add image context'}
          </p>
        </div>
        {hasContext && (
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[11px]" style={{ color: 'var(--gs-faint)' }}>Image loaded</span>
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {msg.role === 'assistant' && (
              <div
                className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5"
                style={{ background: 'rgba(59,130,246,0.12)' }}
              >
                <Bot className="size-3.5" style={{ color: 'var(--gs-accent)' }} />
              </div>
            )}
            <div
              className="max-w-[82%] text-sm px-3.5 py-2.5 rounded-2xl leading-relaxed"
              style={
                msg.role === 'user'
                  ? { background: 'var(--gs-accent)', color: 'var(--gs-accent-fg, #071008)' , borderBottomRightRadius: 6 }
                  : { background: 'var(--gs-surface-2, #eef3fb)', color: 'var(--gs-text)', borderBottomLeftRadius: 6 }
              }
            >
              {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, pi) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={pi}>{part.slice(2, -2)}</strong>
                  : <span key={pi}>{part}</span>
              )}
            </div>
          </div>
        ))}

        {/* Typing dots */}
        {loading && (
          <div className="flex gap-2.5">
            <div
              className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.12)' }}
            >
              <Bot className="size-3.5" style={{ color: 'var(--gs-accent)' }} />
            </div>
            <div
              className="px-3.5 py-2.5 rounded-2xl flex items-center gap-1"
              style={{ background: 'var(--gs-surface-2, #eef3fb)', borderBottomLeftRadius: 6 }}
            >
              {[0, 1, 2].map(d => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full gg-thinking-dot"
                  style={{ background: 'var(--gs-faint)', animationDelay: `${d * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {showSuggestions && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              disabled={loading}
              className="text-xs px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50"
              style={{ borderColor: 'var(--gs-border)', color: 'var(--gs-muted)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--gs-surface-2, #eef3fb)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-1 border-t shrink-0" style={{ borderColor: 'var(--gs-border)' }}>
        <div
          className="flex items-end gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-bg, #f4f6f9)' }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasContext ? 'Ask about this screenshotÃ¢â‚¬Â¦' : 'Ask me anything about gamingÃ¢â‚¬Â¦'}
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-sm"
            style={{ color: 'var(--gs-text)', maxHeight: 120, lineHeight: '1.5' }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: 'var(--gs-accent)', color: 'var(--gs-accent-fg, #071008)'  }}
          >
            <Send className="size-3.5" />
          </button>
        </div>
        <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--gs-faint)' }}>
          Enter to send Ã‚Â· Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
