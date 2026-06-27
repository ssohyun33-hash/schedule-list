import React, { useState, useEffect } from 'react';
import { ScheduleEvent, UserProfile } from './types';
import { db, auth } from './lib/firebase';
import { collection, query, onSnapshot, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { CalendarView } from './components/CalendarView';
import { ChatRoomView } from './components/ChatRoomView';
import { AiAssistant } from './components/AiAssistant';
import { triggerEventNotification, requestNotificationPermission } from './lib/notifications';

export default function App() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'chat' | 'ai'>('calendar');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [alertedIds, setAlertedIds] = useState<Set<string>>(new Set());

  // Restore user session
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setCurrentUser({
          email: u.email || '',
          displayName: u.displayName || u.email?.split('@')[0] || 'User',
          photoURL: u.photoURL || undefined
        });
      } else {
        const guestStr = localStorage.getItem('local_guest_user');
        if (guestStr) {
          try { setCurrentUser(JSON.parse(guestStr)); } catch {}
        }
      }
    });

    // Seed default user if none
    if (!currentUser && !localStorage.getItem('local_guest_user')) {
      const defaultGuest: UserProfile = {
        email: 'ssohyun33@gmail.com',
        displayName: 'Sohyun',
        isGuest: true
      };
      setCurrentUser(defaultGuest);
    }

    return () => unsub();
  }, []);

  useEffect(() => {
    if (currentUser?.isGuest) {
      localStorage.setItem('local_guest_user', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  // Firebase Real-time Auto-save listener for events
  useEffect(() => {
    const q = query(collection(db, 'events'));
    const unsub = onSnapshot(q, (snapshot) => {
      setIsOnline(true);
      const list: ScheduleEvent[] = [];
      snapshot.forEach((d) => {
        list.push({ ...(d.data() as ScheduleEvent), id: d.id });
      });

      if (list.length === 0) {
        // Load local cache if offline or brand new database
        const localStr = localStorage.getItem('local_schedule_events');
        if (localStr) {
          try { setEvents(JSON.parse(localStr)); return; } catch {}
        }
        // Seed initial event
        const seedEvent: ScheduleEvent = {
          id: 'seed_friday_meet',
          title: '🤝 Weekly Team Standup & Review',
          description: 'Discuss sprint goals and share updates in Gmail chat room.',
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          category: 'meeting',
          completed: false,
          notificationSet: true,
          createdByEmail: 'system@gmail.com',
          recurrence: 'every Friday',
          createdAt: Date.now()
        };
        setEvents([seedEvent]);
      } else {
        setEvents(list);
        localStorage.setItem('local_schedule_events', JSON.stringify(list));
      }
    }, (err) => {
      console.warn("Firebase events real-time sync note (offline or permission note):", err.message);
      setIsOnline(false);
      const localStr = localStorage.getItem('local_schedule_events');
      if (localStr) {
        try { setEvents(JSON.parse(localStr)); } catch {}
      }
    });

    return () => unsub();
  }, []);

  // Notification Alarm checker loop
  useEffect(() => {
    requestNotificationPermission();

    const interval = setInterval(() => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentHHmm = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      events.forEach((evt) => {
        if (evt.date === todayStr && evt.notificationSet && !evt.completed) {
          if (evt.time === currentHHmm && !alertedIds.has(evt.id)) {
            triggerEventNotification(evt);
            setAlertedIds(prev => new Set(prev).add(evt.id));
          }
        }
      });
    }, 20000); // Check every 20s

    return () => clearInterval(interval);
  }, [events, alertedIds]);

  // Handlers
  const handleAddEvent = async (eventData: Omit<ScheduleEvent, 'id' | 'createdAt'>) => {
    const newId = 'evt_' + Math.random().toString(36).substring(2, 11);
    const newEvt: ScheduleEvent = {
      ...eventData,
      id: newId,
      createdAt: Date.now()
    };

    const updated = [...events, newEvt];
    setEvents(updated);
    localStorage.setItem('local_schedule_events', JSON.stringify(updated));

    try {
      await setDoc(doc(db, 'events', newId), newEvt);
    } catch (err) {
      console.warn("Firebase auto-save note (saved locally):", err);
    }
  };

  const handleAddEventsBatch = async (batch: Array<Omit<ScheduleEvent, 'id' | 'createdAt'>>) => {
    const newItems = batch.map(b => ({
      ...b,
      id: 'evt_' + Math.random().toString(36).substring(2, 11),
      createdAt: Date.now()
    }));

    const updated = [...events, ...newItems];
    setEvents(updated);
    localStorage.setItem('local_schedule_events', JSON.stringify(updated));

    // Async auto-save all to Firebase
    newItems.forEach(item => {
      setDoc(doc(db, 'events', item.id), item).catch(() => {});
    });
  };

  const handleToggleComplete = async (eventId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const updated = events.map(e => e.id === eventId ? { ...e, completed: nextStatus } : e);
    setEvents(updated);
    localStorage.setItem('local_schedule_events', JSON.stringify(updated));

    try {
      await updateDoc(doc(db, 'events', eventId), { completed: nextStatus });
    } catch {
      // Offline fallback already updated local state
    }
  };

  const handleToggleNotification = async (event: ScheduleEvent) => {
    const nextNotify = !event.notificationSet;
    const updated = events.map(e => e.id === event.id ? { ...e, notificationSet: nextNotify } : e);
    setEvents(updated);
    localStorage.setItem('local_schedule_events', JSON.stringify(updated));

    if (nextNotify) {
      requestNotificationPermission();
    }

    try {
      await updateDoc(doc(db, 'events', event.id), { notificationSet: nextNotify });
    } catch {}
  };

  const handleDeleteEvent = async (eventId: string) => {
    const updated = events.filter(e => e.id !== eventId);
    setEvents(updated);
    localStorage.setItem('local_schedule_events', JSON.stringify(updated));

    try {
      await deleteDoc(doc(db, 'events', eventId));
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        isOnline={isOnline}
      />

      <main className="flex-1 py-4">
        {activeTab === 'calendar' && (
          <CalendarView
            events={events}
            onAddEvent={handleAddEvent}
            onToggleComplete={handleToggleComplete}
            onToggleNotification={handleToggleNotification}
            onDeleteEvent={handleDeleteEvent}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'chat' && (
          <ChatRoomView currentUser={currentUser} />
        )}

        {activeTab === 'ai' && (
          <AiAssistant
            onAddEventsBatch={handleAddEventsBatch}
            currentUser={currentUser}
          />
        )}
      </main>

      <footer className="py-4 px-6 text-center text-xs text-slate-400 border-t border-slate-200/80 bg-white/50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>☁ Powered by Google Firebase Real-Time Firestore & Gemini Flash</span>
          <span>Project ID: scheduler-9ae2c</span>
        </div>
      </footer>
    </div>
  );
}
