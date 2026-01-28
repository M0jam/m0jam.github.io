import { User, Settings, LogOut, Shield, Bell } from 'lucide-react';

interface OverlayProfileProps {
  user: { username: string; email: string };
  onLogout: () => void;
}

export function OverlayProfile({ user, onLogout }: OverlayProfileProps) {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900/50 border-r border-white/5 p-6 flex flex-col">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-xl font-bold text-white">
            {user.username[0].toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h3 className="font-bold text-white truncate">{user.username}</h3>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 bg-white/5 text-white rounded-lg font-medium">
            <User size={18} className="text-primary-400" />
            General
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium">
            <Shield size={18} />
            Security
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium">
            <Bell size={18} />
            Notifications
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium">
            <Settings size={18} />
            Preferences
          </button>
        </nav>

        <button 
          onClick={onLogout}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors mt-auto px-2 py-2"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Profile Settings</h2>
        
        <div className="space-y-6 max-w-xl">
          <div className="bg-slate-900/50 rounded-xl border border-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">Username</label>
                <div className="px-4 py-2 bg-slate-950 border border-white/10 rounded-lg text-slate-300">
                  {user.username}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">Display Name</label>
                <div className="px-4 py-2 bg-slate-950 border border-white/10 rounded-lg text-slate-300">
                  {user.username}
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-slate-500 font-medium">Email</label>
                <div className="px-4 py-2 bg-slate-950 border border-white/10 rounded-lg text-slate-300 flex justify-between items-center">
                  {user.email}
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Verified</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-xl border border-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Connected Accounts</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-white/10">
                <div className="flex items-center gap-3">
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  <span className="text-sm font-medium text-slate-300">Google</span>
                </div>
                <button className="text-xs text-slate-500 hover:text-white">Disconnect</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
