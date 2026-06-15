import React from 'react';
import { motion } from 'motion/react';
import { Shield, Sparkles, Truck, Hammer, BadgePercent, Gem } from 'lucide-react';

interface HeroProps {
  onBrowseCollections: () => void;
  onOpenCustom: () => void;
}

export default function Hero({ onBrowseCollections, onOpenCustom }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 py-16 sm:py-24 border-b border-stone-850">
      
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-stone-800/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="space-y-6 flex flex-col items-center">
          
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-semibold tracking-wider uppercase"
          >
            <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Affordable Luxury • Premium Crafts</span>
          </motion.div>

          {/* Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-stone-100 tracking-tight leading-tight"
          >
            Simi's Premium <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
              Gold Covering
            </span>
          </motion.h1>

          {/* Intro text */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-xl mx-auto text-base sm:text-lg text-stone-300 font-light leading-relaxed"
          >
            Discover affordable, high-quality luxury with exquisite traditional South Indian jewelry. Crafted with premium 24ct micro-gold plating over highly durable cores, these pieces are virtually indistinguishable from solid gold—built to last up to a year, and can be effortlessly repolished to shine beautifully for another year.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <button
              id="hero-explore-collections"
              onClick={onBrowseCollections}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-bold hover:shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer text-sm"
            >
              Browse Collections
            </button>
            <button
              id="hero-open-custom"
              onClick={onOpenCustom}
              className="px-6 py-3 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-400 border border-amber-500/30 hover:border-amber-400 transition-colors cursor-pointer text-sm font-semibold flex items-center gap-1.5"
            >
              <Hammer className="w-4 h-4" />
              Custom Thali & Set Designing
            </button>
          </motion.div>

          {/* Trust factors */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="pt-6 sm:pt-8 grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-6 border-t border-stone-800 w-full max-w-2xl text-left sm:text-center"
          >
            <div className="flex sm:flex-col items-center justify-start sm:justify-center gap-2">
              <Shield className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="text-xs text-stone-400 sm:text-center">
                <p className="font-bold text-stone-200">6mo-1yr Guarantee</p>
                <p className="font-light">Premium micro plating</p>
              </div>
            </div>
            <div className="flex sm:flex-col items-center justify-start sm:justify-center gap-2">
              <BadgePercent className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="text-xs text-stone-400 sm:text-center">
                <p className="font-bold text-stone-200">Seasonal Offers</p>
                <p className="font-light">Up to 20% off deals</p>
              </div>
            </div>
            <div className="flex sm:flex-col items-center justify-start sm:justify-center gap-2">
              <Hammer className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="text-xs text-stone-400 sm:text-center">
                <p className="font-bold text-stone-200">Re-Polish Service</p>
                <p className="font-light">Lifetime backup care</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
