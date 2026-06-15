import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Star, Quote, Heart } from 'lucide-react';

interface Feedback {
  id: number;
  name: string;
  location: string;
  purchasedItem: string;
  rating: number;
  review: string;
  durationOfUse: string;
}

const FEEDBACKS: Feedback[] = [
  {
    id: 1,
    name: "Anjali Nair",
    location: "Kollam, Kerala",
    purchasedItem: "Premium Daily Wear Thin Bangles",
    rating: 5,
    review: "“I bought daily wear bangles from Simi's six months ago and they still look like brand new gold. The color and polish are absolutely premium. Standard microplating usually fades but this one has surprised me. Ordering another set today!”",
    durationOfUse: "Active user for 6 Months"
  },
  {
    id: 2,
    name: "Reshma Mehra",
    location: "Trivandrum, Kerala",
    purchasedItem: "Micro-Plated Traditional Anklet",
    rating: 5,
    review: "“Honestly, finding gold covering anklets that don't cause allergies or turn black in water is hard. Simi's anklets lasted me a solid 15 months of rough, constant use! More than a year. Bought again from here last week and the customer service was delightful.”",
    durationOfUse: "15 Months Constant Wear"
  },
  {
    id: 3,
    name: "Sreedevi Mohan",
    location: "Kochi, Kerala",
    purchasedItem: "Traditional Manga Mala Set",
    rating: 5,
    review: "“We wore the microplated necklace set for a family wedding. Almost everyone assumed it is real 22ct solid gold. The warm tone has no cheap looking reddish or bright yellow shine. Highly recommended for weddings and functions! It's so safe to wear of high value look.”",
    durationOfUse: "Wore for multiple marriages"
  },
  {
    id: 4,
    name: "Meera Suresh",
    location: "Alappuzha, Kerala",
    purchasedItem: "Designer Twisting Bugadi Earrings",
    rating: 5,
    review: "“Special thanks to the Kollam-based service team! The Bugadi design looks perfect, and the lock mechanism is very reliable even for daily usage. Truly micro-plated luxury with affordable pricing.”",
    durationOfUse: "Daily wear helper"
  },
  {
    id: 5,
    name: "Preetha Subhash",
    location: "Kottarakara, Kerala",
    purchasedItem: "Royal Temple Choker & Jimmiki",
    rating: 5,
    review: "“Very high quality polishing. My friend recommended Simi's Gold Covering because their ornaments last way longer than standard covering jewels. Very glad to have ordered. The premium look is breathtaking!”",
    durationOfUse: "8 Months Review Update"
  }
];

export default function CustomerFeedbacks() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      scrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-8">
      {/* Header section with Gold highlights */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-4">
        <div className="space-y-2 text-left">
          <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-500/20 uppercase tracking-widest flex items-center gap-1.5 w-fit">
            <Heart className="w-3.5 h-3.5 fill-amber-500/30 animate-pulse text-amber-500" />
            Loved By Hundreds
          </span>
          <h3 className="text-2xl sm:text-3xl font-serif font-black text-stone-100 tracking-wide">
            Feedbacks from our valued customers
          </h3>
          <p className="text-xs text-stone-400 max-w-xl">
            Real experiences from people who trusted our micro-plated finish. We guarantee longevity because we respect your hard-earned trust.
          </p>
        </div>

        {/* Custom Navigation Arrows */}
        <div className="flex items-center gap-2">
          <button
            id="feedback-scroll-left"
            onClick={() => handleScroll('left')}
            className="p-2 border border-stone-800 bg-stone-900/60 hover:bg-stone-850 text-stone-400 hover:text-amber-400 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            id="feedback-scroll-right"
            onClick={() => handleScroll('right')}
            className="p-2 border border-stone-800 bg-stone-900/60 hover:bg-stone-850 text-stone-400 hover:text-amber-400 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slidable container */}
      <div className="relative group">
        <div 
          ref={scrollRef}
          className="flex overflow-x-auto gap-6 pb-6 cursor-grab select-none scrollbar-none snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
        >
          {FEEDBACKS.map((fb) => (
            <div 
              key={fb.id}
              className="flex-shrink-0 w-[290px] sm:w-[340px] bg-stone-900/40 hover:bg-stone-900/60 transition-all duration-300 border border-stone-850 hover:border-amber-500/20 rounded-2xl p-6 sm:p-7 flex flex-col justify-between snap-start shadow-md relative group/card"
            >
              {/* Backquote background badge accent */}
              <div className="absolute right-6 top-6 text-stone-800/20 group-hover/card:text-amber-500/10 transition-colors pointer-events-none">
                <Quote className="w-12 h-12 stroke-[3]" />
              </div>

              {/* Top rating and item */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-1">
                  {[...Array(fb.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                
                {/* Item tag */}
                <span className="inline-block text-[10px] text-amber-500/90 font-mono font-medium tracking-wide uppercase">
                  {fb.purchasedItem}
                </span>

                {/* Review in italics & quote apostrophes */}
                <p className="text-stone-300 text-xs sm:text-[13px] leading-relaxed font-light italic font-serif">
                  {fb.review}
                </p>
              </div>

              {/* Customer description */}
              <div className="mt-6 pt-5 border-t border-stone-850/60 flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-stone-100 font-sans tracking-wide">
                    {fb.name}
                  </h4>
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest font-mono">
                    {fb.location}
                  </p>
                </div>
                <div className="text-[10px] bg-stone-950 px-2 py-1 rounded-md text-stone-400 font-medium">
                  {fb.durationOfUse}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Shadow indicators at borders to prompt scroll */}
        <div className="absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-stone-950 via-transparent to-transparent pointer-events-none opacity-40 sm:opacity-70" />
        <div className="absolute top-0 left-0 h-full w-12 bg-gradient-to-r from-stone-950 via-transparent to-transparent pointer-events-none opacity-40 sm:opacity-70" />
      </div>
    </section>
  );
}
