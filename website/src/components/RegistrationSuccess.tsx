import { useEffect, useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';

export function RegistrationSuccess({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Sequence of animations
    const t1 = setTimeout(() => setStep(1), 100); // Start checkmark
    const t2 = setTimeout(() => setStep(2), 800); // Show text

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleContinue = () => {
    setStep(3); // Fade out
    setTimeout(onComplete, 500); // Wait for fade out then complete
  };

  return (
    <div className={`absolute inset-0 z-[100] flex items-center justify-center bg-slate-950 transition-opacity duration-500 rounded-2xl ${step >= 3 ? 'opacity-0' : 'opacity-100'}`}>
        <div className="text-center px-4">
            <div className={`relative mx-auto mb-8 w-24 h-24 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) transform ${step >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                <div className={`absolute inset-0 rounded-full border border-emerald-500/30 animate-[ping_2s_ease-in-out_infinite] opacity-30`}></div>
                <Check className={`w-10 h-10 text-emerald-400 transition-all duration-500 delay-200 ${step >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} strokeWidth={3} />
            </div>
            
            <div className={`transition-all duration-700 delay-300 transform ${step >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-3">Welcome Aboard!</h1>
                <p className="text-lg text-slate-400 mb-8 max-w-md mx-auto">Your account has been successfully created. You can now access all features.</p>
                
                <button 
                    onClick={handleContinue}
                    className={`group relative inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium transition-all duration-500 transform ${step >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 delay-500'}`}
                >
                    Continue to PlayHub
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 transition-all"></div>
                </button>
            </div>
        </div>
        
        {/* Background ambient effect */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none rounded-2xl">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(16,185,129,0.05),transparent_70%)]"></div>
             <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse"></div>
             <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse animation-delay-2000"></div>
        </div>
    </div>
  );
}
