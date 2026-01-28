import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { AuthForms } from './AuthForms';
import { Showcase } from './Showcase';
import { OverlayProfile } from './OverlayProfile';

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  user: { username: string; email: string } | null;
  onLoginSuccess: (user: any) => void;
  onLogout: () => void;
}

export function AuthOverlay({ onClose, user, onLoginSuccess, onLogout }: AuthOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px] md:h-[700px] max-h-[90vh]"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-colors backdrop-blur-md"
        >
          <X size={20} />
        </button>

        {user ? (
          // Logged In: Show Profile Management
          <div className="w-full h-full">
            <OverlayProfile user={user} onLogout={onLogout} />
          </div>
        ) : (
          // Logged Out: Show Auth + Showcase
          <>
            {/* Left Side: Auth Forms */}
            <div className="w-full md:w-[45%] bg-slate-950 flex flex-col relative z-20">
               <div className="flex-1 flex flex-col justify-center overflow-y-auto">
                 <AuthForms onLoginSuccess={onLoginSuccess} onClose={() => {}} />
               </div>
               <div className="p-6 text-center border-t border-white/5 bg-slate-900/30">
                 <p className="text-xs text-slate-500">
                   By continuing, you agree to PlayHub's <a href="#" className="text-slate-400 hover:text-white underline">Terms of Service</a> and <a href="#" className="text-slate-400 hover:text-white underline">Privacy Policy</a>.
                 </p>
               </div>
            </div>

            {/* Right Side: Showcase */}
            <div className="hidden md:block md:w-[55%] relative overflow-hidden">
              <Showcase />
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
