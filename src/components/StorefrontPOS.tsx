import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Plus, Minus, Trash2, ShoppingBag, Calculator, 
  User, Phone, CheckCircle, ArrowRight, X, AlertCircle, Sparkles, Receipt
} from 'lucide-react';
import { Product, CartItem, OrderRequest } from '../types';
import { createOrderRequestInFirestore } from '../firebase';

interface POSCartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
}

interface StorefrontPOSProps {
  products: Product[];
  onUpdateProducts: (newProducts: Product[]) => Promise<void>;
  onClose: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'cart') => void;
}

export default function StorefrontPOS({ 
  products, 
  onUpdateProducts, 
  onClose,
  addToast
}: StorefrontPOSProps) {
  // POS Cart State
  const [posCart, setPosCart] = useState<POSCartItem[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Customer details (clean & offline)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Accounting modifiers
  const [discountVal, setDiscountVal] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [includeGST, setIncludeGST] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  
  // Transaction loading
  const [isProcessing, setIsProcessing] = useState(false);

  // Search filter
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const queryLower = searchQuery.toLowerCase().trim();
    return products.filter(p => 
      p.name.toLowerCase().includes(queryLower) ||
      p.id.toLowerCase().includes(queryLower) ||
      (p.tamilName && p.tamilName.toLowerCase().includes(queryLower)) ||
      p.variety.toLowerCase().includes(queryLower) ||
      p.categoryLabel.toLowerCase().includes(queryLower)
    );
  }, [products, searchQuery]);

  // Quick suggestion/frequent item shortcuts in store (e.g. some bestsellers)
  const recommendedItems = useMemo(() => {
    return products.filter(p => p.isBestSeller).slice(0, 4);
  }, [products]);

  // Helper to get default sizes based on product logic
  const getProductSizes = (product: Product): string[] => {
    if (product.sizes && product.sizes.length > 0) return product.sizes;
    if (product.category === 'vala') return ['2.4', '2.6', '2.8'];
    if (product.category === 'kolus') return ['9.5"', '10"', '10.5"'];
    return ['Standard'];
  };

  // Add Item to POS Cart
  const handleAddToPOSCart = (product: Product, size?: string) => {
    const defaultSize = size || getProductSizes(product)[0];
    
    setPosCart(prev => {
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && item.selectedSize === defaultSize
      );
      
      if (existingIndex > -1) {
        const next = [...prev];
        const newQty = next[existingIndex].quantity + 1;
        // Optional warning if exceeding physical/db stock, but allow offline override
        if (newQty > product.stockCount) {
          addToast(`Note: POS quantity (${newQty}) exceeds catalog stock (${product.stockCount}). Proceeding for offline sale.`, 'info');
        }
        next[existingIndex].quantity = newQty;
        return next;
      } else {
        if (product.stockCount === 0) {
          addToast(`Note: Adding out-of-stock item "${product.name}" for offline order.`, 'info');
        }
        return [...prev, { product, quantity: 1, selectedSize: defaultSize }];
      }
    });

    addToast(`Added "${product.name}" to POS slip.`, 'success');
  };

  // Update Cart Quantity
  const handleUpdateQty = (productId: string, size: string, change: number) => {
    setPosCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId && item.selectedSize === size) {
          const targetQty = item.quantity + change;
          if (targetQty <= 0) return null;
          return { ...item, quantity: targetQty };
        }
        return item;
      }).filter((item): item is POSCartItem => item !== null);
    });
  };

  // Update Cart Size Selection
  const handleSizeChange = (productId: string, oldSize: string, newSize: string) => {
    setPosCart(prev => {
      // Find if we already have the item with the new size
      const targetIndex = prev.findIndex(
        item => item.product.id === productId && item.selectedSize === newSize
      );
      
      if (targetIndex > -1) {
        // Merge them
        const itemToModify = prev.find(item => item.product.id === productId && item.selectedSize === oldSize);
        if (!itemToModify) return prev;
        
        return prev.map((item, idx) => {
          if (idx === targetIndex) {
            return { ...item, quantity: item.quantity + itemToModify.quantity };
          }
          return item;
        }).filter(item => !(item.product.id === productId && item.selectedSize === oldSize));
      } else {
        // Just change size
        return prev.map(item => 
          (item.product.id === productId && item.selectedSize === oldSize)
            ? { ...item, selectedSize: newSize }
            : item
        );
      }
    });
  };

  // Remove Item from POS Cart
  const handleRemoveItem = (productId: string, size: string) => {
    setPosCart(prev => prev.filter(item => !(item.product.id === productId && item.selectedSize === size)));
    addToast('Removed item from POS slip.', 'info');
  };

  // Calculations
  const subtotal = useMemo(() => {
    return posCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }, [posCart]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round((subtotal * (discountVal || 0)) / 100);
    }
    return discountVal || 0;
  }, [subtotal, discountVal, discountType]);

  const gstAmount = useMemo(() => {
    if (!includeGST) return 0;
    // Standard jewelry retail tax is typically 3% SGST/CGST in India
    return Math.round((subtotal - discountAmount) * 0.03);
  }, [subtotal, discountAmount, includeGST]);

  const absoluteTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + gstAmount);
  }, [subtotal, discountAmount, gstAmount]);

  // Submit/Process Offline POS Order
  const handleProcessPOSOrder = async () => {
    if (posCart.length === 0) {
      addToast('Cannot check out an empty POS cart.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Prepare dynamic order receipt id
      const orderId = `pos-rec-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;
      
      const itemsToSave = posCart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        selectedSize: item.selectedSize
      }));
      const orderData: OrderRequest = {
        id: orderId,
        userName: customerName.trim() || 'In-Store Walk-in Customer',
        userPhone: customerPhone.trim() || undefined,
        userEmail: 'offline-pos@simisboutique.in',
        items: itemsToSave,
        orderItems: itemsToSave,
        orderState: 'shipped',
        total: absoluteTotal,
        subtotal: subtotal,
        discountVal: discountAmount,
        shippingCost: 0, // no delivery stuff
        status: 'confirmed', // immediately completed & verified
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        promoCode: discountVal > 0 ? `POS_OFFLINE_${discountVal}${discountType === 'percent' ? 'PCT' : 'INR'}` : undefined
      };

      // 2. Reduce the stock count inside the `products` list
      const updatedProductsList = products.map(catalogProd => {
        const cartMatchedItems = posCart.filter(item => item.product.id === catalogProd.id);
        if (cartMatchedItems.length > 0) {
          const totalQtySubtracted = cartMatchedItems.reduce((acc, match) => acc + match.quantity, 0);
          return {
            ...catalogProd,
            stockCount: Math.max(0, catalogProd.stockCount - totalQtySubtracted)
          };
        }
        return catalogProd;
      });

      // 3. Write Order request record to database (Firestore 'order_requests' collection)
      await createOrderRequestInFirestore(orderData);

      // 4. Trigger bulk products state update so it syncs product stock count reductions inside Firestore as well!
      await onUpdateProducts(updatedProductsList);

      addToast(`In-Store Order ${orderId} finalized securely! Stock count updated.`, 'success');
      
      // Reset forms
      setPosCart([]);
      setSearchQuery('');
      setCustomerName('');
      setCustomerPhone('');
      setDiscountVal(0);
      
    } catch (e: any) {
      console.error("POS Checkout error:", e);
      addToast(`POS Error: ${e.message || 'Verification failure'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="storefront-pos-panel" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10">
      
      {/* 1. Header ribbon */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden border-t-amber-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10" />
        <div className="space-y-1.5 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] font-mono tracking-widest text-amber-500 uppercase font-black">
              Simi Traditional Boutique Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-stone-100 flex items-center justify-center md:justify-start gap-2">
            <Receipt className="w-6 h-6 text-amber-500" />
            In-Store Storefront Mode (POS)
          </h1>
          <p className="text-xs text-stone-400 max-w-xl font-light">
            Fast counter checkout desk to search ornaments, adjust items, calculate client money, and instant-confirm cash/UPI sales with automated inventory subtraction.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-950 hover:bg-stone-850 text-stone-300 hover:text-white rounded-xl border border-stone-800 hover:border-stone-700 font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <X className="w-4 h-4 text-rose-500" />
            <span>Exit POS Client</span>
          </button>
        </div>
      </div>

      {/* 2. Primary layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Product Catalog & Search (7/12) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-stone-900/90 border border-stone-850/80 rounded-2xl p-5 space-y-4 shadow-lg">
            <h2 className="text-base font-serif font-bold text-stone-200 flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-500" />
              Search & Add Ornaments
            </h2>
            
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, category (vala, kolus, earrings), variety, ID..."
                className="w-full bg-stone-950 border border-stone-800 hover:border-stone-750 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 text-stone-100 text-sm px-4 py-3 rounded-xl pl-10 focus:outline-none transition-all placeholder:text-stone-600 font-sans"
              />
              <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3.5 text-stone-500 hover:text-stone-300 focus:outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Search results block */}
            <div className="min-h-[140px] max-h-[380px] overflow-y-auto custom-scrollbar space-y-2 pr-1 pt-1">
              {searchQuery.trim() ? (
                filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {filteredProducts.map(p => {
                      const isLowStock = p.stockCount > 0 && p.stockCount <= 2;
                      const isOutOfStock = p.stockCount === 0;
                      return (
                        <div 
                          key={p.id}
                          className="flex items-center justify-between p-3 bg-stone-950/60 hover:bg-stone-950 border border-stone-850/60 hover:border-amber-500/40 rounded-xl transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-stone-900 rounded-lg overflow-hidden border border-stone-850 shrink-0">
                              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="text-left space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-amber-500 bg-amber-500/5 px-1 py-0.2 rounded border border-amber-500/10">
                                  {p.variety}
                                </span>
                                <span className="text-[9px] text-stone-500 font-mono">ID: {p.id}</span>
                              </div>
                              <h3 className="text-xs sm:text-sm font-sans font-bold text-stone-200">{p.name}</h3>
                              <p className="text-[11px] text-stone-400 font-mono">
                                Price: <span className="text-white font-bold">₹{p.price.toLocaleString('en-IN')}</span> 
                                <span className="mx-2 text-stone-700">|</span> 
                                Stock: <span className={`font-bold ${isOutOfStock ? 'text-rose-500' : isLowStock ? 'text-amber-500' : 'text-emerald-500'}`}>
                                  {p.stockCount} left
                                </span>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddToPOSCart(p)}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-450 text-stone-950 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Add</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-stone-500 space-y-1.5 bg-stone-950/20 rounded-xl border border-dashed border-stone-850">
                    <AlertCircle className="w-6 h-6 text-stone-600 mx-auto" />
                    <p className="text-xs">No matching ornaments found matching "{searchQuery}"</p>
                  </div>
                )
              ) : (
                <div className="text-center py-6 text-stone-500 bg-stone-950/20 rounded-xl border border-stone-850/40">
                  <p className="text-xs font-mono">Type in the prompt above to look up products in real-time...</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Access/Frequently Ordered Ornaments */}
          <div className="bg-stone-900/90 border border-stone-850/80 rounded-2xl p-5 space-y-3.5 shadow-lg">
            <h2 className="text-xs uppercase font-mono font-bold tracking-widest text-stone-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
              Counter Quick Picks (Best Sellers)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recommendedItems.map(p => {
                const isOutOfStock = p.stockCount === 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleAddToPOSCart(p)}
                    className="p-2.5 bg-stone-950/40 hover:bg-stone-950 hover:border-amber-500/30 border border-stone-850/60 rounded-xl cursor-pointer text-left transition-all space-y-2 group"
                  >
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-stone-850 bg-stone-900">
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                      <div className="absolute bottom-1 right-1 bg-stone-950/85 px-1 py-0.2 rounded text-[8px] text-amber-400 font-mono font-bold">
                        ₹{p.price.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-[11px] font-sans font-bold text-stone-300 truncate group-hover:text-amber-300 transition-colors">
                        {p.name}
                      </h4>
                      <p className="text-[9px] text-stone-500 font-mono">
                        Stock: <span className={isOutOfStock ? 'text-rose-500' : 'text-emerald-500 font-bold'}>{p.stockCount}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: POS Billing Terminal Invoice (5/12) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden relative">
            
            {/* Ticket header */}
            <div className="bg-stone-950 border-b border-stone-800 p-4.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-500" />
                <h2 className="text-sm font-mono tracking-wider text-stone-200 font-bold">POS BILLING SLIP</h2>
              </div>
              <span className="text-[10px] font-mono text-stone-500 font-bold bg-stone-900 border border-stone-850 px-2 py-0.5 rounded">
                {posCart.length} Items Selected
              </span>
            </div>

            {/* List of checkout items */}
            <div className="p-4 border-b border-stone-850 space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar">
              {posCart.length > 0 ? (
                posCart.map((item) => {
                  const sizesList = getProductSizes(item.product);
                  return (
                    <div key={`${item.product.id}-${item.selectedSize}`} className="flex items-start justify-between gap-3 bg-stone-950/40 p-3 rounded-xl border border-stone-850">
                      <div className="text-left space-y-1">
                        <p className="text-xs font-semibold text-stone-200">{item.product.name}</p>
                        
                        {/* Selector parameters */}
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-1 text-[11px] text-stone-400">
                            <span className="font-mono text-[10px]">Size:</span>
                            <select
                              value={item.selectedSize}
                              onChange={(e) => handleSizeChange(item.product.id, item.selectedSize, e.target.value)}
                              className="bg-stone-900 text-stone-300 border border-stone-800 rounded text-[10px] px-1 py-0.5 focus:outline-none cursor-pointer"
                            >
                              {sizesList.map(sz => (
                                <option key={sz} value={sz}>{sz}</option>
                              ))}
                            </select>
                          </div>
                          
                          <span className="text-stone-700 font-mono text-[10px]">|</span>
                          
                          <p className="text-[11px] font-mono text-amber-400 font-bold">
                            ₹{item.product.price.toLocaleString('en-IN')} each
                          </p>
                        </div>
                      </div>

                      {/* Quantity & Trash system */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1.5 bg-stone-900 px-1.5 py-1 rounded-lg border border-stone-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.product.id, item.selectedSize, -1)}
                            className="text-stone-400 hover:text-stone-200 p-0.5 focus:outline-none"
                          >
                            <Minus className="w-3 h-3 stroke-[3]" />
                          </button>
                          <span className="text-xs font-mono font-extrabold text-stone-200 w-5 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.product.id, item.selectedSize, 1)}
                            className="text-stone-400 hover:text-emerald-450 p-0.5 focus:outline-none"
                          >
                            <Plus className="w-3 h-3 stroke-[3]" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-stone-300">
                            ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.product.id, item.selectedSize)}
                            className="text-stone-600 hover:text-rose-500 transition-colors p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-stone-500 space-y-2">
                  <ShoppingBag className="w-8 h-8 text-stone-700 mx-auto" />
                  <p className="text-xs">Counter cart is currently empty.</p>
                  <p className="text-[10px] text-stone-600 font-mono">Use the catalog on the left to add items to slip.</p>
                </div>
              )}
            </div>

            {/* Offline-only non-delivery Customer Metadata */}
            <div className="p-4 border-b border-stone-850 bg-stone-950/30 space-y-3">
              <h3 className="text-[10px] uppercase font-mono font-bold tracking-widest text-stone-400 flex items-center gap-1.5">
                <User className="w-3 text-amber-500" />
                Customer Reference (Optional - No Delivery details)
              </h3>
              
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-500">Buyer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Client"
                    className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-500">WhatsApp / Phone</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 7907959180"
                    className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Accounting calculations & discount overrides */}
            <div className="p-4 space-y-4 bg-stone-950/70">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] uppercase font-mono font-bold tracking-widest text-stone-400 flex items-center gap-1.5">
                    <Calculator className="w-3 text-amber-500" />
                    In-Store Modifiers
                  </h3>
                  
                  {/* include GST toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeGST}
                      onChange={(e) => setIncludeGST(e.target.checked)}
                      className="rounded bg-stone-900 border-stone-800 text-amber-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-stone-400">Add 3% GST</span>
                  </label>
                </div>

                <div className="grid grid-cols-12 gap-2 text-left">
                  {/* Discount input */}
                  <div className="col-span-7 space-y-1">
                    <label className="text-[9px] font-mono text-stone-500">Offline Discount Value</label>
                    <input
                      type="number"
                      min="0"
                      value={discountVal || ''}
                      onChange={(e) => setDiscountVal(Math.max(0, Number(e.target.value)))}
                      placeholder="e.g. 5"
                      className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500/50 font-mono focus:ring-0"
                    />
                  </div>

                  {/* Discount type toggle */}
                  <div className="col-span-5 space-y-1">
                    <label className="text-[9px] font-mono text-stone-500">Discount Unit</label>
                    <div className="grid grid-cols-2 bg-stone-950 p-[3px] rounded-lg border border-stone-800">
                      <button
                        type="button"
                        onClick={() => setDiscountType('percent')}
                        className={`text-[10px] font-mono py-1 rounded font-bold cursor-pointer transition-all ${discountType === 'percent' ? 'bg-amber-500 text-stone-950' : 'text-stone-400'}`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('fixed')}
                        className={`text-[10px] font-mono py-1 rounded font-bold cursor-pointer transition-all ${discountType === 'fixed' ? 'bg-amber-500 text-stone-950' : 'text-stone-400'}`}
                      >
                        ₹
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-1.5 text-left">
                <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest block">Offline Payment Settlement</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'UPI', 'Card'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${paymentMethod === method ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/50 shadow-sm' : 'bg-stone-950 border-stone-850 hover:border-stone-800 text-stone-400'}`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accounting details ledger */}
              <div className="pt-3 border-t border-stone-850 space-y-1.5 text-xs text-stone-400 font-mono text-left">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-stone-200">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Discount Deduction:</span>
                    <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {includeGST && (
                  <div className="flex justify-between">
                    <span>GST (3% Jewelry rate):</span>
                    <span className="text-stone-300">₹{gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-dashed border-stone-800 pt-2 text-sm font-bold">
                  <span className="text-stone-200">Total Payable:</span>
                  <span className="text-amber-400">₹{absoluteTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Proceed Action Checkout Button */}
              <button
                type="button"
                disabled={isProcessing || posCart.length === 0}
                onClick={handleProcessPOSOrder}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-550 disabled:bg-stone-800 disabled:text-stone-600 disabled:cursor-not-allowed text-white font-mono font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-500/20 shadow-md"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-stone-100 border-t-transparent rounded-full animate-spin" />
                    <span>Processing In-Store Sale...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-250 animate-pulse" />
                    <span>Finalize Settlement & Subtract Inventories</span>
                  </>
                )}
              </button>
            </div>

            {/* Note decoration */}
            <div className="bg-stone-950 p-2.5 text-center border-t border-stone-850">
              <span className="text-[9px] text-stone-500 font-mono block italic">
                * Order processed here immediately goes intoconfirmed orders log with stock count subtracted *
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
