import React from 'react';
import { ShieldCheck, GraduationCap, PhoneCall, HelpCircle } from 'lucide-react';
import { ScreenId } from '../types';

interface HeaderProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  isAdminLoggedIn: boolean;
  isStudentLoggedIn: boolean;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  isAdminLoggedIn,
  isStudentLoggedIn,
  onLogout
}) => {
  return (
    <header className="header bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border-b border-blue-900/40 shadow-sm relative z-30">
      <div className="max-w-6xl mx-auto px-4 py-3.5 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Institution Brand */}
          <div className="header-inner flex items-center gap-3.5 cursor-pointer" onClick={() => {
            if (isStudentLoggedIn) onNavigate('studentDashboard');
            else if (isAdminLoggedIn) onNavigate('adminDashboard');
            else onNavigate('loginScreen');
          }}>
            <div className="header-logo w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-600/90 border border-blue-400/30 flex items-center justify-center text-white shadow-inner flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs tracking-wider uppercase font-semibold text-blue-300">GIIT Campus Portal</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-200 border border-blue-700/50">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Verified SSL
                </span>
              </div>
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight leading-snug">
                Global Institute of Information & Technology
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-300/90 font-normal">
                Online Student Fee Management & Accounts Ledger
              </p>
            </div>
          </div>

          {/* Right Status / Logout / Contacts */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex flex-col text-right pr-3 border-r border-slate-700/60">
              <span className="text-[11px] text-slate-300 flex items-center gap-1 justify-end">
                <PhoneCall className="w-3 h-3 text-blue-400" /> Helpline: 9334777278
              </span>
              <span className="text-[10px] text-slate-400">Academic Session 2025–26</span>
            </div>

            {(isStudentLoggedIn || isAdminLoggedIn) ? (
              <button
                onClick={onLogout}
                className="depth-btn px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-600/60"
              >
                Sign Out
              </button>
            ) : (
              <a
                href="#help"
                onClick={(e) => {
                  e.preventDefault();
                  alert('GIIT Accounts Support Desk\nOffice Hours: 9:30 AM - 5:00 PM (Mon-Sat)\nHelpline: +91 9334777278\nEmail: accounts@giit.ac.in');
                }}
                className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Support</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
