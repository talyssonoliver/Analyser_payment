/**
 * Home Page - Empty State Page for Unauthenticated Users
 * Replicates the original HTML empty state design
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  Upload, 
  Zap, 
  TrendingUp, 
  Search, 
  FileText, 
  Calculator,
  ArrowRight,
  BarChart3
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading spinner while auth is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, don't render the empty state (redirect will happen)
  if (isAuthenticated) {
    return null;
  }
  
  const handleGetStarted = () => {
    router.push('/analysis');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="onboarding-container px-4 py-8 max-w-4xl mx-auto">
        
        {/* Welcome Hero Section */}
        <div className="welcome-hero text-center mb-12">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="welcome-title text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Welcome to Payment Analyzer!
          </h1>
          <p className="welcome-subtitle text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Your intelligent companion for tracking delivery payments and financial insights
          </p>
        </div>

        {/* Primary CTA Section */}
        <div className="cta-section text-center mb-16">
          <div className="cta-buttons mb-6">
            <button 
              className="primary-cta-btn group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 mx-auto transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              onClick={handleGetStarted}
            >
              <span className="btn-icon">
                <Upload className="w-5 h-5" />
              </span>
              <span className="btn-text">Upload & Analyze</span>
              <span className="btn-arrow group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-5 h-5" />
              </span>
            </button>
          </div>
          <p className="cta-note text-slate-600">
            Ready to go? Upload your documents or enter data to start analysis.
          </p>
        </div>

        {/* Quick Start Steps */}
        <div className="quick-start-section mb-16">
          <h2 className="section-title text-3xl font-bold text-center text-slate-900 mb-12">
            Get Started in 3 Easy Steps
          </h2>
          <div className="steps-container grid md:grid-cols-3 gap-8">
            <div className="step-card bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="step-number w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl mb-4 mx-auto">
                1
              </div>
              <div className="step-icon mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <h3 className="step-title text-xl font-semibold text-slate-900 mb-3">
                Add Your Data
              </h3>
              <p className="step-description text-slate-600 leading-relaxed">
                Upload PDF documents or enter data manually
              </p>
            </div>

            <div className="step-card bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="step-number w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center text-purple-700 font-bold text-xl mb-4 mx-auto">
                2
              </div>
              <div className="step-icon mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex items-center justify-center mx-auto">
                  <Zap className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <h3 className="step-title text-xl font-semibold text-slate-900 mb-3">
                Instant Analysis
              </h3>
              <p className="step-description text-slate-600 leading-relaxed">
                Our AI processes your data in seconds
              </p>
            </div>

            <div className="step-card bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="step-number w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center text-green-700 font-bold text-xl mb-4 mx-auto">
                3
              </div>
              <div className="step-icon mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-50 to-green-100 rounded-xl flex items-center justify-center mx-auto">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h3 className="step-title text-xl font-semibold text-slate-900 mb-3">
                View Insights
              </h3>
              <p className="step-description text-slate-600 leading-relaxed">
                Get detailed reports and payment tracking
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="features-section mb-16">
          <h2 className="section-title text-3xl font-bold text-center text-slate-900 mb-12">
            What You Can Do
          </h2>
          <div className="features-grid grid md:grid-cols-2 gap-6">
            <div className="feature-card bg-white rounded-xl p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="feature-icon">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h4 className="feature-title text-lg font-semibold text-slate-900 mb-2">
                  Smart Analysis
                </h4>
                <p className="feature-description text-slate-600">
                  Automatically calculate expected vs paid amounts
                </p>
              </div>
            </div>

            <div className="feature-card bg-white rounded-xl p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="feature-icon">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div>
                <h4 className="feature-title text-lg font-semibold text-slate-900 mb-2">
                  PDF Processing
                </h4>
                <p className="feature-description text-slate-600">
                  Extract data from runsheets and invoices automatically
                </p>
              </div>
            </div>

            <div className="feature-card bg-white rounded-xl p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="feature-icon">
                <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div>
                <h4 className="feature-title text-lg font-semibold text-slate-900 mb-2">
                  Payment Tracking
                </h4>
                <p className="feature-description text-slate-600">
                  Track bonuses, rates, and payment discrepancies
                </p>
              </div>
            </div>

            <div className="feature-card bg-white rounded-xl p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="feature-icon">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div>
                <h4 className="feature-title text-lg font-semibold text-slate-900 mb-2">
                  Visual Reports
                </h4>
                <p className="feature-description text-slate-600">
                  Beautiful charts and detailed analysis reports
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary CTA */}
        <div className="cta-section text-center">
          <div className="cta-buttons">
            <button 
              className="primary-cta-btn group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 mx-auto transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              onClick={handleGetStarted}
            >
              <span className="btn-icon">
                <Upload className="w-5 h-5" />
              </span>
              <span className="btn-text">Start Your First Analysis</span>
              <span className="btn-arrow group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-5 h-5" />
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* Sign In Link */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => router.push('/login')}
          className="bg-white text-slate-700 px-6 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-slate-300"
        >
          Already have an account? Sign In
        </button>
      </div>
    </div>
  );
}