'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UserDataDeletionPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 mb-4 hover:opacity-80">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-4xl font-bold">Delete Your Data</h1>
          <p className="text-primary-100 mt-2">We respect your privacy and your right to be forgotten</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Your Right to Data Deletion</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              At Automify AI, we respect your privacy and your right to control your personal data. We understand that you may want to delete your account and all associated data from our platform. This page provides instructions on how to request data deletion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Data Deletion Request Process</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Follow these steps to request deletion of your account and personal data:
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 mb-6">
              <ol className="space-y-4">
                <li className="flex gap-4">
                  <span className="flex-shrink-0 bg-blue-500 text-white w-8 h-8 flex items-center justify-center rounded-full font-semibold">1</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">Send an Email</p>
                    <p className="text-gray-600 dark:text-gray-400">Send an email to: <strong>support@automifyyai.com</strong></p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 bg-blue-500 text-white w-8 h-8 flex items-center justify-center rounded-full font-semibold">2</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">Use Subject Line</p>
                    <p className="text-gray-600 dark:text-gray-400">Subject: <strong>"Data Deletion Request"</strong></p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 bg-blue-500 text-white w-8 h-8 flex items-center justify-center rounded-full font-semibold">3</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">Provide Identification</p>
                    <p className="text-gray-600 dark:text-gray-400">Include your account email address, phone number, or connected social media ID (Facebook/Instagram/WhatsApp)</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 bg-blue-500 text-white w-8 h-8 flex items-center justify-center rounded-full font-semibold">4</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">Verification</p>
                    <p className="text-gray-600 dark:text-gray-400">We may request additional information to verify your identity for security purposes</p>
                  </div>
                </li>
              </ol>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">What Gets Deleted</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              When you request data deletion, we will remove:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
              <li>Your account profile and credentials</li>
              <li>Personal information (email, phone, name, etc.)</li>
              <li>All conversations and messages</li>
              <li>Campaign and lead data</li>
              <li>Billing and payment information</li>
              <li>Integration credentials and tokens</li>
              <li>Analytics and activity logs</li>
              <li>Any other data associated with your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Processing Timeline</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We will process your data deletion request within <strong>7 business days</strong> of receipt. You will receive a confirmation email once your data has been deleted.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Please note that some data may be retained for legal, compliance, or backup purposes as required by applicable laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Important Information</h2>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                <strong>Please Note:</strong>
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                <li>This action is irreversible – once deleted, your data cannot be recovered</li>
                <li>You will lose access to your account immediately</li>
                <li>Active subscriptions will be terminated</li>
                <li>Any ongoing campaigns will be stopped</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Alternative: Download Your Data</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Before requesting deletion, you may want to download a copy of your data for your records. To do this, please contact us at <strong>support@automifyyai.com</strong> with the subject line <strong>"Data Export Request"</strong>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Questions or Need Help?</h2>
            <p className="text-gray-600 dark:text-gray-400">
              If you have any questions about the data deletion process or need assistance, please don't hesitate to contact us at:
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              <strong>Automify AI Support</strong><br />
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
