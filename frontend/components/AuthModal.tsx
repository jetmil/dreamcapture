'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const loginRes = await authAPI.login({
          email: formData.email,
          password: formData.password,
        });
        const token = loginRes.data.access_token;

        // Manually save to localStorage IMMEDIATELY (sync)
        if (typeof window !== 'undefined') {
          const authState = {
            state: {
              user: null,
              token: token,
              isAuthenticated: true,
              isLoading: false
            },
            version: 0
          };
          console.log('💾 Saving auth-storage:', { token: token.substring(0, 20) + '...' });
          localStorage.setItem('auth-storage', JSON.stringify(authState));
          console.log('✅ Auth-storage saved to localStorage');
        }

        // Now fetch full user data with token DIRECTLY in header (bypass interceptor timing)
        const userRes = await api.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setAuth(userRes.data, token);
        onClose();
      } else {
        await authAPI.register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });

        // Auto-login after registration
        const loginRes = await authAPI.login({
          email: formData.email,
          password: formData.password,
        });
        const token = loginRes.data.access_token;

        // Manually save to localStorage IMMEDIATELY (sync)
        if (typeof window !== 'undefined') {
          const authState = {
            state: {
              user: null,
              token: token,
              isAuthenticated: true,
              isLoading: false
            },
            version: 0
          };
          console.log('💾 Saving auth-storage:', { token: token.substring(0, 20) + '...' });
          localStorage.setItem('auth-storage', JSON.stringify(authState));
          console.log('✅ Auth-storage saved to localStorage');
        }

        // Now fetch full user data with token DIRECTLY in header (bypass interceptor timing)
        const userRes = await api.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setAuth(userRes.data, token);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          className="glass rounded-3xl p-8 max-w-md w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gradient">
              {isLogin ? 'С возвращением' : 'Присоединяйтесь'}
            </h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm text-white/60 mb-2">Имя пользователя</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-dream-500 focus:outline-none transition-colors"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-white/60 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-dream-500 focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">Пароль</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-dream-500 focus:outline-none transition-colors"
                required
                minLength={8}
                placeholder="Минимум 8 символов"
              />
            </div>

            {error && (
              <div className="text-moment-400 text-sm bg-moment-500/10 border border-moment-500/20 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-dream-600 hover:bg-dream-700 rounded-xl font-medium transition-all dream-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Создать аккаунт'}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {isLogin ? "Нет аккаунта? Зарегистрируйтесь" : 'Уже есть аккаунт? Войдите'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
