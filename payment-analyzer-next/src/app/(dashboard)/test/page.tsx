'use client';

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Minimal Test Page</h1>
      <p>No imports, no services, no complexity</p>
      <div className="mt-4 p-4 bg-green-100 rounded">
        If this page loads slowly, there&apos;s a fundamental build system issue.
      </div>
    </div>
  );
}