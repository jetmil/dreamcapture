'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { formatDistanceToNow } from '@/lib/date-utils';
import { dreamsAPI, Dream } from '@/lib/api';

export default function DreamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [dream, setDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDream = async () => {
      try {
        const id = params.id as string;
        console.log('🔍 Fetching dream:', id);
        const response = await dreamsAPI.getById(id);
        console.log('✅ Dream response:', response.data);
        console.log('📊 Dream fields:', {
          title: response.data?.title,
          description: response.data?.description?.substring(0, 50),
          image: response.data?.generated_image_url,
          created: response.data?.created_at,
          expires: response.data?.expires_at
        });
        setDream(response.data);
      } catch (err: any) {
        console.error('❌ Dream fetch error:', err);
        console.error('❌ Error response:', err.response?.data);
        setError(err.response?.data?.detail || 'Сон не найден');
      } finally {
        setLoading(false);
      }
    };

    fetchDream();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (error || !dream) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">{error || 'Сон не найден'}</h1>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-dream-600 hover:bg-dream-700 rounded-full transition-colors"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  console.log('🎨 Rendering dream:', {
    id: dream.id,
    title: dream.title,
    hasDescription: !!dream.description,
    hasImage: !!dream.generated_image_url,
    hasAnalysis: !!dream.ai_analysis
  });

  const expiresIn = formatDistanceToNow(dream.expires_at);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="mb-6 text-white/60 hover:text-white transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к потоку снов
        </button>

        <motion.div
          className="glass rounded-3xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Generated Image */}
          {dream.generated_image_url && (
            <div className="relative w-full h-96">
              <Image
                src={dream.generated_image_url}
                alt={dream.title || 'Dream visualization'}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            {/* Title */}
            {dream.title && (
              <h1 className="text-3xl font-bold text-dream-300 mb-4">{dream.title}</h1>
            )}

            {/* TTL Badge */}
            <div className="flex items-center gap-4 mb-6 text-sm">
              <span className="px-3 py-1 bg-dream-500/20 text-dream-300 rounded-full">
                TTL: {dream.ttl_days} {dream.ttl_days === 1 ? 'день' : dream.ttl_days < 5 ? 'дня' : 'дней'}
              </span>
              <span className="text-white/40">
                Исчезнет {expiresIn}
              </span>
              <span className="text-white/40">
                Просмотров: {dream.view_count}
              </span>
            </div>

            {/* Description */}
            <div className="prose prose-invert max-w-none mb-8">
              <p className="text-lg text-white/90 leading-relaxed whitespace-pre-wrap">
                {dream.description}
              </p>
            </div>

            {/* AI Analysis */}
            {dream.ai_analysis && (
              <div className="border-t border-white/10 pt-6 space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">AI Интерпретация</h2>

                {/* Narrative */}
                {dream.ai_analysis.narrative && (
                  <div className="bg-dream-500/10 border border-dream-500/20 rounded-xl p-6">
                    <h3 className="text-sm text-dream-300 mb-2 uppercase tracking-wide">Суть</h3>
                    <p className="text-white/80 italic">{dream.ai_analysis.narrative}</p>
                  </div>
                )}

                {/* Themes */}
                {dream.ai_analysis.themes && dream.ai_analysis.themes.length > 0 && (
                  <div>
                    <h3 className="text-sm text-white/60 mb-3 uppercase tracking-wide">Темы</h3>
                    <div className="flex flex-wrap gap-2">
                      {dream.ai_analysis.themes.map((theme, i) => (
                        <span
                          key={i}
                          className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emotions */}
                {dream.ai_analysis.emotions && dream.ai_analysis.emotions.length > 0 && (
                  <div>
                    <h3 className="text-sm text-white/60 mb-3 uppercase tracking-wide">Эмоции</h3>
                    <div className="flex flex-wrap gap-2">
                      {dream.ai_analysis.emotions.map((emotion, i) => (
                        <span
                          key={i}
                          className="px-4 py-2 bg-moment-500/10 border border-moment-500/20 text-moment-300 rounded-lg"
                        >
                          {emotion}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Symbols */}
                {dream.ai_analysis.symbols && dream.ai_analysis.symbols.length > 0 && (
                  <div>
                    <h3 className="text-sm text-white/60 mb-3 uppercase tracking-wide">Символы</h3>
                    <div className="flex flex-wrap gap-2">
                      {dream.ai_analysis.symbols.map((symbol, i) => (
                        <span
                          key={i}
                          className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-lg"
                        >
                          {symbol}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {dream.ai_tags && dream.ai_tags.length > 0 && (
              <div className="border-t border-white/10 pt-6 mt-6">
                <h3 className="text-sm text-white/60 mb-3 uppercase tracking-wide">Теги</h3>
                <div className="flex flex-wrap gap-2">
                  {dream.ai_tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-dream-500/20 text-dream-300 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Author Info */}
            <div className="border-t border-white/10 pt-6 mt-6">
              <div className="flex items-center justify-between text-sm text-white/40">
                <span>
                  Опубликован {formatDistanceToNow(dream.created_at)}
                </span>
                {dream.is_public && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full">
                    Публичный
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
