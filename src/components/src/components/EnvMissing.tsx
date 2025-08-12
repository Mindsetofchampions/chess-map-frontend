import React from 'react';

export default function EnvMissing() {
  return (
    <div className="p-6 m-4 rounded-2xl border text-red-700 bg-red-50">
      <h2 className="text-lg font-semibold">Environment not configured</h2>
      <p className="mt-2">
        Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your environment.
      </p>
      <p className="mt-1 text-sm opacity-80">See .env.example and /debug for checks.</p>
    </div>
  );
}
