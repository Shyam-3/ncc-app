import { auth } from '@/config/firebase';
import { mapFirebaseAuthError } from '@/utils/firebaseErrors';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';

const AuthDiagnostics: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; code?: string; message: string }>(null);

  const runTest = async () => {
    setRunning(true);
    setResult(null);
    const email = `nonexistent_${Date.now()}@example.com`;
    const password = 'Test123!';

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // If this succeeds, a user already exists with our synthetic email (unlikely)
      setResult({ ok: true, message: 'Sign-in unexpectedly succeeded (account exists). Provider is enabled.' });
    } catch (err: any) {
      const code = err?.code as string | undefined;
      const friendly = mapFirebaseAuthError(code);
      // If provider is enabled, we'll typically see user-not-found or invalid-credential
      setResult({ ok: false, code, message: friendly });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="container py-4">
      <h1>Auth Diagnostics</h1>
      <p className="text-muted">Runs a safe sign-in check to validate Email/Password configuration.</p>

      <ol>
        <li>Provider enabled? Expect an error like <code>auth/user-not-found</code> or <code>auth/invalid-credential</code>.</li>
        <li>If you see <code>auth/operation-not-allowed</code> or <code>auth/configuration-not-found</code>, enable Email/Password and verify Authorized domains.</li>
      </ol>

      <button className="btn btn-primary" disabled={running} onClick={runTest}>
        {running ? 'Running…' : 'Run sign-in test'}
      </button>

      {result && (
        <div className="alert mt-3 " role="alert" style={{ border: '1px solid #ddd' }}>
          <div><strong>Status:</strong> {result.ok ? 'OK' : 'Error'}</div>
          {result.code && (
            <div><strong>Code:</strong> <code>{result.code}</code></div>
          )}
          <div><strong>Message:</strong> {result.message}</div>
        </div>
      )}

      <p className="mt-3 text-warning">
        Tip: Visit <a href="/debug/firebase">/debug/firebase</a> to compare runtime config with the Console.
      </p>
    </div>
  );
};

export default AuthDiagnostics;
