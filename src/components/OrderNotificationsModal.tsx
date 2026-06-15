import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Bell, AlertCircle, CheckCircle, Package, Calendar, 
  Trash2, BellOff, ArrowRight, ShieldCheck, ChevronRight
} from 'lucide-react';
import { OrderRequest } from '../types';

export interface OrderNotification {
  id: string;
  orderId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
  read: boolean;
}

interface OrderNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderRequest[];
  notifications: OrderNotification[];
  onMarkAllAsRead: () => void;
  onClearAllNotifications: () => void;
  onMarkNotificationRead: (id: string) => void;
}

export default function OrderNotificationsModal({
  isOpen,
  onClose,
  orders,
  notifications,
  onMarkAllAsRead,
  onClearAllNotifications,
  onMarkNotificationRead
}: OrderNotificationsModalProps) {
  
  const unreadCount = notifications.filter(n => !n.read).length;

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[10px] font-bold uppercase tracking-wider font-mono">
            <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
            Pending Authorization
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Inquiry Confirmed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[10px] font-bold uppercase tracking-wider font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Under Smithing
          </span>
        );
      case 'dispatched':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-bold uppercase tracking-wider font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Dispatched from Workshop
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-400 text-[10px] font-bold uppercase tracking-wider font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            Shipped & Delivered
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-800 border border-stone-700 text-stone-500 text-[10px] font-bold uppercase tracking-wider font-mono">
            Cancelled / Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[10px] font-bold uppercase tracking-wider font-mono">
            {status}
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="order-notifications-portal" 
        className="fixed inset-0 z-50 flex items-center justify-end overflow-hidden focus:outline-none"
      >
        {/* Dark subtle overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm"
        />

        {/* Modal panel body */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-lg h-full bg-gradient-to-b from-[#120a1c] to-[#0a0610] border-l border-stone-850 shadow-2xl flex flex-col z-10"
        >
          {/* Top Panel Brand Bar */}
          <div className="bg-[#191026] border-b border-stone-850 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-500 animate-pulse" />
              </div>
              <div className="text-left">
                <h2 className="text-base font-serif font-black tracking-wide text-stone-100 flex items-center gap-2">
                  Order Status Updates
                </h2>
                <p className="text-[11.5px] text-amber-500/80 font-mono tracking-wider font-medium">
                  Real-time Booking Tracker
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick tab filters/actions */}
          {notifications.length > 0 && (
            <div className="bg-stone-950/80 px-5 py-3 border-b border-stone-900 flex justify-between items-center text-xs">
              <span className="font-mono text-stone-400">
                {unreadCount} new update{unreadCount !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={onMarkAllAsRead}
                  className="text-amber-500 hover:text-amber-400 font-mono text-[11px] font-bold cursor-pointer transition-colors"
                >
                  Mark all read
                </button>
                <span className="text-stone-800">|</span>
                <button
                  onClick={onClearAllNotifications}
                  className="text-stone-500 hover:text-rose-400 font-mono text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear notification logs
                </button>
              </div>
            </div>
          )}

          {/* Core Content: Scrollable updates list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
            
            {/* Part 1: Status Change Alert logs */}
            <div className="space-y-3">
              <h3 className="text-[10px] uppercase font-mono font-bold tracking-widest text-stone-400 mb-2">
                Notification Alerts Logs
              </h3>

              {notifications.length > 0 ? (
                <div className="space-y-2.5">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => onMarkNotificationRead(notif.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        notif.read
                          ? 'bg-stone-950/30 border-stone-900 text-stone-300'
                          : 'bg-amber-500/[0.04] border-amber-500/20 shadow-sm text-stone-100 hover:border-amber-400/30 cursor-pointer'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9.5px] font-mono uppercase bg-stone-900 border border-stone-800 text-stone-400 font-bold px-1.5 py-0.5 rounded">
                              ID: {notif.orderId.slice(-6).toUpperCase()}
                            </span>
                            {!notif.read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            )}
                          </div>
                          <p className="text-[12px] leading-relaxed">
                            Booking status updated from{' '}
                            <span className="font-semibold text-rose-400 font-mono capitalize">
                              '{notif.oldStatus}'
                            </span>{' '}
                            to{' '}
                            <span className="font-semibold text-emerald-400 font-mono capitalize">
                              '{notif.newStatus}'
                            </span>
                            .
                          </p>
                          <span className="text-[10px] text-stone-500 block pt-1 font-mono">
                            {formatDate(notif.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 bg-stone-950/20 rounded-2xl border border-dashed border-stone-900/60 flex flex-col items-center justify-center text-center p-4">
                  <BellOff className="w-6 h-6 text-stone-700 mb-1.5" />
                  <p className="text-xs text-stone-500 font-light">No new status update alerts.</p>
                  <p className="text-[10px] text-stone-600 font-mono mt-0.5">Alerts trigger in real-time when booking is updated by studio admins.</p>
                </div>
              )}
            </div>

            {/* Part 2: Active Orders / Bookings List */}
            <div className="space-y-3 pt-2">
              <h3 className="text-[10px] uppercase font-mono font-bold tracking-widest text-stone-400 flex items-center justify-between mb-2">
                <span>My Active Bookings Tracker ({orders.length})</span>
                <span className="text-[9px] text-[#8e6db5] lowercase font-light italic">Refreshed live via firestore</span>
              </h3>

              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
                    return (
                      <div 
                        key={order.id} 
                        className="bg-[#120a1e]/50 border border-stone-900/80 hover:border-stone-850 rounded-2xl p-4 space-y-3 transition-colors text-left"
                      >
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-stone-900/55">
                          <div className="space-y-0.5">
                            <span className="text-[9.5px] uppercase font-mono text-[#aa9dfa] font-bold">
                              Inquiry Code
                            </span>
                            <h4 className="text-sm font-bold text-stone-200 font-mono">
                              #{order.id.slice(-8).toUpperCase()}
                            </h4>
                          </div>
                          <div className="shrink-0">
                            {getStatusBadge(order.status)}
                          </div>
                        </div>

                        {/* Order Summary */}
                        <div className="text-xs space-y-1 text-stone-400 leading-relaxed font-sans">
                          <div className="flex justify-between items-center text-stone-300">
                            <span>Item Count:</span>
                            <span className="font-semibold text-white font-mono">{(order.orderItems || order.items).reduce((sum, item) => sum + item.quantity, 0)} model{((order.orderItems || order.items).reduce((sum, item) => sum + item.quantity, 0)) !== 1 ? 's' : ''}</span>
                          </div>
                          
                          {/* Render items block preview */}
                          <div className="bg-stone-950/30 p-2 rounded-lg border border-stone-900 mt-1.5 mb-1.5 max-h-[105px] overflow-y-auto custom-scrollbar space-y-1">
                            {(order.orderItems || order.items).map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[11px] font-mono text-stone-400">
                                <span className="truncate max-w-[200px] text-stone-300">{it.name}</span>
                                <span className="text-amber-400 font-bold">{it.quantity}x {it.selectedSize ? `(${it.selectedSize})` : ''}</span>
                              </div>
                            ))}
                          </div>

                          {order.orderState && (
                            <div className="mt-1 mb-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/15 flex items-center justify-between">
                              <span className="text-[10px] text-amber-500 font-mono font-bold uppercase tracking-wider">WhatsApp Status:</span>
                              <span className="text-xs font-serif font-black text-amber-400 animate-pulse">{order.orderState}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-1 border-t border-dashed border-stone-900 text-xs">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3 text-stone-500" />
                              <span>Inquired on:</span>
                            </span>
                            <span className="font-mono text-stone-300">{formatDate(order.createdAt).split(',')[0]}</span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span>Settlement Total:</span>
                            <span className="font-mono font-bold text-amber-500 text-sm">₹{order.total.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {/* Status tracker visual bar */}
                        <div className="pt-2">
                          <div className="bg-stone-950/60 rounded-xl p-2.5 border border-stone-900 flex justify-between items-center gap-1">
                            {/* Step 1: Inquiry */}
                            <div className="flex flex-col items-center flex-1">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono leading-none border font-bold ${
                                ['pending', 'confirmed', 'processing', 'dispatched', 'shipped'].includes(order.status)
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                                  : 'bg-stone-900 text-stone-600 border-stone-850'
                              }`}>
                                {['confirmed', 'processing', 'dispatched', 'shipped'].includes(order.status) ? '✓' : '1'}
                              </div>
                              <span className="text-[8px] font-mono text-stone-500 mt-1">Inquiry</span>
                            </div>

                            <ChevronRight className="w-3 text-stone-700" />

                            {/* Step 2: Confirmed */}
                            <div className="flex flex-col items-center flex-1">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono leading-none border font-bold ${
                                ['confirmed', 'processing', 'dispatched', 'shipped'].includes(order.status)
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                                  : 'bg-stone-900 text-stone-600 border-stone-850'
                              }`}>
                                {['processing', 'dispatched', 'shipped'].includes(order.status) ? '✓' : '2'}
                              </div>
                              <span className="text-[8px] font-mono text-stone-500 mt-1">Confirmed</span>
                            </div>

                            <ChevronRight className="w-3 text-stone-700" />

                            {/* Step 3: Smithing / Workshop */}
                            <div className="flex flex-col items-center flex-1">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono leading-none border font-bold ${
                                ['processing', 'dispatched', 'shipped'].includes(order.status)
                                  ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40 animate-pulse'
                                  : 'bg-stone-900 text-stone-600 border-stone-850'
                              }`}>
                                {['dispatched', 'shipped'].includes(order.status) ? '✓' : '3'}
                              </div>
                              <span className="text-[8px] font-mono text-stone-500 mt-1">Smithing</span>
                            </div>

                            <ChevronRight className="w-3 text-stone-700" />

                            {/* Step 4: Sent / Dispatched */}
                            <div className="flex flex-col items-center flex-1">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono leading-none border font-bold ${
                                ['dispatched', 'shipped'].includes(order.status)
                                  ? 'bg-teal-500/15 text-teal-400 border-teal-500/40'
                                  : 'bg-stone-900 text-stone-600 border-stone-850'
                              }`}>
                                {order.status === 'shipped' ? '✓' : '4'}
                              </div>
                              <span className="text-[8px] font-mono text-stone-500 mt-1">Shipped</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 bg-stone-950/20 rounded-2xl border border-dashed border-stone-900 flex flex-col items-center justify-center text-center p-4">
                  <Package className="w-8 h-8 text-stone-800 mb-2" />
                  <p className="text-xs text-stone-400">You have no active or historic inquiries.</p>
                  <p className="text-[10px] text-stone-600 font-mono mt-0.5 max-w-xs leading-normal">Ornaments added to your basket can be inquired by pressing "Submit WhatsApp Booking" inside secure bag drawer.</p>
                </div>
              )}
            </div>

          </div>

          {/* Secure disclaimer bottom stripe */}
          <div className="bg-[#09050d] p-4 border-t border-stone-850 flex items-center justify-center gap-1.5 text-stone-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[10.5px] font-mono leading-none">
              Secured in Real-Time to Simi Gold Covering Database
            </span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
