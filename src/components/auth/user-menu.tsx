'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  User as UserIcon,
  LogOut,
  LogIn,
  UserPlus,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { AuthModal } from './auth-modal';

export function UserMenu() {
  const { user, isDemoMode, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isGuestOrAnonymous = !user || user.isAnonymous || isDemoMode;

  const openAuth = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {isGuestOrAnonymous ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openAuth('login')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-white/10 transition cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => openAuth('register')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full bg-slate-900 border border-white/10 hover:border-white/20 transition cursor-pointer"
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="w-6 h-6 rounded-full object-cover border border-white/20"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center text-xs font-bold">
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <span className="text-xs font-medium text-slate-200 max-w-[100px] truncate hidden sm:inline">
            {user.displayName || user.email?.split('@')[0]}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      )}

      {/* User Dropdown Menu */}
      {dropdownOpen && !isGuestOrAnonymous && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3 border-b border-white/5 space-y-1">
            <span className="font-bold text-white block text-sm truncate">
              {user.displayName || 'Routine Champion'}
            </span>
            <span className="text-slate-400 block truncate">{user.email}</span>
            <div className="pt-1 flex items-center gap-1 text-[11px] text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>Firebase Cloud Synced</span>
            </div>
          </div>

          <div className="p-2 space-y-1 text-slate-300">
            <div className="px-2 py-1 text-[11px] text-slate-500 font-mono truncate">
              UID: {user.uid}
            </div>
          </div>

          <div className="pt-1 border-t border-white/5">
            <button
              type="button"
              onClick={async () => {
                setDropdownOpen(false);
                await signOut();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-950/40 hover:text-red-300 font-semibold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
