import { ScheduleEvent } from '../types';

// Play a friendly soft bell chime using Web Audio API
export function playChimeSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (err) {
    console.warn("Audio chime playback note:", err);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  try {
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch {
    return false;
  }
}

export function triggerEventNotification(event: ScheduleEvent) {
  playChimeSound();
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`🔔 Upcoming Event: ${event.title}`, {
        body: `${event.time} - ${event.description || event.category}`,
        icon: '/vite.svg'
      });
    } catch {
      // In some iframe environments Notification constructor might throw
    }
  }
}
