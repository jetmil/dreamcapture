'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dreamsAPI } from '@/lib/api';
import { useStreamStore } from '@/lib/store';

interface CreateDreamModalProps {
  onClose: () => void;
}

export default function CreateDreamModal({ onClose }: CreateDreamModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { addDream } = useStreamStore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_public: true,
    ttl_days: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await dreamsAPI.create(formData);
      addDream(res.data);
      setSuccess(true);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create dream');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          className="glass rounded-3xl p-8 max-w-2xl w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gradient">
              Поделитесь своим сном
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

          {success ? (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-20 h-20 bg-dream-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-dream-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Сон опубликован!</h3>
              <p className="text-white/60">AI анализирует ваш сон и создаёт иллюстрацию...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Название (необязательно)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Дайте название своему сну"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-dream-500 focus:outline-none transition-colors"
                  maxLength={200}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Ваш сон
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Опишите свой сон в деталях. Что вы видели, чувствовали, переживали?"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-dream-500 focus:outline-none transition-colors resize-none"
                  rows={8}
                  required
                  minLength={10}
                  maxLength={5000}
                />
                <div className="text-xs text-white/40 mt-2 text-right">
                  {formData.description.length}/5000
                </div>
              </div>

              {/* TTL Selection */}
              <div>
                <label className="block text-sm text-white/60 mb-3">
                  Как долго ваш сон будет виден?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { days: 1, label: '24 часа', desc: 'Эфемерный' },
                    { days: 7, label: '7 дней', desc: 'Недельный' },
                    { days: 30, label: '30 дней', desc: 'Месячный' },
                  ].map((option) => (
                    <button
                      key={option.days}
                      type="button"
                      onClick={() => setFormData({ ...formData, ttl_days: option.days })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.ttl_days === option.days
                          ? 'border-dream-500 bg-dream-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="font-bold text-white">{option.label}</div>
                      <div className="text-xs text-white/50">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-dream-500 focus:ring-dream-500"
                />
                <label htmlFor="is_public" className="text-sm text-white/80">
                  Опубликовать в Потоке снов
                </label>
              </div>

              {error && (
                <div className="text-moment-400 text-sm bg-moment-500/10 border border-moment-500/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              {/* Info */}
              <div className="bg-dream-500/10 border border-dream-500/20 rounded-lg p-4 text-sm text-white/70">
                <p className="mb-2">Что происходит дальше:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>GPT-5-nano анализирует темы, эмоции и символы</li>
                  <li>DALL-E 3 генерирует художественную визуализацию</li>
                  <li>AI ищет резонанс с живыми моментами</li>
                  <li>Сон исчезнет из публикации через выбранный срок</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-dream-600 hover:bg-dream-700 rounded-xl font-medium transition-all dream-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Публикую сон...' : 'Поделиться сном'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
