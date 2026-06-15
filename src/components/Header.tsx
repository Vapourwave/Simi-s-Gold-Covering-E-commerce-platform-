import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Search, Sparkles, MessageCircle, Menu, X, Phone, ShieldCheck, Lock, User, Compass, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { CartItem } from '../types';

interface HeaderProps {
  cart: CartItem[];
  onOpenCart: () => void;
  onNavigateHome: () => void;
  onOpenCustomEnquiry: () => void;
  activeCategory: string | null;
  onSelectCategory: (cat: 'vala' | 'kolus' | 'mala_necklace' | 'earrings' | null) => void;
  onOpenAdmin: () => void;
  onOpenPatchNotes: () => void;
  onOpenProfile: () => void;
  isLoggedIn: boolean;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

const LogoIMAGE = () => (
  <img 
    src="https://images.unsplash.com/photo-1781112432787-1f28f3025ed3?q=80&w=1180&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
    alt="Simi's Gold Covering"
    className="h-14 sm:h-16 w-auto object-contain select-none cursor-pointer"
    referrerPolicy="no-referrer"
  />
);

export default function Header({
  cart,
  onOpenCart,
  onNavigateHome,
  onOpenCustomEnquiry,
  activeCategory,
  onSelectCategory,
  onOpenAdmin,
  onOpenPatchNotes,
  onOpenProfile,
  isLoggedIn,
  onOpenNotifications,
  unreadNotificationsCount = 0
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavbar2Visible, setIsNavbar2Visible] = useState(true);
  const isNavbar2VisibleRef = useRef(true);
  isNavbar2VisibleRef.current = isNavbar2Visible;

  const lastScrollY = useRef(0);
  const lastToggleTime = useRef(0);
  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const now = Date.now();
      // 450ms cooldown prevents scroll anchoring layout adjustments from triggering a feedback loop
      const isCooldown = now - lastToggleTime.current < 450;
      
      if (currentScrollY < 50) {
        if (!isNavbar2VisibleRef.current && !isCooldown) {
          setIsNavbar2Visible(true);
          lastToggleTime.current = now;
        }
      } else if (currentScrollY > lastScrollY.current + 12) {
        // Scrolled down with a modern noise threshold
        if (isNavbar2VisibleRef.current && !isCooldown) {
          setIsNavbar2Visible(false);
          lastToggleTime.current = now;
        }
      } else if (currentScrollY < lastScrollY.current - 12) {
        // Scrolled up with a modern noise threshold
        if (!isNavbar2VisibleRef.current && !isCooldown) {
          setIsNavbar2Visible(true);
          lastToggleTime.current = now;
        }
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[#0c0812]/95 backdrop-blur-md border-b border-stone-900 shadow-md">
      {/* Top micro promotion bar */}
      <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-stone-950 text-xs py-1.5 px-4 text-center font-semibold tracking-wider flex justify-center items-center gap-1.5 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
        <span>SEASONAL SALE: FLAT 20% OFF ON ALL GOLD COVERING MODELS + FREE POLISH WARRANTY!</span>
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5 flex-1 md:flex-none">
            <button 
              id="brand-logo"
              onClick={() => { onNavigateHome(); setIsMobileMenuOpen(false); }}
              className="group flex items-center gap-3.5 text-left focus:outline-none cursor-pointer"
            >
              <LogoIMAGE />
              
              <div className="flex flex-col">
                <span className="text-xl sm:text-[22px] font-serif font-black tracking-wide text-amber-400 group-hover:text-amber-300 transition-colors">
                  SIMI'S <span className="text-stone-100 font-sans font-normal text-[15.4px] sm:text-[17.6px]">Gold Covering</span>
                </span>
                <span className="text-[8.5px] sm:text-[10.5px] uppercase tracking-widest text-amber-500/85 -mt-0.5 font-medium select-none font-mono">
                  Micro-Plated Luxury
                </span>
              </div>
            </button>
          </div>

          {/* Large Screen Navigation Links (Moved to navbar2) */}
          <div className="hidden md:flex flex-1" />

          {/* Quick Helper Actions */}
          <div className="flex items-center gap-4">
            
            {/* Website version patch notes badge */}
            <button
              id="version-badge"
              onClick={() => onOpenPatchNotes()}
              className="hidden lg:flex items-center gap-1.5 bg-[#171221] hover:bg-[#20192e] border border-amber-500/20 hover:border-amber-500/40 text-amber-500 hover:text-amber-400 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all active:scale-95 focus:outline-none"
              title="Click to view release updates & patch notes"
            >
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              <span>v0.3.2.4</span>
            </button>

            {/* Real-time Order Notifications Trigger */}
            {onOpenNotifications && (
              <button
                id="notifications-bell"
                onClick={onOpenNotifications}
                className="hidden md:block relative p-2 text-stone-300 hover:text-amber-400 transition-colors focus:outline-none cursor-pointer"
                aria-label="View Order Notifications"
                title="View Order Notifications"
              >
                <Bell className="w-6 h-6 stroke-2" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 bg-rose-500 text-stone-100 text-[9px] font-sans font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border border-stone-900 shadow-sm transform scale-100 animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Client Profile Account Indicator */}
            <button
              id="profile-trigger-button"
              onClick={onOpenProfile}
              className="hidden md:block relative p-2 text-stone-300 hover:text-amber-400 transition-colors focus:outline-none"
              aria-label="Manage Profile & Shipping Address"
              title="Manage Profile & Shipping Address"
            >
              <User className="w-6 h-6 stroke-2" />
              {isLoggedIn ? (
                <span className="absolute top-1.5 right-1.5 bg-emerald-500 w-2.5 h-2.5 rounded-full border-2 border-stone-900 shadow-sm transform scale-100 animate-pulse" />
              ) : (
                <span className="absolute -top-0.5 -right-0.5 bg-amber-500 text-stone-950 text-[8px] font-sans font-bold px-1 rounded border border-stone-900 leading-tight">
                  IN
                </span>
              )}
            </button>

            {/* Mobile Menu Icon */}
            <button
              id="mobile-menu-trigger"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-stone-300 hover:text-amber-400 focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Navbar 2: Sub-navigation for categories in desktop view */}
      <motion.div 
        id="navbar2" 
        initial={{ height: 'auto', opacity: 1 }}
        animate={{ 
          height: isNavbar2Visible ? 'auto' : 0, 
          opacity: isNavbar2Visible ? 1 : 0,
        }}
        transition={{ duration: 0.3125, ease: 'easeInOut' }}
        className="hidden md:block border-t border-stone-850/60 bg-[#07040a]/40 backdrop-blur-sm overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-center gap-14 py-2 text-xs font-mono uppercase tracking-widest text-stone-300">
            <button 
              id="nav-vala"
              onClick={() => onSelectCategory('vala')}
              className={`hover:text-amber-400 transition-colors cursor-pointer relative py-1 ${activeCategory === 'vala' ? 'text-amber-400 font-bold border-b-2 border-amber-500' : ''}`}
            >
              Vala & Bangles
            </button>
            <button 
              id="nav-kolus"
              onClick={() => onSelectCategory('kolus')}
              className={`hover:text-amber-400 transition-colors cursor-pointer relative py-1 ${activeCategory === 'kolus' ? 'text-amber-400 font-bold border-b-2 border-amber-500' : ''}`}
            >
              Anklets (Kolus)
            </button>
            <button 
              id="nav-mala"
              onClick={() => onSelectCategory('mala_necklace')}
              className={`hover:text-amber-400 transition-colors cursor-pointer relative py-1 ${activeCategory === 'mala_necklace' ? 'text-amber-400 font-bold border-b-2 border-amber-500' : ''}`}
            >
              Mala & Necklaces
            </button>
            <button 
              id="nav-earrings"
              onClick={() => onSelectCategory('earrings')}
              className={`hover:text-amber-400 transition-colors cursor-pointer relative py-1 ${activeCategory === 'earrings' ? 'text-amber-400 font-bold border-b-2 border-amber-500' : ''}`}
            >
              Earrings & Jimmikies
            </button>
          </nav>
        </div>
      </motion.div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-stone-950 border-t border-amber-500/20 px-4 py-4 space-y-3 shadow-inner">
          <div className={`grid ${onOpenNotifications ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 text-[10px] sm:text-[11px] font-sans font-bold`}>
            <button
              id="mobile-nav-home"
              onClick={() => { onNavigateHome(); setIsMobileMenuOpen(false); }}
              className={`p-2.5 text-center rounded-lg transition-colors flex flex-col items-center justify-center gap-1 ${!activeCategory ? 'bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30' : 'bg-stone-900 text-stone-300'}`}
            >
              <Compass className="w-4 h-4 ml-0.5" />
              <span>Home</span>
            </button>
            <button
              id="mobile-nav-custom"
              onClick={() => { onOpenCustomEnquiry(); setIsMobileMenuOpen(false); }}
              className="p-2.5 text-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/40 flex flex-col items-center justify-center gap-1"
            >
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Thali</span>
            </button>
            <button
              id="mobile-nav-profile"
              onClick={() => { onOpenProfile(); setIsMobileMenuOpen(false); }}
              className={`p-2.5 text-center rounded-lg border flex flex-col items-center justify-center gap-1 ${isLoggedIn ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/35' : 'bg-stone-900 border-stone-800 text-amber-500'}`}
            >
              <User className="w-4 h-4" />
              <span>{isLoggedIn ? 'Profile' : 'Sign In'}</span>
            </button>
            {onOpenNotifications && (
              <button
                id="mobile-nav-notifications"
                onClick={() => { onOpenNotifications(); setIsMobileMenuOpen(false); }}
                className={`p-2.5 text-center rounded-lg border flex flex-col items-center justify-center gap-1 relative ${unreadNotificationsCount > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/35 animate-pulse' : 'bg-stone-900 border-stone-800 text-[#aa9dfa]'}`}
              >
                <Bell className="w-4 h-4" />
                <span>Alerts</span>
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 bg-rose-500 text-stone-100 text-[8px] font-sans font-black w-4 h-4 flex items-center justify-center rounded-full">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <p className="text-[10px] uppercase font-bold text-stone-500 tracking-wider pt-2 px-1">Shop Categories</p>
          <div className="space-y-1">
            <button
              id="mobile-nav-vala"
              onClick={() => { onSelectCategory('vala'); setIsMobileMenuOpen(false); }}
              className={`w-full p-2.5 rounded text-left flex items-center justify-between ${activeCategory === 'vala' ? 'text-amber-400 font-bold bg-stone-900' : 'text-stone-300'}`}
            >
              <span>Vala / Bangles</span>
              <span className="text-[10px] bg-stone-800 text-amber-500 px-2 py-0.5 rounded">Bangles</span>
            </button>
            <button
              id="mobile-nav-kolus"
              onClick={() => { onSelectCategory('kolus'); setIsMobileMenuOpen(false); }}
              className={`w-full p-2.5 rounded text-left flex items-center justify-between ${activeCategory === 'kolus' ? 'text-amber-400 font-bold bg-stone-900' : 'text-stone-300'}`}
            >
              <span>Kolus (Anklets)</span>
              <span className="text-[10px] bg-stone-800 text-amber-500 px-2 py-0.5 rounded">Anklets</span>
            </button>
            <button
              id="mobile-nav-mala"
              onClick={() => { onSelectCategory('mala_necklace'); setIsMobileMenuOpen(false); }}
              className={`w-full p-2.5 rounded text-left flex items-center justify-between ${activeCategory === 'mala_necklace' ? 'text-amber-400 font-bold bg-stone-900' : 'text-stone-300'}`}
            >
              <span>Mala & Necklaces</span>
              <span className="text-[10px] bg-stone-800 text-amber-500 px-2 py-0.5 rounded">Chains</span>
            </button>
            <button
              id="mobile-nav-earrings"
              onClick={() => { onSelectCategory('earrings'); setIsMobileMenuOpen(false); }}
              className={`w-full p-2.5 rounded text-left flex items-center justify-between ${activeCategory === 'earrings' ? 'text-amber-400 font-bold bg-stone-900' : 'text-stone-300'}`}
            >
              <span>Earrings (Jimmikies, Stud, Bugadi)</span>
              <span className="text-[10px] bg-stone-800 text-amber-500 px-2 py-0.5 rounded">Jimmiki</span>
            </button>
          </div>

          <div className="pt-4 border-t border-stone-900 flex justify-between items-center px-1 text-stone-400 text-xs">
            <button
              onClick={() => { onOpenAdmin(); setIsMobileMenuOpen(false); }}
              className="text-stone-500 hover:text-amber-400 flex items-center gap-1 font-mono text-[10px] uppercase font-bold focus:outline-none"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Admin Login</span>
            </button>
            <button
               onClick={() => { onOpenPatchNotes(); setIsMobileMenuOpen(false); }}
              className="text-amber-500 hover:text-amber-400 font-mono text-[10px] uppercase font-bold flex items-center gap-1 focus:outline-none animate-pulse"
            >
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              <span>v0.3.2.4 notes</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
