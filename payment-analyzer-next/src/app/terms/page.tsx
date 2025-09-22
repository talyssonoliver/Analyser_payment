/**
 * Terms of Service Page
 */

'use client';

import { ArrowLeft, FileText, Shield, Users, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TermsPage() {
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
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Terms of Service</h1>
            <p className="text-slate-600 text-lg">Last updated: August 2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Agreement to Terms</h2>
            </div>
            <p className="text-slate-700 leading-relaxed">
              By accessing and using Payment Analyzer Professional (&quot;the Service&quot;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          {/* Service Description */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-purple-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Service Description</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                Payment Analyzer Professional is a web-based application designed to help users analyze delivery payment data through PDF document processing and manual data entry. The Service provides:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>PDF document parsing and data extraction</li>
                <li>Payment calculation and analysis tools</li>
                <li>Data visualization and reporting features</li>
                <li>Historical data storage and management</li>
                <li>Export capabilities for analysis results</li>
              </ul>
            </div>
          </section>

          {/* Use License */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Use License</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                Permission is granted to temporarily use Payment Analyzer Professional for personal or commercial analysis purposes. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose without authorization</li>
                <li>Attempt to reverse engineer any software contained in the Service</li>
                <li>Remove any copyright or other proprietary notations</li>
                <li>Share account credentials with unauthorized users</li>
              </ul>
            </div>
          </section>

          {/* Data and Privacy */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-orange-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Data and Privacy</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                Your privacy and data security are important to us. By using the Service:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You retain ownership of all data you upload or input</li>
                <li>We implement industry-standard security measures to protect your data</li>
                <li>We do not share your personal data with third parties without consent</li>
                <li>You are responsible for the accuracy and legality of data you provide</li>
                <li>We may retain anonymized usage data for service improvement</li>
              </ul>
            </div>
          </section>

          {/* User Responsibilities */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">User Responsibilities</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                As a user of Payment Analyzer Professional, you agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the Service only for lawful purposes</li>
                <li>Not upload malicious files or attempt to compromise the system</li>
                <li>Respect the intellectual property rights of the Service</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
            </div>
          </section>

          {/* Limitations */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Limitations</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                In no event shall Payment Analyzer Professional or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the Service, even if authorized representatives have been notified orally or in writing of the possibility of such damage.
              </p>
              <p>
                The Service is provided &quot;as is&quot; without any representations or warranties, express or implied. We make no representations or warranties in relation to the Service or the information and materials provided.
              </p>
            </div>
          </section>

          {/* Service Availability */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Service Availability</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                We strive to maintain high availability of the Service, but cannot guarantee uninterrupted access. The Service may be temporarily unavailable due to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Scheduled maintenance and updates</li>
                <li>Technical difficulties or system outages</li>
                <li>Third-party service dependencies</li>
                <li>Force majeure events beyond our control</li>
              </ul>
            </div>
          </section>

          {/* Modifications */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-teal-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Modifications</h2>
            </div>
            <p className="text-slate-700 leading-relaxed">
              We may revise these terms of service at any time without notice. By using the Service, you are agreeing to be bound by the then current version of these terms of service. We will make reasonable efforts to notify users of significant changes to these terms.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-slate-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Contact Information</h2>
            </div>
            <p className="text-slate-700 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us through the application&apos;s support channels or feedback system.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-500">
            Thank you for using Payment Analyzer Professional
          </p>
        </div>
      </div>
    </div>
  );
}