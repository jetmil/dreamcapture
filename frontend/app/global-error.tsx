'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
          <div className="glass rounded-3xl p-8 max-w-lg w-full mx-4 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Критическая ошибка</h2>
            <p className="text-white/60 mb-6">
              Приложение столкнулось с критической ошибкой. Пожалуйста, перезагрузите страницу.
            </p>

            <button
              onClick={reset}
              className="px-6 py-3 bg-moment-600 hover:bg-moment-700 rounded-xl font-medium transition-all"
            >
              Перезагрузить
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
