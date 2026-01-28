import React, { useState } from 'react';
import { Mail, Lock, User, Loader2, ArrowRight, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

interface AuthFormsProps {
  onLoginSuccess: (user: any) => void;
  onClose: () => void;
}

type AuthMode = 'login' | 'register';

export function AuthForms({ onLoginSuccess, onClose }: AuthFormsProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError('Authentication is not configured.');
      return;
    }
    const sb = supabase;

    try {
      setIsLoading(true);
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google login failed');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password || (mode === 'register' && !username)) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (!supabase) {
      setError('Authentication is not configured.');
      setIsLoading(false);
      return;
    }
    const sb = supabase;

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'register') {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
            },
          },
        });
        if (error) throw error;
        if (data.user) {
          // Auto login after register or show success message
          // For now, let's switch to login or auto-login if session is active
           if (data.session) {
             const userProfile = {
              email: data.user.email,
              username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
              id: data.user.id
            };
            onLoginSuccess(userProfile);
            onClose();
           } else {
             // Email confirmation required usually
             setError('Registration successful! Please check your email to verify your account.');
             setIsLoading(false);
           }
        }
      } else {
        // Login via Netlify Function (Cookie Auth)
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }

        if (data.user) {
          onLoginSuccess(data.user);
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-slate-400">
          {mode === 'login' 
            ? 'Enter your credentials to access your account' 
            : 'Join PlayHub and start your gaming journey'}
        </p>
      </div>

      {/* Social Login */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-900 rounded-xl hover:bg-slate-100 transition-colors font-medium text-sm disabled:opacity-50"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
          Google
        </button>
        <button
          disabled
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl border border-white/10 hover:bg-slate-700 transition-colors font-medium text-sm disabled:opacity-50 cursor-not-allowed"
        >
          <Github size={16} />
          GitHub
        </button>
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-950 px-2 text-slate-500">Or continue with</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-4"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {mode === 'register' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400 ml-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-10 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all"
                placeholder="Choose a username"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400 ml-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-10 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all"
              placeholder="name@example.com"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400 ml-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-10 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary-600 hover:bg-primary-500 text-white rounded-xl px-4 py-3 font-medium transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2 mt-6 group"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          {mode === 'login' ? (
            <>Don't have an account? <span className="text-primary-400 font-medium">Sign up</span></>
          ) : (
            <>Already have an account? <span className="text-primary-400 font-medium">Sign in</span></>
          )}
        </button>
      </div>
    </div>
  );
}
