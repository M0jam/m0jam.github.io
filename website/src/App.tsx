import React from 'react';
import { Download, Github, Layers, Zap, Search, Users, Globe, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

function App() {
  const downloadUrl = "https://github.com/M0jam/m0jam.github.io/releases/download/v1.0.4/PlayHub-Setup-1.0.4.exe";
  const repoUrl = "https://github.com/M0jam/m0jam.github.io";

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="PlayHub Logo" className="w-10 h-10" />
            <span className="text-xl font-bold tracking-tight">PlayHub</span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href={repoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
            >
              <Github size={24} />
            </a>
            <a 
              href={downloadUrl}
              className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-full font-medium transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] flex items-center gap-2"
            >
              <Download size={18} />
              Download
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary-500/20 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent">
              All your games.<br />One library.
            </h1>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              PlayHub brings your Steam, Epic, and GOG libraries into a single, beautiful interface. 
              Stop searching, start playing.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href={downloadUrl}
                className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] flex items-center justify-center gap-3"
              >
                <Monitor />
                Download for Windows
              </a>
              <a 
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-bold text-lg transition-all hover:scale-105 flex items-center justify-center gap-3"
              >
                <Github />
                View Source
              </a>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              v1.0.4 • Windows 10/11 • macOS & Linux coming soon
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6 bg-slate-950 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Layers className="text-primary-400" />}
              title="Unified Library"
              description="Automatically syncs installed games from Steam, Epic Games, and GOG Galaxy. No more switching launchers."
            />
            <FeatureCard 
              icon={<Zap className="text-blue-400" />}
              title="Lightning Fast"
              description="Built with Electron and React for maximum performance. Launches instantly and uses minimal resources."
            />
            <FeatureCard 
              icon={<Search className="text-emerald-400" />}
              title="Smart Search"
              description="Find what to play with advanced filtering, tags, and a 'What to Play' randomizer."
            />
            <FeatureCard 
              icon={<Users className="text-pink-400" />}
              title="Social Hub"
              description="See what your friends are playing across platforms. Discord Rich Presence integration included."
            />
            <FeatureCard 
              icon={<Globe className="text-amber-400" />}
              title="Rich Metadata"
              description="Powered by HowLongToBeat and IGDB. See playtime estimates, genres, and ratings at a glance."
            />
            <FeatureCard 
              icon={<Monitor className="text-cyan-400" />}
              title="Couch Mode"
              description="Switch to a controller-friendly interface designed for big screens and relaxing gaming sessions."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 opacity-50">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 grayscale" />
            <span className="font-semibold">PlayHub</span>
          </div>
          <div className="text-slate-500 text-sm">
            © {new Date().getFullYear()} PlayHub. Open source under MIT License.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-primary-500/30 hover:bg-white/10 transition-all group">
      <div className="mb-6 p-4 rounded-2xl bg-slate-950 w-fit group-hover:scale-110 transition-transform duration-300">
        {React.cloneElement(icon as React.ReactElement, { size: 32 })}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  )
}

export default App;
