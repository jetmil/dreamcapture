'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { momentsAPI } from '@/lib/api';
import { useStreamStore } from '@/lib/store';

interface CreateMomentModalProps {
  onClose: () => void;
}

export default function CreateMomentModal({ onClose }: CreateMomentModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addMoment } = useStreamStore();

  const [formData, setFormData] = useState({
    caption: '',
    media_url: '',
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const maxSize = mediaType === 'photo' ? 10 * 1024 * 1024 : 50 * 1024 * 1024; // 10MB for images, 50MB for videos
    if (file.size > maxSize) {
      setError(`Файл слишком большой. Максимум: ${mediaType === 'photo' ? '10' : '50'}MB`);
      return;
    }

    // Validate file type
    const validTypes = mediaType === 'photo'
      ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      : ['video/mp4', 'video/webm', 'video/quicktime'];

    if (!validTypes.includes(file.type)) {
      setError('Неподдерживаемый формат файла');
      return;
    }

    setError('');
    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file to backend
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', mediaType);

      // Upload to backend via /api/upload/moment-media (proxied by nginx)
      const uploadResponse = await fetch('/api/upload/moment-media', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Ошибка загрузки файла');
      }

      const { url } = await uploadResponse.json();
      setFormData({ ...formData, media_url: url });
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки файла');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.media_url) {
      setError('Загрузите фото или видео');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await momentsAPI.create({
        caption: formData.caption || undefined,
        media_type: mediaType,
        media_url: formData.media_url,
      });

      addMoment(res.data);
      setSuccess(true);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Не удалось создать момент');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          className="glass rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gradient">
              Поделитесь моментом
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
              <div className="w-20 h-20 bg-moment-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-moment-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Момент опубликован!</h3>
              <p className="text-white/60">Появится в потоке моментов и исчезнет через 24 часа</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Media Type Selection */}
              <div>
                <label className="block text-sm text-white/60 mb-3">
                  Тип контента
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMediaType('photo')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      mediaType === 'photo'
                        ? 'border-moment-500 bg-moment-500/20'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <svg className="w-6 h-6 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    <div className="font-bold text-white">Фото</div>
                    <div className="text-xs text-white/50">До 10MB</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaType('video')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      mediaType === 'video'
                        ? 'border-moment-500 bg-moment-500/20'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <svg className="w-6 h-6 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                    <div className="font-bold text-white">Видео</div>
                    <div className="text-xs text-white/50">До 50MB</div>
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm text-white/60 mb-3">
                  Загрузите {mediaType === 'photo' ? 'фото' : 'видео'}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {preview ? (
                  <div className="relative rounded-xl overflow-hidden border-2 border-moment-500">
                    {mediaType === 'photo' ? (
                      <img src={preview} alt="Preview" className="w-full h-64 object-cover" />
                    ) : (
                      <video src={preview} className="w-full h-64 object-cover" controls />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPreview(null);
                        setFormData({ ...formData, media_url: '' });
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-16 border-2 border-dashed border-white/20 rounded-xl hover:border-moment-500 hover:bg-moment-500/10 transition-all disabled:opacity-50"
                  >
                    {uploading ? (
                      <div className="text-white/60">Загрузка...</div>
                    ) : (
                      <>
                        <svg className="w-12 h-12 mx-auto mb-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <div className="text-white/60">Нажмите для выбора файла</div>
                        <div className="text-xs text-white/40 mt-1">
                          или перетащите {mediaType === 'photo' ? 'фото' : 'видео'} сюда
                        </div>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Подпись (необязательно)
                </label>
                <textarea
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  placeholder="Опишите момент в 1-2 предложениях"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-moment-500 focus:outline-none transition-colors resize-none"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-white/40 mt-2 text-right">
                  {formData.caption.length}/500
                </div>
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              {/* Info */}
              <div className="bg-moment-500/10 border border-moment-500/20 rounded-lg p-4 text-sm text-white/70">
                <p className="mb-2">Что происходит дальше:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Момент появится в общем потоке</li>
                  <li>Исчезнет через 24 часа (изменено с 60 секунд)</li>
                  <li>AI автоматически создаст теги</li>
                  <li>Может найти резонанс с чьим-то сном</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading || uploading || !formData.media_url}
                className="w-full px-6 py-3 bg-moment-600 hover:bg-moment-700 rounded-xl font-medium transition-all moment-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Публикую момент...' : 'Поделиться моментом'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
