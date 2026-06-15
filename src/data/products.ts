import { Product } from '../types';

export const PRODUCTS: Product[] = [
  // --- VALA / BANGLES CATEGORY ---
  {
    id: 'vala-01',
    name: 'Broad Royal Temple Vala (Set of 2)',
    tamilName: 'அரச கோவில் வளையல்',
    category: 'vala',
    categoryLabel: 'Vala / Bangles',
    variety: 'Temple Vala',
    price: 1150,
    originalPrice: 1750,
    images: [
      'https://images.unsplash.com/photo-1611591437281-460bfbe15763?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Exquisitely crafted heavy gold-covered broad bangles featuring intricate dancing peacock carvings and embossed ruby stones. Made with premium copper base and authentic 24ct gold cladding, ensuring a lifetime shine. Perfect for bridal and festive occasions.',
    details: [
      'Material: 24ct Premium Gold Covering over Copper',
      'Stones: Semi-precious Synthetic Rubies and Emeralds',
      'Size range: 2.4, 2.6, 2.8',
      '1 Year polish Guarantee & Free Re-polishing service',
      'Ideal for wedding wear. High-durability protection lacquer coating.'
    ],
    isBestSeller: true,
    isNewArrival: true,
    isCustomizable: false,
    material: 'gold_covering',
    rating: 4.9,
    reviewsCount: 148,
    stockCount: 8
  }
];
