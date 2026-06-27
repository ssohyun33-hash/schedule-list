import React, { useState } from 'react';
import { Calendar, MessageSquare, Sparkles, Cloud, LogIn, LogOut, User, Mail } from 'lucide-react';
import { UserProfile } from '../types';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

interface NavbarProps {
  activeTab: 'calendar' | 'chat' | 'ai';
  setActiveTab: (tab: 'calendar' | 'chat' | 'ai') => void;
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  isOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  setCurrentUser,
  isOnline
}) => {
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [tempGmail, setTempGmail] = useState('');
  const [tempName, setTempName] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const u = res.user;
      setCurrentUser({
        email: u.email || '',
        displayName: u.displayName || u.email?.split('@')[0] || 'User',
        photoURL: u.photoURL || undefined
      });
    } catch (err: any) {
      console.warn("Google popup blocked or canceled, opening direct Gmail input fallback:", err);
      setShowGmailModal(true);
    }
  };

  const handleManualGmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempGmail.includes('@')) {
      alert("Please enter a valid Gmail address (e.g. name@gmail.com)");
      return;
    }
    setCurrentUser({
      email: tempGmail.trim().toLowerCase(),
      displayName: tempName.trim() || tempGmail.split('@')[0],
      isGuest: true
    });
    setShowGmailModal(false);
  };

  const handleSignOut = () => {
    signOut(auth).catch(() => {});
    setCurrentUser(null);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-sans font-semibold tracking-tight text-slate-900 text-lg flex items-center gap-2">
              Schedule List
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-100 hidden sm:inline-block">
                Firebase Real-Time
              </span>
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Cloud className={`w-3 h-3 ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`} />
              {isOnline ? 'Cloud Auto-Save Connected' : 'Offline / Local Persistence Mode'}
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'calendar'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendar</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat Room</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Gemini AI</span>
          </button>
        </nav>

        {/* Auth / User Info */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="flex items-center gap-2">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName}
                    className="w-8 h-8 rounded-full border border-slate-300 object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-xs border border-indigo-200">
                    {currentUser.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-slate-800 leading-tight">
                    {currentUser.displayName}
                  </div>
                  <div className="text-xs text-slate-500 max-w-[120px] truncate">
                    {currentUser.email}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in with Google</span>
              </button>
              <button
                onClick={() => setShowGmailModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors border border-slate-200"
                title="Quick manual Gmail login"
              >
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Quick Gmail</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Manual Gmail Modal */}
      {showGmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                Enter Gmail to Collaborate
              </h3>
              <button 
                onClick={() => setShowGmailModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              In AI Studio previews, if third-party popups are blocked by your browser, enter your Gmail address below to instantly join chat rooms and sync your schedule!
            </p>
            <form onSubmit={handleManualGmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Your Gmail Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ssohyun33@gmail.com"
                  value={tempGmail}
                  onChange={(e) => setTempGmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Your Name / Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Sohyun"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGmailModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                >
                  Start Collaborating
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
