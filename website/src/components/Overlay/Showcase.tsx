import { motion } from 'framer-motion';
import { Star, Trophy, Zap, Gamepad2 } from 'lucide-react';

export function Showcase() {
  const features = [
    {
      icon: <Gamepad2 className="w-6 h-6 text-purple-400" />,
      title: "Universal Library",
      description: "Connect Steam, Epic, GOG, and more in one place."
    },
    {
      icon: <Trophy className="w-6 h-6 text-yellow-400" />,
      title: "Achievement Tracking",
      description: "Track your progress across all platforms seamlessly."
    },
    {
      icon: <Zap className="w-6 h-6 text-blue-400" />,
      title: "Instant Launch",
      description: "Jump into your games faster with optimized launching."
    }
  ];

  return (
    <div className="h-full bg-slate-900/50 p-8 flex flex-col justify-center relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10"
      >
        <h2 className="text-3xl font-bold text-white mb-2">Welcome to PlayHub</h2>
        <p className="text-slate-400 mb-12">Your ultimate gaming destination.</p>

        <div className="space-y-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex items-start gap-4 group"
            >
              <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5 group-hover:border-primary-500/30 transition-colors">
                {feature.icon}
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1 group-hover:text-primary-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 pt-8 border-t border-white/5 flex items-center gap-4"
        >
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-xs text-white">
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-500">
            <span className="text-white font-semibold">4.9/5</span> rating from our community
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
