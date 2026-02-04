import { ArrowLeft } from 'lucide-react';

export function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={() => window.location.hash = ''}
        className="flex items-center gap-2 text-primary-400 hover:text-primary-300 mb-8 transition-colors"
      >
        <ArrowLeft size={20} />
        Back to Home
      </button>

      <div className="prose prose-invert prose-lg max-w-none">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Terms of Service</h1>
        <p className="text-xl text-slate-400 mb-12">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
          <p className="text-slate-400 leading-relaxed">
            By accessing and using PlayHub ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
            If you do not agree to abide by these terms, please do not use the Service.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
          <p className="text-slate-400 leading-relaxed">
            PlayHub is a unified game launcher that allows users to manage their game libraries from various platforms. 
            The Service is provided "as is" and is free to use.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">3. User Conduct</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            You agree to use the Service only for purposes that are legal, proper and in accordance with these Terms and any applicable policies or guidelines.
            You agree that you will not:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li>Use the Service for any illegal or unauthorized purpose;</li>
            <li>Attempt to hack, destabilize or adapt the Service or alter another website so as to falsely imply that it is associated with the Service;</li>
            <li>Transmit any worms or viruses or any code of a destructive nature.</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">4. Intellectual Property</h2>
          <p className="text-slate-400 leading-relaxed">
            PlayHub is open source software. The code is available under the MIT License. 
            Game artwork and metadata displayed within the application are the property of their respective owners.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">5. Disclaimer of Warranties</h2>
          <p className="text-slate-400 leading-relaxed">
            The Service is provided on an "as is" and "as available" basis. We expressly disclaim all warranties of any kind, whether express or implied, including, but not limited to the implied warranties of merchantability, fitness for a particular purpose and non-infringement.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">6. Limitation of Liability</h2>
          <p className="text-slate-400 leading-relaxed">
            In no event shall PlayHub, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
          </p>
        </section>
      </div>
    </div>
  );
}
