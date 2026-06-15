import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, Unlock, Plus, Trash2, Edit3, X, Save, Image, Check, 
  Sparkles, Hammer, ArrowLeft, RefreshCw, Eye, EyeOff, Mail, Smartphone, Key, ChevronRight,
  MoreVertical, Shield, MessageCircle, ShoppingBag, Calendar, CheckCircle, Package, AlertCircle
} from 'lucide-react';
import { Product, OrderRequest } from '../types';
import ProductCard from './ProductCard';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';
import { db, confirmOrderRequestAndProcess, updateOrderRequestInFirestore } from '../firebase';
import { useToast } from '../context/ToastContext';

interface AdminPortalProps {
  products: Product[];
  onUpdateProducts: (newProducts: Product[]) => void;
  onClose: () => void;
  userProfile: any | null;
  defaultTab?: 'catalog' | 'security' | 'customers' | 'admins' | 'orders';
}

export default function AdminPortal({
  products,
  onUpdateProducts,
  onClose,
  userProfile,
  defaultTab
}: AdminPortalProps) {
  const { addToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return userProfile?.role === 'admin' || userProfile?.isAdmin === true;
  });
  const [pinInput, setPinInput] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Security status & triggers
  const [activeTab, setActiveTab] = useState<'catalog' | 'security' | 'customers' | 'admins' | 'orders'>(() => {
    return defaultTab || 'catalog';
  });

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);
  const [securityNotifications, setSecurityNotifications] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [unbanConfirmIp, setUnbanConfirmIp] = useState<string | null>(null);

  // WhatsApp Order Requests states
  const [orderRequests, setOrderRequests] = useState<OrderRequest[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRequest | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editingItems, setEditingItems] = useState<{ productId: string, name: string, quantity: number, price: number, selectedSize?: string }[]>([]);

  // Customers management states
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [expandedUserUid, setExpandedUserUid] = useState<string | null>(null);

  // Options menu states for role management
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadSecurityNotifications();
      loadCustomers();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(collection(db, 'order_requests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: OrderRequest[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as OrderRequest);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrderRequests(list);
      
      // Update selectedOrder details in real-time if it is being viewed
      setSelectedOrder(prev => {
        if (!prev) return null;
        const fresh = list.find(r => r.id === prev.id);
        return fresh || prev;
      });
    }, (error) => {
      console.warn("Could not subscribe to order requests:", error);
    });
    return () => unsubscribe();
  }, [isAuthenticated]);

  useEffect(() => {
    const userIsAdmin = userProfile?.role === 'admin' || userProfile?.isAdmin === true;
    if (userIsAdmin) {
      setIsAuthenticated(true);
    }
  }, [userProfile]);

  const handleConfirmOrder = async (order: OrderRequest) => {
    try {
      await confirmOrderRequestAndProcess(order);
      addToast(`Order ${order.id} confirmed! Stock decreased and logged to user purchases.`, 'success');
    } catch (e: any) {
      console.error(e);
      addToast('Failed to confirm order: ' + e.message, 'error');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel this order request?")) return;
    try {
      await updateOrderRequestInFirestore(orderId, { status: 'cancelled' });
      addToast(`Order request ${orderId} cancelled.`, 'info');
    } catch (e: any) {
      console.error(e);
      addToast('Failed to cancel order: ' + e.message, 'error');
    }
  };

  const handleStartEdit = (order: OrderRequest) => {
    setEditingItems(order.items);
    setIsEditingOrder(true);
  };

  const handleUpdateEditingQty = (productId: string, delta: number) => {
    setEditingItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleSaveAndConfirm = async (order: OrderRequest) => {
    try {
      const newSubtotal = editingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountPercent = order.discountVal && order.subtotal ? (order.discountVal / order.subtotal) : 0;
      const newDiscountVal = Math.round(newSubtotal * discountPercent);
      const newTotal = newSubtotal - newDiscountVal + (order.shippingCost || 0);

      const updatedOrder: OrderRequest = {
        ...order,
        items: editingItems,
        orderItems: editingItems,
        orderState: 'Preparing for dispatch',
        subtotal: newSubtotal,
        discountVal: newDiscountVal,
        total: newTotal,
        updatedAt: new Date().toISOString()
      };

      // 1. Update in firestore
      await updateOrderRequestInFirestore(order.id, updatedOrder);
      // 2. Process confirmation
      await confirmOrderRequestAndProcess(updatedOrder);

      setIsEditingOrder(false);
      setSelectedOrder(updatedOrder);
      addToast(`Order ${order.id} successfully edited & confirmed!`, 'success');
    } catch (e: any) {
      console.error(e);
      addToast('Failed to edit and confirm order: ' + e.message, 'error');
    }
  };

  const loadCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const customersList: any[] = [];
      querySnapshot.forEach((docSnap) => {
        customersList.push(docSnap.data());
      });
      // Sort customers by joinedAt or name
      customersList.sort((a, b) => {
        const dateA = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
        const dateB = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
        return dateB - dateA; // Newest first
      });
      setCustomers(customersList);
    } catch (e) {
      console.error("Failed loading customer database:", e);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const handleMakeAdmin = async (targetUid: string, shouldBeAdmin: boolean) => {
    setIsUpdatingRole(targetUid);
    try {
      const targetUser = customers.find(c => c.uid === targetUid);
      const email = targetUser?.email || "";

      // 1. Update users collection directly
      await setDoc(doc(db, "users", targetUid), {
        role: shouldBeAdmin ? "admin" : "customer",
        isAdmin: !!shouldBeAdmin
      }, { merge: true });

      // 2. Sync to admins collection directly for rule optimization
      const adminDocRef = doc(db, "admins", targetUid);
      if (shouldBeAdmin) {
        await setDoc(adminDocRef, {
          uid: targetUid,
          email,
          promotedAt: new Date().toISOString()
        });
      } else {
        await deleteDoc(adminDocRef);
      }

      await loadCustomers();
      setActiveMenuUserId(null);
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error occurred while updating user role.');
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const loadSecurityNotifications = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/security-notifications');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSecurityNotifications(data.notifications || []);
        }
      }
    } catch (e) {
      console.error("Failed loading security metrics:", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleUnbanIp = async (ip: string) => {
    try {
      const res = await fetch('/api/admin/unban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUnbanConfirmIp(null);
          await loadSecurityNotifications();
        }
      }
    } catch (e) {
      console.error("Error unbanning IP:", e);
    }
  };

  const handleVerifyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingPin(true);
    setErrorMessage('');
    
    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        loadSecurityNotifications();
        loadCustomers();
      } else {
        if (data.banned) {
          window.location.reload();
        } else {
          setErrorMessage(data.error || 'Incorrect passcode. Please check your credentials.');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Communication error with the auth guard.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Management active views
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // Search / filter within the dashboard
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [dashboardCategory, setDashboardCategory] = useState<string>('All');

  // Form states for adding/editing
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formTamilName, setFormTamilName] = useState('');
  const [formCategory, setFormCategory] = useState<'vala' | 'kolus' | 'mala_necklace' | 'earrings'>('vala');
  const [formVariety, setFormVariety] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formOriginalPrice, setFormOriginalPrice] = useState(0);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDetails, setFormDetails] = useState<string[]>([]);
  const [newDetailPoint, setNewDetailPoint] = useState('');
  const [formIsBestSeller, setFormIsBestSeller] = useState(false);
  const [formIsNewArrival, setFormIsNewArrival] = useState(false);
  const [formIsCustomizable, setFormIsCustomizable] = useState(false);
  const [formArrivalDate, setFormArrivalDate] = useState('');
  const [formMaterial, setFormMaterial] = useState<'gold_covering' | 'gold_covering_on_silver' | 'silver' | 'white_gold'>('gold_covering');
  const [formStockCount, setFormStockCount] = useState<number>(10);
  
  // Editable sizes bubbles
  const [formSizes, setFormSizes] = useState<string[]>([]);
  const [newSizeValue, setNewSizeValue] = useState('');

  // Quick glance live preview product
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Non-blocking UI validation and deletion states
  const [validationError, setValidationError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedProductConfirmation, setSavedProductConfirmation] = useState<Product | null>(null);

  // HTML5 Drag and Drop states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedType, setDraggedType] = useState<'image' | 'detail' | 'size' | null>(null);

  // Array reorder utility
  const moveItemInArray = (arr: any[], fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= arr.length) return arr;
    const nextArr = [...arr];
    const [movedItem] = nextArr.splice(fromIndex, 1);
    nextArr.splice(toIndex, 0, movedItem);
    return nextArr;
  };

  const handleMoveImage = (fromIdx: number, toIdx: number) => {
    setFormImages(moveItemInArray(formImages, fromIdx, toIdx));
  };

  const handleMoveDetail = (fromIdx: number, toIdx: number) => {
    setFormDetails(moveItemInArray(formDetails, fromIdx, toIdx));
  };

  const handleMoveSize = (fromIdx: number, toIdx: number) => {
    setFormSizes(moveItemInArray(formSizes, fromIdx, toIdx));
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, index: number, type: 'image' | 'detail' | 'size') => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
    setDraggedType(type);
  };

  const handleDragOver = (e: React.DragEvent, index: number, type: 'image' | 'detail' | 'size') => {
    if (draggedType !== type || draggedIndex === index || draggedIndex === null) return;
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number, type: 'image' | 'detail' | 'size') => {
    if (draggedType !== type || draggedIndex === null) return;
    e.preventDefault();
    
    if (type === 'image') {
      setFormImages(moveItemInArray(formImages, draggedIndex, targetIndex));
    } else if (type === 'detail') {
      setFormDetails(moveItemInArray(formDetails, draggedIndex, targetIndex));
    } else if (type === 'size') {
      setFormSizes(moveItemInArray(formSizes, draggedIndex, targetIndex));
    }
    
    setDraggedIndex(null);
    setDraggedType(null);
  };


  const startEditProduct = (product: Product) => {
    setValidationError('');
    setShowDeleteConfirm(false);
    setEditingProduct(product);
    setIsAddingNew(false);
    setFormId(product.id);
    setFormName(product.name);
    setFormTamilName(product.tamilName || '');
    setFormCategory(product.category);
    setFormVariety(product.variety);
    setFormPrice(product.price);
    setFormOriginalPrice(product.originalPrice);
    setFormImages([...product.images]);
    setFormDescription(product.description);
    setFormDetails([...product.details]);
    setFormIsBestSeller(product.isBestSeller);
    setFormIsNewArrival(product.isNewArrival);
    setFormIsCustomizable(product.isCustomizable);
    
    // Set arrival date or auto-generate current date
    if (product.arrivalDate) {
      setFormArrivalDate(product.arrivalDate);
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setFormArrivalDate(`${yyyy}-${mm}-${dd}`);
    }

    setFormMaterial(product.material);
    setFormStockCount(product.stockCount !== undefined ? product.stockCount : 10);
    
    // Auto populate default sizes on edit if none exists
    setFormSizes(product.sizes ? [...product.sizes] : (product.category === 'vala' ? ['2.4', '2.6', '2.8'] : (product.category === 'kolus' ? ['8.5 inches', '9 inches', '9.5 inches', '10 inches', '10.5 inches'] : ['Free-size fit'])));
  };

  const startAddNew = () => {
    setValidationError('');
    setShowDeleteConfirm(false);
    setIsAddingNew(true);
    setEditingProduct(null);
    setFormId(`manual-${Date.now()}`);
    setFormName('');
    setFormTamilName('');
    setFormCategory('vala');
    setFormVariety('');
    setFormPrice(0);
    setFormOriginalPrice(0);
    setFormImages([
      'https://images.unsplash.com/photo-1611591437281-460bfbe15763?w=800&auto=format&fit=crop&q=80'
    ]);
    setFormDescription('Superior gold covered masterpiece. Perfect for standard festivals and special occasions.');
    setFormDetails([
      'Material: Hand-polished gold-covering cladding',
      '1 Year polish Guarantee & Free Re-polishing support',
      'Hypoallergenic lead-free copper silver base alloy'
    ]);
    setFormIsBestSeller(false);
    setFormIsNewArrival(true);
    setFormIsCustomizable(false);
    
    // Default to today's date
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setFormArrivalDate(`${yyyy}-${mm}-${dd}`);

    setFormMaterial('gold_covering');
    setFormStockCount(10);
    setFormSizes(['2.4', '2.6', '2.8']); // default for vala / bangles
  };

  const handleImageAppend = () => {
    setValidationError('');
    if (newImageUrl.trim() && newImageUrl.startsWith('http')) {
      setFormImages([...formImages, newImageUrl.trim()]);
      setNewImageUrl('');
    } else {
      setValidationError('Please enter a valid absolute image link URL (starting with http:// or https://)');
    }
  };

  const handleImageRemove = (idx: number) => {
    setValidationError('');
    if (formImages.length <= 1) {
      setValidationError('Products require at least one high-fidelity preview image.');
      return;
    }
    setFormImages(formImages.filter((_, i) => i !== idx));
  };

  const handleDetailAppend = () => {
    if (newDetailPoint.trim()) {
      setFormDetails([...formDetails, newDetailPoint.trim()]);
      setNewDetailPoint('');
    }
  };

  const handleDetailRemove = (idx: number) => {
    setFormDetails(formDetails.filter((_, i) => i !== idx));
  };

  const buildPreviewProduct = (): Product => {
    const categoryLabelMap = {
      vala: 'Vala / Bangles',
      kolus: 'Kolus (Anklets)',
      mala_necklace: 'Mala & Necklaces',
      earrings: 'Earrings'
    };

    return {
      id: formId || 'preview-manual-id',
      name: formName.trim() || 'Traditional Jewelry Sample',
      tamilName: formTamilName.trim() || undefined,
      category: formCategory,
      categoryLabel: categoryLabelMap[formCategory],
      variety: formVariety.trim() || 'Temple Model',
      price: Number(formPrice) || 850,
      originalPrice: Number(formOriginalPrice) || 1200,
      images: formImages.length > 0 ? formImages : ['https://images.unsplash.com/photo-1611591437281-460bfbe15763?w=800&auto=format&fit=crop&q=80'],
      description: formDescription.trim() || 'Premium quality copper base, certified 24ct gold microfilm cladding. Indistinguishable from solid gold, built to last up to a year, and can be repolished to shine beautifully for another year.',
      details: formDetails,
      isBestSeller: formIsBestSeller,
      isNewArrival: formIsNewArrival,
      isCustomizable: formIsCustomizable,
      material: formMaterial,
      rating: editingProduct ? editingProduct.rating : 4.9,
      reviewsCount: editingProduct ? editingProduct.reviewsCount : 80,
      stockCount: Number(formStockCount),
      sizes: formSizes,
      arrivalDate: formArrivalDate || undefined
    };
  };

  const handleSave = () => {
    const reportError = (msg: string) => {
      setValidationError(msg);
      setTimeout(() => {
        const container = document.getElementById('admin-form-container');
        if (container) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    };

    setValidationError('');
    if (!formId.trim()) {
      reportError('Product Unique ID is required.');
      return;
    }
    if (isAddingNew && products.some((p) => p.id === formId)) {
      reportError(`The Product Unique ID "${formId}" is already registered. Please choose a different unique ID.`);
      return;
    }
    if (!formName.trim()) {
      reportError('Product Title is required.');
      return;
    }
    if (!formVariety.trim()) {
      reportError('Ornament variety or sub-type cannot be empty.');
      return;
    }
    if (formPrice <= 0) {
      reportError('Please specify an Offer Price higher than 0.');
      return;
    }
    if (formOriginalPrice <= 0) {
      reportError('Please specify an Original Price higher than 0.');
      return;
    }
    if (formOriginalPrice < formPrice) {
      reportError('Original Price should be greater than or equal to the Offer Price.');
      return;
    }

    setIsSaving(true);
    const updatedProduct: Product = buildPreviewProduct();

    let nextProductsList: Product[] = [];
    if (isAddingNew) {
      nextProductsList = [updatedProduct, ...products];
    } else {
      nextProductsList = products.map((p) => p.id === formId ? updatedProduct : p);
    }

    // High durability simulated database synchronization
    setTimeout(() => {
      onUpdateProducts(nextProductsList);
      setSavedProductConfirmation(updatedProduct);
      setIsSaving(false);
      setIsAddingNew(false);
      setEditingProduct(null);
      setValidationError('');
    }, 1200);
  };

  const handleDeleteProduct = (productId: string) => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteProduct = () => {
    const nextProductsList = products.filter((p) => p.id !== formId);
    onUpdateProducts(nextProductsList);
    setIsAddingNew(false);
    setEditingProduct(null);
    setShowDeleteConfirm(false);
    setValidationError('');
  };

  const filteredDashboardProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(dashboardSearch.toLowerCase()) || 
                          p.variety.toLowerCase().includes(dashboardSearch.toLowerCase()) ||
                          p.id.toLowerCase().includes(dashboardSearch.toLowerCase());
    const matchesCategory = dashboardCategory === 'All' || p.category === dashboardCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-stone-950 text-stone-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
        
        {/* Header bar */}
        <div className="border-b border-stone-850 px-6 py-4 flex items-center justify-between bg-stone-900 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              {isAuthenticated ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </span>
            <div>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-amber-400">Simi's Admin Control Panel</h2>
              <p className="text-[10px] sm:text-xs text-stone-400">Add, edit or retire boutique gold covering items securely</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Gate Screen */}
        {!isAuthenticated ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-6">
            <div className="p-4 rounded-full bg-stone-850 border border-stone-800 inline-block">
              <Lock className="w-12 h-12 text-amber-500 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-serif font-black text-stone-100 italic">Authorized Entrance</h3>
              <p className="text-xs text-stone-400 font-light px-2 leading-relaxed">
                This portal is secured with administrator-only passcode checking. Please input your PIN code to unlock.
              </p>
            </div>

            <form onSubmit={handleVerifyPinSubmit} className="w-full space-y-4">
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter Passcode"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-950 text-stone-200 border border-stone-800 rounded-xl text-center font-mono text-sm tracking-widest focus:outline-none focus:border-amber-400 transition-colors"
                  required
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-400 font-mono italic leading-normal px-2 animate-shake">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={isVerifyingPin}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 text-xs font-black tracking-widest rounded-xl shadow-lg transition-transform active:scale-95 uppercase flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifyingPin ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking Passcode...</span>
                  </>
                ) : (
                  <>
                    <span>Unlock Portal</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Main authenticated Control Panel content */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Secures the Tab Switch selection header */}
            <div className="flex bg-stone-950 border-b border-stone-850 px-6 py-2 shrink-0 gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'catalog'
                    ? 'bg-amber-400 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                }`}
              >
                Catalog Manager
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('customers');
                  loadCustomers();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'customers'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                }`}
              >
                Users Management
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admins');
                  loadCustomers();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'admins'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                }`}
              >
                Admins Centre
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('orders');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-purple-600 text-white shadow-md font-extrabold shadow-purple-500/10'
                    : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Requests</span>
                </span>
                {orderRequests.some(r => r.status === 'pending') && (
                  <span className="bg-red-500 text-[10px] text-white px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                    {orderRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('security');
                  loadSecurityNotifications();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                }`}
              >
                <span>Security Notifications</span>
                {securityNotifications.some(n => n.banned) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-455 bg-rose-400 animate-ping" />
                )}
              </button>
            </div>

            {activeTab === 'orders' ? (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-stone-900/10">
                {/* 1. Left Hand Orders List */}
                <div className="w-full md:w-80 border-r border-stone-850 flex flex-col overflow-y-auto p-4 space-y-3 shrink-0">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-850">
                    <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest">
                      WhatsApp Orders ({orderRequests.length})
                    </span>
                    <span className="text-[9px] bg-purple-950/40 text-purple-400 font-mono font-bold px-2 py-0.5 rounded-full border border-purple-900/60 shrink-0">
                      Realtime Feed
                    </span>
                  </div>

                  {orderRequests.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                      <ShoppingBag className="w-10 h-10 text-stone-600 mb-2.5 animate-pulse" />
                      <p className="text-xs text-stone-400 italic">No WhatsApp orders logged yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {orderRequests.map((order) => {
                        const isPending = order.status === 'pending';
                        const isConfirmed = order.status === 'confirmed';
                        const isSelected = selectedOrder?.id === order.id;

                        return (
                          <button
                            type="button"
                            key={order.id}
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsEditingOrder(false);
                            }}
                            className={`w-full text-left p-3.5 rounded-xl border transition-all relative block cursor-pointer ${
                              isSelected
                                ? 'bg-purple-950/20 border-purple-500 shadow-lg shadow-purple-500/5'
                                : 'bg-stone-950/40 border-stone-850 hover:border-stone-800 hover:bg-stone-950/70'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5 gap-2">
                              <span className="text-[10px] font-mono font-bold text-stone-300">
                                {order.id}
                              </span>
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                                isPending
                                  ? 'bg-amber-950 text-amber-400 border border-amber-900/60'
                                  : isConfirmed
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/60'
                                  : 'bg-stone-900 text-stone-500 border border-stone-800'
                              }`}>
                                {order.status}
                              </span>
                            </div>

                            <h4 className="text-xs font-serif font-bold text-stone-200 line-clamp-1 mb-1">
                              {order.userName}
                            </h4>

                            <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono">
                              <span>
                                {order.items.reduce((sum, i) => sum + i.quantity, 0)} {order.items.reduce((sum, i) => sum + i.quantity, 0) === 1 ? 'item' : 'items'}
                              </span>
                              <span className="font-bold text-stone-300">
                                ₹{order.total.toLocaleString('en-IN')}
                              </span>
                            </div>

                            {/* Red blinking pulse for incoming unread orders */}
                            {isPending && (
                              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Right Hand Order Detail Panel */}
                <div className="flex-1 flex flex-col overflow-y-auto p-6 text-left relative bg-stone-900/20">
                  {selectedOrder ? (
                    <div className="max-w-xl mx-auto w-full space-y-5">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-850 pb-4 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-serif font-bold text-stone-100 uppercase tracking-wider">
                              Inquiry Action Hub
                            </h3>
                            <span className="font-mono text-xs text-stone-400 font-bold bg-stone-950 px-2 py-0.5 rounded border border-stone-850 shrink-0">
                              {selectedOrder.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 font-light flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-stone-500" />
                            Logged: {new Date(selectedOrder.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                            selectedOrder.status === 'pending'
                              ? 'bg-amber-954 bg-amber-950 text-amber-400 border border-amber-900/60 animate-pulse'
                              : selectedOrder.status === 'confirmed'
                              ? 'bg-emerald-954 bg-emerald-950/20 text-emerald-400 border border-emerald-900/40'
                              : 'bg-stone-900 text-stone-400 border border-stone-800'
                          }`}>
                            {selectedOrder.status}
                          </span>
                        </div>
                      </div>

                      {/* Customer Details info block */}
                      <div className="bg-stone-950/40 p-4 rounded-xl border border-stone-850 space-y-3 text-xs text-stone-300">
                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 border-b border-stone-850/40 pb-1.5 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Buyer Passport Details</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-stone-500 block mb-0.5 font-mono text-[10px] uppercase">Full Name</span>
                            <span className="font-semibold">{selectedOrder.userName}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block mb-0.5 font-mono text-[10px] uppercase">Contact Number</span>
                            <span>{selectedOrder.userPhone || 'Not Specified'}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block mb-0.5 font-mono text-[10px] uppercase">Email Address</span>
                            <span className="font-mono text-stone-200">{selectedOrder.userEmail || 'guest@simisgold.com'}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block mb-0.5 font-mono text-[10px] uppercase">User UID Code</span>
                            <span className="font-mono text-[10px] text-stone-400 line-clamp-1">{selectedOrder.userId || 'Guest Session'}</span>
                          </div>
                        </div>

                        {selectedOrder.address && (selectedOrder.address.address || selectedOrder.address.city) && (
                          <div className="mt-3 pt-3 border-t border-stone-850/40">
                            <span className="text-stone-500 block mb-1 font-mono text-[10px] uppercase">Shipping Destination</span>
                            <p className="font-light leading-relaxed text-stone-300">
                              {selectedOrder.address.address}, {selectedOrder.address.city}, {selectedOrder.address.district}, {selectedOrder.address.pincode}, {selectedOrder.address.state}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Items ledger with direct incremental edit controls */}
                      <div className="bg-stone-950/40 p-4 rounded-xl border border-stone-850 space-y-3.5">
                        <div className="flex items-center justify-between border-b border-stone-850/40 pb-1.5">
                          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5" />
                            <span>Enclosed Boutique Items</span>
                          </h4>
                          {selectedOrder.status === 'pending' && !isEditingOrder && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(selectedOrder)}
                              className="text-amber-400 hover:text-amber-300 text-[11px] font-bold border border-amber-900/60 bg-amber-950/40 px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Quantities</span>
                            </button>
                          )}
                        </div>

                        <div className="divide-y divide-stone-900">
                          {isEditingOrder ? (
                            editingItems.map((item) => (
                              <div key={item.productId} className="py-2.5 flex items-center justify-between gap-4">
                                <div className="text-left">
                                  <h5 className="text-xs font-bold text-stone-200">{item.name}</h5>
                                  <span className="text-[10px] text-stone-500 font-mono">
                                    Size: {item.selectedSize || 'Standard'} • Price: ₹{item.price}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateEditingQty(item.productId, -1)}
                                    className="w-7 h-7 bg-stone-900 hover:bg-stone-850 text-stone-300 rounded flex items-center justify-center font-bold font-mono transition-colors cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-mono font-extrabold text-amber-400 w-5 text-center">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateEditingQty(item.productId, 1)}
                                    className="w-7 h-7 bg-stone-900 hover:bg-stone-850 text-stone-300 rounded flex items-center justify-center font-bold font-mono transition-colors cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            selectedOrder.items.map((item) => (
                              <div key={item.productId} className="py-2 flex items-center justify-between text-xs">
                                <div>
                                  <h5 className="font-bold text-stone-200">{item.name}</h5>
                                  <span className="text-[10px] text-stone-500 font-mono">
                                    Size: {item.selectedSize || 'Standard'} • ₹{item.price} each
                                  </span>
                                </div>
                                <div className="text-right font-mono">
                                  <span className="text-stone-400 mr-2">Qty: {item.quantity}</span>
                                  <span className="text-stone-200 font-semibold">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Charges breakdown */}
                        <div className="pt-2 border-t border-stone-850/40 space-y-1.5 text-xs text-stone-400">
                          <div className="flex justify-between">
                            <span>Bag Subtotal</span>
                            <span className="font-mono text-stone-300">
                              ₹{(isEditingOrder ? editingItems.reduce((acc, i) => acc + (i.price * i.quantity), 0) : (selectedOrder.subtotal || selectedOrder.total)).toLocaleString('en-IN')}
                            </span>
                          </div>

                          {selectedOrder.discountVal !== undefined && selectedOrder.discountVal > 0 && (
                            <div className="flex justify-between text-red-400">
                              <span>Promo Coupon Value {selectedOrder.promoCode ? `(${selectedOrder.promoCode})` : ''}</span>
                              <span className="font-mono">-₹{(isEditingOrder ? Math.round(editingItems.reduce((acc, i) => acc + (i.price * i.quantity), 0) * ((selectedOrder.discountVal || 0) / (selectedOrder.subtotal || 1))) : selectedOrder.discountVal).toLocaleString('en-IN')}</span>
                            </div>
                          )}

                          {selectedOrder.shippingCost !== undefined && selectedOrder.shippingCost > 0 && (
                            <div className="flex justify-between">
                              <span>Shipping & Courier Cost</span>
                              <span className="font-mono text-stone-300">₹{selectedOrder.shippingCost}</span>
                            </div>
                          )}

                          <div className="flex justify-between text-xs font-bold text-stone-100 pt-2 border-t border-stone-900">
                            <span className="font-serif">Grand Settlement Total</span>
                            <span className="font-mono text-amber-400 leading-none text-sm">
                              ₹{(isEditingOrder
                                ? (editingItems.reduce((acc, i) => acc + (i.price * i.quantity), 0) - Math.round(editingItems.reduce((acc, i) => acc + (i.price * i.quantity), 0) * ((selectedOrder.discountVal || 0) / (selectedOrder.subtotal || 1))) + (selectedOrder.shippingCost || 0))
                                : selectedOrder.total
                              ).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Main decision workflow buttons */}
                      {selectedOrder.status === 'pending' && (
                        <div className="flex flex-wrap gap-2.5 pt-2">
                          {isEditingOrder ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveAndConfirm(selectedOrder)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Save & Confirm Transaction</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsEditingOrder(false)}
                                className="bg-stone-800 hover:bg-stone-750 text-stone-300 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center transition-colors cursor-pointer"
                              >
                                <span>Cancel Editing</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleConfirmOrder(selectedOrder)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-3 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950/20 transition-all cursor-pointer"
                              >
                                <CheckCircle className="w-4.5 h-4.5 text-emerald-200 shrink-0" />
                                <span>Confirm Booking</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(selectedOrder.id)}
                                className="bg-stone-850 hover:bg-stone-805 hover:text-rose-400 text-stone-300 font-bold text-xs px-4 py-3 rounded-xl flex items-center transition-all cursor-pointer border border-stone-800 hover:border-rose-950/40"
                              >
                                <span>Cancel Inquiry</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {['confirmed', 'processing', 'dispatched', 'shipped'].includes(selectedOrder.status) && (
                        <div className="space-y-4">
                          <div className="bg-[#181126]/40 border border-amber-500/10 p-4 rounded-xl text-left space-y-3">
                            <div className="flex items-center gap-2 text-xs font-serif font-black text-amber-400">
                              <Package className="w-4 h-4" />
                              <span>ADMIN CONTROL: UPDATE ORDER WORKFLOW STATUS</span>
                            </div>
                            
                            <p className="text-[11px] text-stone-400 leading-relaxed font-light">
                              Authorize or progress the production state for this ornament. Triggers real-time alerts & chimes on the customer's device.
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await updateOrderRequestInFirestore(selectedOrder.id, { status: 'confirmed' });
                                    addToast(`Order ${selectedOrder.id} status set to Confirmed`, 'success');
                                  } catch (err: any) {
                                    addToast('Failed to update status: ' + err.message, 'error');
                                  }
                                }}
                                className={`py-2 px-2.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                  selectedOrder.status === 'confirmed'
                                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                                    : 'bg-stone-900 text-stone-400 hover:bg-stone-850 hover:text-white border border-stone-850'
                                }`}
                              >
                                ✓ Confirmed
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await updateOrderRequestInFirestore(selectedOrder.id, { status: 'processing' });
                                    addToast(`Order ${selectedOrder.id} status set to Processing`, 'success');
                                  } catch (err: any) {
                                    addToast('Failed to update status: ' + err.message, 'error');
                                  }
                                }}
                                className={`py-2 px-2.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                  selectedOrder.status === 'processing'
                                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40'
                                    : 'bg-stone-900 text-stone-400 hover:bg-stone-850 hover:text-white border border-stone-850'
                                }`}
                              >
                                🔨 Processing / Smithing
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await updateOrderRequestInFirestore(selectedOrder.id, { status: 'dispatched' });
                                    addToast(`Order ${selectedOrder.id} status set to Dispatched`, 'success');
                                  } catch (err: any) {
                                    addToast('Failed to update status: ' + err.message, 'error');
                                  }
                                }}
                                className={`py-2 px-2.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                  selectedOrder.status === 'dispatched'
                                    ? 'bg-amber-600/20 text-amber-405 border border-amber-500/40'
                                    : 'bg-stone-900 text-stone-400 hover:bg-stone-850 hover:text-white border border-stone-850'
                                }`}
                              >
                                📦 Dispatched
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await updateOrderRequestInFirestore(selectedOrder.id, { status: 'shipped' });
                                    addToast(`Order ${selectedOrder.id} status set to Shipped`, 'success');
                                  } catch (err: any) {
                                    addToast('Failed to update status: ' + err.message, 'error');
                                  }
                                }}
                                className={`py-2 px-2.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                  selectedOrder.status === 'shipped'
                                    ? 'bg-teal-600/20 text-teal-400 border border-teal-500/40'
                                    : 'bg-stone-900 text-stone-400 hover:bg-stone-850 hover:text-white border border-stone-850'
                                }`}
                              >
                                🚚 Shipped / Delivered
                              </button>
                            </div>

                            {/* Info card block for clarity */}
                            <div className="mt-2.5 p-3 rounded-lg bg-stone-900/60 border border-stone-850 text-[11px] text-stone-400">
                              {selectedOrder.status === 'confirmed' && (
                                <span>Authorized order. Next step: Hammer and smith the metals by setting status to <strong>Processing / Smithing</strong>.</span>
                              )}
                              {selectedOrder.status === 'processing' && (
                                <span>Currently in goldsmithing workshop. Next step: Package and label the ornaments by selecting <strong>Dispatched</strong>.</span>
                              )}
                              {selectedOrder.status === 'dispatched' && (
                                <span>Ornament packed and prepared for carriage. Next step: Deliver to logistic transporters by selecting <strong>Shipped / Delivered</strong>.</span>
                              )}
                              {selectedOrder.status === 'shipped' && (
                                <span className="text-emerald-400 font-medium font-serif">✨ Package successfully delivered to the customer and transaction closed in style.</span>
                              )}
                            </div>

                            {/* WhatsApp Request Order State Progression flow requested by customer */}
                            <div className="mt-3.5 pt-3.5 border-t border-stone-850 space-y-3">
                              <div className="flex items-center gap-2 text-xs font-serif font-black text-amber-400">
                                <MessageCircle className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                                <span>CUSTOMER WHATSAPP STATE: <span className="font-mono text-emerald-450 text-emerald-400">{selectedOrder.orderState || 'Order Recieved'}</span></span>
                              </div>
                              
                              <p className="text-[11px] text-stone-400 leading-relaxed font-light">
                                Progress the Direct customer-facing WhatsApp Order Pipeline. Shows up directly on user's order dashboard.
                              </p>

                              <div className="flex flex-wrap gap-2 pt-1">
                                {(!selectedOrder.orderState || selectedOrder.orderState === 'Preparing for dispatch' || selectedOrder.orderState === 'Order Recieved') && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await updateOrderRequestInFirestore(selectedOrder.id, { 
                                          orderState: 'Ready for delivery' 
                                        });
                                        addToast(`Updated order WhatsApp status to "Ready for delivery"!`, 'success');
                                      } catch (err: any) {
                                        addToast('Failed to update stage: ' + err.message, 'error');
                                      }
                                    }}
                                    className="py-2 px-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white border border-amber-500 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-md"
                                  >
                                    🚀 Ready to Ship (Set: Ready for delivery)
                                  </button>
                                )}

                                {selectedOrder.orderState === 'Ready for delivery' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await updateOrderRequestInFirestore(selectedOrder.id, { 
                                          orderState: 'shipped',
                                          status: 'shipped'
                                        });
                                        addToast(`Updated order WhatsApp status to "shipped"!`, 'success');
                                      } catch (err: any) {
                                        addToast('Failed to update stage: ' + err.message, 'error');
                                      }
                                    }}
                                    className="py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border border-emerald-500 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-md"
                                  >
                                    🚚 Ship Order (Set: shipped)
                                  </button>
                                )}

                                {selectedOrder.orderState === 'shipped' && (
                                  <span className="text-[11px] text-emerald-400 font-mono font-bold bg-emerald-950/20 px-2.5 py-1 rounded-md border border-emerald-900/40">
                                    ✓ Fully Processed & Shipped to customer
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedOrder.status === 'cancelled' && (
                        <div className="bg-stone-950/40 border border-stone-850 p-3.5 rounded-xl flex items-start gap-2.5 text-left">
                          <AlertCircle className="w-4.5 h-4.5 text-stone-500 shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-relaxed">
                            <p className="font-bold text-stone-400 mb-0.5">Order Request Cancelled</p>
                            <span className="text-stone-500 block font-light">
                              Inquiry cancelled. Database states untouched.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                      <MessageCircle className="w-12 h-14 text-stone-700 mb-3 stroke-1 animate-pulse" />
                      <h3 className="text-sm font-serif font-bold text-stone-400 mb-1 leading-tight">
                        WhatsApp Booking Inquiries
                      </h3>
                      <p className="text-xs text-stone-500 max-w-xs font-light">
                        Select any listing from the left real-time queue sidebar to verify catalog quantities, totals, addresses, and process transactions.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'security' ? (
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-stone-900/40 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-serif font-bold text-stone-200 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      Security Notifications Trail
                    </h3>
                    <p className="text-xs text-stone-400 font-light">Audit ledger logging incorrect credentials and blacklist locks</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadSecurityNotifications}
                    disabled={isLoadingLogs}
                    className="bg-stone-950 border border-stone-850 text-stone-300 hover:text-amber-400 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                    <span>Refresh logs</span>
                  </button>
                </div>

                {isLoadingLogs ? (
                  <div className="text-center py-24 space-y-3">
                    <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
                    <p className="text-xs text-stone-500 font-mono">Querying security ledger docs...</p>
                  </div>
                ) : securityNotifications.length === 0 ? (
                  <div className="text-center py-20 bg-stone-950/20 rounded-2xl border border-dashed border-stone-800">
                    <p className="text-xs text-stone-500 italic uppercase tracking-wider font-mono text-left">No security notifications recorded inside Firestore.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 text-left">
                    {securityNotifications.map((notif: any) => {
                      const dateFormatted = new Date(notif.timestamp).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      });
                      
                      return (
                        <div 
                          key={notif.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            notif.banned 
                              ? 'bg-rose-950/10 border-rose-900/30' 
                              : 'bg-stone-950/45 border-stone-850 hover:bg-stone-900/20'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="font-mono text-xs font-black text-rose-400">{notif.ip}</span>
                                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                                  notif.banned 
                                    ? 'bg-rose-955 bg-rose-950 text-rose-300 border-rose-800/40' 
                                    : 'bg-stone-900 text-stone-400 border-stone-800'
                                }`}>
                                  {notif.banned ? '🔴 Banned IP' : '⚠️ Failure Alert'}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-stone-200">{notif.type}</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 pt-1.5 text-[11px] text-stone-400 font-light font-mono text-left">
                                <div><span className="text-stone-600">Location:</span> {notif.location || 'Unknown location'}</div>
                                <div><span className="text-stone-600">Device:</span> {notif.device || 'Generic Machine'}</div>
                                <div><span className="text-stone-600">Timestamp:</span> {dateFormatted}</div>
                                <div><span className="text-stone-600">Notification ID:</span> <span className="text-stone-500 font-mono">{notif.id}</span></div>
                              </div>
                            </div>

                            {notif.banned && (
                              <button
                                type="button"
                                onClick={() => setUnbanConfirmIp(notif.ip)}
                                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase px-4 py-2 rounded-xl transition-all shadow-md flex items-center justify-center gap-1 shrink-0 cursor-pointer active:scale-95"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Unban Address</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeTab === 'customers' ? (
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-stone-900/40 relative text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-850 pb-4">
                  <div>
                    <h3 className="text-base font-serif font-bold text-stone-200 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                      Users Management
                    </h3>
                    <p className="text-xs text-stone-400 font-light">Interactive directory of registered accounts, including total orders, shipping default coordinates, checkouts, and review logs.</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadCustomers}
                    disabled={isLoadingCustomers}
                    className="bg-stone-950 border border-stone-850 text-stone-300 hover:text-amber-400 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer w-fit"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCustomers ? 'animate-spin' : ''}`} />
                    <span>Refresh Users</span>
                  </button>
                </div>

                {isLoadingCustomers ? (
                  <div className="text-center py-24 space-y-3">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto animate-pulse" />
                    <p className="text-xs text-stone-500 font-mono">Querying user database files...</p>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-20 bg-stone-950/20 rounded-2xl border border-dashed border-stone-800">
                    <p className="text-xs text-stone-500 italic uppercase tracking-wider font-mono">No users registered on the platform yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Modern Grid/List layout designed specifically for [name, mailid, orders, show profile] */}
                    <div className="hidden md:block overflow-hidden rounded-2xl border border-stone-850 bg-stone-950/25">
                      <table className="w-full text-left border-collapse font-sans text-xs">
                        <thead>
                          <tr className="border-b border-stone-850 bg-stone-950/50 text-stone-400 font-mono text-[10px] uppercase tracking-wider">
                            <th className="px-5 py-3">Name</th>
                            <th className="px-5 py-3">Mail ID</th>
                            <th className="px-5 py-3 text-center">Admin Status</th>
                            <th className="px-5 py-3">Orders</th>
                            <th className="px-5 py-3 text-right">Profile</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-850">
                          {customers.map((userSnap: any) => {
                            const isExpanded = expandedUserUid === userSnap.uid;
                            const ordersCount = userSnap.purchases?.length || 0;
                            const purchaseTotal = userSnap.purchases?.reduce((acc: number, curr: any) => acc + (curr.total || 0), 0) || 0;
                            const isUserAdmin = userSnap.role === 'admin' || userSnap.isAdmin === true;

                            return (
                              <React.Fragment key={userSnap.uid}>
                                <tr className={`hover:bg-stone-900/40 transition-colors ${isExpanded ? 'bg-stone-950/50' : ''}`}>
                                  <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2">
                                      <span className="p-1.5 bg-amber-500/5 text-amber-500 rounded-full border border-amber-500/20 text-[10px] font-bold font-mono w-6 h-6 flex items-center justify-center">
                                        {userSnap.displayName ? userSnap.displayName.charAt(0).toUpperCase() : (userSnap.email || 'U').charAt(0).toUpperCase()}
                                      </span>
                                      <div className="min-w-0">
                                        <div className="font-semibold text-stone-200 flex items-center gap-1.5">
                                          <span>{userSnap.displayName || 'Unnamed User'}</span>
                                          {isUserAdmin && (
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                              Admin
                                            </span>
                                          )}
                                        </div>
                                        {userSnap.phone && (
                                          <div className="text-[9.5px] text-stone-500 font-mono">{userSnap.phone}</div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-stone-300 font-mono text-[11px]">
                                    {userSnap.email}
                                  </td>
                                  <td className="px-5 py-3.5 text-center">
                                    {isUserAdmin ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold uppercase text-[9px] font-mono">
                                        🛡️ Yes (Admin)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-400 uppercase text-[9px] font-mono">
                                        👤 No (Customer)
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5">
                                    <div className="font-mono text-stone-300">
                                      <span className="font-bold text-amber-500">{ordersCount}</span> {ordersCount === 1 ? 'order' : 'orders'}
                                    </div>
                                    <div className="text-[9.5px] text-stone-500 font-mono">Total Value: ₹{purchaseTotal}</div>
                                  </td>
                                  <td className="px-5 py-3.5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setExpandedUserUid(isExpanded ? null : userSnap.uid)}
                                        className={`px-3 py-1.5 font-mono text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                          isExpanded 
                                            ? 'bg-amber-400 text-stone-950 hover:bg-amber-300' 
                                            : 'bg-stone-850 hover:bg-stone-800 text-stone-300'
                                        }`}
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>{isExpanded ? 'Hide Profile' : 'Show Profile'}</span>
                                      </button>

                                      {/* Quick Make Admin toggle mini menu */}
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuUserId(activeMenuUserId === userSnap.uid ? null : userSnap.uid);
                                          }}
                                          className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 bg-stone-950 rounded-lg border border-stone-850 transition-all cursor-pointer"
                                          title="User Options"
                                        >
                                          <MoreVertical className="w-3.5 h-3.5" />
                                        </button>

                                        {activeMenuUserId === userSnap.uid && (
                                          <div className="absolute right-0 mt-1 w-40 rounded-xl bg-stone-950 border border-stone-800 shadow-xl z-50 py-1 overflow-hidden font-mono text-[10px]">
                                            <button
                                              type="button"
                                              onClick={() => handleMakeAdmin(userSnap.uid, !isUserAdmin)}
                                              disabled={isUpdatingRole === userSnap.uid}
                                              className="w-full text-left px-3 py-2 text-stone-200 hover:bg-stone-900 transition-colors flex items-center gap-1.5 disabled:opacity-50 font-bold"
                                            >
                                              <Shield className="w-3.5 h-3.5 text-emerald-400" />
                                              <span>{isUpdatingRole === userSnap.uid ? 'Updating...' : (isUserAdmin ? 'Remove Admin' : 'Make Admin')}</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={4} className="bg-stone-950/60 px-6 py-4 border-b border-stone-850">
                                      {/* Profile Details Area */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left text-xs text-stone-300">
                                        {/* Address block */}
                                        <div className="bg-stone-900/60 p-4 rounded-xl border border-stone-800/80 space-y-2">
                                          <h5 className="text-[10px] font-mono font-bold uppercase text-stone-500 tracking-wider flex items-center gap-1">
                                            <span>🏠 Default Shipping Address</span>
                                          </h5>
                                          {userSnap.defaultAddress?.address ? (
                                            <div className="space-y-1 font-sans leading-relaxed text-stone-300">
                                              <p className="font-semibold text-stone-200">{userSnap.defaultAddress.address}</p>
                                              <p>{userSnap.defaultAddress.city}, {userSnap.defaultAddress.district}</p>
                                              <p>{userSnap.defaultAddress.state} - <span className="font-mono text-amber-500 font-bold">{userSnap.defaultAddress.pincode}</span></p>
                                            </div>
                                          ) : (
                                            <p className="text-stone-550 italic text-[11px] font-mono">No delivery address saved yet.</p>
                                          )}
                                        </div>

                                        {/* Feedback / reviews block */}
                                        <div className="bg-stone-900/60 p-4 rounded-xl border border-stone-800/80 space-y-2">
                                          <h5 className="text-[10px] font-mono font-bold uppercase text-stone-500 tracking-wider">🌟 Client Reviews ({userSnap.reviews?.length || 0})</h5>
                                          {(!userSnap.reviews || userSnap.reviews.length === 0) ? (
                                            <p className="text-stone-550 italic text-[11px] font-mono">No reviews posted by this client.</p>
                                          ) : (
                                            <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                                              {userSnap.reviews.map((rev: any) => (
                                                <div key={rev.id} className="bg-stone-950/50 p-2.5 rounded-lg border border-stone-850/60 text-[11px] space-y-1">
                                                  <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-stone-300">💍 {rev.productName}</span>
                                                    <span className="text-[10px] text-stone-500 font-mono">{new Date(rev.date).toLocaleDateString()}</span>
                                                  </div>
                                                  <p className="text-stone-400 italic">"{rev.comment}"</p>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        {/* Orders Block */}
                                        <div className="col-span-1 md:col-span-2 bg-stone-900/60 p-4 rounded-xl border border-stone-800/80 space-y-2">
                                          <h5 className="text-[10px] font-mono font-bold uppercase text-stone-500 tracking-wider">🛍️ Order & Booking History ({ordersCount})</h5>
                                          {ordersCount === 0 ? (
                                            <p className="text-stone-550 italic text-[11px] font-mono">No WhatsApp bookings recorded in profile logs yet.</p>
                                          ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-1">
                                              {userSnap.purchases.map((ord: any) => (
                                                <div key={ord.id} className="bg-stone-950/50 p-3 rounded-xl border border-stone-850/60 space-y-2">
                                                  <div className="flex justify-between font-mono text-[10px] text-stone-500 border-b border-stone-805 pb-1 border-stone-800">
                                                    <span className="font-bold text-stone-300">{ord.id}</span>
                                                    <span>{new Date(ord.date).toLocaleDateString()}</span>
                                                  </div>
                                                  <div className="text-[11px] space-y-1 text-stone-300">
                                                    {ord.items?.map((it: any, itIdx: number) => (
                                                      <div key={itIdx} className="flex justify-between items-center">
                                                        <span>• {it.name} <span className="text-stone-500">x{it.quantity}</span></span>
                                                        <span className="font-mono text-amber-500/90">₹{it.price * it.quantity}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                  <div className="text-right font-mono text-[10.5px] text-amber-400 font-bold border-t border-stone-800/40 pt-1">
                                                    Total: ₹{ord.total}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile/Responsive View (cards) */}
                    <div className="md:hidden space-y-3.5">
                      {customers.map((userSnap: any) => {
                        const isExpanded = expandedUserUid === userSnap.uid;
                        const ordersCount = userSnap.purchases?.length || 0;
                        const purchaseTotal = userSnap.purchases?.reduce((acc: number, curr: any) => acc + (curr.total || 0), 0) || 0;
                        const isUserAdmin = userSnap.role === 'admin' || userSnap.isAdmin === true;

                        return (
                          <div 
                            key={userSnap.uid} 
                            className={`bg-stone-950/40 border border-stone-850 rounded-2xl p-4 space-y-3 transition-colors ${
                              isExpanded ? 'border-amber-500/20 bg-stone-950/80' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex items-center gap-2">
                                <span className="p-1.5 bg-amber-500/5 text-amber-500 rounded-full border border-amber-500/20 text-[10px] font-bold font-mono w-6.5 h-6.5 flex items-center justify-center">
                                  {userSnap.displayName ? userSnap.displayName.charAt(0).toUpperCase() : (userSnap.email || 'U').charAt(0).toUpperCase()}
                                </span>
                                <div>
                                  <div className="font-bold text-stone-200 flex items-center gap-1.5 flex-wrap">
                                    <span>{userSnap.displayName || 'Unnamed User'}</span>
                                    {isUserAdmin ? (
                                      <span className="text-[7.5px] font-bold px-1.5 py-0.5 rounded-full uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                        Admin
                                      </span>
                                    ) : (
                                      <span className="text-[7.5px] font-bold px-1.5 py-0.5 rounded-full uppercase bg-stone-900 text-stone-400 border border-stone-800">
                                        Customer
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-stone-400 font-mono truncate max-w-[170px]">{userSnap.email}</div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setExpandedUserUid(isExpanded ? null : userSnap.uid)}
                                className={`px-2.5 py-1.5 font-mono text-[9px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                  isExpanded 
                                    ? 'bg-amber-400 text-stone-950' 
                                    : 'bg-stone-850 text-stone-300'
                                }`}
                              >
                                {isExpanded ? 'Hide' : 'Show Profile'}
                              </button>
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-mono text-stone-400 bg-stone-900/60 p-2 rounded-xl border border-stone-850/40">
                              <div>Role: <strong className={isUserAdmin ? "text-rose-400" : "text-stone-400"}>{isUserAdmin ? 'ADMIN' : 'USER'}</strong></div>
                              <div>Orders: <strong className="text-amber-400">{ordersCount}</strong></div>
                              <div>Total Val: <strong className="text-emerald-400">₹{purchaseTotal}</strong></div>
                            </div>

                            {/* Mobile Expanded Sections */}
                            {isExpanded && (
                              <div className="pt-3 border-t border-stone-850/60 space-y-4 text-xs">
                                {/* Shipping default address */}
                                <div className="space-y-1.5 text-left bg-stone-900/40 p-3 rounded-xl border border-stone-850/30">
                                  <p className="text-[9px] font-mono uppercase text-stone-500 font-bold">Shipping default address</p>
                                  {userSnap.defaultAddress?.address ? (
                                    <div className="text-stone-300 leading-relaxed font-sans text-[11.5px]">
                                      <p className="font-semibold text-stone-200">{userSnap.defaultAddress.address}</p>
                                      <p>{userSnap.defaultAddress.city}, {userSnap.defaultAddress.district}</p>
                                      <p>{userSnap.defaultAddress.state} - <span className="font-mono text-amber-500 font-bold">{userSnap.defaultAddress.pincode}</span></p>
                                    </div>
                                  ) : (
                                    <p className="text-stone-500 italic text-[10.5px] font-mono">No default address saved yet.</p>
                                  )}
                                </div>

                                {/* Order summary */}
                                <div className="space-y-1.5 text-left bg-stone-900/40 p-3 rounded-xl border border-stone-850/30">
                                  <p className="text-[9px] font-mono uppercase text-stone-500 font-bold">Booking History ({ordersCount})</p>
                                  {ordersCount === 0 ? (
                                    <p className="text-stone-550 italic text-[10.5px] font-mono">Empty order history.</p>
                                  ) : (
                                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-0.5">
                                      {userSnap.purchases.map((ord: any) => (
                                        <div key={ord.id} className="bg-stone-950/40 p-2.5 rounded-lg border border-stone-850 space-y-1">
                                          <div className="flex justify-between text-[9px] font-mono text-stone-500">
                                            <span># {ord.id.substring(0, 10)}...</span>
                                            <span>{new Date(ord.date).toLocaleDateString()}</span>
                                          </div>
                                          <div className="text-[10px] text-stone-300 space-y-0.5">
                                            {ord.items?.map((it: any, i: number) => (
                                              <div key={i} className="flex justify-between">
                                                <span className="truncate max-w-[130px]">{it.name} x{it.quantity}</span>
                                                <span className="font-mono text-amber-500">₹{it.price * it.quantity}</span>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="text-right font-mono font-bold text-[10px] text-amber-400">Total: ₹{ord.total}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Review logs */}
                                <div className="space-y-1.5 text-left bg-stone-900/40 p-3 rounded-xl border border-stone-850/30">
                                  <p className="text-[9px] font-mono uppercase text-stone-500 font-bold">User Feedback/Reviews ({userSnap.reviews?.length || 0})</p>
                                  {(!userSnap.reviews || userSnap.reviews.length === 0) ? (
                                    <p className="text-stone-550 italic text-[10.5px] font-mono">No review logs.</p>
                                  ) : (
                                    <div className="space-y-2 max-h-[120px] overflow-y-auto pr-0.5">
                                      {userSnap.reviews.map((rev: any) => (
                                        <div key={rev.id} className="bg-stone-950/40 p-2.5 rounded-lg border border-stone-850 text-[10.5px] font-sans">
                                          <div className="flex justify-between font-bold text-stone-300">
                                            <span>💍 {rev.productName}</span>
                                            <span className="text-[9px] font-mono text-stone-500">{new Date(rev.date).toLocaleDateString()}</span>
                                          </div>
                                          <p className="text-stone-400 italic">"{rev.comment}"</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Admin privileges */}
                                <div className="pt-2 border-t border-stone-850/40 flex justify-between items-center">
                                  <span className="text-[10px] font-mono text-stone-400">Boutique Privileges:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleMakeAdmin(userSnap.uid, !isUserAdmin)}
                                    disabled={isUpdatingRole === userSnap.uid}
                                    className="px-3.5 py-1.5 bg-stone-950 hover:bg-stone-900 border border-stone-800 text-stone-300 font-mono text-[9.5px] font-bold rounded-lg cursor-pointer"
                                  >
                                    {isUpdatingRole === userSnap.uid ? 'Updating...' : (isUserAdmin ? 'Demote Admin' : 'Make Admin')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'admins' ? (
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-stone-900/40 relative text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-serif font-bold text-stone-200 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      Admins Centre
                    </h3>
                    <p className="text-xs text-stone-400 font-light">List of active store administrators. Admins bypass PIN gate authorization automatically when visiting.</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadCustomers}
                    disabled={isLoadingCustomers}
                    className="bg-stone-950 border border-stone-850 text-stone-300 hover:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer w-fit"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCustomers ? 'animate-spin' : ''}`} />
                    <span>Refresh Admins</span>
                  </button>
                </div>

                {isLoadingCustomers ? (
                  <div className="text-center py-24 space-y-3">
                    <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto animate-pulse" />
                    <p className="text-xs text-stone-500 font-mono">Querying database administrators...</p>
                  </div>
                ) : customers.filter(c => c.role === 'admin' || c.isAdmin).length === 0 ? (
                  <div className="text-center py-20 bg-stone-950/20 rounded-2xl border border-dashed border-stone-800">
                    <p className="text-xs text-stone-500 italic uppercase tracking-wider font-mono">No other administrators designated inside Firestore yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 text-left">
                    {customers.filter(c => c.role === 'admin' || c.isAdmin).map((custSnapshot: any) => {
                      const joinVal = custSnapshot.joinedAt ? new Date(custSnapshot.joinedAt).toLocaleDateString() : 'N/A';

                      return (
                        <div 
                          key={custSnapshot.uid}
                          className="bg-stone-950/45 border border-emerald-500/20 p-5 rounded-2xl space-y-4 hover:border-emerald-500/30 transition-all text-left"
                        >
                          {/* Top row: basic info */}
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-serif font-bold text-stone-200">{custSnapshot.displayName || 'Unnamed Admin'}</h4>
                                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                  System Admin
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-4 text-xs text-stone-400 font-mono mt-1">
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3.5 h-3.5 text-stone-500" />
                                  <span>{custSnapshot.email}</span>
                                </div>
                                {custSnapshot.phone && (
                                  <div className="flex items-center gap-1 text-emerald-400 font-bold">
                                    <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>{custSnapshot.phone}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-[11px] text-stone-500">
                                  <Key className="w-3.5 h-3.5 text-stone-605" />
                                  <span>UID: {custSnapshot.uid.substring(0, 8)}...</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                              <div className="text-right text-xs text-stone-400 font-mono bg-stone-900 px-3.5 py-1.5 rounded-lg border border-stone-800">
                                Designated Admin
                              </div>

                              {/* Admin Options Dropdown */}
                              <div className="relative">
                                <button
                                  type="button"
                                  id={`customerOptions-${custSnapshot.uid}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuUserId(activeMenuUserId === custSnapshot.uid ? null : custSnapshot.uid);
                                  }}
                                  className="p-1.5 text-stone-400 hover:text-emerald-400 hover:bg-stone-900 bg-stone-950 rounded-lg border border-stone-800 transition-all cursor-pointer"
                                  title="Admin Options"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {activeMenuUserId === custSnapshot.uid && (
                                  <div className="absolute right-0 mt-1 w-40 rounded-xl bg-stone-950 border border-stone-800 shadow-xl z-50 py-1 overflow-hidden font-mono text-[11px]">
                                    <button
                                      type="button"
                                      id={`removeAdmin-${custSnapshot.uid}`}
                                      onClick={() => handleMakeAdmin(custSnapshot.uid, false)}
                                      disabled={isUpdatingRole === custSnapshot.uid}
                                      className="w-full text-left px-3 py-2 text-rose-400 hover:bg-stone-900 transition-colors flex items-center gap-1.5 disabled:opacity-50 font-bold"
                                    >
                                      <Shield className="w-3.5 h-3.5 rotate-180" />
                                      <span>{isUpdatingRole === custSnapshot.uid ? 'Updating...' : 'Remove Admin'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Left list columns: Catalog list & Add triggers */}
            <div className="w-full md:w-1/2 border-r border-stone-850 p-6 overflow-y-auto flex flex-col space-y-4">
              
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shrink-0">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-400">
                  Item Register ({products.length})
                </span>
                <button
                  onClick={startAddNew}
                  className="bg-amber-400 hover:bg-amber-300 text-stone-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow transition-transform active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Product</span>
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-2.5 shrink-0">
                <input
                  type="text"
                  placeholder="Quick search ornaments..."
                  value={dashboardSearch}
                  onChange={(e) => setDashboardSearch(e.target.value)}
                  className="bg-stone-950 border border-stone-800 rounded-lg text-xs px-3 py-2 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-400"
                />
                
                <select
                  value={dashboardCategory}
                  onChange={(e) => setDashboardCategory(e.target.value)}
                  className="bg-stone-950 border border-stone-800 rounded-lg text-xs px-3 py-2 text-stone-300 focus:outline-none focus:border-amber-400"
                >
                  <option value="All">All Categories</option>
                  <option value="vala">Bangles / Vala</option>
                  <option value="kolus">Anklets / Kolus</option>
                  <option value="mala_necklace">Mala & Necklaces</option>
                  <option value="earrings">Earrings</option>
                </select>
              </div>

              {/* Dynamic products list view */}
              <div className="flex-1 space-y-2 max-h-[50vh] md:max-h-full overflow-y-auto">
                {filteredDashboardProducts.length === 0 ? (
                  <div className="text-center py-10 bg-stone-950/20 rounded-xl border border-dashed border-stone-800/80">
                    <p className="text-xs text-stone-500 italic">No matching products found in store catalog.</p>
                  </div>
                ) : (
                  filteredDashboardProducts.map((p) => (
                    <div 
                      key={p.id}
                      onClick={() => !isSaving && startEditProduct(p)}
                      className={`p-3 rounded-xl border flex gap-3 transition-all ${
                        isSaving 
                          ? 'opacity-50 cursor-not-allowed pointer-events-none' 
                          : 'cursor-pointer hover:bg-stone-850/50'
                      } ${editingProduct?.id === p.id ? 'bg-amber-400/5 ring-1 ring-amber-400/25 border-amber-400/30' : 'bg-stone-900/60 border-stone-850'}`}
                    >
                      <img 
                        src={p.images[0]} 
                        alt="Preview" 
                        className="w-12 h-12 rounded-lg object-cover bg-stone-950 border border-stone-800/60 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">{p.categoryLabel}</span>
                          <span className="text-[10px] font-mono text-stone-500">ID: {p.id}</span>
                        </div>
                        <h4 className="text-xs text-stone-150 font-bold truncate">{p.name}</h4>
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className="text-xs text-amber-400 font-bold font-mono">₹{p.price}</span>
                          <span className="text-[10px] text-stone-500 line-through font-mono">₹{p.originalPrice}</span>
                          <span className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded ${
                            p.stockCount === 0 
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-800/10' 
                              : p.stockCount <= 5 
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-800/10 animate-pulse' 
                                : 'bg-emerald-950/80 text-emerald-400 border border-emerald-850/10'
                          }`}>
                            Stk: {p.stockCount}
                          </span>
                          {p.isBestSeller && <span className="bg-amber-400/10 text-amber-500 text-[8px] font-serif px-1.5 rounded uppercase font-bold">Best Seller</span>}
                          {p.isNewArrival && <span className="bg-red-950 text-red-400 text-[8px] font-serif px-1.5 rounded uppercase font-bold">New</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right details editor columns */}
            <div id="admin-form-container" className="w-full md:w-1/2 p-6 bg-stone-950 overflow-y-auto flex flex-col space-y-6">
              
              {!editingProduct && !isAddingNew ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="p-4 rounded-full bg-stone-900 border border-stone-850 text-stone-500">
                    <Edit3 className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-serif font-bold text-stone-300">Select a jewelry card to edit</h4>
                  <p className="text-xs text-stone-500 font-light max-w-xs">
                    Choose from the register left to change descriptions, add slide photos, update pricing guidelines, or click "+ Add New Product" to create from scratch.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-850">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <h3 className="font-serif font-bold text-base text-stone-200">
                        {isAddingNew ? 'Create New Jewelry' : `Edit Product Card`}
                      </h3>
                    </div>
                    
                    {!isAddingNew && (
                      <button
                        onClick={() => handleDeleteProduct(formId)}
                        className="text-stone-500 hover:text-red-400 p-1.5 rounded hover:bg-stone-900 transition-colors"
                        title="Delete this entire card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {validationError && (
                    <div className="p-3 bg-red-950/70 border border-red-800/40 text-red-200 text-xs rounded-xl flex items-start gap-2 animate-fadeIn">
                      <span className="text-red-400 font-bold shrink-0 mt-0.5">⚠️</span>
                      <div className="flex-1">
                        <p className="font-semibold text-stone-100 mb-0.5">Validation Error</p>
                        <p className="text-red-300/90 text-[11px] leading-normal">{validationError}</p>
                      </div>
                    </div>
                  )}

                  {/* Core Form */}
                  <div className="space-y-4">
                    
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1 font-mono">Product Unique ID</label>
                        <input
                          type="text"
                          value={formId}
                          onChange={(e) => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                          disabled={!isAddingNew}
                          className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-850 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-400 disabled:opacity-45"
                          placeholder="e.g. vala-12"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1 font-mono">Jewelry Category</label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value as any)}
                          className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-850 rounded-lg text-xs focus:outline-none focus:border-amber-400"
                        >
                          <option value="vala">Bangles / Vala</option>
                          <option value="kolus">Anklets / Kolus</option>
                          <option value="mala_necklace">Mala & Necklaces</option>
                          <option value="earrings">Earrings</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1 font-mono">Product Title (English)</label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-850 rounded-lg text-xs focus:outline-none focus:border-amber-400"
                        placeholder="Exquisite Broad Kemp Bangle"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1 font-mono">Alternative Subtitle (Optional)</label>
                      <input
                        type="text"
                        value={formTamilName}
                        onChange={(e) => setFormTamilName(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-850 rounded-lg text-xs placeholder-stone-600 focus:outline-none focus:border-amber-400"
                        placeholder="e.g. Royal Temple Vala"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1 font-mono">Variety / Sub-type</label>
                        <input
                          type="text"
                          value={formVariety}
                          onChange={(e) => setFormVariety(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-850 rounded-lg text-xs placeholder-stone-600 focus:outline-none focus:border-amber-400"
                          placeholder="e.g. Jimmiki, Stud, Temple Vala"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1 font-mono">Core Base material</label>
                        <select
                          value={formMaterial}
                          onChange={(e) => setFormMaterial(e.target.value as any)}
                          className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-850 rounded-lg text-xs focus:outline-none focus:border-amber-400"
                        >
                          <option value="gold_covering">Gold Covering (Copper Base)</option>
                          <option value="gold_covering_on_silver">Gold Covering on Silver Base</option>
                          <option value="silver">Pure Silver 92.5</option>
                          <option value="white_gold">White Gold Clad</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1 font-mono">Offer Price (₹)</label>
                        <input
                          type="number"
                          value={formPrice}
                          onChange={(e) => setFormPrice(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-850 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1 font-mono">Original Price (₹)</label>
                        <input
                          type="number"
                          value={formOriginalPrice}
                          onChange={(e) => setFormOriginalPrice(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-850 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1 font-mono">Available Stock</label>
                        <input
                          type="number"
                          value={formStockCount}
                          onChange={(e) => setFormStockCount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-850 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1 font-mono">Description Summary</label>
                      <textarea
                        rows={3}
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-900 text-stone-200 border border-stone-850 rounded-lg text-xs placeholder-stone-600 focus:outline-none focus:border-amber-400"
                        placeholder="Provide details about polishing, visual details, and copper base attributes."
                      />
                    </div>

                    {/* Sizing Bubbles and Fits */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wider font-mono">
                          Editable Sizing Bubbles ({formSizes.length})
                        </label>
                        <span className="text-[9px] text-stone-500 italic">Drag cards or use arrows to arrange</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 p-2.5 bg-stone-950 rounded-lg border border-stone-850/80 min-h-12 items-center">
                        {formSizes.length === 0 ? (
                          <span className="text-[10px] text-stone-600 italic">No custom sizes set. Default category fits will apply.</span>
                        ) : (
                          formSizes.map((sz, idx) => (
                            <div
                              key={idx}
                              draggable
                              onDragStart={(e) => handleDragStart(e, idx, 'size')}
                              onDragOver={(e) => handleDragOver(e, idx, 'size')}
                              onDrop={(e) => handleDrop(e, idx, 'size')}
                              onDragEnd={() => { setDraggedIndex(null); setDraggedType(null); }}
                              className={`flex items-center gap-1 px-2.5 py-1 bg-stone-900 border border-stone-800 rounded-md text-[11px] select-none cursor-grab active:cursor-grabbing transition-colors hover:border-amber-400/40 relative group ${draggedIndex === idx && draggedType === 'size' ? 'opacity-30 border-dashed border-amber-400' : ''}`}
                            >
                              <span className="text-[10px] text-stone-600 font-mono select-none">::</span>
                              <span className="font-mono text-stone-300 font-semibold">{sz}</span>
                              
                              <div className="flex items-center gap-0.5 ml-1.5 border-l border-stone-800 pl-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleMoveSize(idx, idx - 1)}
                                  disabled={idx === 0}
                                  className="text-[9px] text-stone-400 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-stone-400 px-0.5"
                                  title="Move Left"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveSize(idx, idx + 1)}
                                  disabled={idx === formSizes.length - 1}
                                  className="text-[9px] text-stone-400 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-stone-400 px-0.5"
                                  title="Move Right"
                                >
                                  ▼
                                </button>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => setFormSizes(formSizes.filter((_, i) => i !== idx))}
                                className="text-red-400 hover:text-red-300 font-bold ml-1 pl-1 border-l border-stone-800/60 leading-none select-none"
                                title="Remove size"
                              >
                                &times;
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 2.4, 2.6, 10 inches, or Free-size"
                          value={newSizeValue}
                          onChange={(e) => setNewSizeValue(e.target.value)}
                          className="flex-1 bg-stone-900 border border-stone-850 rounded-lg text-[11px] px-3 py-1.5 focus:outline-none placeholder-stone-650"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newSizeValue.trim()) {
                              setFormSizes([...formSizes, newSizeValue.trim()]);
                              setNewSizeValue('');
                            }
                          }}
                          className="bg-stone-850 hover:bg-stone-800 text-stone-200 px-3 py-1.5 rounded-lg text-xs border border-stone-750"
                        >
                          Add Size Bubble
                        </button>
                      </div>
                    </div>

                    {/* Image collection slideshow list */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wider font-mono">
                          Slideshow Image URLs ({formImages.length})
                        </label>
                        <span className="text-[9px] text-stone-500 italic">Drag rows or use arrows to change sequence</span>
                      </div>
                      
                      <div className="space-y-1.5 max-h-40 overflow-y-auto bg-stone-950 p-2.5 rounded-lg border border-stone-850/80">
                        {formImages.map((img, idx) => (
                          <div 
                            key={idx} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx, 'image')}
                            onDragOver={(e) => handleDragOver(e, idx, 'image')}
                            onDrop={(e) => handleDrop(e, idx, 'image')}
                            onDragEnd={() => { setDraggedIndex(null); setDraggedType(null); }}
                            className={`flex items-center justify-between gap-2 text-[10px] p-1.5 bg-stone-900 rounded border border-stone-850 select-none cursor-grab active:cursor-grabbing hover:border-amber-400/40 transition-colors ${draggedIndex === idx && draggedType === 'image' ? 'opacity-30 border-dashed border-amber-400' : ''}`}
                          >
                            <div className="flex items-center gap-2 truncate flex-1">
                              <span className="text-[10px] text-stone-600 font-mono select-none">::</span>
                              <span className="truncate text-stone-400 font-mono">{img}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1 border-r border-stone-800 pr-2">
                                <button
                                  type="button"
                                  onClick={() => handleMoveImage(idx, idx - 1)}
                                  disabled={idx === 0}
                                  className="text-[10px] text-stone-400 hover:text-amber-400 disabled:opacity-30 px-1 font-mono"
                                  title="Move Up"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveImage(idx, idx + 1)}
                                  disabled={idx === formImages.length - 1}
                                  className="text-[10px] text-stone-400 hover:text-amber-400 disabled:opacity-30 px-1 font-mono"
                                  title="Move Down"
                                >
                                  ▼
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleImageRemove(idx)}
                                className="text-red-400 hover:text-red-300 font-bold px-1"
                              >
                                &times;
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-2.5">
                        <input
                          type="text"
                          placeholder="Paste absolute Unsplash image URL..."
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                          className="flex-1 bg-stone-900 border border-stone-850 rounded-lg text-[11px] px-3 py-1.5 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleImageAppend}
                          className="bg-stone-850 hover:bg-stone-800 text-stone-200 px-3 py-1.5 rounded-lg text-xs border border-stone-750"
                        >
                          Append Link
                        </button>
                      </div>
                    </div>

                    {/* Spec Bullet specifications list */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wider font-mono">
                          Bullet Specifications ({formDetails.length})
                        </label>
                        <span className="text-[9px] text-stone-500 italic">Drag rows or use arrows to change sequence</span>
                      </div>
                      
                      <div className="space-y-1.5 max-h-40 overflow-y-auto bg-stone-950 p-2.5 rounded-lg border border-stone-850/80">
                        {formDetails.map((det, idx) => (
                          <div 
                            key={idx} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx, 'detail')}
                            onDragOver={(e) => handleDragOver(e, idx, 'detail')}
                            onDrop={(e) => handleDrop(e, idx, 'detail')}
                            onDragEnd={() => { setDraggedIndex(null); setDraggedType(null); }}
                            className={`flex items-center justify-between gap-2 text-[11px] p-1.5 bg-stone-900 rounded border border-stone-850 select-none cursor-grab active:cursor-grabbing hover:border-amber-400/40 transition-colors ${draggedIndex === idx && draggedType === 'detail' ? 'opacity-30 border-dashed border-amber-400' : ''}`}
                          >
                            <div className="flex items-center gap-2 truncate flex-1">
                              <span className="text-[10px] text-stone-600 font-mono select-none">::</span>
                              <span className="truncate text-stone-300">{det}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1 border-r border-stone-800 pr-2">
                                <button
                                  type="button"
                                  onClick={() => handleMoveDetail(idx, idx - 1)}
                                  disabled={idx === 0}
                                  className="text-[10px] text-stone-400 hover:text-amber-400 disabled:opacity-30 px-1 font-mono"
                                  title="Move Up"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveDetail(idx, idx + 1)}
                                  disabled={idx === formDetails.length - 1}
                                  className="text-[10px] text-stone-400 hover:text-amber-400 disabled:opacity-30 px-1 font-mono"
                                  title="Move Down"
                                >
                                  ▼
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDetailRemove(idx)}
                                className="text-red-400 hover:text-red-300 font-bold px-1"
                              >
                                &times;
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-2.5">
                        <input
                          type="text"
                          placeholder="Add detail bullet point specification..."
                          value={newDetailPoint}
                          onChange={(e) => setNewDetailPoint(e.target.value)}
                          className="flex-1 bg-stone-900 border border-stone-850 rounded-lg text-[11px] px-3 py-1.5 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleDetailAppend}
                          className="bg-stone-850 hover:bg-stone-800 text-stone-200 px-3 py-1.5 rounded-lg text-xs border border-stone-750"
                        >
                          Add Spec
                        </button>
                      </div>
                    </div>

                    {/* Flags System */}
                    <div className="bg-stone-900 rounded-xl p-3 border border-stone-850/60 grid grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 cursor-pointer self-center">
                        <input
                          type="checkbox"
                          checked={formIsBestSeller}
                          onChange={(e) => setFormIsBestSeller(e.target.checked)}
                          className="rounded text-amber-500 bg-stone-950 border-stone-800 focus:ring-0"
                        />
                        <span className="text-[10px] text-stone-300 font-semibold font-mono">Best Seller</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer self-center">
                        <input
                          type="checkbox"
                          checked={formIsNewArrival}
                          onChange={(e) => setFormIsNewArrival(e.target.checked)}
                          className="rounded text-amber-500 bg-stone-950 border-stone-800 focus:ring-0"
                        />
                        <span className="text-[10px] text-stone-300 font-semibold font-mono">New Arrival</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer self-center">
                        <input
                          type="checkbox"
                          checked={formIsCustomizable}
                          onChange={(e) => setFormIsCustomizable(e.target.checked)}
                          className="rounded text-amber-500 bg-stone-950 border-stone-800 focus:ring-0"
                        />
                        <span className="text-[10px] text-stone-300 font-semibold font-mono">Customizable</span>
                      </label>
                    </div>

                    {/* Date of Arrival Option */}
                    <div className="space-y-2 bg-stone-900 rounded-xl p-3 border border-stone-850/60">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold text-stone-300 uppercase tracking-wider font-mono">
                          Date of Arrival
                        </label>
                        <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold">
                          {formArrivalDate || 'Not Set'}
                        </span>
                      </div>
                      <input
                        type="date"
                        value={formArrivalDate}
                        onChange={(e) => setFormArrivalDate(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-800 rounded-lg text-xs px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                      />
                      <p className="text-[10px] text-stone-500 leading-normal">
                        Determines listing ordering inside newest arrival sliders and collections. Newer dates appear first!
                      </p>
                    </div>

                  </div>

                  {/* Actions Bar */}
                  <div className="flex gap-3 pt-4 border-t border-stone-850">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setIsAddingNew(false);
                        setEditingProduct(null);
                        setValidationError('');
                        setShowDeleteConfirm(false);
                      }}
                      className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-bold rounded-xl border border-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        const tempProduct = buildPreviewProduct();
                        setPreviewProduct(tempProduct);
                      }}
                      className="px-4 py-2.5 bg-stone-800 hover:bg-stone-750 text-amber-400 text-xs font-bold rounded-xl border border-stone-700 flex items-center justify-center gap-1.5 transition-transform active:scale-98 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSave}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md ${
                        isSaving 
                          ? 'bg-amber-400/50 text-stone-900 cursor-not-allowed opacity-80' 
                          : 'bg-amber-400 hover:bg-amber-300 text-stone-950 active:scale-[0.98]'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Saving Jewelry...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Jewelry Card</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Unban dialog container overlay */}
        {unbanConfirmIp && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-left">
              <h4 className="text-sm font-serif font-black text-stone-100 uppercase tracking-wider">LIFT ACCESS LOCK</h4>
              <p className="text-xs text-stone-400 leading-relaxed font-light">
                Are you absolutely sure you want to lift the access freeze on IP block <strong className="text-stone-300 font-mono">{unbanConfirmIp}</strong>? This computer will immediately retrieve full store clearance.
              </p>
              <div className="flex justify-end gap-2.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setUnbanConfirmIp(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-stone-400 hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUnbanIp(unbanConfirmIp)}
                  className="px-4 py-1.5 bg-rose-605 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-transform active:scale-95 shadow-md cursor-pointer"
                >
                  Confirm Unban
                </button>
              </div>
            </div>
          </div>
        )}

          </div>
        )}
      </div>

      {/* 5. Live Preview Modal Overlay */}
      <AnimatePresence>
        {previewProduct && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-[0_30px_90px_rgba(0,0,0,0.95)] max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-850">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-serif font-black text-xs text-stone-100 uppercase tracking-widest">Live Ornament Card Preview</span>
                </div>
                <button
                  onClick={() => setPreviewProduct(null)}
                  className="bg-stone-800 hover:bg-stone-750 text-stone-400 hover:text-stone-200 p-1.5 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 flex flex-col justify-center items-center">
                <div className="text-center">
                  <span className="text-[10px] text-amber-500 font-mono font-bold tracking-widest uppercase">Visual Preview on Storefront</span>
                  <p className="text-[11px] text-stone-400">This is exactly how visitors will see this card in search catalogs</p>
                </div>

                {/* Simulated product card display */}
                <div className="w-60">
                  <ProductCard product={previewProduct} onSelect={(p) => {
                    console.log("Interactive detail modal selection preview:", p);
                  }} />
                </div>
                
                <div className="bg-stone-950 p-4 rounded-xl border border-stone-850/60 w-full space-y-2 text-xs">
                  <p className="font-bold text-stone-250 uppercase tracking-wider text-[10px] font-mono">Simulated Specifications & Sizes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {previewProduct.sizes && previewProduct.sizes.length > 0 ? (
                      previewProduct.sizes.map((sz) => (
                        <span key={sz} className="px-2 py-0.5 bg-stone-900 border border-stone-800 text-[10px] font-mono text-stone-400 rounded">
                          {sz}
                        </span>
                      ))
                    ) : (
                      <span className="text-stone-500 italic text-[10px]">Standard Category Sizes</span>
                    )}
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-stone-400 text-[10px]">
                    {previewProduct.details.slice(0, 3).map((det, i) => (
                      <li key={i} className="truncate">{det}</li>
                    ))}
                    {previewProduct.details.length > 3 && <li>+ {previewProduct.details.length - 3} more specs</li>}
                  </ul>
                </div>
              </div>

              {/* Close Button */}
              <div className="px-6 py-4 bg-stone-950 border-t border-stone-850 flex gap-3">
                <button
                  onClick={() => setPreviewProduct(null)}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold rounded-xl shadow-md transition-colors"
                >
                  Back to Editing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Deletion Confirmation Modal Overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-500">
                <span className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <Trash2 className="w-5 h-5" />
                </span>
                <h4 className="font-serif font-black text-xs uppercase tracking-wider text-stone-100">Confirm Deletion</h4>
              </div>
              
              <div className="space-y-1.5">
                <p className="text-xs text-stone-200 leading-normal">
                  Are you absolutely sure you want to permanently delete <strong className="text-stone-100">"{formName || 'this item'}"</strong>?
                </p>
                <p className="text-[11px] text-stone-500 leading-normal">
                  This action cannot be undone, and the item will be permanently wiped from Simi's available catalog listing.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-bold rounded-xl border border-stone-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteProduct}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-650 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-950/40"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Success Saved Confirmation Modal Overlay */}
      <AnimatePresence>
        {savedProductConfirmation && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-stone-950/95 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-[0_35px_80px_rgba(0,0,0,0.95)]"
            >
              {/* Header decor */}
              <div className="relative h-2.5 bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-600" />
              
              <div className="p-6 md:p-8 space-y-6 text-center flex flex-col items-center">
                
                {/* Check circle & Sparkles */}
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-ping duration-[3000ms]" />
                  <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 relative">
                    <Check className="w-8 h-8" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-serif font-black text-lg md:text-xl text-stone-100 uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-stone-50 to-stone-300">
                    Ornament Added Live!
                  </h3>
                  <p className="text-xs text-stone-400 leading-normal max-w-xs">
                    This jewelry card has been successfully indexed. Visitors of Simi's boutique can now view, customize, or add it to their bag.
                  </p>
                </div>

                {/* Micro preview block */}
                <div className="w-full bg-stone-950/40 p-4 rounded-2xl border border-stone-850 flex flex-col items-center space-y-3 relative">
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 text-[9px] font-mono font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    ✨ Added to Storefront
                  </span>
                  
                  {/* Embedded high fidelity preview card */}
                  <div className="w-56 pt-2">
                    <ProductCard product={savedProductConfirmation} onSelect={() => {}} />
                  </div>
                  
                  <div className="text-[11px] font-mono text-stone-500 text-center space-y-0.5 w-full">
                    <p className="truncate text-stone-300 font-bold">{savedProductConfirmation.name}</p>
                    <p>ID: {savedProductConfirmation.id} | Price: ₹{savedProductConfirmation.price}</p>
                  </div>
                </div>

                {/* Subtext actions */}
                <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSavedProductConfirmation(null);
                      startAddNew();
                    }}
                    className="flex-1 py-3 bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-500" />
                    <span>Create Another</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSavedProductConfirmation(null);
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-450 text-stone-950 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Done & Dismiss</span>
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
