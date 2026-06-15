import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShieldCheck, Gem } from 'lucide-react';

export default function WipAnnouncementModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasViewedStatus = localStorage.getItem('simis_wip_popup_viewed');
    if (!hasViewedStatus) {
      // Short delay for high-end cinematic intro animation
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('simis_wip_popup_viewed', 'true');
    setIsOpen(false);
  };

  // Allow resetting via custom admin or console commands if developers want to test
  useEffect(() => {
    (window as any).resetSimiWipPopup = () => {
      localStorage.removeItem('simis_wip_popup_viewed');
      setIsOpen(true);
      console.log("WIP Announcement Popup reset! Refresh the page or it has opened directly.");
    };
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="wip-announcement-container" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          
          {/* Backdrop layer with premium progressive blur effect. 
              As opacity goes to 0 on exit, framer-motion will concurrently fade out this blur. */}
          <motion.div
            id="wip-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="fixed inset-0 bg-stone-950/85 backdrop-blur-md"
            onClick={handleDismiss}
          />

          {/* Modal Card content */}
          <motion.div
            id="wip-card"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-stone-900 border border-amber-500/25 rounded-3xl w-full max-w-md p-8 sm:p-10 shadow-[0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden z-10 flex flex-col justify-between text-center"
          >
            {/* Top gold ambient glow gradient backdrop details */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-6">
              {/* Luxury Icon Badge */}
              <div className="mx-auto w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center relative animate-pulse">
                <Gem className="w-6 h-6 text-amber-400" />
                <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-0.5 -right-0.5 animate-spin-slow" />
              </div>

              {/* Serif Heading */}
              <div className="space-y-2">
                <span className="text-[10px] text-amber-500/90 font-mono uppercase tracking-widest font-bold">
                  Exclusive Preview Journey
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-100 tracking-wide">
                  Welcome to Simi's Gold
                </h3>
              </div>

              {/* Announcement Statement Block */}
              <p className="text-sm text-stone-300 font-sans leading-relaxed text-justify sm:text-center px-1">
                You're currently viewing a work in progress website, will be releasing by the end of this June. Thanks for being part of this journey, your feedbacks will keep improving us!
              </p>

              {/* Mini trust checklist */}
              <div className="flex items-center justify-center gap-2.5 pt-2 text-[10px] text-stone-500 font-mono uppercase tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500/70" />
                <span>Micro-Plating Smithy • 2026</span>
              </div>
            </div>

            {/* Bottom-Middle Continue button with premium hover aesthetics */}
            <div className="mt-8 flex justify-center w-full">
              <button
                id="wip-dismiss-btn"
                onClick={handleDismiss}
                className="w-full sm:w-auto sm:px-12 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 px-6 rounded-xl transition-all shadow-[0_4px_15px_rgba(245,158,11,0.2)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.35)] active:scale-97 cursor-pointer text-xs uppercase tracking-widest font-mono"
              >
                Continue to Store
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
