import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-sans selection:bg-cyan-500/30">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        
        {/* Header */}
        <div className="mb-10">
          <Link 
            href="/login" 
            className="inline-flex items-center text-sm text-neutral-500 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-neutral-500">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-neutral max-w-none space-y-10">
          
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              Welcome to <strong>MayaGen</strong> ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. 
              This Privacy Policy explains how we collect, use, disclosure, and safeguard your information when you visit our website 
              <span className="text-indigo-400"> https://mayagen.fun</span> and use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <p>
              We collect information that you strictly provide to us when creating an account or using our services.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-400">
              <li>
                <strong>Personal Information:</strong> When you sign in using Google, we collect your name, email address, and profile picture URL.
              </li>
              <li>
                <strong>Usage Data:</strong> We may collect information about how you access and use the service, such as your IP address, browser type, and operating system, for security and analytics purposes.
              </li>
              <li>
                <strong>Generated Content:</strong> Images and text prompts you engage with on our platform.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <p>
              We use the collected information for the following purposes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-400">
              <li>To provide and maintain our Service.</li>
              <li>To manage your account and authentication via Google OAuth.</li>
              <li>To improve and personalize user experience.</li>
              <li>To prevent fraud and ensure security.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Google User Data</h2>
            <p>
              Our use of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.
            </p>
            <p className="mt-2">
              We does <strong>not</strong> share your personal data with third-party tools for AI models training purposes without your explicit consent.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Data Retention</h2>
            <p>
              We retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy. You can request deletion of your account and data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2 text-indigo-400">
              support@mayagen.fun
            </p>
          </section>

        </div>
        
        {/* Footer */}
        <div className="mt-20 pt-10 border-t border-neutral-800 text-center text-sm text-neutral-600">
          &copy; {new Date().getFullYear()} MayaGen. All rights reserved.
        </div>
      </div>
    </div>
  );
}
