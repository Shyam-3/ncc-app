import { FIREBASE_CONFIG } from '@/config/firebase';
import React from 'react';

const DebugFirebase: React.FC = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'n/a';
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a';

  return (
    <div className="container py-4">
      <h1>Firebase Debug</h1>
      <p className="text-muted">Use this page to verify the runtime Firebase configuration and environment.</p>

      <h3 className="mt-4">Runtime</h3>
      <ul>
        <li><strong>Origin:</strong> {origin}</li>
        <li><strong>User Agent:</strong> {userAgent}</li>
        <li><strong>Mode:</strong> {import.meta.env.DEV ? 'development' : 'production'}</li>
      </ul>

      <h3 className="mt-4">Firebase Config</h3>
      <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: 6 }}>
        {JSON.stringify(FIREBASE_CONFIG, null, 2)}
      </pre>

      <p className="mt-3 text-warning">
        Note: API keys in Firebase clients are not secrets; this page is safe to use for debugging. Remove when done.
      </p>
    </div>
  );
};

export default DebugFirebase;
