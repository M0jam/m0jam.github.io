import { User, Settings, LogOut, Mail, Shield, Bell, Smartphone, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileTabProps {
  user: { username: string; email: string } | null;
  onLogOut: () => void;
}

export function ProfileTab({ user, onLogOut }: ProfileTabProps) {
  if (!user) return null;

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden"
      >
        {/* Header / Banner */}
        <div className="h-48 bg-gradient-to-r from-primary-900/50 to-blue-900/50 relative">
          <div className="absolute inset-0 bg-grid-white/[0.05]" />
        </div>

        {/* Profile Info */}
        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-6 flex justify-between items-end">
            <div className="flex items-end gap-6">
              <div className="w-32 h-32 rounded-2xl bg-slate-800 border-4 border-slate-950 flex items-center justify-center text-4xl font-bold text-white shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-blue-600 opacity-80" />
                <span className="relative z-10">{user.username[0].toUpperCase()}</span>
              </div>
              <div className="mb-2">
                <h1 className="text-3xl font-bold text-white">{user.username}</h1>
                <p className="text-slate-400">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={onLogOut}
              className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-2 font-medium mb-2"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {/* Sidebar Navigation */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Account Settings</h3>
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 text-white rounded-lg border border-white/10 font-medium">
                <User size={18} className="text-primary-400" />
                Profile
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium">
                <Shield size={18} />
                Security
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium">
                <Bell size={18} />
                Notifications
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium">
                <Settings size={18} />
                Preferences
              </button>
            </div>

            {/* Main Content Area */}
            <div className="md:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="bg-slate-950/50 rounded-xl border border-white/5 p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <User size={20} className="text-primary-400" />
                  Personal Information
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 font-medium">Username</label>
                      <div className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-lg text-slate-300">
                        {user.username}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 font-medium">Display Name</label>
                      <div className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-lg text-slate-300">
                        {user.username}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium">Email Address</label>
                    <div className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-lg text-slate-300 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <Mail size={16} className="text-slate-500" />
                        <span>{user.email}</span>
                      </div>
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Verified</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connected Devices */}
              <div className="bg-slate-950/50 rounded-xl border border-white/5 p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Monitor size={20} className="text-blue-400" />
                  Active Sessions
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-primary-500/30">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                        <Monitor size={20} className="text-slate-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">Windows PC (Chrome)</h4>
                        <p className="text-xs text-emerald-400">Active Now • Cologne, Germany</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-primary-500/10 text-primary-400 text-xs font-medium rounded-full border border-primary-500/20">
                      Current Device
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-white/5 opacity-60">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                        <Smartphone size={20} className="text-slate-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">iPhone 13 Pro</h4>
                        <p className="text-xs text-slate-500">Last seen 2 hours ago • Cologne, Germany</p>
                      </div>
                    </div>
                    <button className="text-xs text-red-400 hover:underline">Revoke</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
