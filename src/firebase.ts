import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, doc, getDocs, setDoc, deleteDoc, getDocFromServer, onSnapshot, query, where, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Product, UserProfile, OrderRequest } from './types';
import { PRODUCTS } from './data/products';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to recursively clean undefined properties from an object before Firestore write
export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        cleaned[key] = cleanUndefined(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Validation helper for connecting to FireStore on boot
export async function testConnection() {
  const pathForTest = 'test/connection';
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Fetch products from FireStore
export async function fetchProductsFromFirestore(): Promise<Product[]> {
  const path = 'products';
  
  let isSeeded = false;
  try {
    // Check if we have already seeded before, to avoid re-seeding if the admin deleted everything on purpose
    const seededDoc = await getDocFromServer(doc(db, 'metadata', 'seeded'));
    isSeeded = seededDoc.exists();
  } catch (error) {
    console.warn("Could not read metadata/seeded tracking document:", error);
    // Suppress this error so we can still try to read the products list
  }

  try {
    const querySnapshot = await getDocs(collection(db, path));
    const items: Product[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push(docSnap.data() as Product);
    });
    
    // If empty AND has never been seeded before, seed from default PRODUCTS list!
    if (items.length === 0 && !isSeeded) {
      await seedDefaultProducts();
      try {
        await setDoc(doc(db, 'metadata', 'seeded'), { seeded: true });
      } catch (e) {
        console.warn("Failed to write metadata/seeded:", e);
      }
      return PRODUCTS;
    }
    
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Save or overwrite a single product
export async function saveProductToFirestore(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const cleaned = cleanUndefined(product);
    await setDoc(doc(db, 'products', product.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete a product from Firestore
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Helper to seed all default products
export async function seedDefaultProducts(): Promise<void> {
  for (const product of PRODUCTS) {
    await saveProductToFirestore(product);
  }
}

// Fetch user profile from Firestore
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const docSnap = await getDocFromServer(doc(db, 'users', uid));
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    // If it doesn't exist or is not authorized, we degrade gracefully without crash
    console.warn("User profile fetch failed/not found:", error);
    return null;
  }
}

// Save or update user profile with merge
export async function saveUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  const path = `users/${uid}`;
  try {
    const cleaned = cleanUndefined(profile);
    await setDoc(doc(db, 'users', uid), cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Create an order request in Firestore
export async function createOrderRequestInFirestore(order: OrderRequest): Promise<void> {
  const path = `order_requests/${order.id}`;
  try {
    const cleaned = cleanUndefined(order);
    await setDoc(doc(db, 'order_requests', order.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Update order request fields (e.g. status, items, total, etc.)
export async function updateOrderRequestInFirestore(orderId: string, updates: Partial<OrderRequest>): Promise<void> {
  const path = `order_requests/${orderId}`;
  try {
    const cleaned = cleanUndefined(updates);
    const orderDocRef = doc(db, 'order_requests', orderId);
    await setDoc(orderDocRef, { ...cleaned, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Fetch all order requests from Firestore for admins
export async function fetchOrderRequestsFromFirestore(): Promise<OrderRequest[]> {
  const path = 'order_requests';
  try {
    const querySnapshot = await getDocs(collection(db, 'order_requests'));
    const items: OrderRequest[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push(docSnap.data() as OrderRequest);
    });
    // Sort by createdAt descending
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Confirm order request: reduces inventory stock, appends to user's purchases array, and marks order request status as 'confirmed'
export async function confirmOrderRequestAndProcess(order: OrderRequest): Promise<void> {
  // 1. Reduce product stock count in Firestore
  for (const item of order.items) {
    try {
      const productRef = doc(db, 'products', item.productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const productData = productSnap.data() as Product;
        const currentStock = productData.stockCount || 0;
        const newStock = Math.max(0, currentStock - item.quantity);
        await setDoc(productRef, { stockCount: newStock }, { merge: true });
      }
    } catch (e) {
      console.error(`Failed to update stock count for product ${item.productId}:`, e);
    }
  }

  // 2. Append purchase record to the user profile if userId is valid and userProfile exists
  if (order.userId) {
    try {
      const userProfileSnap = await getDoc(doc(db, 'users', order.userId));
      if (userProfileSnap.exists()) {
        const userProfile = userProfileSnap.data() as UserProfile;
        const existingPurchases = userProfile.purchases || [];
        const newPurchase = {
          id: order.id,
          date: new Date().toISOString(),
          items: order.items.map(item => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            selectedSize: item.selectedSize || 'Standard'
          })),
          total: order.total
        };
        await setDoc(doc(db, 'users', order.userId), {
          purchases: [...existingPurchases, newPurchase]
        }, { merge: true });
      } else {
        // Fallback for offline or non-existent profile - let's create a stub profile if needed
        const newPurchase = {
          id: order.id,
          date: new Date().toISOString(),
          items: order.items.map(item => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            selectedSize: item.selectedSize || 'Standard'
          })),
          total: order.total
        };
        await setDoc(doc(db, 'users', order.userId), {
          uid: order.userId,
          email: order.userEmail || '',
          displayName: order.userName || 'Guest User',
          phone: order.userPhone || '',
          joinedAt: new Date().toISOString(),
          purchases: [newPurchase],
          role: 'customer',
          isAdmin: false
        }, { merge: true });
      }
    } catch (e) {
      console.error(`Failed to append purchase to user profile ${order.userId}:`, e);
    }
  }

  // 3. Mark order request as 'confirmed' alongside keeping items in sync and setting orderState to Preparing for dispatch
  await updateOrderRequestInFirestore(order.id, { 
    status: 'confirmed',
    orderState: 'Preparing for dispatch',
    orderItems: order.items
  });
}

// Persistent Guest User ID helper
export function getPersistentGuestUid(): string {
  if (typeof window === 'undefined') return 'offline_guest_server';
  let uid = localStorage.getItem('simi_guest_uid');
  if (!uid) {
    uid = 'offline_guest_' + Math.floor(100000 + Math.random() * 900000);
    localStorage.setItem('simi_guest_uid', uid);
  }
  return uid;
}

// Migrate any orders created while being a guest over to the logged-in user's profile
export async function migrateGuestOrdersToUser(userUid: string, userEmail: string, userName: string): Promise<void> {
  const guestUid = getPersistentGuestUid();
  if (guestUid === userUid) return;

  try {
    const q = query(collection(db, 'order_requests'), where('userId', '==', guestUid));
    const querySnapshot = await getDocs(q);

    for (const docSnap of querySnapshot.docs) {
      const orderId = docSnap.id;
      // Update the userId in order_requests to the newly logged in user
      await setDoc(doc(db, 'order_requests', orderId), {
        userId: userUid,
        userEmail: userEmail,
        userName: userName
      }, { merge: true });
      console.log(`Migrated guest order ${orderId} to user ${userUid}`);
    }
  } catch (err) {
    console.warn("Failed migrating guest orders to logged in user:", err);
  }
}

