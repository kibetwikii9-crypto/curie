import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Data Deletion',
  description: 'User data deletion instructions for Automify.',
};

export default function UserDataDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-sm leading-7 text-gray-800">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">
        User Data Deletion Instructions for automify
      </h1>

      <p className="mb-4">
        If you would like to delete your data from automify, follow these steps:
      </p>

      <ol className="mb-6 list-decimal space-y-2 pl-6">
        <li>Send an email to: hellenmueni05@gmail.com</li>
        <li>Use the subject: "Data Deletion Request"</li>
        <li>Include your account email or Facebook/Instagram ID</li>
      </ol>

      <p className="mb-4">
        We will process your request and delete your data within 7 days.
      </p>

      <p>If you have any questions, contact us at: hellenmueni05@gmail.com</p>
    </main>
  );
}
