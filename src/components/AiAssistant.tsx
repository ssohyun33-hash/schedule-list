import React, { useState } from 'react';
import { Sparkles, Send, CalendarPlus, CheckCircle2, Bot, User, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { ScheduleEvent, UserProfile } from '../types';

interface AiAssistantProps {
  onAddEventsBatch: (events: Array<Omit<ScheduleEvent, 'id' | 'createdAt'>>) => void;
  currentUser: UserProfile | null;
}

interface AiTurn {
  role: 'user' | 'assistant';
  text: string;
  suggestedEvents?: Array<{
    title: string;
    description?: string;
    date: string;
    time: string;
    category: 'work' | 'personal' | 'urgent' | 'meeting';
    recurrenceRule?: string;
  }>;
  saved?: boolean;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ onAddEventsBatch, currentUser }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [turns, setTurns] = useState<AiTurn[]>([
    {
      role: 'assistant',
      text: `Hello ${currentUser?.displayName || 'there'}! I am your Gemini AI Schedule Assistant. Try typing natural rules like:\n\n• "every Friday: Team Standup at 10:00"\n• "every 3rd of week: Gym training at 17:00"\n• "Plan 3 focus blocks for next week"\n\nI will calculate the exact dates and prepare them for Firebase auto-save!`
    }
  ]);

  const quickChips = [
    "every Friday: Team sync & retro at 10:00",
    "every 3rd of week: Gym workout at 17:30",
    "every Monday: Sprint planning at 09:00",
    "Add Dentist checkup on the 15th of next month at 14:00"
  ];

  const handleSendPrompt = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userTurn: AiTurn = { role: 'user', text: textToSend };
    setTurns(prev => [...prev, userTurn]);
    setPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          currentDate: todayStr
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to contact Gemini backend.");
      }

      const eventsList = data.events || [];
      const botTurn: AiTurn = {
        role: 'assistant',
        text: `✨ I analyzed your request and generated ${eventsList.length} concrete schedule items! Review them below and click Save to sync with Firebase.`,
        suggestedEvents: eventsList,
        saved: false
      };
      setTurns(prev => [...prev, botTurn]);
    } catch (err: any) {
      setTurns(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ Could not generate schedule: ${err.message || "Network error."}\nMake sure GEMINI_API_KEY is configured in AI Studio Settings.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToFirebase = (turnIdx: number) => {
    const turn = turns[turnIdx];
    if (!turn.suggestedEvents || turn.saved) return;

    const batch = turn.suggestedEvents.map(evt => ({
      title: evt.title,
      description: evt.description || '',
      date: evt.date,
      time: evt.time,
      category: evt.category || 'work',
      completed: false,
      notificationSet: true,
      recurrence: evt.recurrenceRule,
      createdByEmail: currentUser?.email || 'ai.assistant@gmail.com'
    }));

    onAddEventsBatch(batch);

    setTurns(prev => prev.map((t, idx) => idx === turnIdx ? { ...t, saved: true } : t));
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-100px)] min-h-[600px] p-4 lg:p-6 flex flex-col">
      
      {/* Header card */}
      <div className="bg-gradient-to-r from-indigo-900 via-violet-900 to-purple-900 rounded-2xl p-6 text-white shadow-lg mb-6 flex items-center justify-between flex-wrap gap-4 border border-violet-700/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-md">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="text-left">
            <h2 className="font-sans font-bold text-lg sm:text-xl text-white flex items-center gap-2">
              Gemini AI Schedule Assistant
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-violet-500/40 text-violet-200 border border-violet-400/30">
                Gemini 3.5 Flash
              </span>
            </h2>
            <p className="text-xs text-violet-200 mt-0.5">
              Low latency recurring event generator. Type like <em>"every Friday:"</em> or <em>"every 3rd of week:"</em>
            </p>
          </div>
        </div>
      </div>

      {/* Chat turns feed */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-4 bg-slate-50/70 rounded-2xl p-4 sm:p-6 border border-slate-200/80">
        {turns.map((t, idx) => (
          <div key={idx} className={`flex gap-3 sm:gap-4 ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {t.role === 'assistant' && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0 mt-0.5 border border-indigo-400">
                <Bot className="w-5 h-5" />
              </div>
            )}

            <div className={`max-w-[85%] sm:max-w-2xl rounded-2xl p-4 sm:p-5 text-left shadow-xs ${
              t.role === 'user'
                ? 'bg-slate-900 text-white rounded-br-2xs'
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-2xs'
            }`}>
              <div className="text-xs font-semibold mb-1 opacity-75">
                {t.role === 'user' ? 'You' : '✨ Gemini Assistant'}
              </div>
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{t.text}</p>

              {/* Suggested schedule preview box */}
              {t.suggestedEvents && t.suggestedEvents.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950">
                      📅 Calculated Schedule Occurrences ({t.suggestedEvents.length})
                    </span>
                    {t.saved && (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Saved to Firebase
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200/60">
                    {t.suggestedEvents.map((ev, evIdx) => (
                      <div key={evIdx} className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs text-left">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-bold text-indigo-600">{ev.date}</span>
                          <span className="font-mono bg-slate-100 text-slate-700 px-1 rounded font-semibold">{ev.time}</span>
                        </div>
                        <div className="font-semibold text-xs text-slate-900 mt-1 truncate">{ev.title}</div>
                        {ev.recurrenceRule && (
                          <div className="text-[10px] text-violet-600 font-medium mt-0.5">🔄 {ev.recurrenceRule}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {!t.saved ? (
                    <button
                      onClick={() => handleSaveToFirebase(idx)}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      <span>Auto-Save All {t.suggestedEvents.length} Events to Firebase</span>
                    </button>
                  ) : (
                    <div className="text-center py-2 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200">
                      ✓ All items auto-saved & synced to your schedule calendar!
                    </div>
                  )}
                </div>
              )}
            </div>

            {t.role === 'user' && (
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center animate-spin">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
              <span>Gemini Flash is calculating recurring dates and schedule items...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick suggestions */}
      <div className="mb-3 flex flex-wrap gap-2">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendPrompt(chip)}
            disabled={isLoading}
            className="px-3 py-1.5 bg-white hover:bg-indigo-50 hover:border-indigo-300 active:bg-indigo-100 text-slate-700 hover:text-indigo-700 text-xs rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3 text-violet-500" />
            <span>{chip}</span>
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendPrompt(prompt); }} className="flex items-center gap-2 bg-white rounded-2xl p-2 border border-slate-300 shadow-md focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
        <input
          type="text"
          placeholder='Try "every Friday: lunch at 12:00" or "every 3rd of week: gym at 18:00"...'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
          className="flex-1 px-4 py-3 text-xs sm:text-sm text-slate-900 bg-transparent focus:outline-hidden"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || isLoading}
          className="px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>Ask Gemini</span>
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};
