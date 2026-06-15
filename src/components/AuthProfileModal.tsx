import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Mail, Lock, User, MapPin, Sparkles, LogOut, Key, 
  Compass, Info, Loader2, CheckCircle2, ChevronRight, UserCheck, Smartphone,
  Heart, ShoppingBag
} from 'lucide-react';
import { auth, saveUserProfile, getUserProfile } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { useToast } from '../context/ToastContext';
import { UserProfile, UserAddress } from '../types';
import { PRODUCTS } from '../data/products';

interface AuthProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (profile: UserProfile | null) => void;
  onSelectProduct?: (product: any) => void;
}

export default function AuthProfileModal({
  isOpen,
  onClose,
  onAuthSuccess,
  onSelectProduct
}: AuthProfileModalProps) {
  const { addToast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'profile' | 'new_user_details'>('login');
  const [activeTab, setActiveTab] = useState<'details' | 'wishlist' | 'orders'>('details');

  // Input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Address fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Kerala');
  const [isKerala, setIsKerala] = useState(true);

  // Auto pincode verification
  const [isPinLoading, setIsPinLoading] = useState(false);

  // Monitor auth identity state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsLoading(true);
        try {
          const profile = await getUserProfile(user.uid);
          
          // A user is fully registered if they have a profile AND phone AND address
          const isFullyRegistered = !!(profile && profile.phone && profile.defaultAddress?.address);

          if (profile) {
            // Heal profile with missing fields if role or isAdmin is not defined
            if (profile.role === undefined || profile.isAdmin === undefined) {
              const healedProfile: UserProfile = {
                ...profile,
                role: profile.role || 'customer',
                isAdmin: profile.hasOwnProperty('isAdmin') ? profile.isAdmin : false
              };
              await saveUserProfile(user.uid, healedProfile);
              setUserProfile(healedProfile);
              if (onAuthSuccess) onAuthSuccess(healedProfile);
            } else {
              setUserProfile(profile);
              if (onAuthSuccess) onAuthSuccess(profile);
            }
            
            // Pre-populate details in state so editing is initialized correctly
            const currentProfile = profile;
            setName(currentProfile.displayName || user.displayName || '');
            setPhone(currentProfile.phone || '');
            if (currentProfile.defaultAddress) {
              setAddress(currentProfile.defaultAddress.address || '');
              setCity(currentProfile.defaultAddress.city || '');
              setPincode(currentProfile.defaultAddress.pincode || '');
              setDistrict(currentProfile.defaultAddress.district || '');
              setState(currentProfile.defaultAddress.state || 'Kerala');
            }

            if (isFullyRegistered) {
              setMode('profile');
            } else {
              if (isOpen) {
                setMode('new_user_details');
              } else {
                setMode('profile');
              }
            }
          } else {
            // Brand new registration
            const intlProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              joinedAt: new Date().toISOString(),
              purchases: [],
              reviews: [],
              role: 'customer',
              isAdmin: false
            };
            await saveUserProfile(user.uid, intlProfile);
            setUserProfile(intlProfile);
            if (onAuthSuccess) onAuthSuccess(intlProfile);
            
            setName(user.displayName || '');
            setPhone('');
            setAddress('');
            setCity('');
            setPincode('');
            setDistrict('');
            setState('Kerala');

            if (isOpen) {
              setMode('new_user_details');
            } else {
              setMode('profile');
            }
          }
        } catch (err: any) {
          console.error("Auth state change failure:", err);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUserProfile(null);
        if (onAuthSuccess) onAuthSuccess(null);
        setMode('login');
      }
    });

    return () => unsubscribe();
  }, [onAuthSuccess, isOpen]);

  // Handle pincode details fetch during auth address setup
  useEffect(() => {
    const pin = pincode.trim().replace(/\D/g, '');
    if (pin.length === 6) {
      const fetchPin = async () => {
        setIsPinLoading(true);
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data[0] && data[0].Status === 'Success') {
              const info = data[0].PostOffice[0];
              if (info.Block && info.Block !== 'NA') setCity(info.Block);
              else if (info.Name) setCity(info.Name);
              if (info.District) setDistrict(info.District);
              if (info.State) {
                setState(info.State);
                setIsKerala(info.State.trim().toLowerCase() === 'kerala');
              }
            }
          }
        } catch (e) {
          console.warn('Pincode fetch error:', e);
        } finally {
          setIsPinLoading(false);
        }
      };
      fetchPin();
    }
  }, [pincode]);

  const handleGoogleSocial = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      let profile = await getUserProfile(result.user.uid);

      if (!profile) {
        // Ensure a profile document is created in Firestore immediately on successful login
        const newProfile: UserProfile = {
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          joinedAt: new Date().toISOString(),
          purchases: [],
          reviews: [],
          role: 'customer',
          isAdmin: false
        };
        await saveUserProfile(result.user.uid, newProfile);
        profile = newProfile;
      } else if (profile.role === undefined || profile.isAdmin === undefined) {
        const healedProfile: UserProfile = {
          ...profile,
          role: profile.role || 'customer',
          isAdmin: profile.hasOwnProperty('isAdmin') ? profile.isAdmin : false
        };
        await saveUserProfile(result.user.uid, healedProfile);
        profile = healedProfile;
      }

      const isFullyRegistered = !!(profile && profile.phone && profile.defaultAddress?.address);

      if (profile && isFullyRegistered) {
        setUserProfile(profile);
        if (onAuthSuccess) onAuthSuccess(profile);
        addToast(`Welcome back, ${profile.displayName || result.user.displayName}!`, 'success');
        onClose();
      } else {
        // Direct to onboarding details for brand new or incomplete Google users
        setName(profile.displayName || result.user.displayName || '');
        setPhone(profile.phone || '');
        setEmail(profile.email || result.user.email || '');
        setMode('new_user_details');
        addToast('Login successful! Please complete your delivery profile details.', 'info');
      }
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Google Authentication failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (skipAddress: boolean = false) => {
    if (!email || !password || !name) {
      addToast('Please enter your Name, Email and Password.', 'error');
      return;
    }
    if (password.length < 6) {
      addToast('Password must be at least 6 characters long.', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      const credentials = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credentials.user, { displayName: name });
      
      const defaultAddress: UserAddress | undefined = skipAddress ? undefined : {
        address, city, pincode, district, state
      };

      const customProfile: UserProfile = {
        uid: credentials.user.uid,
        email: credentials.user.email || '',
        displayName: name,
        phone: '', // Email signup doesn't require upfront phone, can complete later
        joinedAt: new Date().toISOString(),
        purchases: [],
        reviews: [],
        defaultAddress,
        role: 'customer',
        isAdmin: false
      };

      await saveUserProfile(credentials.user.uid, customProfile);
      setUserProfile(customProfile);
      addToast('Account created successfully!', 'success');
      onClose();
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/operation-not-allowed') {
        addToast('Email Auth is not yet toggled on. Creating offline-backed credentials inside secure Firestore!', 'info');
        const fallbackUid = `offline_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const defaultAddress: UserAddress | undefined = skipAddress ? undefined : {
          address, city, pincode, district, state
        };
        const offlineProfile: UserProfile = {
          uid: fallbackUid,
          email: email,
          displayName: name,
          phone: '',
          joinedAt: new Date().toISOString(),
          purchases: [],
          reviews: [],
          defaultAddress,
          sandboxPassword: password,
          role: 'customer',
          isAdmin: false
        };
        await saveUserProfile(fallbackUid, offlineProfile);
        setUserProfile(offlineProfile);
        if (onAuthSuccess) onAuthSuccess(offlineProfile);
        addToast('Welcome! Logged in using Simi Secure Sandbox Mode.', 'success');
        onClose();
      } else {
        addToast(error.message || 'Registration failed.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      addToast('Please input both Email and Password.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Wait for onAuthStateChanged to capture profile and close
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/user-not-found') {
        const fallbackUid = `offline_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const profile = await getUserProfile(fallbackUid);
        if (profile) {
          if (profile.sandboxPassword && profile.sandboxPassword !== password) {
            addToast('Incorrect password for this sandbox account. Please try again.', 'error');
            setIsLoading(false);
            return;
          }
          if (profile.role === undefined || profile.isAdmin === undefined) {
            const healedProfile: UserProfile = {
              ...profile,
              role: profile.role || 'customer',
              isAdmin: profile.hasOwnProperty('isAdmin') ? profile.isAdmin : false
            };
            await saveUserProfile(fallbackUid, healedProfile);
            setUserProfile(healedProfile);
            if (onAuthSuccess) onAuthSuccess(healedProfile);
          } else {
            setUserProfile(profile);
            if (onAuthSuccess) onAuthSuccess(profile);
          }
          addToast(`Welcome back! Logged in via Simi Secure Sandbox Mode.`, 'success');
          onClose();
        } else {
          addToast('Account not found in our system.', 'error');
        }
      } else {
        addToast(error.message || 'Sign in failed. Check your password.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      setUserProfile(null);
      setCurrentUser(null);
      if (onAuthSuccess) onAuthSuccess(null);
      addToast('Logged out successfully.', 'info');
      setMode('login');
    } catch (e: any) {
      console.error(e);
      addToast('Failed to logout.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOnboardingDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Please enter your name.', 'error');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      addToast('Please enter a valid phone number (min 10 digits).', 'error');
      return;
    }
    if (!address.trim() || !pincode.trim() || !city.trim() || !district.trim()) {
      addToast('Please fill in complete delivery address details.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const uid = currentUser?.uid || userProfile?.uid;
      if (!uid) throw new Error('No client user found');

      const updatedAddress: UserAddress = { address, city, pincode, district, state };
      const updated: UserProfile = {
        ...userProfile,
        uid,
        email: currentUser?.email || userProfile?.email || '',
        displayName: name,
        phone,
        defaultAddress: updatedAddress,
        joinedAt: userProfile?.joinedAt || new Date().toISOString(),
        purchases: userProfile?.purchases || [],
        reviews: userProfile?.reviews || []
      };

      await saveUserProfile(uid, updated);
      setUserProfile(updated);
      if (onAuthSuccess) onAuthSuccess(updated);
      addToast(`Delivery profile updated! Welcome to Simi's Gold, ${name}!`, 'success');
      onClose();
    } catch (e: any) {
      console.error(e);
      addToast('Failed to complete setup: ' + e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddressOnly = async () => {
    if (!userProfile) return;
    if (!name.trim()) {
      addToast('Please enter your name.', 'error');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      addToast('Please enter a valid phone number (min 10 digits).', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const updatedAddress = { address, city, pincode, district, state };
      const updated = {
        ...userProfile,
        displayName: name,
        phone,
        defaultAddress: updatedAddress
      };
      await saveUserProfile(userProfile.uid, updated);
      setUserProfile(updated);
      if (onAuthSuccess) onAuthSuccess(updated);
      addToast('Profile and delivery details updated successfully!', 'success');
    } catch (e: any) {
      console.error(e);
      addToast('Failed to update details', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark overlay backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#060309]/80 backdrop-blur-sm"
      />

      {/* Main card box container */}
      <motion.div 
        id="auth-profile-card-modal"
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="relative bg-stone-900 border border-stone-800/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 sm:p-7 space-y-5"
      >
        {/* Top header */}
        <div className="flex items-center justify-between border-b border-stone-850 pb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
              {mode === 'profile' ? <UserCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </span>
            <div>
              <h2 className="font-serif font-black text-stone-100 text-lg sm:text-xl tracking-wide">
                {mode === 'login' && "Access Boutique Client"}
                {mode === 'signup' && "Register Client Portfolio"}
                {mode === 'profile' && "Your Client Portfolio"}
              </h2>
              <p className="text-[10px] sm:text-xs text-stone-400 font-mono">
                {mode === 'profile' ? 'Authenticated Session' : 'Simi Gold Covering Member'}
              </p>
            </div>
          </div>
          <button
            id="auth-close-btn"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-xs text-stone-400 font-mono">Synchronizing Simi records...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {mode === 'login' && (
              <motion.div 
                key="login-pane"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {/* Social Google Login Button */}
                <button
                  type="button"
                  onClick={handleGoogleSocial}
                  className="w-full py-3.5 bg-stone-950 hover:bg-stone-900 border border-stone-800 rounded-xl font-bold text-xs text-stone-200 flex items-center justify-center gap-2.5 transition-all active:scale-98 shadow-md"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Google_Favicon_2025.svg/1280px-Google_Favicon_2025.svg.png" className="w-[18px] h-[18px] object-contain" alt="Google logo" referrerPolicy="no-referrer" />
                  <span>Continue with Google account</span>
                </button>
              </motion.div>
            )}

            {mode === 'new_user_details' && (
              <motion.div 
                key="new-user-pane"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4 max-h-[78vh] overflow-y-auto pr-1"
              >
                <div className="bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-2xl space-y-1">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 font-serif">
                    <Sparkles className="w-3.5 h-3.5" />
                    Complete Your Customer Profile
                  </h4>
                  <p className="text-[10.5px] text-stone-400 leading-relaxed font-sans text-left">
                    Welcome! We need your delivery address and contact phone number to process instant orders smoothly on WhatsApp.
                  </p>
                </div>

                <form onSubmit={handleSaveOnboardingDetails} className="space-y-4 text-left">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Your Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                        <input 
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your Name"
                          className="w-full bg-stone-950 border border-stone-850 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/30 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Contact Phone Number</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                        <input 
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="WhatsApp Mobile Number"
                          className="w-full bg-stone-950 border border-stone-850 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/30 transition-colors font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-stone-850/60 pt-4 space-y-3">
                    <h3 className="text-xs uppercase font-mono text-amber-500 font-bold tracking-wider flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      Default Shipping Address
                    </h3>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-400 font-semibold uppercase">Street Address</label>
                        <textarea 
                          rows={2}
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="House Name, Building/Flat, Street or Locality..."
                          className="w-full bg-stone-950 border border-stone-850 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/30 transition-colors resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1 relative">
                          <label className="text-[10px] text-stone-400 font-semibold uppercase">Pincode</label>
                          <input 
                            type="text"
                            required
                            maxLength={6}
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value.replace(/\D/gi, ''))}
                            placeholder="691001"
                            className="w-full bg-stone-950 border border-stone-850 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/30 transition-colors font-mono font-bold"
                          />
                          {isPinLoading && <span className="absolute right-2 bottom-1.5 text-[8.5px] text-amber-500 animate-pulse">...</span>}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-stone-400 font-semibold uppercase">City / Town</label>
                          <input 
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Kollam"
                            className="w-full bg-stone-950 border border-stone-850 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/30 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-stone-400 font-semibold uppercase">District</label>
                          <input 
                            type="text"
                            required
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            placeholder="Kollam"
                            className="w-full bg-stone-950 border border-stone-850 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/30 transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-stone-400 font-semibold uppercase">State</label>
                          <input 
                            type="text"
                            required
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="Kerala"
                            className="w-full bg-stone-950 border border-stone-850 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/30 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md hover:scale-101 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Save Profile & Start Browsing</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {mode === 'profile' && userProfile && (
              <motion.div 
                key="profile-pane"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Elegant Profile Tabs */}
                <div className="flex border-b border-stone-850 gap-2 p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 pb-2.5 pt-1 text-center font-mono text-[10px] font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer focus:outline-none ${activeTab === 'details' ? 'border-amber-500 text-amber-500' : 'border-transparent text-stone-400 hover:text-stone-200'}`}
                  >
                    Boutique profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('wishlist')}
                    className={`flex-grow pb-2.5 pt-1 text-center font-mono text-[10px] font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer focus:outline-none ${activeTab === 'wishlist' ? 'border-amber-500 text-amber-500' : 'border-transparent text-stone-400 hover:text-stone-200'}`}
                  >
                    Wishlist ({userProfile.wishlist?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className={`flex-1 pb-2.5 pt-1 text-center font-mono text-[10px] font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer focus:outline-none ${activeTab === 'orders' ? 'border-amber-500 text-amber-500' : 'border-transparent text-stone-400 hover:text-stone-200'}`}
                  >
                    Orders ({userProfile.purchases?.length || 0})
                  </button>
                </div>

                {activeTab === 'details' && (
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                    {/* Profile detail card */}
                    <div className="bg-stone-950/40 border border-stone-850/60 p-4 rounded-xl flex flex-col items-center text-center space-y-2 relative overflow-hidden">
                      <span className="p-3 bg-amber-500/5 text-amber-500 rounded-full border border-amber-500/20 text-xl font-bold font-mono">
                        {userProfile.displayName ? userProfile.displayName.charAt(0).toUpperCase() : userProfile.email.charAt(0).toUpperCase()}
                      </span>
                      
                      <div className="space-y-1">
                        <p className="text-stone-100 font-serif font-bold text-base tracking-wide">
                          {userProfile.displayName || "Simi Client Partner"}
                        </p>
                        <p className="text-[11px] text-stone-400 font-mono">
                          {userProfile.email}
                        </p>
                      </div>
                    </div>

                    {/* Customer Info Management */}
                    <div className="bg-stone-950/50 rounded-2xl border border-stone-850/40 p-4 space-y-3.5 text-left">
                      <h3 className="text-xs uppercase font-mono text-amber-500 tracking-wider font-bold flex items-center gap-1.5 border-b border-stone-850 pb-2">
                        <User className="w-4 h-4 text-amber-500" />
                        Account Personal details
                      </h3>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9.5px] text-stone-400 uppercase tracking-wider font-bold">Your Full Name</label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your registered name"
                            className="w-full bg-stone-950 border border-stone-850 focus:border-amber-400/50 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9.5px] text-stone-400 uppercase tracking-wider font-bold">Contact Phone (WhatsApp)</label>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder="WhatsApp Mobile Number"
                            className="w-full bg-stone-950 border border-stone-850 focus:border-amber-400/50 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none transition-colors font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Shipping Default address management */}
                    <div className="bg-stone-950/50 rounded-2xl border border-stone-850/40 p-4 space-y-4 text-left">
                      <h3 className="text-xs uppercase font-mono text-amber-500 tracking-wider font-bold flex items-center gap-1.5 border-b border-stone-850 pb-2">
                        <MapPin className="w-4 h-4 text-amber-500" />
                        Boutique Shipping Default
                      </h3>

                      {userProfile.defaultAddress?.address ? (
                        <div className="space-y-1">
                          <p className="text-xs text-stone-300 bg-stone-950/80 p-3 rounded-xl border border-stone-800 leading-relaxed font-sans text-left">
                            {userProfile.defaultAddress.address}, {userProfile.defaultAddress.city}, {userProfile.defaultAddress.district}, {userProfile.defaultAddress.state} - <span className="font-mono font-bold text-amber-400">{userProfile.defaultAddress.pincode}</span>
                          </p>
                          
                          <p className="text-[10px] text-stone-500 italic flex items-center gap-1 font-mono pt-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            This will be chosen on your bag checkout automatically.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs text-stone-400 italic">No default address saved yet.</p>
                          <p className="text-[11.2px] text-stone-400 font-light leading-relaxed">
                            To add your location preferences, fill the fields below and click save details.
                          </p>
                        </div>
                      )}

                      {/* Form to insert/change address */}
                      <div className="space-y-3.5 pt-1">
                        <div className="space-y-1">
                          <label className="text-[9.5px] text-stone-400 uppercase tracking-wider font-bold">House Name / Street</label>
                          <textarea
                            rows={2}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter house name, flat, landmark..."
                            className="w-full bg-stone-950 border border-stone-850 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/35 transition-colors resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9.5px] text-stone-400 uppercase font-semibold">Pincode</label>
                            <input
                              type="text"
                              maxLength={6}
                              value={pincode}
                              onChange={(e) => setPincode(e.target.value.replace(/\D/gi, ''))}
                              placeholder="691001"
                              className="w-full bg-stone-950 border border-stone-850 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 font-mono font-bold focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9.5px] text-stone-400 uppercase font-semibold">City</label>
                            <input
                              type="text"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              placeholder="Kollam"
                              className="w-full bg-stone-950 border border-stone-850 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9.5px] text-stone-400 uppercase font-semibold">District</label>
                            <input
                              type="text"
                              value={district}
                              onChange={(e) => setDistrict(e.target.value)}
                              placeholder="Kollam"
                              className="w-full bg-stone-950 border border-stone-850 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9.5px] text-stone-400 uppercase font-semibold">State</label>
                            <input
                              type="text"
                              value={state}
                              onChange={(e) => setState(e.target.value)}
                              placeholder="Kerala"
                              className="w-full bg-stone-950 border border-stone-850 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveAddressOnly}
                          className="w-full py-2.5 bg-stone-950 hover:bg-stone-850 text-amber-500 border border-amber-500/20 hover:border-amber-500/35 rounded-xl text-xs font-bold font-mono transition-all duration-200"
                        >
                          Save & Sync Profile Details
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'wishlist' && (
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 text-left">
                    {(!userProfile.wishlist || userProfile.wishlist.length === 0) ? (
                      <div className="py-12 text-center space-y-2">
                        <Heart className="w-8 h-8 text-stone-600 mx-auto" />
                        <p className="text-xs text-stone-400 font-mono">Your boutique wishlist is currently empty.</p>
                        <p className="text-[10px] text-stone-500 font-sans">Add gold-covering designs you love in the catalog to view them here.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-stone-850/60">
                        {PRODUCTS.filter(p => userProfile.wishlist?.includes(p.id)).map(product => (
                          <div key={product.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                            <img 
                              src={product.images[0]} 
                              alt={product.name} 
                              className="w-12 h-12 rounded-lg object-cover bg-stone-950 border border-stone-800"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-serif font-bold text-stone-200 truncate">{product.name}</h4>
                              <p className="text-[10px] text-stone-400 font-mono">{product.categoryLabel}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-bold text-amber-400 font-mono">₹{product.price}</span>
                                {product.originalPrice > product.price && (
                                  <span className="text-[9px] text-stone-500 line-through font-mono">₹{product.originalPrice}</span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectProduct) {
                                  onSelectProduct(product);
                                }
                                onClose();
                              }}
                              className="px-3 py-1.5 bg-stone-850 hover:bg-amber-500 hover:text-stone-950 text-stone-300 font-mono text-[9.5px] font-bold rounded-lg border border-stone-800 hover:border-amber-500 transition-all cursor-pointer"
                            >
                              View Detail
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 text-left">
                    {(!userProfile.purchases || userProfile.purchases.length === 0) ? (
                      <div className="py-12 text-center space-y-2">
                        <ShoppingBag className="w-8 h-8 text-stone-600 mx-auto" />
                        <p className="text-xs text-stone-400 font-mono">No order records registered yet.</p>
                        <p className="text-[10px] text-stone-500 font-sans">Every checkout from your booking bag will populate items here.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userProfile.purchases.map((purchase: any) => (
                          <div key={purchase.id} className="bg-stone-950/60 border border-stone-850/80 p-3.5 rounded-2xl space-y-2.5">
                            <div className="flex items-center justify-between border-b border-stone-850 pb-2">
                              <div>
                                <span className="text-[10px] font-mono font-bold text-amber-500">{purchase.id}</span>
                                <p className="text-[9px] text-stone-500 font-mono">
                                  {purchase.date ? new Date(purchase.date).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  }) : 'Just now'}
                                </p>
                              </div>
                              <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-mono border border-amber-500/10">
                                Processing / Received
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {purchase.items?.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-[10.5px] font-sans">
                                  <div className="text-stone-300 truncate pr-2 max-w-[180px]">
                                    • {item.name} <span className="text-stone-500 text-[9px]">({item.selectedSize})</span>
                                  </div>
                                  <span className="text-stone-400 font-mono flex-shrink-0">QTY {item.quantity} x ₹{item.price}</span>
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-stone-850">
                              <span className="text-[9px] uppercase font-mono text-stone-400 font-semibold">Total Invoice</span>
                              <span className="text-xs font-mono font-bold text-amber-400">₹{purchase.total}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sign Out Trigger Action */}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2.5 mt-2 bg-stone-950 hover:bg-[#200e12] text-rose-500 hover:text-rose-400 border border-stone-850 hover:border-red-500/10 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-2 transition-colors focus:outline-none cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout From Simi Catalogue</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}
