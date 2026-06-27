export interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  category: 'work' | 'personal' | 'urgent' | 'meeting';
  completed: boolean;
  notificationSet: boolean;
  createdByEmail: string;
  recurrence?: string; // e.g., "every Friday" or "every 3rd of week"
  createdAt: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  members: string[]; // Gmail / email addresses allowed in this chat room
  createdByEmail: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderEmail: string;
  senderName: string;
  text: string;
  imageUrl?: string; // base64 compressed data URL or storage URL
  createdAt: number;
}

export interface UserProfile {
  email: string;
  displayName: string;
  photoURL?: string;
  isGuest?: boolean;
}
