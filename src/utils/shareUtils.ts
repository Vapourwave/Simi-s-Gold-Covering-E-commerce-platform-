import { Product } from '../types';

/**
 * Normalizes the environment origin to always use the official production URL
 * so that shared links and loaded images are universally accessible.
 */
export function getOfficialOrigin(): string {
  const currentOrigin = window.location.origin;
  if (
    currentOrigin.includes('localhost') || 
    currentOrigin.includes('asia-east1.run.app') || 
    currentOrigin.includes('ais-dev') || 
    currentOrigin.includes('ais-pre')
  ) {
    return 'https://simi-s-gold-covering-929323470087.asia-southeast1.run.app';
  }
  return currentOrigin;
}

/**
 * Returns formatted details for sharing a product including title, textual description
 * with price/savings and a link to the product itself & the preview image.
 */
export function getCleanShareDetails(product: Product) {
  const origin = getOfficialOrigin();
  const shareUrl = `${origin}/?product=${encodeURIComponent(product.id)}`;
  const firstImage = product.images?.[0] || '';
  const absoluteImageUrl = firstImage
    ? (firstImage.startsWith('http') ? firstImage : `${origin}${firstImage.startsWith('/') ? '' : '/'}${firstImage}`)
    : '';

  const originalPriceText = product.originalPrice && product.originalPrice > product.price 
    ? ` ~₹${product.originalPrice}~` 
    : '';

  const savings = product.originalPrice && product.originalPrice > product.price 
    ? ` (Save ₹${product.originalPrice - product.price}!)` 
    : '';

  const priceText = product.price ? `\nPrice: ₹${product.price}${originalPriceText}${savings}` : '';
  const categoryText = product.categoryLabel ? `\nCategory: ${product.categoryLabel}` : '';

  // Determine standard booking text depends dynamically on stockCount
  const isOutOfStock = typeof product.stockCount === 'number' && product.stockCount === 0;
  const actionPhrase = isOutOfStock ? 'pre-order now' : 'order now';

  // WhatsApp-friendly text format with bold styles and emojis (retains the physical image sharing flow but skips printing the URL raw in text)
  const shareText = `✨ *${product.name}* ✨${categoryText}${priceText}\n\nView details & ${actionPhrase} here:\n🔗 ${shareUrl}`;
  
  return {
    shareUrl,
    shareTitle: `${product.name} | Simi's Gold Covering`,
    shareText,
    absoluteImageUrl
  };
}

/**
 * Tries to share the image as an actual attached file using the Web Share API.
 * Returns true if successful, false otherwise.
 */
export async function tryShareImageFile(imageUrl: string, title: string, text: string, url: string): Promise<boolean> {
  if (!imageUrl || !navigator.share || !navigator.canShare) return false;
  
  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('CORS or fetch error');
    const blob = await response.blob();
    
    let extension = 'jpg';
    if (blob.type === 'image/png') extension = 'png';
    else if (blob.type === 'image/webp') extension = 'webp';
    else if (blob.type === 'image/gif') extension = 'gif';
    
    const file = new File([blob], `product-preview.${extension}`, { type: blob.type });
    const shareData = {
      title,
      text,
      url,
      files: [file]
    };
    
    if (navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return true;
    }
  } catch (err) {
    console.warn("Could not share image file natively:", err);
  }
  return false;
}
