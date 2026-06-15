import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, SlidersHorizontal, ArrowUpDown, Sparkles, 
  Tag, Compass, Info, BadgePercent, Check, ChevronDown 
} from 'lucide-react';
import { Product, SortOption } from '../types';
import ProductCard from './ProductCard';

interface CategoryViewProps {
  products: Product[];
  category: 'vala' | 'kolus' | 'mala_necklace' | 'earrings';
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
}

export default function CategoryView({
  products,
  category,
  onBack,
  onSelectProduct
}: CategoryViewProps) {
  // Load all products in this category
  const categoryProducts = useMemo(() => {
    return products.filter(p => p.category === category);
  }, [products, category]);

  // Find the exact maximum price of any product in this category
  const absoluteMaxCategoryPrice = useMemo(() => {
    if (categoryProducts.length === 0) return 5500;
    const prices = categoryProducts.map(p => p.price);
    return Math.max(...prices);
  }, [categoryProducts]);

  // Filters State
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [activeTag, setActiveTag] = useState<'all' | 'bestseller' | 'newest'>('all');
  const [selectedVariety, setSelectedVariety] = useState<string>('All');
  const [maxPrice, setMaxPrice] = useState<number>(() => {
    const categoryProductsDirect = products.filter(p => p.category === category);
    if (categoryProductsDirect.length === 0) return 5500;
    return Math.max(...categoryProductsDirect.map(p => p.price));
  });
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('All');

  const categoryLabel = categoryProducts[0]?.categoryLabel || 'Jewelry Collection';

  // Get unique varieties dynamic list for current category
  const varieties = useMemo(() => {
    const list = categoryProducts.map(p => {
      let v = p.variety || '';
      if (v.toLowerCase() === 'bugatties' || v.toLowerCase() === 'bugatti') {
        return 'Bugadi';
      }
      if (v.toLowerCase() === 'studs') {
        return 'Stud';
      }
      return v;
    });
    return ['All', ...Array.from(new Set(list))];
  }, [categoryProducts]);

  // Get unique materials list for current category
  const materials = useMemo(() => {
    const list = categoryProducts.map(p => p.material.replace(/_/g, ' '));
    return ['All', ...Array.from(new Set(list))];
  }, [categoryProducts]);

  // Filter products recursively by Tag, Price, Variety, Material
  const filteredProducts = useMemo(() => {
    let result = [...categoryProducts];

    // 1. Variety Filter
    if (selectedVariety !== 'All') {
      result = result.filter(p => {
        let pv = p.variety || '';
        if (pv.toLowerCase() === 'bugatties' || pv.toLowerCase() === 'bugatti') {
          pv = 'Bugadi';
        }
        if (pv.toLowerCase() === 'studs') {
          pv = 'Stud';
        }
        return pv === selectedVariety;
      });
    }

    // 2. Material Filter
    if (selectedMaterial !== 'All') {
      result = result.filter(p => p.material.replace(/_/g, ' ') === selectedMaterial);
    }

    // 3. Price Filter
    result = result.filter(p => p.price <= maxPrice);

    // 4. Tag Filter (Selected bubble toggling "All", "Best Sellers", "New Models")
    if (activeTag === 'bestseller') {
      result = result.filter(p => p.isBestSeller);
    } else if (activeTag === 'newest') {
      result = result.filter(p => p.isNewArrival);
    }

    // Sort items
    if (sortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => {
        const dateA = a.arrivalDate ? new Date(a.arrivalDate).getTime() : 0;
        const dateB = b.arrivalDate ? new Date(b.arrivalDate).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
        return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
      });
    } else if (sortBy === 'popular') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [categoryProducts, selectedVariety, selectedMaterial, maxPrice, activeTag, sortBy]);

  // Split calculations specifically requested by user:
  // "...maintaining the structure showing the latest models and best sellers in the selected price range."
  // Dynamic partitions based on the parent filters sorted by arrival date
  const structuredLatest = useMemo(() => {
    const rawArrivals = filteredProducts.filter(p => p.isNewArrival);
    return [...rawArrivals].sort((a, b) => {
      const dateA = a.arrivalDate ? new Date(a.arrivalDate).getTime() : 0;
      const dateB = b.arrivalDate ? new Date(b.arrivalDate).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      return b.id.localeCompare(a.id);
    });
  }, [filteredProducts]);

  // Standard collection holds anything not exclusive, or serves as baseline (Classic Collections)
  const remainingProducts = useMemo(() => {
    return filteredProducts.filter(p => !p.isNewArrival);
  }, [filteredProducts]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen">
      
      {/* Navigation and Header title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-800">
        <div className="flex items-center gap-4">
          <button
            id="cat-view-back"
            onClick={onBack}
            className="p-3 bg-stone-900 border border-stone-850 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 rounded-2xl cursor-pointer transition-all flex items-center justify-center focus:outline-none shrink-0"
          >
            <ArrowLeft className="w-5 h-5 pointer-events-none" />
          </button>
          <div>
            <span className="text-xs uppercase tracking-widest text-amber-500 font-mono">Simi's Collection</span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-100 flex items-center gap-2">
              {categoryLabel}
              <span className="text-stone-500 font-sans text-sm font-normal">({categoryProducts.length} models)</span>
            </h1>
          </div>
        </div>

        {/* Info banner about re-polishing service */}
        <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-3 max-w-sm text-xs text-amber-300/90 leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>Need custom sizing? Speak directly with Simi's jewellers for personalized dimensions and wedding orders!</span>
        </div>
      </div>

      {/* FILTERS TOOLBAR ROW */}
      <div className={`bg-transparent border-0 rounded-3xl transition-all duration-300 shadow-xl -mt-5 mb-0.5 px-5 sm:px-6 lg:px-7 ${showFilters ? 'py-5 sm:py-6 lg:py-7' : 'py-3 sm:py-3.5 lg:py-4'}`}>
        
        {/* HEADER / TRIGGER BAR */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs sm:text-sm font-sans font-bold text-stone-200 uppercase tracking-widest">
              Filter Collections
            </h3>
            {!showFilters && (activeTag !== 'all' || selectedVariety !== 'All' || selectedMaterial !== 'All' || maxPrice < absoluteMaxCategoryPrice) && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-mono animate-pulse">
                Active Filters Included
              </span>
            )}
          </div>
          
          <button
            id="more-filters-toggle"
            onClick={() => setShowFilters(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-850 hover:bg-stone-800 text-stone-300 hover:text-amber-400 border border-stone-750 transition-all text-xs font-semibold cursor-pointer focus:outline-none"
          >
            <span className="text-[11px] font-bold">More filters</span>
            <motion.div
              animate={{ rotate: showFilters ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.div>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ 
                height: 'auto', 
                opacity: 1, 
                marginTop: 24,
                transition: {
                  height: { type: 'spring', stiffness: 280, damping: 28 },
                  opacity: { duration: 0.2, delay: 0.05 }
                }
              }}
              exit={{ 
                height: 0, 
                opacity: 0, 
                marginTop: 0,
                transition: {
                  height: { duration: 0.25 },
                  opacity: { duration: 0.15 }
                }
              }}
              className="overflow-hidden"
            >
              <div className="space-y-6">
                {/* ROW 1: TAG BUBBLES SELECTOR */}
                <div className="space-y-2.5">
                  <h3 className="text-xs text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-amber-500" />
                    Showcase:
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      id="tag-filter-all"
                      onClick={() => setActiveTag('all')}
                      className={`px-4 py-2 rounded-full text-xs font-semibold cursor-pointer border transition-all focus:outline-none ${activeTag === 'all' ? 'bg-amber-500 text-stone-950 border-amber-500 font-extrabold shadow-sm' : 'bg-stone-800/80 text-stone-300 border-stone-750 hover:border-stone-500'}`}
                    >
                      All Collections
                    </button>
                    <button
                      id="tag-filter-bestsellers"
                      onClick={() => setActiveTag('bestseller')}
                      className={`px-4 py-2 rounded-full text-xs font-semibold cursor-pointer border transition-all focus:outline-none ${activeTag === 'bestseller' ? 'bg-amber-500 text-stone-950 border-amber-500 font-extrabold shadow-sm' : 'bg-stone-800/80 text-stone-300 border-stone-750 hover:border-stone-500'}`}
                    >
                      ⭐ Best Sellers
                    </button>
                    <button
                      id="tag-filter-newest"
                      onClick={() => setActiveTag('newest')}
                      className={`px-4 py-2 rounded-full text-xs font-semibold cursor-pointer border transition-all focus:outline-none ${activeTag === 'newest' ? 'bg-amber-500 text-stone-950 border-amber-500 font-extrabold shadow-sm' : 'bg-stone-800/80 text-stone-300 border-stone-750 hover:border-stone-500'}`}
                    >
                      ✨ Newest Models
                    </button>
                  </div>
                </div>

                {/* ROW 2: VARIETY SPECIFIC BUBBLES */}
                <div className="space-y-2.5">
                  <h3 className="text-xs text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-500" />
                    Jewelry Varieties inside:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {varieties.map((varItem) => (
                      <button
                        key={varItem}
                        onClick={() => setSelectedVariety(varItem)}
                        className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer focus:outline-none border ${selectedVariety === varItem ? 'bg-amber-500/20 text-amber-400 border-amber-500/55 font-bold shadow-md' : 'bg-stone-800/40 text-stone-400 border-stone-800 hover:border-stone-700'}`}
                      >
                        {varItem === 'All' ? 'All Varieties' : varItem}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SECTION 3: DOUBLE COLUMN INPUTS FOR PRICE RANGE & SORTING */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                  
                  {/* Price Range Slider */}
                  <div className="md:col-span-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
                        Price Budget: Up to ₹{maxPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400">Max ₹{absoluteMaxCategoryPrice.toLocaleString('en-IN')}</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <input
                        id="price-range-slider"
                        type="range"
                        min="300"
                        max={absoluteMaxCategoryPrice}
                        step="50"
                        value={Math.min(maxPrice, absoluteMaxCategoryPrice)}
                        onChange={(e) => setMaxPrice(Number(e.target.value))}
                        className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    {/* Price budget helper buttons */}
                    <div className="flex gap-2 pt-1 flex-wrap">
                      {absoluteMaxCategoryPrice >= 600 && (
                        <button
                          onClick={() => setMaxPrice(600)}
                          className={`px-2.5 py-1 text-[10px] rounded border font-mono ${maxPrice === 600 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-stone-800/40 text-stone-500 border-transparent'}`}
                        >
                          ₹600
                        </button>
                      )}
                      {absoluteMaxCategoryPrice >= 1200 && (
                        <button
                          onClick={() => setMaxPrice(1200)}
                          className={`px-2.5 py-1 text-[10px] rounded border font-mono ${maxPrice === 1200 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-stone-800/40 text-stone-500 border-transparent'}`}
                        >
                          ₹1,200
                        </button>
                      )}
                      {absoluteMaxCategoryPrice >= 2500 && (
                        <button
                          onClick={() => setMaxPrice(2500)}
                          className={`px-2.5 py-1 text-[10px] rounded border font-mono ${maxPrice === 2500 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-stone-800/40 text-stone-500 border-transparent'}`}
                        >
                          ₹2,500
                        </button>
                      )}
                      <button
                        onClick={() => setMaxPrice(absoluteMaxCategoryPrice)}
                        className={`px-2.5 py-1 text-[10px] rounded border font-mono ${maxPrice === absoluteMaxCategoryPrice ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-stone-800/40 text-stone-500 border-transparent'}`}
                      >
                        Show All (₹{absoluteMaxCategoryPrice.toLocaleString('en-IN')})
                      </button>
                    </div>
                  </div>

                  {/* Quick Base Material Selection */}
                  <div className="md:col-span-3 space-y-3">
                    <span className="text-xs text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      Material base:
                    </span>
                    <select
                      id="material-base-select"
                      value={selectedMaterial}
                      onChange={(e) => setSelectedMaterial(e.target.value)}
                      className="w-full bg-stone-850 hover:bg-stone-800 text-stone-200 border border-stone-750 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-400/50"
                    >
                      <option value="All">All Metals/Bases</option>
                      {materials.filter(m => m !== 'All').map(matItem => (
                        <option key={matItem} value={matItem} className="capitalize">
                          {matItem}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Real-time Order Sorting */}
                  <div className="md:col-span-3 space-y-3">
                    <span className="text-xs text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5 text-amber-500" />
                      Sort order:
                    </span>
                    <select
                      id="sort-by-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="w-full bg-stone-850 hover:bg-stone-800 text-stone-200 border border-stone-750 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-400/50"
                    >
                      <option value="popular">Best Quality Rating</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="newest">New Arrivals First</option>
                    </select>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* DUAL-STRUCTURED RENDER PANELS */}
      {/* If no products are found */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-stone-900 border border-stone-850 max-w-2xl mx-auto space-y-3">
          <SlidersHorizontal className="w-12 h-12 text-stone-600 mx-auto" />
          <h3 className="text-stone-200 text-lg font-bold">No jewelry matches your exact filters</h3>
          <p className="text-stone-400 text-sm max-w-md mx-auto">
            Try resetting your price slider upwards or select "All Varieties" to see other marvelous pieces in Simi's collection.
          </p>
          <button
            onClick={() => {
              setSelectedVariety('All');
              setSelectedMaterial('All');
              setMaxPrice(absoluteMaxCategoryPrice);
              setActiveTag('all');
            }}
            className="mt-4 px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-lg text-xs hover:bg-amber-400 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          
          {/* STRUCTURE 1: LATEST MODELS SUB-SECTION (Shown only if not narrowed to specific tag or if newest is chosen) */}
          {activeTag !== 'bestseller' && structuredLatest.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="h-0.5 bg-amber-500/20 flex-1" />
                <h2 className="text-xl font-serif font-bold text-amber-400 tracking-wide flex items-center gap-2 px-1">
                  ✨ LATEST MODEL ARRIVALS
                </h2>
                <span className="h-0.5 bg-amber-500/20 flex-1" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                <AnimatePresence mode="popLayout">
                  {structuredLatest.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onSelect={onSelectProduct} 
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* BASELINE: STANDARD COLLECTIONS */}
          {remainingProducts.length > 0 && (
            <div className="space-y-4">
              {(activeTag === 'all' || activeTag === 'bestseller') && (
                <div className="flex items-center gap-2.5">
                  <span className="h-0.5 bg-stone-800 flex-1" />
                  <h2 className="text-base text-stone-400 font-serif tracking-widest uppercase flex items-center gap-2 px-1">
                    {activeTag === 'bestseller' ? 'Best Seller Collections' : 'Classic Collections'}
                  </h2>
                  <span className="h-0.5 bg-stone-800 flex-1" />
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                <AnimatePresence mode="popLayout">
                  {remainingProducts.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onSelect={onSelectProduct} 
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

        </div>
      )}

      {/* SERVICE CARE CARD FOOTER */}
      <div className="bg-stone-900/40 p-6 sm:p-8 rounded-3xl border border-stone-850/80 flex flex-col md:flex-row justify-between items-center gap-6 mt-12">
        <div className="space-y-1.5 text-center md:text-left">
          <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-3 py-1 rounded border border-amber-500/25 uppercase">
            POLISHING & CARE SERVICE
          </span>
          <h4 className="text-white font-serif text-lg font-bold">Original Polishing & Warranty Care at Simi's</h4>
          <p className="text-xs text-stone-400 max-w-xl">
            We understand jewelry is tied to traditions. We provide premium re-polishing solutions at minimal rates. Got old coverings? Bring them in, and our gold smiths will restore them to a gleaming 24ct finish.
          </p>
        </div>
        <a
          id="polishing-care-whatsapp-enquiry"
          href="https://wa.me/917907959180?text=Hello%20Simi%20Gold%20Covering!%20I%20want%20to%20enquire%20about%20your%20re-polishing%20and%20repair%20services%20for%20old%2520jewelleries."
          target="_blank"
          rel="noreferrer"
          className="bg-stone-850 hover:bg-stone-800 hover:text-amber-400 text-stone-300 border border-stone-750 px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shrink-0"
        >
          Enquire Sparkle Repolish
        </a>
      </div>
    </div>
  );
}
