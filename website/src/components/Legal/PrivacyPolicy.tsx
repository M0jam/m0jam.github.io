import { ArrowLeft } from 'lucide-react';

export function PrivacyPolicy() {
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
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Privacy Policy</h1>
        <p className="text-xl text-slate-400 mb-12">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            We collect information you provide directly to us when you use PlayHub. This includes:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li>Account information (if you choose to create an account);</li>
            <li>Usage data and preferences;</li>
            <li>Technical information about your device and connection.</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li>Provide, maintain, and improve our services;</li>
            <li>Process your requests and send you related information;</li>
            <li>Monitor and analyze trends, usage, and activities in connection with our services;</li>
            <li>Personalize and improve the services and provide content or features that match user profiles or interests.</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">3. Cookies and Tracking Technologies</h2>
          <p className="text-slate-400 leading-relaxed">
            We use cookies and similar tracking technologies to track the activity on our Service and hold certain information.
            Cookies are files with small amount of data which may include an anonymous unique identifier.
            You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">4. Data Security</h2>
          <p className="text-slate-400 leading-relaxed">
            The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure.
            While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">5. Third-Party Services</h2>
          <p className="text-slate-400 leading-relaxed">
            We may employ third party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, to perform Service-related services or to assist us in analyzing how our Service is used.
            These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">6. Contact Us</h2>
          <p className="text-slate-400 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us via our GitHub repository.
          </p>
        </section>
      </div>
    </div>
  );
}
