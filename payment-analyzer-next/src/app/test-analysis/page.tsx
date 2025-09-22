/**
 * Test Analysis Page - No Authentication Required
 */

'use client';

import { useState } from 'react';

export default function TestAnalysisPage() {
  const [step, setStep] = useState(1);

  const handleViewDetailedReport = () => {
    console.log('📊 TEST: View Detailed Report clicked');
    alert('View Detailed Report button works! Console has logs.');
    // In real app, would navigate to reports
    // router.push('/reports');
  };

  const handleStartNewAnalysis = () => {
    console.log('🔄 TEST: Start New Analysis clicked');
    alert('Start New Analysis button works! Resetting to step 1.');
    setStep(1);
  };

  const mockAnalysisData = {
    totals: {
      totalConsignments: 57,
      expectedTotal: 150.00,
      paidTotal: 145.00,
      workingDays: 5,
      differenceTotal: -5.00
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-blue-600">Payment Analyzer Test</h1>
        <p className="text-gray-600 mb-6">Testing button functionality - Step {step}</p>
        
        {step === 1 && (
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl mb-4">Step 1: Upload Data</h2>
            <p className="text-gray-600 mb-6">This simulates completing the analysis workflow.</p>
            <button 
              onClick={() => setStep(3)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-lg font-semibold"
            >
              🚀 Simulate Analysis Complete
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl mb-6">Step 3: Analysis Results ✅</h2>
            
            {/* Quick Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {mockAnalysisData.totals.totalConsignments}
                </div>
                <div className="text-sm font-medium text-gray-600">Total Consignments</div>
              </div>
              <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  £{mockAnalysisData.totals.expectedTotal.toFixed(2)}
                </div>
                <div className="text-sm font-medium text-gray-600">Expected Total</div>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  £{mockAnalysisData.totals.paidTotal.toFixed(2)}
                </div>
                <div className="text-sm font-medium text-gray-600">Paid Total</div>
              </div>
            </div>

            {/* Action Buttons - This is what we're testing */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Test These Buttons:</h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleViewDetailedReport}
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 text-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  📊 View Detailed Report
                </button>
                <button
                  onClick={handleStartNewAnalysis}
                  className="bg-gray-600 text-white px-8 py-4 rounded-lg hover:bg-gray-700 text-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  🔄 Start New Analysis
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-4 text-center">
                ✓ Click buttons and check browser console for logs<br/>
                ✓ Both buttons should show alerts when clicked
              </p>
            </div>

            {/* Analysis Summary */}
            <div className="mt-8 bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-blue-800">Analysis Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Working Days:</span>
                  <span className="font-medium">{mockAnalysisData.totals.workingDays}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Consignments:</span>
                  <span className="font-medium">{mockAnalysisData.totals.totalConsignments}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expected Total:</span>
                  <span className="font-medium">£{mockAnalysisData.totals.expectedTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid Total:</span>
                  <span className="font-medium">£{mockAnalysisData.totals.paidTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Difference:</span>
                  <span className={`font-bold ${mockAnalysisData.totals.differenceTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    £{mockAnalysisData.totals.differenceTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}