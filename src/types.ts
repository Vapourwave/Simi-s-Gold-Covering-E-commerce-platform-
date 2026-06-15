export interface Product {
  id: string;
  name: string;
  tamilName?: string;
  category: 'vala' | 'kolus' | 'mala_necklace' | 'earrings';
  categoryLabel: string;
  variety: string; // e.g. "Jimmiki", "Stud", "Bugadi", "Temple Mala", "Kayi Chain", "Custom Thali", "Silver Jewelry"
  price: number;
  originalPrice: number; // for seasonal discounts
  images: string[];
  description: string;
  details: string[];
  isBestSeller: boolean;
  isNewArrival: boolean;
  isCustomizable: boolean;
  material: 'gold_covering' | 'gold_covering_on_silver' | 'silver' | 'white_gold';
  rating: number;
  reviewsCount: number;
  stockCount: number; // available stock option
  sizes?: string[]; // customizable sizes list
  arrivalDate?: string; // date of arrival for latest model order (e.g. "YYYY-MM-DD")
}

export type SortOption = 'price_asc' | 'price_desc' | 'popular' | 'newest';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface UserAddress {
  address?: string;
  city?: string;
  pincode?: string;
  district?: string;
  state?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  phone?: string;
  joinedAt?: string;
  purchases?: any[];
  reviews?: any[];
  wishlist?: string[];
  defaultAddress?: UserAddress;
  role?: 'admin' | 'customer';
  isAdmin?: boolean;
  sandboxPassword?: string;
}

export interface OrderRequest {
  id: string;
  userId?: string;
  userEmail?: string;
  userName: string;
  userPhone?: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    selectedSize?: string;
  }[];
  total: number;
  subtotal?: number;
  discountVal?: number;
  promoCode?: string;
  shippingCost?: number;
  address?: UserAddress;
  status: 'pending' | 'confirmed' | 'cancelled' | 'processing' | 'dispatched' | 'shipped';
  orderItems?: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    selectedSize?: string;
  }[];
  orderState?: string;
  createdAt: string;
  updatedAt?: string;
}
