import React, { useState } from 'react';
import { Sparkles, Send, CalendarPlus, CheckCircle2, Bot, User, ArrowRight, Loader2, RefreshCw, Trash2, Hash } from 'lucide-react';
import { ScheduleEvent, UserProfile } from '../types';

interface AiAssistantProps {
  onAddEventsBatch: (events: Array<Omit<ScheduleEvent, 'id' | 'createdAt'>>) => void;
  onDeleteEvent: (id: string) => void;
  onToggleComplete: (id: string, current: boolean) => void;
  onCreateRoom: (name: string, members: string[]) => void;
  events: ScheduleEvent[];
  currentUser: UserProfile | null;
}

interface AiAction {
  type: 'CREATE_EVENTS' | 'CREATE_ROOM' | 'DELETE_EVENTS' | 'TOGGLE_EVENTS';
  payload: any;
}

interface AiTurn {
  role: 'user' | 'assistant';
  text: string;
  summary?: string;
  actions?: AiAction[];
  applied?: boolean;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ 
  onAddEventsBatch, 
  onDeleteEvent,
  onToggleComplete,
  onCreateRoom,
  events,
  currentUser 
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [turns, setTurns] = useState<AiTurn[]>([
    {
      role: 'assistant',
      text: `Hello ${currentUser?.displayName || 'there'}! I'm now a full-app orchestrator. You can ask me to:\n\n• "Create a chat room called 'Diet Room' and invite bob@gmail.com"\n• "Delete my cooking event on Friday"\n• "Cross out 'Dinner' from my list"\n• "Schedule every Monday: Team Sync at 9am"`
    }
  ]);

  const handleSendPrompt = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userTurn: AiTurn = { role: 'user', text: textToSend };
    setTurns(prev => [...prev, userTurn]);
    setPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          currentDate: todayStr,
          context: { 
            recentEvents: events.map(e => ({ id: e.id, title: e.title, date: e.date, completed: e.completed }))
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to contact Gemini.");

      const botTurn: AiTurn = {
        role: 'assistant',
        text: data.summary || "I've prepared the following actions based on your request:",
        actions: data.actions || [],
        applied: false
      };
      setTurns(prev => [...prev, botTurn]);
    } catch (err: any) {
      setTurns(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ Error: ${err.message}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyActions = (turnIdx: number) => {
    const turn = turns[turnIdx];
    if (!turn.actions || turn.applied) return;

    turn.actions.forEach(action => {
      const p = action.payload;
      switch (action.type) {
        case 'CREATE_EVENTS':
          if (p.events) {
            onAddEventsBatch(p.events.map((e: any) => ({
              ...e,
              completed: false,
              notificationSet: true,
              createdByEmail: currentUser?.email || 'ai@app.io'
            })));
          }
          break;
        case 'CREATE_ROOM':
          if (p.roomName) onCreateRoom(p.roomName, p.invites || []);
          break;
        case 'DELETE_EVENTS':
          if (p.targetIds) p.targetIds.forEach((id: string) => onDeleteEvent(id));
          else if (p.targetTitleMatch) {
            const matches = events.filter(e => e.title.toLowerCase().includes(p.targetTitleMatch.toLowerCase()));
            matches.forEach(e => onDeleteEvent(e.id));
          }
          break;
        case 'TOGGLE_EVENTS':
          if (p.targetIds) p.targetIds.forEach((id: string) => onToggleComplete(id, !p.completed));
          else if (p.targetTitleMatch) {
            const matches = events.filter(e => e.title.toLowerCase().includes(p.targetTitleMatch.toLowerCase()));
            matches.forEach(e => onToggleComplete(e.id, !p.completed));
          }
          break;
      }
    });

    setTurns(prev => prev.map((t, idx) => idx === turnIdx ? { ...t, applied: true } : t));
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-100px)] min-h-[600px] p-4 lg:p-6 flex flex-col">
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg mb-6 flex items-center justify-between border border-slate-700">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
          <h2 className="font-bold text-xl">App Orchestrator</h2>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">Gemini 2.0 Flash</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 mb-4 bg-white/50 rounded-2xl p-6 border border-slate-200">
        {turns.map((t, idx) => (
          <div key={idx} className={`flex gap-4 ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-5 shadow-xs ${
              t.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-800'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{t.text}</p>

              {t.actions && t.actions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    {t.actions.map((act, actIdx) => (
                      <div key={actIdx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                          {act.type === 'CREATE_EVENTS' && <CalendarPlus className="w-4 h-4" />}
                          {act.type === 'CREATE_ROOM' && <Hash className="w-4 h-4" />}
                          {act.type === 'DELETE_EVENTS' && <Trash2 className="w-4 h-4 text-rose-500" />}
                          {act.type === 'TOGGLE_EVENTS' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </div>
                        <div className="text-xs">
                          <div className="font-bold text-slate-900">{act.type.replace('_', ' ')}</div>
                          <div className="text-slate-500">
                            {act.type === 'CREATE_EVENTS' && `${act.payload.events?.length} items`}
                            {act.type === 'CREATE_ROOM' && `"${act.payload.roomName}"`}
                            {act.type === 'DELETE_EVENTS' && (act.payload.targetTitleMatch || 'by ID')}
                            {act.type === 'TOGGLE_EVENTS' && (act.payload.targetTitleMatch || 'by ID')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!t.applied ? (
                    <button
                      onClick={() => applyActions(idx)}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                    >
                      Confirm and Apply All Changes
                    </button>
                  ) : (
                    <div className="text-center py-2 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
                      ✓ Changes applied successfully!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 text-slate-500 text-xs p-4 bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Gemini is orchestrating your request...</span>
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSendPrompt(prompt); }} className="flex gap-2 bg-white rounded-2xl p-2 border border-slate-300 shadow-md">
        <input
          type="text"
          placeholder='e.g. "Create room Diet and invite bob@gmail.com" or "Delete dinner event"'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1 px-4 py-3 text-sm outline-hidden"
        />
        <button type="submit" disabled={!prompt.trim() || isLoading} className="px-6 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
};
