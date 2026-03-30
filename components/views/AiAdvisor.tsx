import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types';
import { getAiAdvice } from '../../services/geminiService';
import { Button, Card } from '../UI';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  contextSummary: string;
  isDark: boolean;
  lang?: string;
}

export const AiAdvisorView: React.FC<Props> = ({ contextSummary, isDark, lang }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 'welcome', 
      role: 'model', 
      text: lang === 'km' ? 'សួស្តី! ខ្ញុំគឺជាជំនួយការ AI របស់ FamilyFlow។ តើខ្ញុំអាចជួយអ្វីខ្លះអំពីការវិវត្តន៍កូន សុខភាព ឬផែនការថ្ងៃនេះ?' : 'Hello! I am your FamilyFlow AI assistant. How can I help with milestones, health queries, or planning today?', 
      timestamp: Date.now() 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    const responseText = await getAiAdvice(inputValue, contextSummary, lang);

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  return (
    <div className="h-[calc(100vh-220px)] md:h-[calc(100vh-160px)] flex flex-col animate-in fade-in duration-500">
      <Card className="flex-1 flex flex-col border-0 shadow-2xl overflow-hidden relative dark:bg-dark-card" noPadding>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-10"></div>
        
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50 dark:bg-dark-bg/50 scroll-smooth">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-end gap-3 max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300'}`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className={`p-4 rounded-[1.5rem] shadow-sm text-sm md:text-base leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-primary to-indigo-600 text-white rounded-br-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex justify-start">
              <div className="flex items-end gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-[1.5rem] rounded-bl-none border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                  <Loader2 size={18} className="animate-spin text-primary" />
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-dark-card border-t border-slate-100 dark:border-slate-800">
           <div className="relative flex items-center max-w-3xl mx-auto">
             <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={lang === 'km' ? "សួរអំពីការវិវត្តន៍កូន ឬផែនការ..." : "Ask about milestones, symptoms, or budget..."}
                className="w-full pl-6 pr-14 py-4 bg-slate-100 dark:bg-slate-900 border-transparent focus:bg-white dark:focus:bg-black/20 rounded-full text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
             />
             <button 
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                className="absolute right-2 p-2.5 bg-primary text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-primary transition-transform active:scale-90 shadow-lg shadow-primary/30"
             >
               <Send size={18} />
             </button>
           </div>
           <div className="mt-3 flex justify-center">
             <span className="text-[10px] md:text-xs text-slate-400 flex items-center bg-slate-50 dark:bg-white/5 px-3 py-1 rounded-full">
               <Sparkles size={10} className="mr-1.5 text-yellow-500" /> AI advice is for info only. Consult doctors for medical decisions.
             </span>
           </div>
        </div>
      </Card>
    </div>
  );
};