'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 mb-4 hover:opacity-80">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
          <p className="text-primary-100 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Introduction</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Automify AI ("we" or "us" or "our") operates the Automify AI website. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our service and the choices you have associated with that data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">1. Information Collection and Use</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We collect several different types of information for various purposes to provide and improve our Service to you.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Types of Data Collected</h3>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4 mb-4">
              <li><strong>Personal Data:</strong> Account details, email address, phone number, name, and profile information</li>
              <li><strong>Usage Data:</strong> Browser type, IP address, pages visited, time spent, and other diagnostic data</li>
              <li><strong>Conversation Data:</strong> Messages exchanged through our platform for AI training and improvement</li>
              <li><strong>Device Information:</strong> Device ID, operating system, and mobile network information</li>
              <li><strong>Payment Information:</strong> Processed securely through payment processors; we don't store full card details</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">2. Use of Data</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Automify AI uses the collected data for various purposes:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To allow you to participate in interactive features of our Service</li>
              <li>To provide customer support and respond to your inquiries</li>
              <li>To gather analysis or valuable information to improve our Service</li>
              <li>To monitor the usage of our Service</li>
              <li>To detect, prevent, and address technical and security issues</li>
              <li>To improve and optimize our AI models and algorithms</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">3. Security of Data</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">4. Service Providers</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We may employ third-party companies and individuals to facilitate our Service, provide the Service on our behalf, perform Service-related services, or assist us in analyzing how our Service is used. These third parties have access to your personal data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">5. Links to Other Sites</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Our Service may contain links to other sites that are not operated by us. If you click on a third-party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">6. Children's Privacy</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Our Service does not address anyone under the age of 18 ("Children"). We do not knowingly collect personally identifiable information from children under 18. If we become aware that a child has provided us with personal data, we immediately delete such information from our servers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">7. Changes to This Privacy Policy</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">8. Your Data Rights</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
              <li>The right to access – You have the right to request copies of your personal data</li>
              <li>The right to rectification – You have the right to request correction of inaccurate data</li>
              <li>The right to erasure – You have the right to request deletion of your data</li>
              <li>The right to restrict processing – You have the right to request restriction of processing</li>
              <li>The right to object to processing – You have the right to object to our processing</li>
              <li>The right to data portability – You have the right to request transfer of your data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">9. Contact Us</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              If you have any questions about this Privacy Policy, please contact us at:
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
