'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Moment } from '@/lib/api';
import { formatDistanceToNow, safeParseDate } from '@/lib/date-utils';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface MomentDetailModalProps {
  moment: Moment;
  onClose: () => void;
}

export default function MomentDetailModal({ moment, onClose }: MomentDetailModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiresDate = safeParseDate(moment.expires_at);
      if (!expiresDate) {
        setSecondsLeft(0);
        return;
      }
      const expires = expiresDate.getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setSecondsLeft(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [moment.expires_at]);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          className="glass rounded-3xl overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-moment-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-moment-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-moment-300">Момент</h2>
                <p className="text-sm text-white/60">{formatDistanceToNow(moment.created_at)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Media */}
          <div className="relative w-full bg-black">
            {moment.media_type === 'photo' ? (
              <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                <Image
                  src={moment.media_url}
                  alt={moment.caption || 'Moment'}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            ) : (
              <video
                src={moment.media_url}
                className="w-full h-auto"
                controls
                autoPlay
                loop
                playsInline
              />
            )}

            {/* Countdown Overlay */}
            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-moment-400 font-mono font-bold text-lg">
                {secondsLeft}s
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Caption */}
            {moment.caption && (
              <div className="mb-6">
                <p className="text-white/90 text-lg leading-relaxed">{moment.caption}</p>
              </div>
            )}

            {/* Location */}
            {moment.location?.name && (
              <div className="flex items-center gap-2 text-white/70 mb-6 pb-6 border-b border-white/10">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{moment.location.name}</span>
              </div>
            )}

            {/* Tags */}
            {moment.ai_tags && moment.ai_tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm text-white/60 mb-3">AI Теги</h3>
                <div className="flex flex-wrap gap-2">
                  {moment.ai_tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-moment-500/20 text-moment-300 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between text-sm text-white/40 pt-6 border-t border-white/10">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  <span>{moment.view_count} просмотров</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>Исчезнет через {secondsLeft}s</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
