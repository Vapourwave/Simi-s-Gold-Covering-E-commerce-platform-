import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Trash2, ShoppingBasket, MessageCircle, Info, 
  Sparkles, Gift, BadgeAlert, CheckCircle2, MapPin, Star, Heart
} from 'lucide-react';
import { CartItem, UserProfile, UserAddress, OrderRequest } from '../types';
import { saveUserProfile, createOrderRequestInFirestore, updateOrderRequestInFirestore, getPersistentGuestUid } from '../firebase';
import { useToast } from '../context/ToastContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, size: string, quantity: number) => void;
  onRemoveItem: (productId: string, size: string) => void;
  userProfile: UserProfile | null;
  onUpdateProfile?: (profile: UserProfile) => void;
  onOrderSuccess?: (id: string, total: number, itemCount: number) => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  userProfile,
  onUpdateProfile,
  onOrderSuccess
}: CartDrawerProps) {
  const { addToast } = useToast();
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(20); // Default 20% seasonal offer
  const [promoAppliedMsg, setPromoAppliedMsg] = useState('SIMI20 Applied (Seasonal Flat 20% Off)');
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);

  // Deliverable destination state variables with Kerala defaults for convenience
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Kerala');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // Auto-populate address details from userProfile on drawer open
  useEffect(() => {
    if (isOpen && userProfile?.defaultAddress) {
      const da = userProfile.defaultAddress;
      if (da.address) setAddress(da.address);
      if (da.city) setCity(da.city);
      if (da.pincode) setPincode(da.pincode);
      if (da.district) setDistrict(da.district);
      if (da.state) setState(da.state);
    }
  }, [isOpen, userProfile]);

  // Refs for tracking scroll container and target section
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const destinationSectionRef = useRef<HTMLDivElement>(null);

  // Automatic Indian Pincode Lookup
  useEffect(() => {
    const cleanPin = pincode.trim().replace(/\D/g, '');
    if (cleanPin.length === 6) {
      const fetchPincodeDetails = async () => {
        setIsLookupLoading(true);
        setLookupError('');
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`);
          if (!response.ok) throw new Error('API request failed');
          const data = await response.json();
          if (data && data[0] && data[0].Status === 'Success') {
            const postOffices = data[0].PostOffice;
            if (postOffices && postOffices.length > 0) {
              const info = postOffices[0];
              if (info.Block && info.Block !== 'NA') {
                setCity(info.Block);
              } else if (info.Name) {
                setCity(info.Name);
              }
              if (info.District) setDistrict(info.District);
              if (info.State) setState(info.State);
            } else {
              setLookupError('No location details found for this Pincode.');
            }
          } else {
            setLookupError('Invalid Pincode or no records found.');
          }
        } catch (err) {
          console.error('Error fetching pincode details:', err);
          setLookupError('Could not verify Pincode online.');
        } finally {
          setIsLookupLoading(false);
        }
      };
      fetchPincodeDetails();
    } else {
      setLookupError('');
    }
  }, [pincode]);

  useEffect(() => {
    if (isOpen && cart.length > 0) {
      const timer = setTimeout(() => {
        destinationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isOpen, cart.length]);

  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountVal = Math.round(subtotal * (discountPercent / 100));

  const isKerala = state.trim().toLowerCase() === 'kerala';
  const hasNoLocation = state.trim().length === 0 || district.trim().length === 0;

  let shippingCost: string | number = 0;
  let locationCheckmsg = '';

  if (hasNoLocation) {
    shippingCost = 'Enter Destination Address';
    locationCheckmsg = 'Location not specified';
  } else if (isKerala) {
    shippingCost = 80;
    locationCheckmsg = `${district.trim()}, ${state.trim()}`;
  } else {
    shippingCost = 'Contact Simi';
    locationCheckmsg = `${district.trim()}, ${state.trim()} (outside kerala)`;
  }

  const shippingCostDisplay = typeof shippingCost === 'number' ? `₹${shippingCost}` : shippingCost;
  const baseEstimatedTotal = subtotal - discountVal;
  const estimatedTotal = isKerala && !hasNoLocation ? baseEstimatedTotal + 80 : baseEstimatedTotal;

  const handleSetDefaultAddress = async () => {
    if (!userProfile) {
      addToast('Please login / sign up to set a default shipping address!', 'info');
      return;
    }
    if (!address.trim() || !pincode.trim() || !city.trim() || !district.trim() || !state.trim()) {
      addToast('Please fill out all address details first to save them.', 'error');
      return;
    }

    try {
      const updatedAddress: UserAddress = { address, city, pincode, district, state };
      const updatedProfile: UserProfile = {
        ...userProfile,
        defaultAddress: updatedAddress
      };
      await saveUserProfile(userProfile.uid, updatedProfile);
      if (onUpdateProfile) onUpdateProfile(updatedProfile);
      addToast('Saved successfully! This will be your default shipping destination.', 'success');
    } catch (error: any) {
      console.error(error);
      addToast('Failed to save default address: ' + (error.message || error), 'error');
    }
  };

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'GOLD25') {
       setDiscountPercent(25);
       setPromoAppliedMsg('GOLD25 Applied (Exclusive 25% Off)');
       setPromoCode('');
       addToast('GOLD25 promo code applied successfully!', 'success');
    } else if (promoCode.trim().toUpperCase() === 'FREEPOLISH') {
       setDiscountPercent(20);
       setPromoAppliedMsg('FREEPOLISH Activated (20% Off + Free 2 Years Re-polish Voucher)');
       setPromoCode('');
       addToast('FREEPOLISH promo code applied successfully!', 'success');
    } else {
       addToast('Invalid Coupon Code! Try using "GOLD25" or "FREEPOLISH".', 'error');
    }
  };

  const handleCheckoutRecording = async () => {
    setIsSubmittingCheckout(true);
    try {
      const orderId = 'REQ-' + Math.floor(100000 + Math.random() * 900000);
      const guestId = getPersistentGuestUid();
      const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
      const itemsToSave = cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        selectedSize: item.selectedSize || 'Standard'
      }));
      const newOrder: OrderRequest = {
        id: orderId,
        userId: userProfile?.uid || guestId,
        userEmail: userProfile?.email || 'guest@simisgold.com',
        userName: userProfile?.displayName || 'Guest User',
        userPhone: userProfile?.phone || '',
        items: itemsToSave,
        orderItems: itemsToSave,
        orderState: 'Sending Order',
        total: estimatedTotal,
        subtotal: subtotal,
        discountVal: discountVal,
        promoCode: promoAppliedMsg || '',
        shippingCost: typeof shippingCost === 'number' ? shippingCost : 0,
        address: {
          address: address || '',
          city: city || '',
          pincode: pincode || '',
          district: district || '',
          state: state || 'Kerala'
        },
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await createOrderRequestInFirestore(newOrder);
      if (onOrderSuccess) {
        onOrderSuccess(orderId, estimatedTotal, totalItemsCount);
      }
      addToast(`Order request ${orderId} logged successfully! Opening WhatsApp checkout...`, 'success');
      
      // Update orderState to "Order Recieved" on customer side after successful creation
      try {
        await updateOrderRequestInFirestore(orderId, { orderState: 'Order Recieved' });
      } catch (err) {
        console.warn("Failed to set state as Order Recieved:", err);
      }

      // Secure redirection to WhatsApp *after* database integration is complete
      const waUrl = getWhatsAppCheckoutLink();
      const newWindow = window.open(waUrl, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        window.location.href = waUrl;
      }
      onClose();
    } catch (e: any) {
      console.warn('Error recording checkout log:', e);
      addToast('Opening WhatsApp manager conversation...', 'info');
      
      // Fallback redirection to WhatsApp
      const waUrl = getWhatsAppCheckoutLink();
      const newWindow = window.open(waUrl, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        window.location.href = waUrl;
      }
    } finally {
      setIsSubmittingCheckout(false);
    }
  };

  // Generate beautiful e-commerce WhatsApp orders
  const getWhatsAppCheckoutLink = () => {
    let itemsStr = '';
    cart.forEach((item, idx) => {
      itemsStr += `💍 *${idx + 1}. ${item.product.name}*\n   📏 Size: ${item.selectedSize || 'Standard'}\n   💵 Qty: ${item.quantity} x ₹${item.product.price} = ₹${item.product.price * item.quantity}\n\n`;
    });

    const totalDisplay = isKerala && !hasNoLocation 
      ? `₹${estimatedTotal}` 
      : `₹${estimatedTotal} + Shipping (TBD)`;

    const msg = `Hello Simi's Gold Covering! I wish to place an order for the following jewelry models:
------------------------------------------
${itemsStr}------------------------------------------
📦 *Delivery Address Details:*
🏠 Street Address: ${address || 'No street address specified yet'}
🏙️ City/Town: ${city || 'Not specified'}
📍 Pincode: ${pincode || 'Not specified'}
🌆 District: ${district || 'Not specified'}
🌐 State: ${state || 'Not specified'}
------------------------------------------
🏷️ *Subtotal:* ₹${subtotal}
✨ *Promo Discount:* -₹${discountVal} (${promoAppliedMsg})
🚚 *Shipping cost:* ${shippingCostDisplay} (${locationCheckmsg})
💰 *Grand Total:* ${totalDisplay}
------------------------------------------
📦 Please confirm my order booking and guide me with the bank transfer details. Thank you!`;

    return `https://wa.me/917907959180?text=${encodeURIComponent(msg)}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm"
          />

          {/* Slider Menu Body */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-screen max-w-md bg-stone-900 border-l border-stone-800 flex flex-col shadow-2xl relative"
            >
              {/* Header Container */}
              <div className="p-6 border-b border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBasket className="w-5.5 h-5.5 text-amber-500" />
                  <h2 className="text-stone-100 font-serif font-bold text-lg">My Bag</h2>
                  <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full font-mono">
                    {cart.length}
                  </span>
                </div>
                <button
                  id="close-cart-drawer"
                  onClick={onClose}
                  className="p-1 text-stone-400 hover:text-amber-400 rounded-full hover:bg-stone-800 focus:outline-none transition-colors"
                >
                  <X className="w-5.5 h-5.5" />
                </button>
              </div>

              {/* Items Area */}
              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
                {cart.length === 0 ? (
                  <div className="h-2/3 flex flex-col items-center justify-center text-center space-y-3">
                    <ShoppingBasket className="w-14 h-14 text-stone-700 animate-pulse" />
                    <div>
                      <h3 className="text-stone-300 font-bold">Your bag is empty</h3>
                      <p className="text-stone-500 text-xs max-w-xs mt-1">
                        Browse Simi's latest Anklets, Bangles, and Mala necklaces to find your affordable masterpiece!
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div
                          key={`${item.product.id}-${item.selectedSize}`}
                          className="bg-stone-950/50 border border-stone-800/80 p-3 sm:p-4 rounded-2xl flex gap-3 relative overflow-hidden group hover:border-amber-500/20 transition-all"
                        >
                          {/* Product image */}
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl shrink-0"
                            referrerPolicy="no-referrer"
                          />

                          {/* Specs */}
                          <div className="flex-1 space-y-1 pr-4">
                            <h4 className="text-stone-200 text-xs sm:text-sm font-semibold line-clamp-1">
                              {item.product.name}
                            </h4>
                            <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
                              <span className="text-amber-500 font-medium bg-amber-500/10 px-2 py-0.5 rounded">
                                Size: {item.selectedSize || 'Standard'}
                              </span>
                              <span className="text-stone-400 capitalize">
                                {item.product.variety}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 font-mono pt-1">
                              <span className="text-amber-400 font-bold text-sm">
                                ₹{item.product.price}
                              </span>
                              {item.product.originalPrice > item.product.price && (
                                <span className="text-stone-600 line-through text-[11px]">
                                  ₹{item.product.originalPrice}
                                </span>
                              )}
                            </div>
                            
                            {/* Quantity controls */}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => onUpdateQuantity(item.product.id, item.selectedSize || '', item.quantity - 1)}
                                className="bg-stone-800 hover:bg-stone-700 text-stone-200 w-6 h-6 flex items-center justify-center rounded-md font-bold focus:outline-none"
                              >
                                -
                              </button>
                              <span className="text-stone-300 font-mono text-xs w-4 text-center select-none font-bold">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(item.product.id, item.selectedSize || '', item.quantity + 1)}
                                className="bg-stone-800 hover:bg-stone-700 text-stone-200 w-6 h-6 flex items-center justify-center rounded-md font-bold focus:outline-none"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Trash action */}
                          <button
                            onClick={() => onRemoveItem(item.product.id, item.selectedSize || '')}
                            className="absolute right-3 top-3 text-stone-500 hover:text-red-500 p-1.5 rounded-lg hover:bg-stone-900 transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Delivery Location Finder Section */}
                    <div ref={destinationSectionRef} className="bg-stone-904/90 border border-stone-850 p-3.5 rounded-2xl space-y-3 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-amber-400 uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                          1. Delivery Destination
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {isKerala ? 'Kerala Region 🌴' : 'Outside Kerala ✈️'}
                        </span>
                      </div>

                      {/* address block */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
                          Street Address:
                        </label>
                        <textarea
                          id="delivery-address-input"
                          rows={3}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="House Name / Flat Number, Street, Landmark..."
                          className="w-full bg-stone-950 text-stone-200 border border-stone-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400/50 transition-colors resize-none"
                        />
                      </div>

                      {/* pincode and city row */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1 relative">
                          <label className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
                            Pincode:
                          </label>
                          <input
                            id="delivery-pincode-input"
                            type="text"
                            maxLength={6}
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value.replace(/\D/gi, ''))}
                            placeholder="600001"
                            className="w-full bg-stone-950 text-stone-200 border border-stone-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-amber-400/50 transition-colors font-mono font-bold"
                          />
                          {isLookupLoading && (
                            <span className="absolute right-2.5 bottom-2 text-[9px] font-mono text-amber-500 animate-pulse">
                              ...
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
                            City:
                          </label>
                          <input
                            id="delivery-city-input"
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder={isKerala ? "eg: Kochi" : "Enter city / town"}
                            className="w-full bg-stone-950 text-stone-200 border border-stone-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400/50 transition-colors"
                          />
                        </div>
                      </div>

                      {/* district and state row */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
                            District:
                          </label>
                          <input
                            id="delivery-district-input"
                            type="text"
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            placeholder={isKerala ? "eg: Ernakulam" : "Enter district"}
                            className="w-full bg-stone-950 text-stone-200 border border-stone-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400/50 transition-colors"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
                            State:
                          </label>
                          <input
                            id="delivery-state-input"
                            type="text"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder={isKerala ? "Kerala" : "Enter state"}
                            className="w-full bg-stone-950 text-stone-200 border border-stone-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400/50 transition-colors"
                          />
                        </div>
                      </div>

                      {lookupError && (
                        <p className="text-[9px] text-rose-400 font-mono italic">
                          ℹ️ {lookupError}
                        </p>
                      )}
                      {!lookupError && pincode.length === 6 && !isLookupLoading && (
                        <p className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Location details auto-filled from Pincode!
                        </p>
                      )}

                      {/* Set as Default Address Option */}
                      {userProfile ? (
                        <div className="pt-1.5 pb-1">
                          <button
                            type="button"
                            onClick={handleSetDefaultAddress}
                            className="w-full py-2 bg-stone-950 border border-amber-500/15 hover:border-amber-500/35 text-amber-500 hover:text-amber-400 font-serif font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors duration-200"
                            title="Set this input address as your default profile address"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" />
                            <span>Set as Default Address</span>
                          </button>
                        </div>
                      ) : (
                        <div className="pt-1 py-1 px-2.5 bg-stone-950/40 border border-stone-850/60 rounded-xl text-[10.5px] text-stone-400 leading-relaxed text-center font-sans">
                          💡 Log in at the top to save this address as your default for next checkout!
                        </div>
                      )}

                      {/* Region Buttons */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[9px] text-stone-500 uppercase tracking-wider font-medium block">Region Option:</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            id="preset-kerala"
                            onClick={() => { 
                              setState('Kerala'); 
                              setDistrict('');
                              setCity('');
                            }}
                            className={`flex-1 text-xs py-2 rounded-xl font-bold border transition-all cursor-pointer text-center ${isKerala ? 'bg-amber-400/10 text-amber-400 border-amber-400/40' : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'}`}
                          >
                            Kerala (₹80)
                          </button>
                          <button
                            type="button"
                            id="preset-other"
                            onClick={() => { 
                              setState('Tamil Nadu'); 
                              setDistrict(''); 
                              setCity(''); 
                            }}
                            className={`flex-1 text-xs py-2 rounded-xl font-bold border transition-all cursor-pointer text-center ${!isKerala ? 'bg-amber-400/10 text-amber-400 border-amber-400/40' : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'}`}
                          >
                            Other
                          </button>
                        </div>
                      </div>

                      {!isKerala && state.trim().length > 0 && (
                        <p className="text-[10px] text-amber-500/90 leading-relaxed bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg flex items-start gap-1.5 font-sans">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                          <span>Outside Kerala orders require manual courier rate calculation. Click WhatsApp checkout below to enquire and confirm rates with Simi!</span>
                        </p>
                      )}
                    </div>

                    {/* Coupon Application Row */}
                    <div className="space-y-1.5 border-t border-stone-800 pt-5 mt-4">
                      <label className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold block">
                        Got Gold Premium Coupon?
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          placeholder="e.g. GOLD25 or FREEPOLISH"
                          className="flex-1 bg-stone-900 hover:bg-stone-850 text-stone-200 border border-stone-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400/50"
                        />
                        <button
                          onClick={handleApplyPromo}
                          className="bg-amber-500 hover:bg-amber-400 text-stone-950 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                      {/* Copyable code tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button 
                          onClick={() => setPromoCode('GOLD25')}
                          className="text-[9px] bg-stone-900 hover:bg-stone-850 text-amber-500/80 px-2 py-0.5 rounded border border-stone-850 hover:border-amber-500/25 font-mono cursor-pointer"
                        >
                          Code: GOLD25 (25% off)
                        </button>
                        <button 
                          onClick={() => setPromoCode('FREEPOLISH')}
                          className="text-[9px] bg-stone-900 hover:bg-stone-850 text-amber-500/80 px-2 py-0.5 rounded border border-stone-850 hover:border-amber-500/25 font-mono cursor-pointer"
                        >
                          Code: FREEPOLISH (Voucher)
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Drawer Sticky Footer Checkout calculations */}
              {cart.length > 0 && (
                <div className="bg-stone-950 border-t border-stone-800 p-5 space-y-4">
                  {/* Summary calculations */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-stone-400">
                      <span>Items Subtotal</span>
                      <span className="font-mono text-stone-300">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between text-xs text-stone-400 items-center">
                      <span className="flex items-center gap-1 text-amber-400">
                        <Gift className="w-3.5 h-3.5 text-amber-400" />
                        Offer Discount
                      </span>
                      <span className="font-mono font-bold text-red-400">-₹{discountVal.toLocaleString('en-IN')}</span>
                    </div>

                    {promoAppliedMsg && (
                      <p className="text-[10px] text-emerald-400 flex items-center gap-1 px-1 font-medium italic">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {promoAppliedMsg}
                      </p>
                    )}

                    <div className="flex justify-between text-xs text-stone-400 items-center">
                      <span>Delivery Charge</span>
                      {hasNoLocation ? (
                        <span className="text-amber-500 text-[11px] font-mono font-bold">Please specify location</span>
                      ) : isKerala ? (
                        <span className="text-amber-400 font-mono font-bold">₹80 ({locationCheckmsg})</span>
                      ) : (
                        <span className="text-amber-500/90 text-[10.5px] font-mono leading-none text-right">
                          TBD (Contact Simi)
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between text-sm pt-2.5 border-t border-stone-900 font-bold text-stone-100">
                      <span className="font-serif">Estimated Grand Total</span>
                      <span className="font-mono text-lg text-amber-400">
                        ₹{estimatedTotal.toLocaleString('en-IN')}{!isKerala && ' + Courier TBD'}
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp Checkout Activator */}
                  <div className="space-y-2 pt-2">
                    <button
                      id="whatsapp-checkout-link"
                      disabled={isSubmittingCheckout}
                      onClick={async (e) => {
                        e.preventDefault();
                        await handleCheckoutRecording();
                      }}
                      className="w-full py-4.5 bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 hover:from-emerald-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-lg active:scale-98 transition-all text-center focus:outline-none cursor-pointer disabled:opacity-50"
                    >
                      <MessageCircle className="w-5 h-5 fill-white text-emerald-600 shrink-0" />
                      <span>{isSubmittingCheckout ? 'Saving booking...' : 'Book Instantly on WhatsApp'}</span>
                    </button>
                    
                    <p className="text-[10px] text-stone-500 font-mono text-center uppercase tracking-wider">
                      * Booking will open a direct chat with representative Simi
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
