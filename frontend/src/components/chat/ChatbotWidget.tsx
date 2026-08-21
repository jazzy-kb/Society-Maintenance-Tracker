import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, X, Send, Sparkles, ShieldAlert, Copy, Check,
  ArrowRight, ShieldCheck, UserCheck
} from 'lucide-react';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  action?: {
    action_type: string;
    title?: string;
    details?: any;
  };
  suggested_actions?: string[];
}

export function ChatbotWidget() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [isOpen, setIsOpen] = useState(false);
  const [inputMsg, setInputMsg] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  // Initialize role-specific welcome message when user loads
  useEffect(() => {
    const welcomeText = isAdmin
      ? `👑 Hello Admin **${user?.name || 'Administrator'}**! I am your **Admin Operations Command Assistant**.`
      : `👋 Hello **${user?.name || 'Resident'}**! I am your **Resident AI Concierge**. How can I assist you today?`;

    const initialChips = isAdmin
      ? ['Society Health Score', 'Overdue Escalations', 'Staff Workload', 'Gate Security Logs']
      : ['Raise Complaint', 'Generate Visitor Pass', 'Track My Complaints', 'Society Rules'];

    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggested_actions: initialChips,
      }
    ]);
  }, [user]);

  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMsg;
    if (!text.trim() || loading) return;

    const userMsgId = Date.now().toString();
    const userMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputMsg('');
    setLoading(true);

    try {
      const res = await api.post('/chatbot/message', { message: text });
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: res.data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: res.data.action,
        suggested_actions: res.data.suggested_actions,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch {
      toast.error('AI Concierge failed to respond');
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: 'Sorry, I am having trouble connecting to Society AI services right now.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Pass code ${code} copied!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Helper to parse basic markdown bold (**text**) and code (`code`)
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Process bold **text** and code `code`
      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
      return (
        <p key={idx} className={idx > 0 ? 'mt-1.5' : ''}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return <code key={pIdx} className="bg-slate-900 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-xs border border-indigo-500/20">{part.slice(1, -1)}</code>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative group bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white p-4 rounded-full shadow-2xl shadow-indigo-600/40 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
        >
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900" />
          </span>
          <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 rounded-3xl w-80 sm:w-96 h-[560px] shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-5 py-4 border-b border-indigo-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  Society AI Concierge
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </h3>
                <p className="text-[11px] text-emerald-400 font-medium">Online · Smart Assistant</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-750 rounded-bl-none'
                  }`}
                >
                  {renderFormattedText(msg.text)}

                  {/* Render Structured Action Cards */}
                  {msg.action && (
                    <div className="mt-3 pt-3 border-t border-slate-700/60">
                      {msg.action.action_type === 'complaint_created' && (
                        <div className="bg-slate-950/80 p-3 rounded-xl border border-indigo-500/30 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-300">Complaint #{msg.action.details.id}</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase text-amber-400 bg-amber-500/10">
                              {msg.action.details.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-white font-medium">{msg.action.details.title}</p>
                          <p className="text-[10px] text-slate-400">SLA Target: {msg.action.details.sla_deadline}</p>
                        </div>
                      )}

                      {msg.action.action_type === 'visitor_pass_created' && (
                        <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Gate Pass Code</span>
                            <button
                              onClick={() => handleCopyCode(msg.action?.details?.pass_code)}
                              className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded"
                            >
                              {copiedCode === msg.action?.details?.pass_code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              Copy Code
                            </button>
                          </div>
                          <span className="text-lg font-black font-mono tracking-wider text-emerald-400 block">
                            {msg.action.details.pass_code}
                          </span>
                          <p className="text-[10px] text-slate-300">
                            Visitor: <strong>{msg.action.details.visitor_name}</strong> ({msg.action.details.visitor_type})
                          </p>
                        </div>
                      )}

                      {msg.action.action_type === 'emergency' && (
                        <div className="bg-rose-950/60 p-3 rounded-xl border border-rose-500/40 space-y-1 text-slate-200">
                          <p className="font-bold text-rose-400 text-xs flex items-center gap-1">
                            <ShieldAlert className="w-4 h-4" /> Emergency Direct Contacts
                          </p>
                          <p className="text-[11px]">Gate Security: <strong>{msg.action.details['Gate Security Direct']}</strong></p>
                          <p className="text-[11px]">Society Desk: <strong>{msg.action.details['Society Desk']}</strong></p>
                        </div>
                      )}
                    </div>
                  )}

                  <span className="text-[9px] text-slate-400 block text-right mt-1 opacity-70">
                    {msg.timestamp}
                  </span>
                </div>

                {/* Suggested Action Chips */}
                {msg.suggested_actions && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                    {msg.suggested_actions.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(chip)}
                        className="bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
                      >
                        {chip}
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 p-3 rounded-xl w-fit">
                <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                <span className="text-xs italic">AI Concierge is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-slate-950 border-t border-indigo-500/20">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask AI Concierge (e.g. raise complaint)..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputMsg.trim() || loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl disabled:opacity-40 transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
