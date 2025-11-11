'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console (can be replaced with error tracking service)
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="glass rounded-3xl p-8 max-w-lg w-full mx-4 text-center">
        <div className="w-20 h-20 bg-moment-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-moment-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Что-то пошло не так</h2>
        <p className="text-white/60 mb-6">
          Произошла ошибка при загрузке страницы. Попробуйте обновить.
        </p>

        {error.digest && (
          <p className="text-xs text-white/40 mb-4 font-mono">
            Код ошибки: {error.digest}
          </p>
        )}

        <button
          onClick={reset}
          className="px-6 py-3 bg-dream-600 hover:bg-dream-700 rounded-xl font-medium transition-all dream-glow"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}
