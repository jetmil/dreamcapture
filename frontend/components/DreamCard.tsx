'use client';

import { motion } from 'framer-motion';
import { Dream } from '@/lib/api';
import { formatDistanceToNow } from '@/lib/date-utils';
import Image from 'next/image';
import Link from 'next/link';

interface DreamCardProps {
  dream: Dream;
}

export default function DreamCard({ dream }: DreamCardProps) {
  const expiresIn = formatDistanceToNow(dream.expires_at);

  return (
    <Link href={`/dreams/${dream.id}`}>
      <motion.div
        className="glass rounded-2xl p-6 dream-glow hover:scale-105 transition-transform cursor-pointer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -5 }}
      >
      {/* Generated Image */}
      {dream.generated_image_url && (
        <div className="relative w-full h-48 rounded-xl overflow-hidden mb-4">
          <Image
            src={dream.generated_image_url}
            alt={dream.title || 'Dream visualization'}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Title */}
      {dream.title && (
        <h3 className="text-xl font-bold text-dream-300 mb-2">{dream.title}</h3>
      )}

      {/* Description */}
      <p className="text-white/80 mb-4 line-clamp-4">{dream.description}</p>

      {/* AI Tags */}
      {dream.ai_tags && dream.ai_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {dream.ai_tags.slice(0, 5).map((tag, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-dream-500/20 text-dream-300 rounded-full text-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* AI Analysis */}
      {dream.ai_analysis && (
        <div className="border-t border-white/10 pt-4 mb-4">
          <p className="text-sm text-white/60 italic">{dream.ai_analysis.narrative}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-white/40">
        <span>Просмотров: {dream.view_count}</span>
        <span>Исчезнет {expiresIn}</span>
      </div>
      </motion.div>
    </Link>
  );
}
