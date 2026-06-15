import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronLeft, ChevronRight, ShoppingCart, MessageCircle, Star, 
  ShieldCheck, ArrowRight, Sparkles, HelpCircle, Heart, Share2, Hammer,
  ChevronDown, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import { Product, CartItem, UserProfile, OrderRequest } from '../types';
import { useToast } from '../context/ToastContext';
import { saveUserProfile, createOrderRequestInFirestore, updateOrderRequestInFirestore, getPersistentGuestUid } from '../firebase';
import { getCleanShareDetails, tryShareImageFile } from '../utils/shareUtils';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, size: string, quantity: number) => void;
  onOpenCustomEnquiry: (productName?: string) => void;
  userProfile: UserProfile | null;
  onUpdateProfile?: (profile: UserProfile) => void;
  onOpenLoginModal?: () => void;
  onOpenNotifications?: () => void;
  onOrderSuccess?: (id: string, total: number, itemCount: number) => void;
}

export default function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  onOpenCustomEnquiry,
  userProfile,
  onUpdateProfile,
  onOpenLoginModal,
  onOpenNotifications,
  onOrderSuccess
}: ProductDetailModalProps) {
  const { addToast } = useToast();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Reviews systems
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isSubmittingWhatsApp, setIsSubmittingWhatsApp] = useState(false);

  // Lightbox fullscreen view states
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [lightboxOffset, setLightboxOffset] = useState({ x: 0, y: 0 });
  const [isDraggingLight, setIsDraggingLight] = useState(false);
  const [dragStartLight, setDragStartLight] = useState({ x: 0, y: 0 });

  const lastTouchDistance = React.useRef<number | null>(null);

  const minScale = 1;
  const maxScale = 5;

  const handleZoomIn = () => {
    setLightboxScale(prev => Math.min(prev + 0.5, maxScale));
  };

  const handleZoomOut = () => {
    setLightboxScale(prev => {
      const next = Math.max(prev - 0.5, minScale);
      if (next === minScale) {
        setLightboxOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setLightboxScale(1);
    setLightboxOffset({ x: 0, y: 0 });
  };

  const handleWheelLight = (e: React.WheelEvent<HTMLDivElement>) => {
    const ratio = e.deltaY < 0 ? 1.15 : 0.85;
    setLightboxScale(prev => {
      const next = Math.min(Math.max(prev * ratio, minScale), maxScale);
      if (next === minScale) {
        setLightboxOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleMouseDownLight = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only
    setIsDraggingLight(true);
    setDragStartLight({
      x: e.clientX - lightboxOffset.x,
      y: e.clientY - lightboxOffset.y
    });
  };

  const handleMouseMoveLight = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingLight) return;
    setLightboxOffset({
      x: e.clientX - dragStartLight.x,
      y: e.clientY - dragStartLight.y
    });
  };

  const handleMouseUpLight = () => {
    setIsDraggingLight(false);
  };

  const handleTouchStartLight = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDraggingLight(true);
      setDragStartLight({
        x: e.touches[0].clientX - lightboxOffset.x,
        y: e.touches[0].clientY - lightboxOffset.y
      });
    } else if (e.touches.length === 2) {
      setIsDraggingLight(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      lastTouchDistance.current = dist;
    }
  };

  const handleTouchMoveLight = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      if (!isDraggingLight) return;
      const newX = e.touches[0].clientX - dragStartLight.x;
      const newY = e.touches[0].clientY - dragStartLight.y;
      setLightboxOffset({ x: newX, y: newY });
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / lastTouchDistance.current;
      setLightboxScale(prev => {
        const next = Math.min(Math.max(prev * ratio, minScale), maxScale);
        if (next === minScale) {
          setLightboxOffset({ x: 0, y: 0 });
        }
        return next;
      });
      lastTouchDistance.current = dist;
    }
  };

  const handleTouchEndLight = () => {
    setIsDraggingLight(false);
    lastTouchDistance.current = null;
  };

  useEffect(() => {
    if (!product) return;
    
    // Seed and user submitted review elements
    const seedReviews = [
      {
        id: 'seed-1',
        author: 'Anjali Menon',
        rating: 5,
        comment: 'Absolutely stunning work! The polishing remains as shiny as real gold even after daily wear for three months.',
        date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'seed-2',
        author: 'Deepa Nair',
        rating: 4,
        comment: 'Beautiful design. The casting and weight are solid. Received so many compliments at a wedding.',
        date: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString()
      }
    ];

    const customReviews = userProfile?.reviews?.filter(r => r.productId === product.id) || [];
    setReviews([...seedReviews, ...customReviews]);
  }, [product, userProfile]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    if (!reviewComment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const newReview = {
        id: 'REV-' + Math.floor(100000 + Math.random() * 900000),
        productId: product.id,
        productName: product.name,
        author: userProfile.displayName || 'Verified Client',
        rating: reviewRating,
        comment: reviewComment.trim(),
        date: new Date().toISOString()
      };

      const existingReviews = userProfile.reviews || [];
      const updatedProfile: UserProfile = {
        ...userProfile,
        reviews: [...existingReviews, newReview]
      };

      await saveUserProfile(userProfile.uid, updatedProfile);
      if (onUpdateProfile) {
        onUpdateProfile(updatedProfile);
      }
      setReviewComment('');
      setReviewRating(5);
      addToast('Review posted successfully! Thank you for the verified feedback.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Failed to lock review details: ' + err.message, 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const touchStartX = React.useRef(0);
  const touchEndX = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX; // Initialize end with start
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const difference = touchStartX.current - touchEndX.current;
    
    // threshold of 50px
    if (difference > 50) {
      nextImage();
    } else if (difference < -50) {
      prevImage();
    }
    
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Reset indices and favorites on product change
  useEffect(() => {
    if (product) {
      setActiveImageIndex(0);
      setSelectedQuantity(1);
      // Set default sizes based on custom or category defaults
      if (product.sizes && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0]);
      } else if (product.category === 'vala') {
        setSelectedSize('2.6');
      } else if (product.category === 'kolus') {
        setSelectedSize('10 inches');
      } else {
        setSelectedSize('Standard Size');
      }
      setSuccessMessage('');

      // Determine favorite status
      if (userProfile) {
        setIsFavorite(userProfile.wishlist?.includes(product.id) || false);
      } else {
        const guestWishlist = JSON.parse(localStorage.getItem('simis_guest_wishlist') || '[]');
        setIsFavorite(guestWishlist.includes(product.id));
      }
    }
  }, [product, userProfile]);

  const toggleFavorite = async () => {
    if (!product) return;
    
    const nextFavorite = !isFavorite;
    setIsFavorite(nextFavorite);

    if (userProfile) {
      const currentWishlist = userProfile.wishlist || [];
      const updatedWishlist = nextFavorite
        ? [...currentWishlist, product.id]
        : currentWishlist.filter(id => id !== product.id);

      const updatedProfile = {
        ...userProfile,
        wishlist: updatedWishlist
      };

      try {
        await saveUserProfile(userProfile.uid, updatedProfile);
        if (onUpdateProfile) {
          onUpdateProfile(updatedProfile);
        }
        addToast(nextFavorite ? 'Added to your boutique wishlist!' : 'Removed from your wishlist.', 'success');
      } catch (err) {
        console.error('Failed to update wishlist:', err);
        addToast('Failed to save wishlist preference.', 'error');
      }
    } else {
      // Guest local storage wishlist
      const guestWishlist = JSON.parse(localStorage.getItem('simis_guest_wishlist') || '[]');
      const updatedWishlist = nextFavorite
        ? [...guestWishlist, product.id]
        : guestWishlist.filter((id: string) => id !== product.id);
      localStorage.setItem('simis_guest_wishlist', JSON.stringify(updatedWishlist));
      addToast(nextFavorite ? 'Added to guest wishlist!' : 'Removed from guest wishlist.', 'success');
    }
  };

  if (!product) return null;

  const handleShareProduct = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Get formatted, WhatsApp-optimized share content and resolved image URL
    const { shareUrl, shareTitle, shareText, absoluteImageUrl } = getCleanShareDetails(product);

    // 1. Attempt Native Web Share with the actual Image File attached (supported on mobile safari/chrome)
    if (absoluteImageUrl && navigator.share && navigator.canShare) {
      addToast('Preparing product image for sharing...', 'info');
      const fileShared = await tryShareImageFile(absoluteImageUrl, shareTitle, shareText, shareUrl);
      if (fileShared) {
        addToast('Shared successfully!', 'success');
        return;
      }
    }

    // 2. Fallback to normal Web Share with rich formatted WhatsApp text content (containing text & image links)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        addToast('Shared successfully!', 'success');
        return;
      } catch (err) {
        console.warn("Text-only navigator.share failed, failing over to clipboard copy:", err);
      }
    }

    // 3. Fallback to Clipboard copy with full WhatsApp formatted text (containing links)
    try {
      const fullTextToCopy = shareText;
      await navigator.clipboard.writeText(fullTextToCopy);
      addToast('Product details copied to clipboard! Paste directly in WhatsApp.', 'success');
    } catch (err) {
      console.error("Failed to copy link:", err);
      addToast('Failed to copy link. Please manually copy the browser URL bar.', 'error');
    }
  };

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % product.images.length);
    handleResetZoom();
  };

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    handleResetZoom();
  };

  const handleAddToCart = () => {
    onAddToCart(product, selectedSize, selectedQuantity);
    const successMsg = product.stockCount === 0 
      ? `Added ${selectedQuantity} x ${product.name} (Size: ${selectedSize}) to booking bag as a bespoke Custom Pre-Order request!`
      : `Successfully added ${selectedQuantity} x ${product.name} (Size: ${selectedSize}) to booking bag!`;
    setSuccessMessage(successMsg);
    setTimeout(() => {
      setSuccessMessage('');
    }, 4000);
  };

  // Generate beautiful pre-formatted Indian WhatsApp message
  const getWhatsAppLink = () => {
    const stockStatusText = product.stockCount === 0 ? 'Out of Stock (Request Crafting / Pre-Order)' : 'In Stock';
    const message = `Hello Simi's Gold Covering! I am highly interested in placing an order/enquiring about:
------------------------------------------
🌟 *Product:* ${product.name}
🔖 *Variety:* ${product.variety}
📦 *Material:* ${product.material.replace(/_/g, ' ').toUpperCase()}
📏 *Selected Size:* ${selectedSize}
💵 *Quantity:* ${selectedQuantity} x ₹${product.price} = ₹${product.price * selectedQuantity}
💰 *Total Price:* ₹${product.price * selectedQuantity} (Original: ₹${product.originalPrice * selectedQuantity})
🔴 *Stock Status:* ${stockStatusText}
------------------------------------------
${product.stockCount === 0 
  ? 'Since this piece is currently sold out, can you please custom-make/pre-order this for me? Please let me know the craft duration & booking details.'
  : 'Is this currently available for home delivery? Please assist me with the booking and polishing service terms.'}`;
    return `https://wa.me/917907959180?text=${encodeURIComponent(message)}`;
  };

  const handleWhatsAppOrder = async () => {
    if (!product) return;
    setIsSubmittingWhatsApp(true);
    try {
      const orderId = 'REQ-' + Math.floor(100000 + Math.random() * 900000);
      const guestId = getPersistentGuestUid();
      const orderItemsList = [{
        productId: product.id,
        name: product.name,
        quantity: selectedQuantity,
        price: product.price,
        selectedSize: selectedSize || 'Standard'
      }];
      const newOrder: OrderRequest = {
        id: orderId,
        userId: userProfile?.uid || guestId,
        userEmail: userProfile?.email || 'guest@simisgold.com',
        userName: userProfile?.displayName || 'Guest User',
        userPhone: userProfile?.phone || '',
        items: orderItemsList,
        orderItems: orderItemsList,
        orderState: 'Sending Order',
        total: product.price * selectedQuantity,
        subtotal: product.price * selectedQuantity,
        discountVal: 0,
        createdAt: new Date().toISOString(),
        status: 'pending',
        address: userProfile?.defaultAddress || {}
      };

      await createOrderRequestInFirestore(newOrder);
      if (onOrderSuccess) {
        onOrderSuccess(orderId, newOrder.total, selectedQuantity);
      }
      addToast(`Booking Request ${orderId} submitted! Opening WhatsApp chat...`, 'success');

      // Update orderState to "Order Recieved" on customer side after successful creation
      try {
        await updateOrderRequestInFirestore(orderId, { orderState: 'Order Recieved' });
      } catch (err) {
        console.warn("Failed to set state as Order Recieved:", err);
      }

      // Secure redirection to WhatsApp *after* database write operations are complete
      const waUrl = getWhatsAppLink();
      const newWindow = window.open(waUrl, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        window.location.href = waUrl;
      }
      onClose();
    } catch (e: any) {
      console.error("Could not record WhatsApp request:", e);
      addToast("Connecting directly to WhatsApp manager chat...", 'info');
      // Still open WhatsApp as dynamic fallback
      const waUrl = getWhatsAppLink();
      const newWindow = window.open(waUrl, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        window.location.href = waUrl;
      }
    } finally {
      setIsSubmittingWhatsApp(false);
    }
  };

  // Sizing definitions
  const bangleSizes = ['2.4', '2.6', '2.8', '2.10'];
  const ankletSizes = ['9.5 inches', '10 inches', '10.5 inches', '11 inches'];

  // Calculate discount percentage
  const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-start md:items-center justify-center p-4 sm:p-6 md:p-8">
        {/* Backdrop overlay closely holding space */}
        <motion.div
          id="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-stone-950/95 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.3 }}
          className="relative bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-5xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-10 flex flex-col md:flex-row h-auto md:h-[85vh] md:max-h-[85vh] my-6 sm:my-8 md:my-0"
        >
          {/* Close Action floating icon */}
          <button
            id="close-product-modal"
            onClick={onClose}
            className="absolute top-4 right-4 z-35 p-2 rounded-full bg-stone-950/80 hover:bg-amber-400 text-stone-200 hover:text-stone-950 border border-stone-800/40 hover:border-amber-400/20 transition-all focus:outline-none"
            aria-label="Close product details"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left Hand: Borderless Slideshow Image Center */}
          <div className="w-full md:w-1/2 bg-stone-950 relative flex flex-col justify-center items-center h-72 sm:h-96 md:h-full min-h-[300px] md:min-h-[400px] lg:min-h-[500px]">
            
            {/* Carousel Active Image Display with Swipe support */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => {
                const diff = Math.abs(touchStartX.current - touchEndX.current);
                if (diff < 12) {
                  // Handled as a tap (not a long swipe)
                  setIsLightboxOpen(true);
                }
                handleTouchEnd();
              }}
              onClick={() => {
                setIsLightboxOpen(true);
              }}
              className="w-full h-full relative select-none flex items-center justify-center p-6 cursor-zoom-in group"
            >
              <motion.img
                key={activeImageIndex}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35 }}
                src={product.images[activeImageIndex]}
                alt={`${product.name} View ${activeImageIndex + 1}`}
                className="max-h-full max-w-full object-contain pointer-events-none rounded-xl"
                referrerPolicy="no-referrer"
              />

              {/* Indicator overlay */}
              <div className="absolute inset-0 bg-stone-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="bg-stone-950/90 text-stone-200 border border-stone-800 rounded-full px-3.5 py-2 text-xs font-mono tracking-wide flex items-center gap-2 shadow-xl">
                  <ZoomIn className="w-4 h-4 text-amber-400" /> TAP TO ZOOM NATIVE
                </span>
              </div>

              {/* Discount Ribbon inside image box */}
              {discountPercent > 0 && (
                <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-serif font-black px-3 py-1 rounded shadow-md uppercase tracking-wider">
                  SEASONAL OFFER • {discountPercent}% OFF
                </div>
              )}

              {/* Swipe indicator helper for multi-image products on mobile */}
              {product.images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-stone-900/80 backdrop-blur-sm border border-stone-800 text-[9px] text-stone-400 px-2.5 py-1 rounded-full uppercase tracking-widest font-mono lg:hidden pointer-events-none">
                  ← Swipe images →
                </div>
              )}
            </div>

            {/* Left / Right slider arrows */}
            {product.images.length > 1 && (
              <>
                <button
                  id="modal-slide-prev"
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-stone-950/70 hover:bg-amber-400 text-stone-100 hover:text-stone-950 border border-stone-800/50 hover:border-amber-400/45 transition-colors focus:outline-none z-20"
                >
                  <ChevronLeft className="w-5 h-5 pointer-events-none" />
                </button>
                <button
                  id="modal-slide-next"
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-stone-950/70 hover:bg-amber-400 text-stone-100 hover:text-stone-950 border border-stone-800/50 hover:border-amber-400/45 transition-colors focus:outline-none z-20"
                >
                  <ChevronRight className="w-5 h-5 pointer-events-none" />
                </button>
              </>
            )}

            {/* Bottom Dots Navigation */}
            <div className="absolute bottom-4 flex gap-1.5 z-20">
              {product.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all focus:outline-none ${idx === activeImageIndex ? 'bg-amber-400 w-6' : 'bg-stone-500/60'}`}
                />
              ))}
            </div>
          </div>

          {/* Right Hand: Detailed Product Configuration Panel */}
          <div className="w-full md:w-1/2 p-6 sm:p-8 md:overflow-y-auto flex flex-col justify-between h-auto md:h-full bg-stone-900">
            <div>
              {/* Category Breadcrumb */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-500 uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-400" />
                  {product.categoryLabel}
                </span>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={toggleFavorite}
                    className="p-1.5 rounded-full bg-stone-800/50 text-stone-300 hover:text-red-500 transition-colors"
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                  <button 
                    onClick={handleShareProduct} 
                    className="p-1.5 rounded-full bg-stone-800/50 text-stone-300 hover:text-amber-400 transition-colors cursor-pointer focus:outline-none"
                    aria-label="Share Product Link"
                    title="Share Product Link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title & Tamil Native Text */}
              <div className="mt-2 space-y-1">
                <h2 className="text-stone-100 font-serif font-bold text-2xl sm:text-3xl tracking-tight leading-tight">
                  {product.name}
                </h2>
              </div>

              {/* Solitaire Reviews & Material summary */}
              <div className="flex flex-wrap items-center gap-4 mt-3 pb-3 border-b border-stone-800/60">
                <div className="flex items-center gap-1 text-amber-400 text-sm">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-3.5 h-3.5 ${i < Math.floor(product.rating) ? 'fill-amber-400' : 'text-stone-600'}`} 
                    />
                  ))}
                  <span className="text-stone-300 font-semibold font-mono text-xs ml-1">
                    {product.rating.toFixed(1)} ({product.reviewsCount} verified reviews)
                  </span>
                </div>

                <span className="text-xs bg-stone-800 text-amber-400 px-2.5 py-1 rounded-full capitalize font-mono border border-amber-500/10">
                  Core: {product.material.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Price Panel */}
              <div className="mt-4 bg-stone-950/65 rounded-2xl p-4 border border-stone-800/80">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold">Genuine Price</p>
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className="text-3xl font-serif font-black text-amber-400 font-mono">
                        ₹{product.price}
                      </span>
                      {product.originalPrice > product.price && (
                        <>
                          <span className="text-stone-500 line-through text-lg font-mono">
                            ₹{product.originalPrice}
                          </span>
                          <span className="bg-red-950 text-red-400 font-bold text-xs px-2 py-0.5 rounded border border-red-500/20">
                            SAVE ₹{product.originalPrice - product.price}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stock Status Selection Option label */}
                  <div>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold sm:text-right">Availability</p>
                    <div className="mt-1 font-mono">
                      {product.stockCount === 0 ? (
                        <span className="bg-rose-950/60 text-rose-400 text-xs px-3 py-1 rounded-full border border-rose-900/30 font-bold uppercase tracking-wide block text-center">
                          SOLD OUT / custom order
                        </span>
                      ) : product.stockCount <= 5 ? (
                        <span className="bg-amber-950/70 text-amber-400 text-xs px-3 py-1 rounded-full border border-amber-900/30 font-bold uppercase tracking-wider block text-center animate-pulse">
                          ONLY {product.stockCount} LEFT!
                        </span>
                      ) : (
                        <span className="bg-emerald-950/70 text-emerald-400 text-xs px-3 py-1 rounded-full border border-emerald-900/40 font-bold uppercase tracking-wide block text-center">
                          IN STOCK ({product.stockCount})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-emerald-400 mt-2.5 flex items-center gap-1 font-light">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Affordable Price Guarantee with free lifetime polish backups
                </p>
              </div>

              {/* Product description & bullet statements */}
              <div className="mt-5 space-y-4">
                <p className="text-sm text-stone-300 leading-relaxed font-light">
                  {product.description}
                </p>

               {product.details && product.details.filter(d => d && d.trim().length > 0).length > 0 && (
                 <div className="bg-stone-950/30 rounded-xl p-3 border border-stone-800/40">
                   <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider mb-2">Specifications:</p>
                   <ul className="text-xs text-stone-300 space-y-2.5 pl-1">
                     {product.details.filter(d => d && d.trim().length > 0).map((detail, index) => (
                       <li key={index} className="flex gap-2 items-start">
                         <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                         <span>{detail}</span>
                       </li>
                     ))}
                   </ul>
                 </div>
               )}
              </div>

              {/* Size Configuration Area */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-stone-300 uppercase tracking-wider font-semibold">
                    Select Your Size:
                  </label>
                  <a 
                    href="#sizechart" 
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Indian gold covering sizes standard gauge applies.\n- Bangles/Vala sizes are inside diameters e.g. 2.4 (2.25 inches), 2.6 (2.37 inches), 2.8 (2.5 inches).\n- Anklets/Kolus standard is 10-10.5 inches.");
                    }}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    How to measure size?
                  </a>
                </div>

                {/* Dinamic size buttons based on Custom config or Category */}
                {product.sizes && product.sizes.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5">
                    {product.sizes.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSelectedSize(sz)}
                        className={`px-4 py-2 text-xs font-mono rounded-lg border font-bold transition-all focus:outline-none ${selectedSize === sz ? 'bg-amber-400 text-stone-950 border-amber-400 shadow-md ring-1 ring-amber-500/30' : 'bg-stone-800 text-stone-300 border-stone-700 hover:border-stone-500'}`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                ) : product.category === 'vala' ? (
                  <div className="flex flex-wrap gap-2.5">
                    {bangleSizes.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSelectedSize(sz)}
                        className={`px-4 py-2 text-xs font-mono rounded-lg border font-bold transition-all focus:outline-none ${selectedSize === sz ? 'bg-amber-400 text-stone-950 border-amber-400 shadow-md ring-1 ring-amber-500/30' : 'bg-stone-800 text-stone-300 border-stone-700 hover:border-stone-500'}`}
                      >
                        Bangle {sz}
                      </button>
                    ))}
                  </div>
                ) : product.category === 'kolus' ? (
                  <div className="flex flex-wrap gap-2.5">
                    {ankletSizes.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSelectedSize(sz)}
                        className={`px-4 py-2 text-xs font-mono rounded-lg border font-bold transition-all focus:outline-none ${selectedSize === sz ? 'bg-amber-400 text-stone-950 border-amber-400 shadow-md ring-1 ring-amber-500/30' : 'bg-stone-800 text-stone-300 border-stone-700 hover:border-stone-500'}`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs bg-stone-950/50 text-stone-400 px-3.5 py-2.5 rounded-lg border border-stone-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Free-size fit: Supplied with a comfortable 2-inch extension chain link to fit any wrist, neck, or lobe size safely.</span>
                  </div>
                )}
              </div>

              {/* Quantity Configuration Area */}
              <div className="mt-5 space-y-2">
                <label htmlFor="quantity-selector" className="text-xs text-stone-300 uppercase tracking-wider font-semibold block">
                  Select Quantity:
                </label>
                <div className="relative">
                  <select
                    id="quantity-selector"
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                    className="w-full bg-stone-950 text-stone-200 border border-stone-800 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-amber-400/50 appearance-none transition-colors cursor-pointer pr-10"
                  >
                    {product.stockCount === 0 ? (
                      [...Array(10)].map((_, i) => (
                        <option key={i + 1} value={i + 1} className="bg-stone-900 text-stone-200">
                          {i + 1} {i + 1 === 1 ? 'Unit' : 'Units'} (Pre-order Request)
                        </option>
                      ))
                    ) : (
                      [...Array(product.stockCount)].map((_, i) => (
                        <option key={i + 1} value={i + 1} className="bg-stone-900 text-stone-200">
                          {i + 1} {i + 1 === 1 ? 'Unit' : 'Units'} {product.stockCount <= 5 ? `(Only ${product.stockCount} left!)` : ''}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-3 pointer-events-none flex items-center">
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  </div>
                </div>
              </div>

              {/* Custom options trigger */}
              {product.isCustomizable && (
                <div className="mt-5 p-4 bg-purple-950/20 border border-purple-500/25 rounded-2xl flex items-center gap-3.5">
                  <Hammer className="w-6 h-6 text-purple-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-purple-300">Custom Mugappu or Casting Work?</p>
                    <p className="text-stone-300 mt-0.5">We custom-craft mugappus and casting. Request custom Thali carvings!</p>
                    <button 
                      onClick={() => onOpenCustomEnquiry(product.name)}
                      className="text-amber-400 hover:text-amber-300 font-bold underline mt-1.5 flex items-center gap-1 cursor-pointer focus:outline-none"
                    >
                      Enquire Custom Casting <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

            {/* Actions Strips */}
            <div className="mt-6 pt-5 border-t border-stone-800/80 space-y-3">
              
              {successMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-xs px-3.5 py-3 rounded-xl flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMessage}</span>
                </motion.div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {/* 1. Add to Cart Button */}
                <button
                  id="add-to-cart-button"
                  onClick={handleAddToCart}
                  className={`flex-1 px-5 py-4 text-sm font-bold rounded-xl flex items-center justify-center gap-2.5 transition-all focus:outline-none border ${
                    product.stockCount === 0
                      ? 'bg-purple-950/30 hover:bg-purple-950/45 text-purple-300 border-purple-900/60 hover:border-purple-500/40'
                      : 'bg-stone-800 hover:bg-stone-750 text-white border-stone-700 hover:border-amber-400'
                  }`}
                >
                  <ShoppingCart className={`w-4 h-4 ${product.stockCount === 0 ? 'text-purple-400' : 'text-amber-400'}`} />
                  <span>{product.stockCount === 0 ? 'Bespoke Pre-Order' : 'Add to bag'}</span>
                </button>

                {/* 2. Buy / Enquiry direct on WhatsApp */}
                <button
                  id="order-on-whatsapp-link"
                  disabled={isSubmittingWhatsApp}
                  onClick={async (e) => {
                    e.preventDefault();
                    await handleWhatsAppOrder();
                  }}
                  className={`flex-1 px-5 py-4 text-sm font-bold rounded-xl flex items-center justify-center gap-2.5 shadow-md active:scale-98 transition-all focus:outline-none cursor-pointer disabled:opacity-50 ${
                    product.stockCount === 0
                      ? 'bg-gradient-to-r from-amber-650 to-amber-750 hover:from-amber-600 hover:to-amber-700 text-stone-950 border border-amber-600/30'
                      : 'bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 hover:from-emerald-500 text-white'
                  }`}
                >
                  <MessageCircle className={`w-4 h-4 ${product.stockCount === 0 ? 'fill-stone-950 text-amber-800' : 'fill-white text-emerald-600'}`} />
                  <span>
                    {isSubmittingWhatsApp 
                      ? 'Please wait...' 
                      : product.stockCount === 0 
                        ? 'Pre-order on WhatsApp' 
                        : 'Order on WhatsApp'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Reviews & Feedbacks Section */}
          <div className="mt-8 border-t border-stone-850 pt-6 space-y-4 text-left">
            <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase font-mono text-amber-500 font-bold tracking-wider flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Verified Reviews ({reviews.length})
                </h3>
                <span className="text-xs font-bold text-amber-400">
                  ★ {(reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / (reviews.length || 1)).toFixed(1)} / 5.0
                </span>
              </div>

              {/* Reviews List */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {reviews.length === 0 ? (
                  <div className="text-xs text-stone-500 italic p-3 text-center bg-stone-950/20 border border-stone-850/40 rounded-xl">
                    No customer reviews yet. Be the first to leave a feedback!
                  </div>
                ) : (
                  reviews.map((rev: any, rIdx: number) => (
                    <div key={rIdx} className="bg-stone-950/40 border border-stone-850/60 p-3 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-stone-300 font-serif">{rev.author || 'Verified Client'}</span>
                        <span className="text-[10px] text-stone-500 font-mono">{rev.date ? new Date(rev.date).toLocaleDateString() : 'Recent'}</span>
                      </div>
                      <div className="flex gap-0.5 text-amber-400 text-[10px]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3 h-3 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-700'}`} 
                          />
                        ))}
                      </div>
                      <p className="text-xs text-stone-400 font-light leading-relaxed">{rev.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Review Submission Area */}
              <div className="border-t border-stone-850/60 pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-stone-300">Submit a Verified Review</h4>
                {userProfile ? (
                  <form onSubmit={handleReviewSubmit} className="space-y-2.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-stone-400 mr-2 uppercase tracking-wide">Rating:</span>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => setReviewRating(i + 1)}
                          className="p-1 focus:outline-none focus:ring-0 active:scale-95 transition-transform cursor-pointer"
                        >
                          <Star 
                            className={`w-5 h-5 transition-all ${i < reviewRating ? 'text-amber-400 fill-amber-400' : 'text-stone-755'}`} 
                          />
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <textarea
                        rows={2}
                        required
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="What did you love about this piece? (Casting work, polishing quality...)"
                        className="w-full bg-stone-950 border border-stone-850 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/20 placeholder-stone-600 transition-colors resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingReview || !reviewComment.trim()}
                      className="w-full py-2 px-4 bg-stone-800 hover:bg-stone-750 border border-stone-750 hover:border-amber-400/40 text-stone-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isSubmittingReview ? 'Submitting Review...' : 'Post Verified Review'}
                    </button>
                  </form>
                ) : (
                  <div className="p-3 bg-stone-950/20 border border-stone-850/40 rounded-xl flex flex-col items-center gap-2 text-center">
                    <p className="text-[11px] text-stone-400">You must be logged in to leave a product review.</p>
                    <button
                      type="button"
                      onClick={onOpenLoginModal}
                      className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/15 text-amber-400 font-bold text-[10px] rounded-lg border border-amber-500/20 active:scale-98 transition-all cursor-pointer uppercase tracking-wider"
                    >
                      Log In Now / Register
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Fullscreen Interactive Lightbox Modal */}
        <AnimatePresence>
          {isLightboxOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-stone-950/98 backdrop-blur-xl z-[100] flex flex-col justify-between select-none overflow-hidden touch-none"
              onWheel={handleWheelLight}
            >
              {/* Header bar controls */}
              <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 bg-gradient-to-b from-stone-950/90 to-transparent z-40 gap-3 border-b border-stone-900/40">
                <div className="text-left">
                  <h4 className="text-stone-100 font-serif font-black text-sm sm:text-base tracking-tight leading-tight">
                    {product.name}
                  </h4>
                  <p className="text-[10px] text-stone-400 font-mono tracking-wide uppercase mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    Viewing {activeImageIndex + 1} of {product.images.length} • Pinch / Wheel to Zoom • Touch / Mouse Drag to Pan
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={handleZoomOut}
                    disabled={lightboxScale <= minScale}
                    className="p-2 rounded-xl bg-stone-900/90 hover:bg-stone-850 border border-stone-800 text-stone-300 hover:text-white disabled:opacity-30 disabled:hover:text-stone-300 transition-all focus:outline-none cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-stone-900/90 px-3 py-1.5 rounded-xl border border-stone-800">
                    {Math.round(lightboxScale * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={lightboxScale >= maxScale}
                    className="p-2 rounded-xl bg-stone-900/90 hover:bg-stone-850 border border-stone-800 text-stone-300 hover:text-white disabled:opacity-30 disabled:hover:text-stone-300 transition-all focus:outline-none cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    disabled={lightboxScale === 1 && lightboxOffset.x === 0 && lightboxOffset.y === 0}
                    className="p-2 rounded-xl bg-stone-900/90 hover:bg-stone-850 border border-stone-800 text-stone-300 hover:text-white disabled:opacity-30 disabled:hover:text-stone-300 transition-all focus:outline-none cursor-pointer"
                    title="Reset Zoom & Pan"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <div className="w-[1.5px] h-6 bg-stone-800 mx-1 hidden sm:block" />
                  <button
                    onClick={() => {
                      setIsLightboxOpen(false);
                      handleResetZoom();
                    }}
                    className="p-2 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold transition-all focus:outline-none cursor-pointer shadow-lg hover:scale-105 active:scale-95"
                    title="Close Screen"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Image content area */}
              <div 
                className="flex-1 w-full relative flex items-center justify-center overflow-hidden h-full z-10"
                onMouseDown={handleMouseDownLight}
                onMouseMove={handleMouseMoveLight}
                onMouseUp={handleMouseUpLight}
                onMouseLeave={handleMouseUpLight}
                onTouchStart={handleTouchStartLight}
                onTouchMove={handleTouchMoveLight}
                onTouchEnd={handleTouchEndLight}
                onDoubleClick={() => {
                  if (lightboxScale > 1) {
                    handleResetZoom();
                  } else {
                    setLightboxScale(2.5);
                    setLightboxOffset({ x: 0, y: 0 });
                  }
                }}
              >
                {/* Left navigation arrow floating in lightbox */}
                {product.images.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
                    className="absolute left-4 sm:left-6 p-3 rounded-full bg-stone-900/80 hover:bg-amber-400 text-stone-200 hover:text-stone-950 border border-stone-800/60 hover:border-amber-400/30 transition-all focus:outline-none z-30 shadow-2xl active:scale-95 cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {/* Main Zoomable Image Canvas Container */}
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  <img
                    src={product.images[activeImageIndex]}
                    alt={`${product.name} Full screen`}
                    className="max-h-[75vh] sm:max-h-[80vh] max-w-[92vw] sm:max-w-[85vw] object-contain select-none rounded bg-transparent"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    style={{
                      transform: `translate(${lightboxOffset.x}px, ${lightboxOffset.y}px) scale(${lightboxScale})`,
                      transition: isDraggingLight ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      cursor: lightboxScale > 1 ? (isDraggingLight ? 'grabbing' : 'grab') : 'zoom-in'
                    }}
                  />
                </div>

                {/* Right navigation arrow floating in lightbox */}
                {product.images.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                    className="absolute right-4 sm:right-6 p-3 rounded-full bg-stone-900/80 hover:bg-amber-400 text-stone-200 hover:text-stone-950 border border-stone-800/60 hover:border-amber-400/30 transition-all focus:outline-none z-30 shadow-2xl active:scale-95 cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Bottom indicators */}
              <div className="p-4 bg-gradient-to-t from-stone-950/90 to-transparent flex flex-col items-center gap-2 z-40">
                <div className="flex gap-2.5 mb-1.5 md:mb-2">
                  {product.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveImageIndex(idx);
                        handleResetZoom();
                      }}
                      className={`w-3 h-3 rounded-full transition-all focus:outline-none cursor-pointer ${idx === activeImageIndex ? 'bg-amber-400 w-8' : 'bg-stone-700 hover:bg-stone-500'}`}
                    />
                  ))}
                </div>
                <div className="text-[10px] text-stone-400 font-mono tracking-widest uppercase bg-stone-950/80 border border-stone-800/80 px-4 py-2 rounded-full flex items-center gap-2 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span>Double-click or double-tap to toggle zoom • Swipe or drag with mouse to pan</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
