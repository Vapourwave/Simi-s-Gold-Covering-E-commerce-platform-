import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, ShieldCheck, Heart, ArrowRight, MessageCircle, 
  HelpCircle, Star, Phone, Hammer, ChevronRight, Gem, Info, Lock, ShoppingBag,
  User, LogOut
} from 'lucide-react';

import Header from './components/Header';
import Hero from './components/Hero';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import CategoryView from './components/CategoryView';
import CartDrawer from './components/CartDrawer';
import CustomEnquiryModal from './components/CustomEnquiryModal';
import AdminPortal from './components/AdminPortal';
import WipAnnouncementModal from './components/WipAnnouncementModal';
import CustomerFeedbacks from './components/CustomerFeedbacks';
import PatchNotesModal from './components/PatchNotesModal';
import AuthProfileModal from './components/AuthProfileModal';
import StorefrontPOS from './components/StorefrontPOS';
import OrderNotificationsModal, { OrderNotification } from './components/OrderNotificationsModal';
import OrderPlacedOverlay from './components/OrderPlacedOverlay';

import { signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import { 
  fetchProductsFromFirestore, 
  saveProductToFirestore, 
  deleteProductFromFirestore,
  testConnection,
  auth,
  db,
  confirmOrderRequestAndProcess,
  updateOrderRequestInFirestore,
  getPersistentGuestUid,
  migrateGuestOrdersToUser
} from './firebase';

import { PRODUCTS } from './data/products';
import { Product, CartItem, UserProfile, OrderRequest } from './types';
import { ToastProvider, useToast } from './context/ToastContext';

// Helper to seed products with progressive default arrival dates if missing
const seedProductsWithDates = (list: Product[]): Product[] => {
  // Base date June 12, 2026. Give each predefined item a unique, progressive date.
  const baseTime = 1781228400000;
  return list.map((p, idx) => {
    if (!p.arrivalDate) {
      // Subtract 1 day for each index to give them a progressive history
      const itemTime = baseTime - idx * 24 * 60 * 60 * 1000;
      const d = new Date(itemTime);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return {
        ...p,
        arrivalDate: `${yyyy}-${mm}-${dd}`
      };
    }
    return p;
  });
};

function AppContent() {
  const { addToast } = useToast();

  // Profile session states
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Real-time WhatsApp orders for showing notifications to admin
  const [orderRequests, setOrderRequests] = useState<OrderRequest[]>([]);
  const [adminPortalDefaultTab, setAdminPortalDefaultTab] = useState<'catalog' | 'security' | 'customers' | 'admins' | 'orders'>('catalog');
  const [isStorefrontMode, setIsStorefrontMode] = useState(false);

  // Customer notifications states
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<{ id: string; total: number; itemCount: number } | null>(null);
  const [customerOrders, setCustomerOrders] = useState<OrderRequest[]>([]);
  const [orderNotifications, setOrderNotifications] = useState<OrderNotification[]>(() => {
    try {
      const saved = localStorage.getItem('simi_order_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const prevStatusesRef = React.useRef<Record<string, string>>({});
  const isFirstLoadRef = React.useRef(true);
  const adminFirstLoadRef = React.useRef(true);
  const prevAdminPendingSetRef = React.useRef<Set<string>>(new Set());

  // Save customer notifications to localStorage
  React.useEffect(() => {
    localStorage.setItem('simi_order_notifications', JSON.stringify(orderNotifications));
  }, [orderNotifications]);

  const handleMarkAllAsRead = () => {
    setOrderNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    addToast('All updates marked as read.', 'success');
  };

  const handleClearAllNotifications = () => {
    setOrderNotifications([]);
    addToast('Cleared all status update logs.', 'info');
  };

  const handleMarkNotificationRead = (id: string) => {
    setOrderNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setIsStorefrontMode(false);
      addToast('Sign out complete. Logged out of your boutique profile.', 'info');
    } catch (e: any) {
      console.error(e);
      addToast('Communication error during sign out.', 'error');
    }
  };

  // IP blocking checks
  const [isBanned, setIsBanned] = useState(false);
  const [userIp, setUserIp] = useState('');

  // Products interactive State (initiates with static defaults, then loads from Firestore)
  const [products, setProducts] = useState<Product[]>(() => {
    return seedProductsWithDates(PRODUCTS);
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Check ban status and Authentically load live products from Firebase on mount
  React.useEffect(() => {
    let active = true;

    async function checkIpBan() {
      try {
        const res = await fetch('/api/ip-status');
        if (res.ok && active) {
          const data = await res.json();
          setUserIp(data.ip || '');
          if (data.banned) {
            setIsBanned(true);
            return;
          }
        }
      } catch (e) {
        console.error("Failed IP ban verify:", e);
      }
    }

    async function loadDbProducts() {
      try {
        const liveProducts = await fetchProductsFromFirestore();
        if (active) {
          setProducts(seedProductsWithDates(liveProducts));
          setIsLoadingProducts(false);
        }
      } catch (err) {
        console.error("Error loading products from Firebase:", err);
        if (active) {
          setIsLoadingProducts(false);
        }
      }
    }
    
    checkIpBan();
    testConnection();
    loadDbProducts();
    
    return () => {
      active = false;
    };
  }, []);

  // Synchronize order requests for notifications if admin is logged in
  React.useEffect(() => {
    const isAdmin = userProfile?.role === 'admin' || userProfile?.isAdmin === true;
    if (!isAdmin) {
      setOrderRequests([]);
      adminFirstLoadRef.current = true;
      prevAdminPendingSetRef.current = new Set();
      return;
    }

    const q = query(collection(db, 'order_requests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: OrderRequest[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as OrderRequest);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Track pending requests for real-time heads-up alerts
      const pendingIds = new Set(list.filter(r => r.status === 'pending').map(r => r.id));

      if (adminFirstLoadRef.current) {
        prevAdminPendingSetRef.current = pendingIds;
        adminFirstLoadRef.current = false;
      } else {
        // Find newly pending requests
        pendingIds.forEach((id) => {
          if (!prevAdminPendingSetRef.current.has(id)) {
            const freshOrder = list.find(r => r.id === id);
            if (freshOrder) {
              // Sound alert
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                if (audioCtx.state === 'suspended') {
                  audioCtx.resume();
                }
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'triangle'; // pleasant, loud alert tone
                osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
                gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.3);
              } catch (soundErr) {
                console.warn('Blocked autoplay warning:', soundErr);
              }

              // Post beautiful Toast notifier
              addToast(
                `🔔 [NEW ORDER INQUIRY] Received from ${freshOrder.userName}! Size and total ₹${freshOrder.total.toLocaleString('en-IN')}. Accept or adjust in WhatsApp Requests.`,
                'success',
                15000
              );
            }
          }
        });
        prevAdminPendingSetRef.current = pendingIds;
      }

      setOrderRequests(list);
    }, (error) => {
      console.warn("App.tsx failed subscribing to order_requests:", error);
    });

    return () => unsubscribe();
  }, [userProfile]);

  // Automatically trigger guest order migration when a user signs in
  React.useEffect(() => {
    if (userProfile && userProfile.uid && !userProfile.uid.startsWith('offline_guest_')) {
      const runMigration = async () => {
        try {
          await migrateGuestOrdersToUser(
            userProfile.uid,
            userProfile.email || '',
            userProfile.displayName || 'Client User'
          );
        } catch (e) {
          console.warn("Guest order migration skipped:", e);
        }
      };
      runMigration();
    }
  }, [userProfile]);

  // Synchronize customer orders and observe real-time status changes
  React.useEffect(() => {
    const trackUid = userProfile ? userProfile.uid : getPersistentGuestUid();

    // Reset tracking indicators
    prevStatusesRef.current = {};
    isFirstLoadRef.current = true;

    // Listen to current tracking UID's order requests
    const q = query(
      collection(db, 'order_requests'),
      where('userId', '==', trackUid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: OrderRequest[] = [];
      const newStatuses: Record<string, string> = {};

      snapshot.forEach((docSnap) => {
        const order = docSnap.data() as OrderRequest;
        list.push(order);
        newStatuses[order.id] = order.status;
      });

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCustomerOrders(list);

      if (isFirstLoadRef.current) {
        // First snapshot load - cache existing statuses
        prevStatusesRef.current = newStatuses;
        isFirstLoadRef.current = false;
      } else {
        // Subsequent loads - locate status deviations
        Object.keys(newStatuses).forEach((id) => {
          const oldS = prevStatusesRef.current[id];
          const newS = newStatuses[id];

          if (oldS && oldS !== newS) {
            // Document status updated!
            const newNotif: OrderNotification = {
              id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              orderId: id,
              oldStatus: oldS,
              newStatus: newS,
              timestamp: new Date().toISOString(),
              read: false
            };

            setOrderNotifications((prev) => [newNotif, ...prev]);

            // Auditory bell/chime cue
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.type = 'sine';
              osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // chime frequency
              gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.15);
            } catch {
              // Ignore blocked or disabled audio permissions
            }

            addToast(
              `Order Updated: Your order #${id.slice(-6).toUpperCase()} is now '${newS}'!`,
              'info',
              6000
            );
          }
        });

        // Update tracking ref
        prevStatusesRef.current = newStatuses;
      }
    }, (error) => {
      console.warn("Real-time customer status listener subscription error:", error);
    });

    return () => unsubscribe();
  }, [userProfile, addToast]);

  if (isBanned) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.08)_0,transparent_100%)]" />
        <div className="max-w-md w-full bg-stone-900 border border-red-500/20 rounded-3xl p-8 space-y-6 shadow-[0_30px_70px_rgba(0,0,0,0.9)] relative z-10 border-t-red-600/40 animate-fadeIn">
          <div className="w-16 h-16 bg-red-950/40 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-black text-rose-500 tracking-wide">Website Access Terminated</h1>
            <p className="text-sm font-semibold text-stone-300">You are banned for unauthorised entry.</p>
            <p className="text-xs text-stone-400 font-light leading-relaxed pt-2">
              The administrator control security engine detected 3 successive authentication failures from your device location.
            </p>
          </div>
          <div className="bg-stone-950/80 border border-stone-850 px-4 py-3 rounded-xl font-mono text-[11px] text-stone-500 text-left space-y-1">
            <div className="flex justify-between"><span>Registry:</span> <span className="font-bold text-stone-400">Simi Security Ledger</span></div>
            <div className="flex justify-between"><span>Your IP:</span> <span className="font-bold text-red-400">{userIp || 'unknown'}</span></div>
            <div className="flex justify-between"><span>Status:</span> <span className="font-bold text-red-400 uppercase tracking-wider">Locked (403 Forbidden)</span></div>
          </div>
          <p className="text-[10px] text-stone-500 italic leading-normal">
            If you believe this restriction is an error, please contact Simi Gold Plating Operations directly to request a manual administrative unban.
          </p>
        </div>
      </div>
    );
  }

  const handleUpdateProducts = async (newProducts: Product[]) => {
    // Optimistic offline update to UI for instant visual responsiveness
    setProducts(newProducts);
    
    // Sync to Cloud Firestore Database
    try {
      const newIds = new Set(newProducts.map(p => p.id));
      const deleted = products.filter(p => !newIds.has(p.id));
      
      // Perform deletion
      for (const p of deleted) {
        await deleteProductFromFirestore(p.id);
      }

      // Perform additions or modifications
      for (const p of newProducts) {
        const existing = products.find(oldP => oldP.id === p.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(p)) {
          await saveProductToFirestore(p);
        }
      }
    } catch (err) {
      console.error("Failed to sync updates to FireStore:", err);
    }
  };

  // Navigation & Category selection State
  const [activeCategory, setActiveCategory] = useState<'vala' | 'kolus' | 'mala_necklace' | 'earrings' | null>(null);
  
  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Sync URL query parameter "?product=ID" with selectedProduct
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentId = params.get('product');
    if (selectedProduct) {
      if (currentId !== selectedProduct.id) {
        const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?product=${encodeURIComponent(selectedProduct.id)}${window.location.hash}`;
        window.history.pushState({ productId: selectedProduct.id }, '', newUrl);
      }
    } else {
      if (currentId !== null) {
        const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}${window.location.hash}`;
        window.history.pushState(null, '', cleanUrl);
      }
    }
  }, [selectedProduct]);

  // Read URL query parameter on load or when products are loaded, and listen for back/forward popstate
  React.useEffect(() => {
    if (products && products.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const prodId = params.get('product');
      if (prodId) {
        const found = products.find(p => p.id === prodId);
        if (found) {
          setSelectedProduct(found);
        }
      }
    }
  }, [products]);

  React.useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const prodId = params.get('product');
      if (prodId && products && products.length > 0) {
        const found = products.find(p => p.id === prodId);
        if (found) {
          setSelectedProduct(found);
          return;
        }
      }
      setSelectedProduct(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [products]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCustomEnquiryOpen, setIsCustomEnquiryOpen] = useState(false);
  const [prefilledCustomProduct, setPrefilledCustomProduct] = useState('');
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false);
  const [isAuthProfileOpen, setIsAuthProfileOpen] = useState(false);

  const handleOpenProfileClick = () => {
    setIsAuthProfileOpen(true);
  };

  // Cart State (Local storage-backed or fresh reactive state)
  const [cart, setCart] = useState<CartItem[]>([]);
  const totalCartItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  // Filter & Search state (for header search if requested)
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Filtered lists for Homepage based on reactive list (Sorted by Date descending)
  const latestModels = useMemo(() => {
    const rawArrivals = products.filter(p => p.isNewArrival);
    return [...rawArrivals].sort((a, b) => {
      const dateA = a.arrivalDate ? new Date(a.arrivalDate).getTime() : 0;
      const dateB = b.arrivalDate ? new Date(b.arrivalDate).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      return b.id.localeCompare(a.id);
    }).slice(0, 4);
  }, [products]);

  const classicModels = useMemo(() => {
    return products.filter(p => !p.isNewArrival).slice(0, 8);
  }, [products]);

  // 2. Add to basket handler
  const handleAddToCart = (product: Product, size: string, quantityToAdd: number = 1) => {
    setCart((prevCart) => {
      // Check if product with identical size exists
      const existingIdx = prevCart.findIndex(
        (item) => item.product.id === product.id && item.selectedSize === size
      );

      if (existingIdx > -1) {
        const nextCart = [...prevCart];
        nextCart[existingIdx].quantity += quantityToAdd;
        return nextCart;
      } else {
        return [...prevCart, { product, quantity: quantityToAdd, selectedSize: size }];
      }
    });

    // Framer motion interactive toast visual feedback
    const toastMessage = product.stockCount === 0
      ? `Bespoke Pre-Order: Added ${quantityToAdd} x ${product.name} (Size: ${size}) to booking request!`
      : `Added ${quantityToAdd} x ${product.name} (Size: ${size}) to your shopping bag.`;
    addToast(toastMessage, 'cart');
  };

  // Modify cart quantities
  const handleUpdateCartQuantity = (productId: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(productId, size);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId && item.selectedSize === size
          ? { ...item, quantity }
          : item
      )
    );
  };

  // Remove individual cart item
  const handleRemoveCartItem = (productId: string, size: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => !(item.product.id === productId && item.selectedSize === size))
    );
  };

  // Open custom engraving with pre-filled name
  const handleOpenCustomEnquiry = (productName?: string) => {
    setPrefilledCustomProduct(productName || '');
    setIsCustomEnquiryOpen(true);
  };

  // Smoothly scroll down to categories section slowly
  const handleScrollToCategories = () => {
    const target = document.getElementById('category-section');
    if (!target) return;

    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - 90;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 1200; // 1.2 seconds for slow, smooth slidedown effect
    let startTime: number | null = null;

    const easeInOutQuad = (t: number, b: number, c: number, d: number) => {
      t /= d / 2;
      if (t < 1) return (c / 2) * t * t + b;
      t--;
      return (-c / 2) * (t * (t - 2) - 1) + b;
    };

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
      window.scrollTo(0, run);
      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      } else {
        window.scrollTo(0, targetPosition);
      }
    };

    requestAnimationFrame(animation);
  };

  const isAdmin = userProfile?.role === 'admin' || userProfile?.isAdmin === true;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-400 selection:text-stone-950">
      
      {/* 1. Navbar Header */}
      <Header 
        cart={cart}
        onOpenCart={() => setIsCartOpen(true)}
        onNavigateHome={() => setActiveCategory(null)}
        onOpenCustomEnquiry={() => handleOpenCustomEnquiry()}
        activeCategory={activeCategory}
        onSelectCategory={(cat) => setActiveCategory(cat)}
        onOpenAdmin={() => {
          setAdminPortalDefaultTab('catalog');
          setIsAdminPortalOpen(true);
        }}
        onOpenPatchNotes={() => setIsPatchNotesOpen(true)}
        onOpenProfile={handleOpenProfileClick}
        isLoggedIn={userProfile !== null}
        onOpenNotifications={() => {
          const isAdmin = userProfile?.role === 'admin' || userProfile?.isAdmin === true;
          if (isAdmin) {
            setAdminPortalDefaultTab('orders');
            setIsAdminPortalOpen(true);
          } else {
            setIsNotificationsOpen(true);
          }
        }}
        unreadNotificationsCount={
          (userProfile?.role === 'admin' || userProfile?.isAdmin === true)
            ? orderRequests.filter(r => r.status === 'pending').length
            : orderNotifications.filter(n => !n.read).length
        }
      />

      {/* Main Dynamic Viewport wrapper */}
      <main className="pb-16">
        <AnimatePresence mode="wait">
          {!activeCategory ? (
            // --- HOMEPAGE DEFAULT VIEW ---
            <motion.div
              key="homepage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-12"
            >
              {/* Admin Storefront Mode Controller Banner */}
              {isAdmin && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                  <div className="bg-gradient-to-r from-stone-900 to-amber-950/25 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row hover:border-amber-500/40 transition-all items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 font-sans">
                        <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500/10" />
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-amber-400">Administrative In-Store Controls</span>
                        <h3 className="text-sm font-bold text-stone-100 font-serif">Storefront Point of Sale & Walk-In Orders</h3>
                        <p className="text-[11px] text-stone-400 font-light mt-0.5">
                          Toggle the interactive digital register to record offline cash/UPI sales and automatically deduct catalog stocks instantly.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsStorefrontMode(!isStorefrontMode)}
                      className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shrink-0 border ${
                        isStorefrontMode 
                          ? "bg-amber-500 text-stone-900 border-amber-400 hover:bg-amber-400" 
                          : "bg-stone-950 hover:bg-stone-900 text-amber-500 border-amber-500/20"
                      }`}
                    >
                      <span>{isStorefrontMode ? "Deactivate POS Terminal" : "Activate POS Terminal"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {isStorefrontMode && isAdmin ? (
                <StorefrontPOS 
                  products={products}
                  onUpdateProducts={handleUpdateProducts}
                  onClose={() => setIsStorefrontMode(false)}
                  addToast={addToast}
                />
              ) : (
                <>
                  {/* Grand Hero Section */}
                  <Hero 
                    onBrowseCollections={handleScrollToCategories}
                    onOpenCustom={() => handleOpenCustomEnquiry()}
                  />

              {/* A. Category Cards Sections */}
              <section id="category-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 scroll-mt-24">
                <div className="text-center space-y-2 mb-10">
                  <span className="text-[11px] text-amber-500 uppercase tracking-widest font-mono font-bold">Traditional Classifications</span>
                  <h2 className="text-3xl sm:text-4xl font-serif font-black text-stone-100">Shop Ornaments by Category</h2>
                  <p className="text-xs sm:text-sm text-stone-400 max-w-lg mx-auto font-light">
                    Select a category panel below to expand and search its unique varieties, adjust budget ranges, and explore newest arrivals.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                  {/* Card 1: Bangles */}
                  <motion.div
                    id="cat-card-bangles"
                    whileHover={{ y: -5 }}
                    onClick={() => setActiveCategory('vala')}
                    className="group relative h-72 rounded-2xl overflow-hidden border border-stone-850 cursor-pointer shadow-lg bg-stone-900"
                  >
                    <img 
                      src="https://images.unsplash.com/photo-1781218246074-d4e787f747ef?q=80&w=1034&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                      alt="Bangles / Vala Category"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-106"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 space-y-1.5 z-10">
                      <span className="text-[9px] text-amber-400 font-mono uppercase tracking-wider font-bold">24ct Plated Ornaments</span>
                      <h3 className="text-white text-xl font-serif font-bold">Vala / Bangles</h3>
                      <p className="text-xs text-stone-300 font-light truncate">Thiruguvazha, temple models, broad pairs</p>
                    </div>
                    <span className="absolute top-4 right-4 bg-amber-400/10 text-amber-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-amber-500/20">Explore</span>
                  </motion.div>

                  {/* Card 2: Anklets */}
                  <motion.div
                    id="cat-card-kolus"
                    whileHover={{ y: -5 }}
                    onClick={() => setActiveCategory('kolus')}
                    className="group relative h-72 rounded-2xl overflow-hidden border border-stone-850 cursor-pointer shadow-lg bg-stone-900"
                  >
                    <img 
                      src="https://images.unsplash.com/photo-1781251315301-7a9f75757ff5?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                      alt="Anklets / Kolus Category"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-106"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 space-y-1.5 z-10">
                      <span className="text-[9px] text-amber-400 font-mono uppercase tracking-wider font-bold">Certified 925 Silver Base</span>
                      <h3 className="text-white text-xl font-serif font-bold">Kolus (Anklets)</h3>
                      <p className="text-xs text-stone-300 font-light truncate">Traditional chiming, baby kolus, gold-capped silver</p>
                    </div>
                    <span className="absolute top-4 right-4 bg-amber-400/10 text-amber-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-amber-500/20">Explore</span>
                  </motion.div>

                  {/* Card 3: Mala & Necklaces */}
                  <motion.div
                    id="cat-card-mala"
                    whileHover={{ y: -5 }}
                    onClick={() => setActiveCategory('mala_necklace')}
                    className="group relative h-72 rounded-2xl overflow-hidden border border-stone-850 cursor-pointer shadow-lg bg-stone-900"
                  >
                    <img 
                      src="https://images.unsplash.com/photo-1781242346168-a4a876ce2673?q=80&w=1035&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                      alt="Mala & Necklaces Category"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-106"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 space-y-1.5 z-10">
                      <span className="text-[9px] text-amber-400 font-mono uppercase tracking-wider font-bold">Traditional Haaram sets</span>
                      <h3 className="text-white text-xl font-serif font-bold">Mala & Necklaces</h3>
                      <p className="text-xs text-stone-300 font-light truncate">Mango mala, custom Thalis, Bridal chokers, White gold</p>
                    </div>
                    <span className="absolute top-4 right-4 bg-amber-400/10 text-amber-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-amber-500/20">Explore</span>
                  </motion.div>

                  {/* Card 4: Earrings */}
                  <motion.div
                    id="cat-card-earrings"
                    whileHover={{ y: -5 }}
                    onClick={() => setActiveCategory('earrings')}
                    className="group relative h-72 rounded-2xl overflow-hidden border border-stone-850 cursor-pointer shadow-lg bg-stone-900"
                  >
                    <img 
                      src="https://images.unsplash.com/photo-1781211184129-e6d365dcd503?q=80&w=1022&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                      alt="Earrings Category"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-106"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 space-y-1.5 z-10">
                      <span className="text-[9px] text-amber-400 font-mono uppercase tracking-wider font-bold">Perfect Lobe Ornaments</span>
                      <h3 className="text-white text-xl font-serif font-bold">Earrings</h3>
                      <p className="text-xs text-stone-300 font-light truncate">Traditional Kemp jimmikies, stud, twisted bugadi</p>
                    </div>
                    <span className="absolute top-4 right-4 bg-amber-400/10 text-amber-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-amber-500/20">Explore</span>
                  </motion.div>
                </div>
              </section>

              {/* B. LATEST ARRIVALS CONTAINER */}
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-amber-500 uppercase font-mono font-bold">Newest Indian Releases</span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-150">Latest model Collections</h2>
                  </div>
                  <button 
                    onClick={() => setActiveCategory('earrings')}
                    className="text-amber-500 hover:text-amber-400 text-xs sm:text-sm font-bold flex items-center gap-1 hover:underline"
                  >
                    <span>View all new model arrivals</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                  {latestModels.map((p) => (
                    <ProductCard key={p.id} product={p} onSelect={setSelectedProduct} />
                  ))}
                </div>
              </section>

              {/* C. CLASSIC COLLECTIONS CONTAINER */}
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-stone-900/15 py-12 border-t border-b border-stone-900/40">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-amber-500 uppercase font-mono font-bold">Timeless Handcrafted Designs</span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-150">Classic Collections</h2>
                  </div>
                  <button 
                    onClick={() => setActiveCategory('vala')}
                    className="text-amber-500 hover:text-amber-400 text-xs sm:text-sm font-bold flex items-center gap-1 hover:underline"
                  >
                    <span>View all classic models</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                  {classicModels.map((p) => (
                    <ProductCard key={p.id} product={p} onSelect={setSelectedProduct} />
                  ))}
                </div>
              </section>

              {/* D. SERVICE CARE BENEFITS FOR GOLD COVERING SHOP */}
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-stone-900/60 border border-stone-850/80 rounded-3xl p-6 sm:p-10 space-y-8 shadow-xl">
                  <div className="text-center space-y-2 max-w-2xl mx-auto">
                    <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-500/20 uppercase tracking-widest">
                      Our Sales & Polishing Service Care
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">Why choose Simi's Gold Covering?</h3>
                    <p className="text-xs text-stone-400">
                      We treat gold covering as an art of trust. Each model is hand-curated to prevent skin allergies and match real solid gold color hues perfectly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Care facet 1 */}
                    <div className="bg-stone-950/30 p-5 rounded-2xl border border-stone-800/60 space-y-3">
                      <span className="text-amber-500 text-lg font-bold">01. Ornaments That Last</span>
                      <p className="text-xs text-stone-300 font-light leading-relaxed font-sans">
                        We have high quality gold covering ornaments that last from 8 months to 1 year. Some of our customer's anklets have lasted 15 months, which is more than a year, and we are proud to see them buy from us again!
                      </p>
                    </div>

                    {/* Care facet 2 */}
                    <div className="bg-stone-950/30 p-5 rounded-2xl border border-stone-800/60 space-y-3">
                      <span className="text-amber-500 text-lg font-bold">02. Seasonal Offers & Sales</span>
                      <p className="text-xs text-stone-300 font-light leading-relaxed">
                        We run periodic festive and wedding offers with up to 30% savings. We believe stunning traditional pieces shouldn't hold families back financially during auspicious dates.
                      </p>
                    </div>

                    {/* Care facet 3 */}
                    <div className="bg-stone-950/30 p-5 rounded-2xl border border-stone-800/60 space-y-3">
                      <span className="text-amber-500 text-lg font-bold">03. Lifetime polish backups</span>
                      <p className="text-xs text-stone-300 font-light leading-relaxed">
                        Dull covering? Simply post or carry the jewel back to our Kollam, Kerala polishing center. Our team will micro-clash it back to its original brilliant golden shimmer at minor cost!
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Feedbacks section */}
              <CustomerFeedbacks />

              {/* E. FOOTER CARDS SYSTEM */}
              <footer className="border-t border-stone-900 bg-stone-950 pt-10 pb-6 text-center text-stone-500 text-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="font-serif font-bold text-stone-300">SIMI'S GOLD COVERING JEWELLERS</p>
                    <div className="flex flex-wrap gap-4 text-[11px] justify-center sm:justify-start items-center">
                      <a href="#about" onClick={() => alert("Simi's Gold Covering. Leading provider of 24ct plated anklets, bangles, long malas, and custom Thali castings since 2018.")} className="hover:text-stone-300 transition-colors">About our Smiths</a>
                      <a href="#polishing" onClick={() => alert("polishing terms: We guarantee micro plating for 6-12 months. Periodic re-polishing is completed in 3 business days.")} className="hover:text-stone-300 transition-colors">Polishing Warranty</a>
                      <a href="#delivery" onClick={() => alert("We dispatch orders securely with insured parcel covers. Tracking numbers are shared automatically on WhatsApp.")} className="hover:text-stone-300 transition-colors">Insured Shipping Care</a>
                      <button 
                        onClick={() => setIsAdminPortalOpen(true)} 
                        className="hover:text-stone-300 text-[10px] uppercase text-stone-500 font-mono flex items-center justify-center gap-1 focus:outline-none cursor-pointer"
                      >
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span>Admin Portal</span>
                      </button>
                    </div>
                  </div>

                  {/* Footnote Spacer */}
                  <div className="pt-2" />

                  <p className="text-[10px] text-stone-600 border-t border-stone-900/60 pt-4">
                    © 2026 Simi's Gold Covering. All rights reserved. Registered Indian jeweler partner. Designed with high-purity micro-cladding processes.
                  </p>
                </div>
              </footer>
                </>
              )}
            </motion.div>
          ) : (
            // --- DETAILED EXPANDED CATEGORY SECTION VIEW ---
            <motion.div
              key={`category-${activeCategory}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CategoryView 
                products={products}
                category={activeCategory}
                onBack={() => setActiveCategory(null)}
                onSelectProduct={setSelectedProduct}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- FLOATING WHATSAPP CHAT TRIGGER --- */}
      <div className="fixed bottom-6 left-6 z-40">
        <a
          href="https://wa.me/917907959180?text=Hello%20Simi%20Gold%20Covering,%20I%20am%20interested%20in%20your%20jewelry%20collections."
          target="_blank"
          rel="noreferrer"
          className="bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl tracking-wide font-bold flex items-center justify-center gap-2 border border-emerald-555/30 transition-all hover:scale-105 active:scale-95 focus:outline-none"
          title="Direct WhatsApp Chat"
        >
          <MessageCircle className="w-5 h-5 text-white fill-white/10" />
          <span className="hidden sm:inline text-xs">WhatsApp Chat</span>
          <span className="sm:hidden text-xs font-bold">WhatsApp</span>
        </a>
      </div>

      {/* --- FLOATING SECURE SHOPPING BAG TRIGGER --- */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsCartOpen(true)}
          className="bg-[#171221] hover:bg-[#20192e] hover:border-amber-500/50 text-amber-500 px-4.5 py-3.5 rounded-full shadow-2xl tracking-wide font-serif font-black flex items-center justify-center gap-2 border border-amber-500/35 transition-all hover:scale-105 active:scale-95 focus:outline-none relative border-t-amber-500/50"
          title="Open Shopping Bag"
        >
          <ShoppingBag className="w-5 h-5 text-amber-500" />
          {totalCartItems > 0 ? (
            <>
              <span className="hidden sm:inline text-xs tracking-wide">View Bag ({totalCartItems})</span>
              <span className="sm:hidden text-xs tracking-wide">{totalCartItems} Item{totalCartItems > 1 ? 's' : ''}</span>
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-stone-100 text-[10px] w-5.5 h-5.5 flex items-center justify-center font-bold rounded-full border-2 border-stone-900 shadow-md transform scale-100 animate-pulse">
                {totalCartItems}
              </span>
            </>
          ) : (
            <>
               <span className="hidden sm:inline text-xs tracking-wide">Secure Bag</span>
               <span className="sm:hidden text-xs tracking-wide">Bag</span>
            </>
          )}
        </button>
      </div>

      {/* --- ALL OVERLAYS SYSTEM --- */}
      {/* 1. Modal: Detailed active slide product picker */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onOpenCustomEnquiry={handleOpenCustomEnquiry}
        userProfile={userProfile}
        onUpdateProfile={setUserProfile}
        onOpenLoginModal={() => setIsAuthProfileOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOrderSuccess={(id, total, count) => setLastPlacedOrder({ id, total, itemCount: count })}
      />

      {/* 2. Side-Menu Drawer: Shopping booking basket */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        userProfile={userProfile}
        onUpdateProfile={setUserProfile}
        onOrderSuccess={(id, total, count) => setLastPlacedOrder({ id, total, itemCount: count })}
      />

      {/* 3. Modal: Custom gold smithing and Thali Kodi maker */}
      <CustomEnquiryModal
        isOpen={isCustomEnquiryOpen}
        onClose={() => setIsCustomEnquiryOpen(false)}
        prefilledProductName={prefilledCustomProduct}
      />

      {/* 4. Secure Admin Product Portal */}
      {isAdminPortalOpen && (
        <AdminPortal
          products={products}
          onUpdateProducts={handleUpdateProducts}
          onClose={() => setIsAdminPortalOpen(false)}
          userProfile={userProfile}
          defaultTab={adminPortalDefaultTab}
        />
      )}

      {/* 4.5. Gorgeous Post-Checkout Order Confirmation Dialog Overlay */}
      <OrderPlacedOverlay
        isOpen={lastPlacedOrder !== null}
        onClose={() => setLastPlacedOrder(null)}
        orderId={lastPlacedOrder?.id || ''}
        total={lastPlacedOrder?.total || 0}
        itemCount={lastPlacedOrder?.itemCount || 0}
        isGuest={!userProfile}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAuth={() => setIsAuthProfileOpen(true)}
      />

      {/* 5. First-time Visitor Welcome & WIP Announcement Modal */}
      <WipAnnouncementModal />

      {/* 6. Release Chronicles & Patch Notes (At Absolute Root Layer) */}
      <PatchNotesModal isOpen={isPatchNotesOpen} onClose={() => setIsPatchNotesOpen(false)} />

      {/* 7. User Authentication & Default Address Profile Panel */}
      <AuthProfileModal
        isOpen={isAuthProfileOpen}
        onClose={() => setIsAuthProfileOpen(false)}
        onAuthSuccess={setUserProfile}
        onSelectProduct={setSelectedProduct}
      />

      {/* 7.5. Customer Real-time Order Status Notifications Portal */}
      <OrderNotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        orders={customerOrders}
        notifications={orderNotifications}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClearAllNotifications={handleClearAllNotifications}
        onMarkNotificationRead={handleMarkNotificationRead}
      />

      {/* 8. Modern Real-time Admin WhatsApp Order Heads-up Notifications Portal */}
      {(() => {
        const isAdmin = userProfile?.role === 'admin' || userProfile?.isAdmin === true;
        const pendingRequests = orderRequests.filter(r => r.status === 'pending');
        if (!isAdmin || pendingRequests.length === 0) return null;

        const latestRequest = pendingRequests[0];

        // Direct confirm and cancel actions
        const handleQuickConfirm = async () => {
          try {
            await confirmOrderRequestAndProcess(latestRequest);
            addToast(`Quick Confirmed order ${latestRequest.id}! Stock decreased & purchases mapped.`, 'success');
          } catch (e: any) {
            console.error(e);
            addToast(`Confirm failed: ${e.message}`, 'error');
          }
        };

        const handleQuickCancel = async () => {
          if (!window.confirm(`Are you sure you want to cancel order request ${latestRequest.id}?`)) return;
          try {
            await updateOrderRequestInFirestore(latestRequest.id, { status: 'cancelled' });
            addToast(`Cancelled order request ${latestRequest.id}.`, 'info');
          } catch (e: any) {
            console.error(e);
            addToast(`Cancel failed: ${e.message}`, 'error');
          }
        };

        const handleQuickEditAndReview = () => {
          setAdminPortalDefaultTab('orders');
          setIsAdminPortalOpen(true);
        };

        return (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-stone-900 border border-purple-500 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] border-t-purple-400 p-5 space-y-4 animate-slideIn text-left">
            <div className="flex items-center justify-between border-b border-stone-850 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-455 bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-purple-400">
                  New WhatsApp Order Alert
                </span>
              </div>
              <span className="text-[10px] font-mono text-stone-500 font-bold bg-stone-950 px-1.5 py-0.5 rounded border border-stone-850">
                Pending Approval
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-stone-300">
              <p className="font-semibold text-stone-200">
                Customer: <span className="text-white font-serif font-black">{latestRequest.userName}</span>
              </p>
              <p className="text-[11px] text-stone-400 font-mono">
                Items: {latestRequest.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
              </p>
              <p className="text-[11px] text-stone-400 font-mono">
                Settlement Total: <span className="text-amber-400 font-bold">₹{latestRequest.total.toLocaleString('en-IN')}</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
              <button
                type="button"
                onClick={handleQuickConfirm}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wide py-2.5 rounded-lg transition-colors cursor-pointer text-center"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={handleQuickEditAndReview}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] uppercase tracking-wide py-2.5 rounded-lg transition-colors cursor-pointer text-center"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleQuickCancel}
                className="bg-stone-850 hover:bg-rose-950/40 hover:text-rose-400 text-stone-300 font-bold text-[10px] uppercase tracking-wide py-2.5 rounded-lg transition-all cursor-pointer text-center border border-stone-800 hover:border-rose-950/40"
              >
                Cancel
              </button>
            </div>
            
            <p className="text-[9px] text-stone-500 italic text-center font-mono">
              * Opening "Edit" reveals direct quantitative adjusting options
            </p>
          </div>
        );
      })()}

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
