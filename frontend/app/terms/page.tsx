'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 mb-4 hover:opacity-80">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-4xl font-bold">Terms of Service</h1>
          <p className="text-primary-100 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">1. Agreement to Terms</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              By accessing and using Automify AI ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">2. Use License</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Permission is granted to temporarily download one copy of the materials (information or software) on Automify AI for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software contained on the Service</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transmitting the materials over any public or private network</li>
              <li>Violating any applicable laws or regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">3. Disclaimer</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The materials on Automify AI are provided on an 'as is' basis. Automify AI makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">4. Limitations</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              In no event shall Automify AI or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Automify AI.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">5. Accuracy of Materials</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The materials appearing on Automify AI could include technical, typographical, or photographic errors. Automify AI does not warrant that any of the materials on the Service are accurate, complete, or current. Automify AI may make changes to the materials contained on the Service at any time without notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">6. Links</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Automify AI has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Automify AI of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">7. Modifications</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Automify AI may revise these terms of service for the website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">8. Governing Law</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which Automify AI operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">9. User Accounts</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">10. User Conduct</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You agree not to engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Service, or which, as determined by us, may harm us or users of the Service. Prohibited behavior includes:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
              <li>Harassing or causing distress or inconvenience to any person</li>
              <li>Transmitting obscene or offensive content</li>
              <li>Disrupting the normal flow of dialogue within our website</li>
              <li>Attempting to gain unauthorized access to our systems</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">11. Contact Us</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Automify AI</strong><br />
              Email: support@automifyyai.com<br />
              Website: https://www.automifyyai.com
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>© {new Date().getFullYear()} Automify AI. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="/privacy-policy" className="hover:text-primary-600 dark:hover:text-primary-400">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-primary-600 dark:hover:text-primary-400">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
