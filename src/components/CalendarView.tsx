import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Bell, BellOff, CheckCircle2, Circle, Clock, Tag, Trash2 } from 'lucide-react';
import { ScheduleEvent, UserProfile } from '../types';

interface CalendarViewProps {
  events: ScheduleEvent[];
  onAddEvent: (eventData: Omit<ScheduleEvent, 'id' | 'createdAt'>) => void;
  onToggleComplete: (eventId: string, currentStatus: boolean) => void;
  onToggleNotification: (event: ScheduleEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  currentUser: UserProfile | null;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  onAddEvent,
  onToggleComplete,
  onToggleNotification,
  onDeleteEvent,
  currentUser
}) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateStr, setSelectedDateStr] = useState<string>(today.toISOString().split('T')[0]);

  // Modal / Form state for writing thing happen
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [category, setCategory] = useState<'work' | 'personal' | 'urgent' | 'meeting'>('work');
  const [description, setDescription] = useState('');
  const [setNotify, setSetNotify] = useState(true);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  // Generate grid days
  const calendarDays: Array<{ dayNum: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push({ dayNum: null, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dayNum: d, dateStr: dStr });
  }

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddEvent({
      title: title.trim(),
      description: description.trim(),
      date: selectedDateStr,
      time,
      category,
      completed: false,
      notificationSet: setNotify,
      createdByEmail: currentUser?.email || 'anonymous@gmail.com'
    });
    setTitle('');
    setDescription('');
  };

  const selectedDayEvents = events
    .filter(e => e.date === selectedDateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'work': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'urgent': return 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse';
      case 'meeting': return 'bg-violet-100 text-violet-700 border-violet-200';
      default: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 lg:p-6">
      
      {/* Full Month Calendar Grid (Columns 1-7) */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col">
        
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <h2 className="font-sans font-bold text-slate-900 text-xl tracking-tight">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelectedDateStr(today.toISOString().split('T')[0]);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day Name Columns */}
        <div className="grid grid-cols-7 text-center mb-2">
          {dayNames.map((name, i) => (
            <div key={name} className={`text-xs font-semibold py-2 uppercase tracking-wider ${i === 0 || i === 6 ? 'text-indigo-500' : 'text-slate-500'}`}>
              {name}
            </div>
          ))}
        </div>

        {/* Month Day Cells */}
        <div className="grid grid-cols-7 gap-2 flex-1">
          {calendarDays.map((cell, idx) => {
            if (cell.dayNum === null || cell.dateStr === null) {
              return <div key={`empty-${idx}`} className="bg-slate-50/50 rounded-xl min-h-[88px]" />;
            }
            
            const isToday = cell.dateStr === today.toISOString().split('T')[0];
            const isSelected = cell.dateStr === selectedDateStr;
            const dayEvts = events.filter(e => e.date === cell.dateStr);

            return (
              <div
                key={cell.dateStr}
                onClick={() => setSelectedDateStr(cell.dateStr!)}
                className={`group relative flex flex-col p-2.5 rounded-xl min-h-[88px] cursor-pointer transition-all duration-150 border text-left ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-500 shadow-md shadow-indigo-100 ring-2 ring-indigo-400'
                    : isToday
                    ? 'bg-amber-50/40 border-amber-400 hover:border-amber-500'
                    : 'bg-white border-slate-200/80 hover:border-slate-400 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold inline-flex items-center justify-center rounded-lg w-7 h-7 ${
                    isToday
                      ? 'bg-amber-500 text-white shadow-xs'
                      : isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 group-hover:text-slate-900'
                  }`}>
                    {cell.dayNum}
                  </span>
                  {dayEvts.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {dayEvts.length}
                    </span>
                  )}
                </div>

                {/* Micro preview of events */}
                <div className="mt-2 space-y-1 overflow-hidden max-h-[52px]">
                  {dayEvts.slice(0, 2).map((ev) => (
                    <div key={ev.id} className="text-[11px] truncate px-1.5 py-0.5 rounded bg-slate-100/90 text-slate-700 flex items-center gap-1 font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.completed ? 'bg-slate-400' : 'bg-indigo-500'}`} />
                      <span className={ev.completed ? 'line-through text-slate-400' : ''}>{ev.title}</span>
                    </div>
                  ))}
                  {dayEvts.length > 2 && (
                    <div className="text-[10px] text-indigo-600 font-semibold pl-1">
                      +{dayEvts.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Selected Day Panel & Creator Form (Columns 8-12) */}
      <div className="lg:col-span-5 flex flex-col space-y-6">
        
        {/* Write thing happen box */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl text-white p-6 shadow-xl border border-indigo-800">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                Day Schedule Editor
              </span>
              <h3 className="font-sans font-bold text-xl text-white mt-0.5">
                {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-200">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-indigo-200 mb-1.5">Write thing happening</label>
              <input
                type="text"
                required
                placeholder="e.g. Doctor appointment or Gym"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-indigo-200 mb-1.5">Time</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-indigo-200 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-white/20 rounded-xl text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="work">💼 Work</option>
                  <option value="personal">🏠 Personal</option>
                  <option value="meeting">🤝 Meeting</option>
                  <option value="urgent">🚨 Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-indigo-200 mb-1.5">Notes (optional)</label>
              <input
                type="text"
                placeholder="Location, links, or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-indigo-100 select-none">
                <input
                  type="checkbox"
                  checked={setNotify}
                  onChange={(e) => setSetNotify(e.target.checked)}
                  className="rounded text-indigo-500 focus:ring-indigo-400 w-4 h-4"
                />
                <Bell className={`w-3.5 h-3.5 ${setNotify ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>Set notification alarm</span>
              </label>

              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 font-semibold text-white text-xs rounded-xl shadow-lg shadow-indigo-900/50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Day</span>
              </button>
            </div>
          </form>
        </div>

        {/* Existing Schedule Items for this day */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-600" />
              Events on {selectedDateStr} ({selectedDayEvents.length})
            </h4>
            <span className="text-[11px] text-slate-400">Auto-saved via Firebase</span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/80 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                No events scheduled for this date yet. Use the editor above or ask Gemini AI!
              </div>
            ) : (
              selectedDayEvents.map((evt) => (
                <div
                  key={evt.id}
                  className={`group p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                    evt.completed
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => onToggleComplete(evt.id, evt.completed)}
                      className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer shrink-0"
                    >
                      {evt.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                          {evt.time}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${getCategoryBadge(evt.category)}`}>
                          {evt.category}
                        </span>
                        {evt.recurrence && (
                          <span className="text-[10px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded border border-violet-100 font-medium">
                            🔄 {evt.recurrence}
                          </span>
                        )}
                      </div>
                      <h5 className={`font-semibold text-sm mt-1 truncate ${evt.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {evt.title}
                      </h5>
                      {evt.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {evt.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                    <button
                      onClick={() => onToggleNotification(evt)}
                      title={evt.notificationSet ? "Notification active" : "Enable notification"}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        evt.notificationSet 
                          ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' 
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {evt.notificationSet ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => onDeleteEvent(evt.id)}
                      title="Delete event"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
