import { useState, useRef, useEffect } from 'react';
import { Send, X, Minus, MessageSquare, Loader2 } from 'lucide-react';
import { apiChat } from '../lib/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatBotProps {
  contextGame?: string | null;
  onClose?: () => void;
}

export function ChatBot({ contextGame, onClose }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (contextGame) {
      setMessages([{
        id: Date.now().toString(),
        text: `Loaded up ${contextGame}. Ask me anything — weapon stats, skin prices, best loadouts, tips. Go.`,
        sender: 'bot', timestamp: new Date(),
      }]);
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [contextGame]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: '0',
        text: "Hey — ask me anything. Weapon stats, skin prices, best loadouts. I've got you.",
        sender: 'bot', timestamp: new Date(),
      }]);
    }
  }, [isOpen]);

  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const userText = inputValue.trim();
    const newMsg: Message = { id: Date.now().toString(), text: userText, sender: 'user', timestamp: new Date() };
    
    const newMessages = [...messages, newMsg];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Send the chat history + context game to the backend API
      const res = await apiChat(newMessages, contextGame);
      setMessages(p => [...p, { id: (Date.now() + 1).toString(), text: res.text, sender: 'bot', timestamp: new Date() }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(p => [...p, { id: (Date.now() + 1).toString(), text: "Sorry, I'm having trouble connecting right now. Make sure the API key is set in `server/.env` and the server is running.", sender: 'bot', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  function handleClose() { setIsOpen(false); onClose?.(); }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-gs-accent text-gs-accent-fg shadow-lg hover:opacity-90 transition-all duration-200 flex items-center justify-center z-50 accent-glow"
      >
        <MessageSquare className="size-5" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 bg-gs-surface rounded-2xl shadow-2xl flex flex-col z-50 border border-gs-border overflow-hidden transition-all duration-200"
      style={{ width: '22rem', height: isMinimized ? 'auto' : '560px', boxShadow: '0 0 40px var(--gs-glow), 0 24px 48px rgba(0,0,0,0.4)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gs-border shrink-0"
        style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--gs-accent) 12%, var(--gs-surface)), var(--gs-surface))' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gs-accent/20 flex items-center justify-center">
            <MessageSquare className="size-3.5 text-gs-accent" />
          </div>
          <div>
            <p className="text-gs-text leading-none mb-0.5" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              GameGuide AI{contextGame ? <span className="text-gs-accent"> · {contextGame}</span> : ''}
            </p>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              <p className="text-[10px] text-gs-faint leading-none">Online</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setIsMinimized(!isMinimized)} className="text-gs-faint hover:text-gs-muted transition-colors p-1.5 rounded-lg hover:bg-gs-surface-2">
            <Minus className="size-3.5" />
          </button>
          <button onClick={handleClose} className="text-gs-faint hover:text-gs-muted transition-colors p-1.5 rounded-lg hover:bg-gs-surface-2">
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gs-bg">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 ${
                  message.sender === 'user'
                    ? 'bg-gs-accent text-gs-accent-fg rounded-br-sm'
                    : 'bg-gs-surface text-gs-text border border-gs-border rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-line text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: message.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
                  <span className="text-[10px] mt-1 block opacity-40">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[84%] rounded-2xl px-4 py-3 bg-gs-surface text-gs-text border border-gs-border rounded-bl-sm flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-gs-accent" />
                  <span className="text-xs text-gs-faint">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gs-border bg-gs-surface shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about weapons, skins, strategy..."
                className="flex-1 bg-gs-surface-2 border border-gs-border rounded-xl px-3.5 py-2 text-gs-text placeholder-gs-faint focus:outline-none focus:border-gs-accent/50 focus:ring-2 focus:ring-gs-accent/10 text-sm transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="bg-gs-accent text-gs-accent-fg rounded-xl px-3 py-2 hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
