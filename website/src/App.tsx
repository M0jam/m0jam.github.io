import React, { useState, useEffect } from 'react';
import { Download, Github, Layers, Zap, Search, Users, Globe, Monitor, Star, Check, Twitter, MessageCircle, Heart, Play, Loader2, Home, Newspaper, Settings, LayoutGrid, LogIn } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { AuthModal } from './components/AuthModal';
import { ProfileTab } from './components/ProfileTab';
import { supabase } from './lib/supabaseClient';

const games = [
  { id: 1, title: "Cyberpunk 2077", cover: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/library_600x900.jpg", year: 2020, developer: "CD Projekt Red", rating: 4.5 },
  { id: 2, title: "Elden Ring", cover: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/library_600x900.jpg", year: 2022, developer: "FromSoftware", rating: 4.8 },
  { id: 3, title: "Hades", cover: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1145360/library_600x900.jpg", year: 2020, developer: "Supergiant Games", rating: 4.9 },
  { id: 4, title: "Stardew Valley", cover: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/413150/library_600x900.jpg", year: 2016, developer: "ConcernedApe", rating: 4.9 },
  { id: 5, title: "Hollow Knight", cover: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/367520/library_600x900.jpg", year: 2017, developer: "Team Cherry", rating: 4.9 },
  { id: 6, title: "The Witcher 3", cover: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/library_600x900.jpg", year: 2015, developer: "CD Projekt Red", rating: 4.9 },
];

function App() {
  const downloadUrl = "https://github.com/M0jam/m0jam.github.io/releases/download/v1.0.4/PlayHub-Setup-1.0.4.exe";
  const repoUrl = "https://github.com/M0jam/m0jam.github.io";
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<{ username: string; email: string; id?: string } | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'profile'>('home');

  useEffect(() => {
    // Check for initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          id: session.user.id
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          id: session.user.id
        });
      } else {
        setUser(null);
        setCurrentView('home');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js';
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      if (window.kofiwidget2) {
        // @ts-ignore
        window.kofiwidget2.init('Buy me a Coffee', '#fafafa', 'D1D71M4YEA');
        // @ts-ignore
        window.kofiwidget2.draw();
      }
    };
    document.body.appendChild(script);
    return () => {
      // Cleanup if needed
    };
  }, []);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setIsAuthOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // State update handled by onAuthStateChange
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary-500/30 overflow-x-hidden flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button 
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img src="/logo.png" alt="PlayHub Logo" className="w-10 h-10" />
            <span className="text-xl font-bold tracking-tight">PlayHub</span>
          </button>
          <div className="flex items-center gap-4">
            <a 
              href={repoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden sm:flex p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
            >
              <Github size={24} />
            </a>

            {user ? (
              <button 
                onClick={() => setCurrentView('profile')}
                className={`flex items-center gap-3 pl-4 border-l border-white/10 transition-colors ${currentView === 'profile' ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              >
                <span className="text-sm font-medium text-slate-300 hidden sm:block">{user.username}</span>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                  {user.username[0].toUpperCase()}
                </div>
              </button>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                <LogIn size={16} />
                Sign In
              </button>
            )}

            <a 
              href={downloadUrl}
              className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-full font-medium transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] flex items-center gap-2"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Download</span>
            </a>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isAuthOpen && (
          <AuthModal 
            isOpen={isAuthOpen} 
            onClose={() => setIsAuthOpen(false)} 
            onLoginSuccess={handleLoginSuccess}
          />
        )}
      </AnimatePresence>

      <div className="flex-1">
        {currentView === 'profile' ? (
          <ProfileTab user={user} onLogOut={handleLogout} />
        ) : (
          <>
            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden">
              {/* Dynamic Background */}
              <motion.div style={{ y: y1 }} className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-500/10 blur-[100px] rounded-full -z-10" />
              <motion.div style={{ y: y2 }} className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/10 blur-[100px] rounded-full -z-10" />
              
              <div className="max-w-7xl mx-auto text-center relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium text-slate-300">Open Source Community</span>
                  </div>

                  <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent leading-tight">
                    All your games.<br />One library.
                  </h1>
                  <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                    PlayHub unifies your Steam, Epic, and GOG libraries into a single, stunning interface. 
                    Stop searching, start playing.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                    <motion.a 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      href={downloadUrl}
                      className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold text-lg shadow-[0_0_40px_rgba(139,92,246,0.3)] flex items-center justify-center gap-3"
                    >
                      <Monitor />
                      Download for Windows
                    </motion.a>
                    <motion.a 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      href={repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3"
                    >
                      <Github />
                      View Source
                    </motion.a>
                  </div>

                  {/* App Mockup */}
                  <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="relative mx-auto max-w-5xl rounded-xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden aspect-video group select-none"
                  >
                    {/* Window Controls */}
                    <div className="absolute top-0 left-0 right-0 h-10 bg-slate-900 border-b border-white/5 flex items-center justify-between px-4 z-20">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                      </div>
                      <div className="flex items-center gap-2 opacity-50">
                         <div className="w-32 h-6 rounded bg-white/5" />
                      </div>
                    </div>
                    
                    {/* UI Content Mockup */}
                    <div className="absolute top-10 inset-0 flex">
                      {/* Sidebar */}
                      <div className="w-64 bg-slate-950/80 border-r border-white/5 p-4 flex flex-col gap-6 hidden md:flex">
                        <div className="flex items-center gap-3 px-2">
                           <div className="w-8 h-8 rounded-lg bg-primary-600/20 border border-primary-500/30" />
                           <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                        </div>
                        
                        <div className="space-y-1">
                          <SidebarItem icon={<Home size={18} />} label="Home" active />
                          <SidebarItem icon={<LayoutGrid size={18} />} label="Library" />
                          <SidebarItem icon={<Newspaper size={18} />} label="News" />
                          <SidebarItem icon={<Users size={18} />} label="Friends" />
                        </div>
                        
                        <div className="mt-auto">
                          <SidebarItem icon={<Settings size={18} />} label="Settings" />
                        </div>
                      </div>
                      
                      {/* Main Content */}
                      <div className="flex-1 p-8 bg-slate-950/50 overflow-hidden relative">
                         {/* Header */}
                         <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-white">Library</h2>
                            <div className="flex gap-3">
                               <div className="w-8 h-8 rounded-full bg-white/5" />
                               <div className="w-8 h-8 rounded-full bg-white/5" />
                            </div>
                         </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          {games.map((game) => (
                            <motion.div 
                              key={game.id} 
                              whileHover={{ scale: 1.02, y: -5 }}
                              className="aspect-[2/3] rounded-xl bg-slate-800 border border-white/5 relative group/card cursor-pointer overflow-hidden shadow-lg"
                            >
                               <img 
                                 src={game.cover} 
                                 alt={game.title}
                                 loading="lazy"
                                 className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                               />
                               
                               {/* Gradient Overlay */}
                               <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent opacity-60 group-hover/card:opacity-90 transition-opacity" />
                               
                               {/* Play Button Overlay */}
                               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                                 <div className="w-14 h-14 rounded-full bg-primary-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] transform scale-0 group-hover/card:scale-100 transition-transform duration-300">
                                   <Play fill="white" className="ml-1 w-6 h-6" />
                                 </div>
                               </div>
                               
                              {/* Metadata */}
                              <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
                                 <h3 className="text-white font-bold text-lg leading-tight mb-2 truncate drop-shadow-md">{game.title}</h3>
                                 <div className="flex items-center justify-between text-xs font-medium">
                                    <span className="text-slate-300 bg-black/40 px-2 py-1 rounded backdrop-blur-sm border border-white/5">{game.year}</span>
                                    <div className="flex items-center gap-1.5 text-slate-300 bg-black/40 px-2 py-1 rounded backdrop-blur-sm border border-white/5">
                                       <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                       <span>{game.rating}</span>
                                    </div>
                                 </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none z-10" />
                  </motion.div>
                </motion.div>
              </div>
            </section>

            {/* Stats Section */}
            <div className="border-y border-white/5 bg-white/[0.02]">
              <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
                <StatItem label="Platforms" value="3+" />
                <StatItem label="Games Supported" value="Unlimited" />
                <StatItem label="Open Source" value="100%" />
              </div>
            </div>

            {/* Features Grid */}
            <section className="py-32 px-6 bg-slate-950 relative">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-20">
                  <h2 className="text-4xl md:text-5xl font-bold mb-6">Built for Gamers</h2>
                  <p className="text-xl text-slate-400 max-w-2xl mx-auto">Everything you need to manage your collection, without the bloat.</p>
                </div>
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

            {/* How It Works */}
            <section className="py-32 px-6 bg-slate-900/30 relative">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-20">
                  <h2 className="text-4xl md:text-5xl font-bold mb-6">How It Works</h2>
                  <p className="text-xl text-slate-400">Get started in less than 2 minutes.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                  {/* Connecting Line */}
                  <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
                  
                  <StepCard 
                    number="01"
                    title="Download & Install"
                    description="Get the latest version of PlayHub for Windows. Setup is quick and bloat-free."
                  />
                  <StepCard 
                    number="02"
                    title="Connect Accounts"
                    description="Sign in securely to Steam, Epic, and GOG. We never store your credentials."
                  />
                  <StepCard 
                    number="03"
                    title="Start Playing"
                    description="Your library syncs automatically. Launch any game from one beautiful dashboard."
                  />
                </div>
              </div>
            </section>

            {/* Comparison Table */}
            <section className="py-32 px-6">
              <div className="max-w-4xl mx-auto bg-slate-900/50 rounded-3xl border border-white/5 p-8 md:p-12">
                <h2 className="text-3xl font-bold mb-12 text-center">Why choose PlayHub?</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-4 text-left">Feature</th>
                        <th className="py-4 text-center text-primary-400">PlayHub</th>
                        <th className="py-4 text-center text-slate-500">Others</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <ComparisonRow feature="Unified Library" />
                      <ComparisonRow feature="No Ads / Bloatware" />
                      <ComparisonRow feature="Open Source" />
                      <ComparisonRow feature="Couch Mode" />
                      <ComparisonRow feature="HowLongToBeat Data" />
                      <ComparisonRow feature="Memory Usage" value="< 150MB" otherValue="> 400MB" />
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Newsletter / CTA */}
            <section className="py-32 px-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-primary-600/10 blur-[100px] -z-10" />
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to organize your chaos?</h2>
                <p className="text-xl text-slate-400 mb-12">Join thousands of gamers who have simplified their library.</p>
                
                <NewsletterForm />

                <div className="flex items-center justify-center gap-8 text-slate-400 mt-16">
                  <a href="#" className="hover:text-white transition-colors"><Twitter /></a>
                  <a href="#" className="hover:text-white transition-colors"><Github /></a>
                  <a href="#" className="hover:text-white transition-colors"><MessageCircle /></a>
                  <a href="#" className="hover:text-white transition-colors"><Heart /></a>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity duration-300">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 grayscale hover:grayscale-0 transition-all" />
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

function SidebarItem({ icon, label, active }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${active ? 'bg-primary-600/10 text-primary-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-primary-500/30 hover:bg-white/10 transition-all group cursor-default"
    >
      <div className="mb-6 p-4 rounded-2xl bg-slate-950 w-fit group-hover:scale-110 transition-transform duration-300 shadow-lg border border-white/5">
        {React.cloneElement(icon as React.ReactElement, { size: 32 })}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-slate-400 leading-relaxed">
        {description}
      </p>
    </motion.div>
  )
}

function StepCard({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="relative z-10 text-center px-4">
      <div className="w-16 h-16 mx-auto bg-slate-950 border border-primary-500/30 rounded-2xl flex items-center justify-center text-2xl font-bold text-primary-400 mb-6 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
        {number}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  )
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <div className="text-4xl font-bold text-white mb-2">{value}</div>
      <div className="text-slate-500 font-medium uppercase tracking-wider text-sm">{label}</div>
    </div>
  )
}

function ComparisonRow({ feature, value, otherValue }: { feature: string, value?: string, otherValue?: string }) {
  return (
    <tr>
      <td className="py-4 font-medium text-slate-300">{feature}</td>
      <td className="py-4 text-center">
        {value ? <span className="font-bold text-primary-400">{value}</span> : <Check className="inline text-primary-400" />}
      </td>
      <td className="py-4 text-center text-slate-600">
        {otherValue ? <span>{otherValue}</span> : <div className="w-1.5 h-1.5 rounded-full bg-slate-700 mx-auto" />}
      </td>
    </tr>
  )
}

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');

    try {
      // In a real Netlify deployment, this calls the function.
      // For static demo, we might simulate success if function not found, but we will implement the function.
      const res = await fetch('/.netlify/functions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        throw new Error('Failed to subscribe');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto p-6 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 flex items-center gap-3 justify-center"
      >
        <Check size={20} />
        <span className="font-medium">Thanks for subscribing! Check your inbox.</span>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mb-16 relative">
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email for updates" 
        className="px-6 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary-500 w-full disabled:opacity-50"
        disabled={status === 'loading'}
        required
      />
      <button 
        type="submit"
        disabled={status === 'loading'}
        className="px-8 py-4 bg-white text-slate-950 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
      >
        {status === 'loading' ? <Loader2 className="animate-spin" /> : 'Subscribe'}
      </button>
      
      {status === 'error' && (
        <div className="absolute -bottom-8 left-0 right-0 text-red-400 text-sm font-medium">
          Something went wrong. Please try again.
        </div>
      )}
    </form>
  );
}

export default App;
