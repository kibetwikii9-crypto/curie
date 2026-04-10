import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Simple privacy policy for Automify.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-sm leading-7 text-gray-800">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Privacy Policy</h1>

      <p className="mb-4">
        Effective date: April 10, 2026
      </p>

      <p className="mb-4">
        We collect only the information needed to provide and improve our service, such as account details,
        messages, and usage data.
      </p>

      <p className="mb-4">
        We use your data to operate the platform, respond to support requests, and maintain security. We do not
        sell your personal information.
      </p>

      <p className="mb-4">
        We may use trusted third-party providers (such as hosting, analytics, and payment services) to run the
        product. These providers process data only as needed to provide their services.
      </p>

      <p className="mb-4">
        You can request access, correction, or deletion of your information by contacting us.
      </p>

      <p className="mb-4">
        Contact: support@automifyyai.com
      </p>

      <p className="text-gray-600">
        We may update this policy from time to time. Continued use of the service means you accept the latest
        version.
      </p>
    </main>
  );
}
