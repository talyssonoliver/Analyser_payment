/**
 * Privacy Policy Page
 */

'use client';

import { ArrowLeft, Shield, Eye, Database, Lock, UserCheck, Globe, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-teal-700 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
            <p className="text-slate-600 text-lg">Last updated: August 2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Your Privacy Matters</h2>
            </div>
            <p className="text-slate-700 leading-relaxed">
              At Payment Analyzer Professional, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, protect, and handle your data when you use our service.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Information We Collect</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Personal Information</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Email address (for account creation and authentication)</li>
                  <li>Name (if provided during registration)</li>
                  <li>Account preferences and settings</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Usage Data</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Payment analysis data you upload or input</li>
                  <li>PDF documents processed through our service</li>
                  <li>Analysis results and calculations</li>
                  <li>Application usage patterns and preferences</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Technical Information</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>IP address and general location data</li>
                  <li>Browser type and version</li>
                  <li>Device information and screen resolution</li>
                  <li>Session data and authentication tokens</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-purple-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">How We Use Your Information</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>We use the collected information for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Providing and maintaining the Payment Analyzer service</li>
                <li>Processing your payment analysis requests</li>
                <li>Authenticating your account and ensuring security</li>
                <li>Storing your analysis history for future reference</li>
                <li>Improving our service through usage analytics</li>
                <li>Communicating important service updates</li>
                <li>Providing customer support when requested</li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Lock className="w-4 h-4 text-red-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Data Security</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>We implement industry-standard security measures to protect your information:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>End-to-end encryption for data transmission</li>
                <li>Secure database storage with access controls</li>
                <li>Regular security audits and updates</li>
                <li>Multi-factor authentication support</li>
                <li>Row-level security policies in our database</li>
                <li>Automated backups with encryption at rest</li>
                <li>Limited employee access on a need-to-know basis</li>
              </ul>
            </div>
          </section>

          {/* Data Retention */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Database className="w-4 h-4 text-orange-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Data Retention</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>We retain your information only as long as necessary:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Account data: Retained while your account is active</li>
                <li>Analysis data: Stored until you delete it or close your account</li>
                <li>Usage analytics: Anonymized and retained for service improvement</li>
                <li>Security logs: Retained for up to 90 days for security purposes</li>
                <li>Deleted data: Permanently removed within 30 days of deletion request</li>
              </ul>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-teal-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Your Rights</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>You have the following rights regarding your personal data:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Access:</strong> Request copies of your personal data</li>
                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                <li><strong>Portability:</strong> Request transfer of your data</li>
                <li><strong>Restriction:</strong> Request limitation of data processing</li>
                <li><strong>Objection:</strong> Object to certain data processing activities</li>
                <li><strong>Withdraw consent:</strong> Withdraw consent for data processing</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, please contact us through the application&apos;s settings or support system.
              </p>
            </div>
          </section>

          {/* Data Sharing */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Data Sharing</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following limited circumstances:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations or court orders</li>
                <li>To protect our rights, property, or safety</li>
                <li>With trusted service providers who assist in operating our service (under strict confidentiality agreements)</li>
                <li>In connection with a business transfer or merger (with prior notice)</li>
              </ul>
              <p className="mt-4">
                We never share your payment analysis data or personal documents with any third parties for marketing or commercial purposes.
              </p>
            </div>
          </section>

          {/* Cookies and Tracking */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Eye className="w-4 h-4 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Cookies and Tracking</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>We use cookies and similar technologies for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maintaining your session and authentication state</li>
                <li>Remembering your preferences and settings</li>
                <li>Analyzing usage patterns to improve our service</li>
                <li>Ensuring security and preventing fraud</li>
              </ul>
              <p className="mt-4">
                Most cookies are essential for the service to function properly. You can control non-essential cookies through your browser settings, though this may limit some functionality.
              </p>
            </div>
          </section>

          {/* Children's Privacy */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-pink-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Children&apos;s Privacy</h2>
            </div>
            <p className="text-slate-700 leading-relaxed">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us so we can delete such information.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-gray-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Changes to This Policy</h2>
            </div>
            <p className="text-slate-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. We encourage you to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-slate-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Contact Us</h2>
            </div>
            <div className="text-slate-700 leading-relaxed space-y-4">
              <p>
                If you have any questions about this Privacy Policy or how we handle your personal information, please contact us through:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>The feedback system within the application</li>
                <li>Your account settings and support options</li>
                <li>The contact form available in the app</li>
              </ul>
              <p>
                We are committed to resolving any privacy concerns you may have and will respond to your inquiries promptly.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-500">
            Your privacy is protected with Payment Analyzer Professional
          </p>
        </div>
      </div>
    </div>
  );
}