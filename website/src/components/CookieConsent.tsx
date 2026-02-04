import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Check, Settings } from 'lucide-react';

export function CookieConsent() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState<{
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
  } | null>(null);

  useEffect(() => {
    const savedConsent = localStorage.getItem('playhub_cookie_consent');
    if (savedConsent) {
      setConsent(JSON.parse(savedConsent));
    } else {
      // Small delay before showing to not be annoying immediately
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const newConsent = { essential: true, analytics: true, marketing: true };
    saveConsent(newConsent);
  };

  const handleAcceptEssential = () => {
    const newConsent = { essential: true, analytics: false, marketing: false };
    saveConsent(newConsent);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newConsent = {
      essential: true,
      analytics: formData.get('analytics') === 'on',
      marketing: formData.get('marketing') === 'on',
    };
    saveConsent(newConsent);
  };

  const saveConsent = (newConsent: typeof consent) => {
    setConsent(newConsent);
    localStorage.setItem('playhub_cookie_consent', JSON.stringify(newConsent));
    setIsOpen(false);
    setShowSettings(false);
  };

  // If consent is already given, we don't show the banner, 
  // but we could expose a way to open settings via footer link (handled elsewhere)
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
        >
          <div className="max-w-4xl mx-auto bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8">
            {!showSettings ? (
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 text-primary-400 mb-2">
                    <Cookie size={24} />
                    <h3 className="font-bold text-white text-lg">We value your privacy</h3>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                    By clicking "Accept All", you consent to our use of cookies.
                    Read our <a href="#privacy" className="text-white hover:underline">Privacy Policy</a>.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <Settings size={16} />
                    Preferences
                  </button>
                  <button
                    onClick={handleAcceptEssential}
                    className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white transition-colors font-medium text-sm"
                  >
                    Reject All
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white transition-colors font-medium text-sm shadow-lg shadow-primary-500/20"
                  >
                    Accept All
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    <Settings size={20} className="text-primary-400" />
                    Cookie Preferences
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="pt-1">
                      <Check size={20} className="text-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white">Essential Cookies</span>
                        <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">Always Active</span>
                      </div>
                      <p className="text-sm text-slate-400">
                        Necessary for the website to function properly. These cannot be disabled.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer group hover:border-white/10 transition-colors">
                    <div className="pt-1">
                      <input type="checkbox" name="analytics" defaultChecked className="w-5 h-5 rounded border-white/20 bg-slate-900 text-primary-500 focus:ring-primary-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white group-hover:text-primary-400 transition-colors">Analytics Cookies</span>
                      </div>
                      <p className="text-sm text-slate-400">
                        Help us understand how visitors interact with the website.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer group hover:border-white/10 transition-colors">
                    <div className="pt-1">
                      <input type="checkbox" name="marketing" className="w-5 h-5 rounded border-white/20 bg-slate-900 text-primary-500 focus:ring-primary-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white group-hover:text-primary-400 transition-colors">Marketing Cookies</span>
                      </div>
                      <p className="text-sm text-slate-400">
                        Used to deliver relevant advertisements and track ad performance.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-6 py-2.5 rounded-lg text-slate-400 hover:text-white transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-colors text-sm font-medium"
                  >
                    Save Preferences
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
