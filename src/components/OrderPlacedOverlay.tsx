import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, MessageCircle, Bell, ArrowRight, ShieldCheck, X } from 'lucide-react';

interface OrderPlacedOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  total: number;
  itemCount: number;
  isGuest: boolean;
  onOpenNotifications?: () => void;
  onOpenAuth?: () => void;
}

export default function OrderPlacedOverlay({
  isOpen,
  onClose,
  orderId,
  total,
  itemCount,
  isGuest,
  onOpenNotifications,
  onOpenAuth
}: OrderPlacedOverlayProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="order-placed-overlay-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 focus:outline-none"
      >
        {/* Animated Dark Blur Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-950/90 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 240 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-[#180f28] to-[#0b0612] border border-amber-500/30 rounded-3xl p-6 md:p-8 text-center shadow-2xl z-10 overflow-hidden"
        >
          {/* Subtle Golden Glow Ornaments */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none" />

          {/* Close corner button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-900 border border-stone-850 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Logo / Spark */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5 shadow-inner">
            <CheckCircle2 className="w-8 h-8 text-amber-500 animate-bounce" />
          </div>

          {/* Headings */}
          <h3 className="text-xl md:text-2xl font-serif font-black tracking-wide text-stone-100 leading-tight">
            WhatsApp Inquiry Registered!
          </h3>
          <p className="text-xs text-amber-500 font-mono tracking-widest uppercase mt-1">
            Simi Gold Smithing Master Ledger
          </p>

          {/* Order Details Snippet */}
          <div className="my-6 p-4 rounded-2xl bg-[#0a0510]/80 border border-stone-850 text-left space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-stone-900">
              <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider">Inquiry Code</span>
              <span className="text-xs font-mono font-bold text-amber-400">{orderId}</span>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-400">Total Gold Items:</span>
              <span className="font-mono text-stone-200 font-semibold">{itemCount} ornament{itemCount !== 1 ? 's' : ''}</span>
            </div>

            <div className="flex justify-between items-center text-xs pb-1">
              <span className="text-stone-400">Estimated Total:</span>
              <span className="font-mono font-bold text-emerald-400">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Deep Explanation */}
          <div className="space-y-4 text-xs text-stone-300 leading-relaxed text-left font-sans">
            <p className="flex gap-2">
              <MessageCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Opening WhatsApp:</strong> We've redirected you in a new tab to initiate our premium personal concierge checkout. Chat there with representative <strong>Simi</strong> to verify sizes and finalize the booking terms.
              </span>
            </p>

            <p className="flex gap-2">
              <Bell className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Real-time Live Progress:</strong> Your order request status is fully synced to your browser! As our smiths approve, cast, and dispatch your jewelry, you'll receive sound chime notifications. Find live updates under the <strong>Alerts Bell</strong> (top right header menu).
              </span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-8 space-y-2.5">
            <button
              onClick={() => {
                onClose();
                if (onOpenNotifications) {
                  onOpenNotifications();
                }
              }}
              className="w-full py-3.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-stone-950 font-black text-xs rounded-xl shadow-lg border border-amber-400/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
            >
              <span>View Live Booking Tracker</span>
              <ArrowRight className="w-4 h-4 ml-0.5 stroke-[2.5]" />
            </button>

            {isGuest && onOpenAuth && (
              <p className="text-[10px] text-stone-400 font-mono text-center pt-2">
                💡 Want to track on other devices?{' '}
                <button 
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="text-amber-500 hover:text-amber-400 font-bold underline cursor-pointer"
                >
                  Create a Google/Secure Account
                </button>{' '}
                to backup this order!
              </p>
            )}
          </div>

          <div className="mt-6 border-t border-stone-900 pt-4 flex items-center justify-center gap-1.5 text-[10px] font-mono text-stone-500">
            <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>Secured in Real-Time to Simi Gold Covering Database</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
