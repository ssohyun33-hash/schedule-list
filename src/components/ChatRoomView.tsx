import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Send, Image as ImageIcon, Users, ShieldAlert, Lock, Hash, Trash2, CheckCircle2 } from 'lucide-react';
import { ChatRoom, ChatMessage, UserProfile } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';

interface ChatRoomViewProps {
  currentUser: UserProfile | null;
}

export const ChatRoomView: React.FC<ChatRoomViewProps> = ({ currentUser }) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [inputText, setInputText] = useState('');
  const [attachedImageBase64, setAttachedImageBase64] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // New room modal
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomMembers, setNewRoomMembers] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userEmail = currentUser?.email || 'visitor@anonymous.io';
  const userName = currentUser?.displayName || 'Visitor ' + userEmail.substring(8, 12);

  const PUBLIC_ROOM_ID = 'public-lobby';

  // Listen to chat rooms
  useEffect(() => {
    const q = query(collection(db, 'chatRooms'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomList: ChatRoom[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ChatRoom;
        
        // Public rooms are visible to everyone (logged in or not)
        const isPublic = docSnap.id === PUBLIC_ROOM_ID;
        
        // Private room checks
        const isMember = data.members?.some(m => m.toLowerCase() === userEmail.toLowerCase()) ||
                         data.createdByEmail?.toLowerCase() === userEmail.toLowerCase() ||
                         currentUser?.isGuest;
        
        if (isPublic || isMember) {
          roomList.push({ ...data, id: docSnap.id });
        }
      });

      // Ensure Public Lobby always exists in the list
      const hasPublic = roomList.some(r => r.id === PUBLIC_ROOM_ID);
      if (!hasPublic) {
        const publicRoom: ChatRoom = {
          id: PUBLIC_ROOM_ID,
          name: '🌍 Public Community Lobby',
          members: [], // Empty means open to all in our logic
          createdByEmail: 'system@gmail.com',
          createdAt: 0
        };
        roomList.unshift(publicRoom);
      }

      setRooms(roomList);
      localStorage.setItem('local_chat_rooms', JSON.stringify(roomList));
      if (!activeRoomId && roomList.length > 0) setActiveRoomId(roomList[0].id);
    }, (err) => {
      console.warn("ChatRooms listener note (using local state):", err.message);
      const localRoomsStr = localStorage.getItem('local_chat_rooms');
      if (localRoomsStr) {
        setRooms(JSON.parse(localRoomsStr));
        if (!activeRoomId && JSON.parse(localRoomsStr).length > 0) setActiveRoomId(JSON.parse(localRoomsStr)[0].id);
      }
    });

    return () => unsubscribe();
  }, [userEmail, activeRoomId, currentUser]);

  // Listen to messages in active room
  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chatMessages'), 
      where('roomId', '==', activeRoomId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        msgList.push({ ...(docSnap.data() as ChatMessage), id: docSnap.id });
      });

      if (msgList.length === 0) {
        const localMsgs = localStorage.getItem(`local_msgs_${activeRoomId}`);
        if (localMsgs) {
          try {
            setMessages(JSON.parse(localMsgs));
            return;
          } catch {}
        }
      }
      setMessages(msgList);
      localStorage.setItem(`local_msgs_${activeRoomId}`, JSON.stringify(msgList));
    }, (err) => {
      console.warn("ChatMessages listener note (using local cache):", err.message);
      const localMsgs = localStorage.getItem(`local_msgs_${activeRoomId}`);
      if (localMsgs) setMessages(JSON.parse(localMsgs));
    });

    return () => unsubscribe();
  }, [activeRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const gmails = newRoomMembers
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.includes('@'));
    
    if (!gmails.includes(userEmail.toLowerCase())) {
      gmails.push(userEmail.toLowerCase());
    }

    const newId = 'room_' + Math.random().toString(36).substring(2, 11);
    const newRoom: ChatRoom = {
      id: newId,
      name: newRoomName.trim(),
      members: gmails,
      createdByEmail: userEmail,
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'chatRooms', newId), newRoom);
    } catch {
      // Local fallback
      const updated = [newRoom, ...rooms];
      setRooms(updated);
      localStorage.setItem('local_chat_rooms', JSON.stringify(updated));
    }

    setActiveRoomId(newId);
    setNewRoomName('');
    setNewRoomMembers('');
    setShowNewRoomModal(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 640;
        const MAX_HEIGHT = 640;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to ~40KB jpeg
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        setAttachedImageBase64(dataUrl);
        setIsCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedImageBase64) return;
    if (!activeRoomId) return;

    const newMsgId = 'msg_' + Math.random().toString(36).substring(2, 11);
    const newMsg: ChatMessage = {
      id: newMsgId,
      roomId: activeRoomId,
      senderEmail: userEmail,
      senderName: userName,
      text: inputText.trim(),
      imageUrl: attachedImageBase64 || undefined,
      createdAt: Date.now()
    };

    setInputText('');
    setAttachedImageBase64(null);

    // Optimistic update
    const updatedMsgs = [...messages, newMsg];
    setMessages(updatedMsgs);
    localStorage.setItem(`local_msgs_${activeRoomId}`, JSON.stringify(updatedMsgs));

    try {
      await setDoc(doc(db, 'chatMessages', newMsgId), newMsg);
    } catch (err) {
      console.warn("Message sync note (saved locally):", err);
    }
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] min-h-[600px] p-4 lg:p-6 flex flex-col md:flex-row gap-6">
      
      {/* Rooms Sidebar */}
      <div className="w-full md:w-80 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Chat Rooms ({rooms.length})
          </h3>
          <button
            onClick={() => setShowNewRoomModal(true)}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Create chat room with Gmails"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {rooms.map((rm) => {
            const isActive = rm.id === activeRoomId;
            return (
              <button
                key={rm.id}
                onClick={() => setActiveRoomId(rm.id)}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-2 border ${
                  isActive
                    ? 'bg-indigo-50/90 border-indigo-500 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-400'
                    : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Hash className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs truncate font-medium">{rm.name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {rm.id === PUBLIC_ROOM_ID ? (
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold uppercase tracking-wide">Public</span>
                      ) : (
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded font-bold uppercase tracking-wide flex items-center gap-0.5">
                          <Lock className="w-2 h-2" /> Private
                        </span>
                      )}
                      <div className="text-[10px] text-slate-400 truncate">
                        {rm.id === PUBLIC_ROOM_ID ? 'Open to all visitors' : `${rm.members?.length || 1} whitelisted`}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3 bg-indigo-50/50 border-t border-indigo-100 text-[11px] text-indigo-800 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>No page refreshes needed. Real-time Firebase sync enabled.</span>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden min-w-0">
        {activeRoom ? (
          <>
            {/* Room Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Hash className="w-4 h-4 text-indigo-400" />
                  {activeRoom.name}
                </h4>
                <div className="text-xs text-slate-400 mt-0.5 truncate flex items-center gap-1.5">
                  {activeRoom.id === PUBLIC_ROOM_ID ? (
                    <span>This room is public. Everyone (including visitors) can participate!</span>
                  ) : (
                    <>
                      <span>Whitelisted Gmails:</span>
                      <span className="text-indigo-200 font-mono text-[11px]">{activeRoom.members?.join(', ')}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-full font-semibold">
                  ● Live Sync
                </span>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-8 space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                  <p>Welcome to <strong>{activeRoom.name}</strong>!</p>
                  <p>Type below or attach photos to send messages without needing to refresh.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderEmail.toLowerCase() === userEmail.toLowerCase();
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMe && (
                        <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0 border border-violet-200 mt-1">
                          {m.senderName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className={`max-w-[80%] sm:max-w-md rounded-2xl p-3.5 shadow-2xs space-y-1.5 text-left ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-2xs'
                          : 'bg-white border border-slate-200 text-slate-900 rounded-bl-2xs'
                      }`}>
                        <div className="flex items-center justify-between gap-3 text-[10px] opacity-80">
                          <span className="font-semibold">{isMe ? 'You' : m.senderName}</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {m.text && <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.text}</p>}

                        {m.imageUrl && (
                          <div className="mt-2 overflow-hidden rounded-xl border border-black/10">
                            <img 
                              src={m.imageUrl} 
                              alt="Attachment"
                              className="max-h-64 w-auto object-cover cursor-pointer hover:opacity-95" 
                              onClick={() => window.open(m.imageUrl, '_blank')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment preview banner */}
            {attachedImageBase64 && (
              <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-indigo-800 font-medium">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>Image attached (~40KB JPEG ready)</span>
                </div>
                <button
                  onClick={() => setAttachedImageBase64(null)}
                  className="text-xs text-rose-600 hover:underline font-bold"
                >
                  Remove ✕
                </button>
              </div>
            )}

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                title="Attach image"
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  attachedImageBase64
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
              >
                <ImageIcon className={`w-4 h-4 ${isCompressing ? 'animate-bounce text-indigo-600' : ''}`} />
              </button>

              <input
                type="text"
                placeholder={`Chat in #${activeRoom.name} as ${userEmail}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
              />

              <button
                type="submit"
                disabled={!inputText.trim() && !attachedImageBase64}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            Select or create a chat room on the left to start collaborating!
          </div>
        )}
      </div>

      {/* New Room Modal */}
      {showNewRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in duration-150">
            <h3 className="font-semibold text-slate-900 text-lg mb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Create Collaborative Chat Room
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Add Gmail addresses of teammates or family members. Only whitelisted Gmails will be able to see and post in this chat room.
            </p>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Room Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Planners or Team Standup"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Whitelist Gmail Addresses (comma separated)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. ssohyun33@gmail.com, colleague@gmail.com"
                  value={newRoomMembers}
                  onChange={(e) => setNewRoomMembers(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Your email ({userEmail}) is automatically included.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewRoomModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
