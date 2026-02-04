import React from 'react';
import { Github, Twitter, Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <img src="/logo.png" alt="PlayHub Logo" className="w-10 h-10" />
              <span className="text-xl font-bold tracking-tight text-white">PlayHub</span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-sm mb-6">
              The ultimate unified game launcher. Connect your libraries, track your playtime, and discover your next favorite game.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://github.com/M0jam/m0jam.github.io" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-white mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a href="#" className="hover:text-primary-400 transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">Download</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">Changelog</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">Roadmap</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-white mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li>
                <a href="#terms" onClick={() => window.location.hash = 'terms'} className="hover:text-primary-400 transition-colors cursor-pointer">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#privacy" onClick={() => window.location.hash = 'privacy'} className="hover:text-primary-400 transition-colors cursor-pointer">
                  Privacy Policy
                </a>
              </li>
              <li>
                <button onClick={() => localStorage.removeItem('playhub_cookie_consent') || window.location.reload()} className="hover:text-primary-400 transition-colors text-left">
                  Cookie Settings
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-slate-500 text-sm">
            © {currentYear} PlayHub. Open source under MIT License.
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-white/5 px-4 py-2 rounded-full border border-white/5">
            <span>Credits:</span>
            <span className="font-medium text-slate-300">Mojam</span>
            <span className="text-slate-600">&</span>
            <span className="font-medium text-slate-300">Trae</span>
            <Heart size={14} className="text-red-500/80 fill-red-500/20 ml-1" />
          </div>
        </div>
      </div>
    </footer>
  );
}
