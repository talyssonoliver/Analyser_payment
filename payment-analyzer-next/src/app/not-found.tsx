/**
 * 404 Not Found Page
 */

'use client';

import { Home, Search, ArrowLeft, FileQuestion } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-orange-100 rounded-3xl mx-auto mb-6 flex items-center justify-center">
            <FileQuestion className="w-12 h-12 text-red-500" />
          </div>
          <div className="text-8xl font-bold text-slate-300 mb-4">404</div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Page Not Found</h1>
          <p className="text-xl text-slate-600 mb-6 leading-relaxed">
            Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <p className="text-slate-500">
            Don&apos;t worry, it happens to the best of us. Let&apos;s get you back on track.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-3 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
          
          <Link
            href="/"
            className="flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center justify-center gap-2">
            <Search className="w-5 h-5 text-slate-600" />
            Try These Instead
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link
              href="/analysis"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileQuestion className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-slate-900">New Analysis</div>
                <div className="text-sm text-slate-600">Start analyzing payments</div>
              </div>
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Home className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-slate-900">Dashboard</div>
                <div className="text-sm text-slate-600">View your analytics</div>
              </div>
            </Link>

            <Link
              href="/history"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Search className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-slate-900">History</div>
                <div className="text-sm text-slate-600">Browse past analyses</div>
              </div>
            </Link>

            <Link
              href="/settings"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileQuestion className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <div className="font-medium text-slate-900">Settings</div>
                <div className="text-sm text-slate-600">Manage your account</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Search Suggestion */}
        <div className="text-center">
          <p className="text-slate-500 mb-2">Still can&apos;t find what you&apos;re looking for?</p>
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-medium underline"
          >
            Sign in to access all features
          </Link>
        </div>
      </div>
    </div>
  );
}