import React from 'react';
import { motion } from 'motion/react';
import { Star, Eye, Tag, AlertCircle } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  key?: string | number;
}

export default function ProductCard({ product, onSelect }: ProductCardProps) {
  // Calculate savings percentage
  const discountPercent = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  // Dynamic fallback for size bubbles
  const productSizes = product.sizes && product.sizes.length > 0 
    ? product.sizes 
    : product.category === 'vala' 
      ? ['2.4', '2.6', '2.8'] 
      : product.category === 'kolus' 
        ? ['9.5"', '10"', '10.5"'] 
        : ['Free-size'];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6 }}
      onClick={() => onSelect(product)}
      className="group flex flex-col bg-stone-900/40 rounded-2xl border border-stone-800/80 hover:border-amber-500/30 overflow-hidden cursor-pointer shadow-md transition-all duration-300 relative"
    >
      {/* Floating Badges */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
        {product.isBestSeller && (
          <span className="bg-amber-500/90 backdrop-blur-md text-stone-950 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded shadow-sm tracking-wide">
            BEST SELLER
          </span>
        )}

        {product.isCustomizable && (
          <span className="bg-purple-600/95 backdrop-blur-md text-white text-[10px] sm:text-[10px] font-bold px-2 py-0.5 rounded shadow-sm tracking-wide">
            CUSTOMIZABLE
          </span>
        )}
      </div>

      {/* Image Container with Hover reveal effects */}
      <div className="relative aspect-square w-full bg-stone-950 overflow-hidden border-b border-stone-800/60 w-full">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        
        {/* Dark mask overlay on hover */}
        <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 rounded-full bg-amber-400 text-stone-950 shadow-lg font-bold flex items-center gap-1 text-xs"
          >
            <Eye className="w-4 h-4" />
            <span>Quick View</span>
          </motion.div>
        </div>

        {/* Quality indicator ribbon */}
        <div className="absolute bottom-2 left-2 bg-stone-950/85 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] text-stone-400 font-mono capitalize">
          {product.material.replace(/_/g, ' ')}
        </div>
      </div>

      {/* Info container */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-amber-500/80 font-mono">
            <span>{product.variety}</span>
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span className="text-stone-300">{product.rating.toFixed(1)}</span>
            </span>
          </div>

          <h3 className="text-stone-200 font-serif font-semibold text-sm sm:text-base group-hover:text-amber-300 transition-colors line-clamp-1">
            {product.name}
          </h3>

          {/* Sizing Bubbles visible on each card */}
          <div className="flex flex-wrap gap-1 mt-1.5 overflow-hidden h-[18px] items-center">
            {productSizes.map((sz) => (
              <span 
                key={sz} 
                className="text-[9px] bg-stone-900 border border-stone-800 text-stone-400 font-mono font-bold px-1.5 py-0.5 rounded shadow-xs"
              >
                {sz}
              </span>
            ))}
          </div>

        </div>

        {/* Price & Action strip */}
        <div className="pt-3 border-t border-stone-800/50 mt-3 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-amber-400 font-bold text-base sm:text-lg font-mono">
                ₹{product.price}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-stone-500 line-through text-xs font-mono">
                  ₹{product.originalPrice}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-mono tracking-wide font-bold uppercase ${
              product.stockCount === 0 
                ? 'text-rose-500' 
                : product.stockCount <= 5 
                  ? 'text-amber-500 animate-pulse' 
                  : 'text-emerald-500'
            }`}>
              {product.stockCount === 0 
                ? 'Pre-order' 
                : `${product.stockCount} in stock`}
            </span>
          </div>

          {discountPercent > 0 && (
            <span className="bg-red-950/40 text-red-400 border border-red-900/30 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
              -{discountPercent}% OFF
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
