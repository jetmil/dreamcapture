'use client';

import { motion } from 'framer-motion';
import { Moment } from '@/lib/api';
import { formatDistanceToNow, safeParseDate } from '@/lib/date-utils';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import MomentDetailModal from './MomentDetailModal';

interface MomentCardProps {
  moment: Moment;
}

export default function MomentCard({ moment }: MomentCardProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <>
      <motion.div
        className="glass rounded-2xl overflow-hidden moment-glow hover:scale-105 transition-transform cursor-pointer"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileHover={{ y: -5 }}
        onClick={() => setIsModalOpen(true)}
      >
      {/* Media */}
      <div className="relative w-full h-64">
        {moment.media_type === 'photo' ? (
          <Image
            src={moment.media_url}
            alt={moment.caption || 'Moment'}
            fill
            className="object-cover object-top"
          />
        ) : (
          <video
            src={moment.media_url}
            className="w-full h-full object-cover object-top"
            autoPlay
            loop
            muted
            playsInline
          />
        )}

        {/* Countdown Overlay */}
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full">
          <span className="text-moment-400 font-mono font-bold">
            {secondsLeft}s
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Caption */}
        {moment.caption && (
          <p className="text-white/90 mb-3">{moment.caption}</p>
        )}

        {/* Location */}
        {moment.location?.name && (
          <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span>{moment.location.name}</span>
          </div>
        )}

        {/* Tags */}
        {moment.ai_tags && moment.ai_tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {moment.ai_tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-moment-500/20 text-moment-300 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-white/40 mt-3 pt-3 border-t border-white/10">
          <span>Просмотров: {moment.view_count}</span>
          <span>{formatDistanceToNow(moment.created_at)}</span>
        </div>
      </div>
      </motion.div>

      {/* Modal */}
      {isModalOpen && (
        <MomentDetailModal
          moment={moment}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
