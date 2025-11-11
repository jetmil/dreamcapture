'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore, useStreamStore } from '@/lib/store';
import { dreamsAPI, momentsAPI, connectWebSocket } from '@/lib/api';
import DreamCard from '@/components/DreamCard';
import MomentCard from '@/components/MomentCard';
import AuthModal from '@/components/AuthModal';
import CreateDreamModal from '@/components/CreateDreamModal';
import CreateMomentModal from '@/components/CreateMomentModal';

export default function Home() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { dreams, moments, setDreams, setMoments, clearExpired } = useStreamStore();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateDream, setShowCreateDream] = useState(false);
  const [showCreateMoment, setShowCreateMoment] = useState(false);
  const [activeStream, setActiveStream] = useState<'dreams' | 'moments'>('dreams');
  const [loading, setLoading] = useState(true);

  // Check auth on mount (if token exists in persisted state)
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [dreamsRes, momentsRes] = await Promise.all([
          dreamsAPI.getAll(0, 20),
          momentsAPI.getAll(0, 20),
        ]);
        setDreams(dreamsRes.data);
        setMoments(momentsRes.data);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [setDreams, setMoments]);

  // WebSocket connection
  useEffect(() => {
    const ws = connectWebSocket((data) => {
      if (data.type === 'new_moment') {
        // Reload moments
        momentsAPI.getAll(0, 20).then((res) => setMoments(res.data));
      }
    });

    return () => ws.close();
  }, [setMoments]);

  // Clear expired content every minute
  useEffect(() => {
    const interval = setInterval(clearExpired, 60000);
    return () => clearInterval(interval);
  }, [clearExpired]);

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-dream-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-moment-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 glass border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <motion.h1
              className="text-4xl font-bold text-gradient"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              МирСнов
            </motion.h1>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => setShowCreateDream(true)}
                    className="px-6 py-2 bg-dream-600 hover:bg-dream-700 rounded-full font-medium transition-all dream-glow"
                  >
                    Поделиться сном
                  </button>
                  <button
                    onClick={() => setShowCreateMoment(true)}
                    className="px-6 py-2 bg-moment-600 hover:bg-moment-700 rounded-full font-medium transition-all moment-glow"
                  >
                    Поделиться моментом
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-6 py-2 glass hover:bg-white/10 rounded-full font-medium transition-all"
                >
                  Войти
                </button>
              )}
            </div>
          </div>

          {/* Tagline */}
          <motion.p
            className="text-center text-white/60 mt-4 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Где сны становятся моментами, а моменты отражают сны
          </motion.p>
        </div>
      </header>

      {/* Stream Selector */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveStream('dreams')}
            className={`px-8 py-3 rounded-full font-medium transition-all ${
              activeStream === 'dreams'
                ? 'bg-dream-600 dream-glow'
                : 'glass hover:bg-white/10'
            }`}
          >
            Поток снов
          </button>
          <button
            onClick={() => setActiveStream('moments')}
            className={`px-8 py-3 rounded-full font-medium transition-all ${
              activeStream === 'moments'
                ? 'bg-moment-600 moment-glow'
                : 'glass hover:bg-white/10'
            }`}
          >
            Поток моментов
          </button>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-dream-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeStream === 'dreams' ? (
              dreams.length > 0 ? (
                dreams.map((dream) => (
                  <DreamCard key={dream.id} dream={dream} />
                ))
              ) : (
                <div className="col-span-full text-center text-white/40 py-16">
                  Пока нет снов. Будьте первым, кто поделится.
                </div>
              )
            ) : (
              moments.length > 0 ? (
                moments.map((moment) => (
                  <MomentCard key={moment.id} moment={moment} />
                ))
              ) : (
                <div className="col-span-full text-center text-white/40 py-16">
                  Моментов ещё нет. Запечатлейте этот момент!
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showCreateDream && <CreateDreamModal onClose={() => setShowCreateDream(false)} />}
      {showCreateMoment && <CreateMomentModal onClose={() => setShowCreateMoment(false)} />}
    </main>
  );
}
