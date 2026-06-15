import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, Sparkles, AlertCircle } from 'lucide-react';

interface PatchNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PatchNode {
  version: string;
  date?: string;
  title: string;
  changes: string[];
}

const PATCH_HISTORY: PatchNode[] = [
  {
    version: '0.3.2.4',
    title: 'Rich Web Share & Flexible Stock Booking Action States',
    changes: [
      'Engineered persistent deep-linking to synchronize dynamic product detail modals via query parameters (?product=ID), fully supporting browser Back/Forward navigation states.',
      'Integrated responsive Web Share interface with direct-to-WhatsApp visual image sharing and formatted bold price summaries with strike-through original prices.',
      'Programmed dynamic call-to-action behaviors altering checkout & sharing descriptions (e.g., "order now" vs. "pre-order now") in context-aware alignment with available product stock levels.',
      'Polished the brand message in the hero dashboard to showcase the premium micro-gold durability and affordable jewelry repolishing benefits clearly.'
    ]
  },
  {
    version: '0.3.1.4',
    title: 'Fullscreen Interactive Lightbox & Pre-Redirection Booking Synchronization',
    changes: [
      'Engineered a fullscreen interactive lightbox viewer for jewelry products with support for multi-finger pinch scaling, wheel zooming, double tap/click zoom toggle, and fluid drag-panning.',
      'Hardened order creation flows by mandating absolute catalog queue storage and guest session updates to Firestore database records prior to initiating external WhatsApp applet redirections.'
    ]
  },
  {
    version: '0.3.0.4',
    title: 'Customer Order Action Hub & Real-time Progression',
    changes: [
      'Engineered real-time order status tracking with custom notifications spanning multiple stages (Smithing, Dispatched, Shipped)',
      'Added immediate, intuitive alerts and tracking buttons for both guest active queues and authenticated member profiles',
      'Configured proactive administrative order action state controls with detailed workshop guidelines and instant customer device chimes',
      'Resolved a critical navigation bar scrolling feedback loop jitter bug by implementing custom threshold filters and rapid-toggle scroll cool-downs'
    ]
  },
  {
    version: '0.2.9.4',
    title: 'Real-Time Order Tracking & Live Customer Notifications Portal',
    changes: [
      'Engineered a highly responsive, personalized, real-time Order Status Tracker and Alerts system for logged-in boutique customers',
      'Established persistent Firestore database listeners to monitor state updates (e.g., from Pending to Confirmed) of each user\'s specific order requests',
      'Implemented customizable localized cache for client-side notification badges, including individual mark-as-read toggles and bulk-clear commands',
      'Integrated synchronized visual tracking steps and dynamic stage-badges mapping live status variables from the Gold Covering database',
      'Programmed melodic audio chimes and interactive alert cards to announce status transformations in real-time'
    ]
  },
  {
    version: '0.2.8.4',
    title: 'In-Store POS Storefront Desk & Live Inventory Subtraction',
    changes: [
      'Engineered an interactive In-Store Point of Sale (POS) counter interface exclusively accessible for boutique administrators',
      'Integrated real-time product query scanner allowing administrators to search premium ornaments and add them directly to a point of sale checkout slip',
      'Designed state-of-the-art interactive POS cart modifiers with size configurators, manual pricing audits, and adjustable GST/discount tax ledgers',
      'Connected offline walk-in receipt finalizing mechanism with the Firestore database to records instant sales registers',
      'Configured automated physical stock subtraction subtracting live boutique product inventory levels immediately upon POS checkout'
    ]
  },
  {
    version: '0.2.7.4',
    title: 'Real-Time Booking Inquiries & Admin Notification Hub',
    changes: [
      'Integrated real-time database listener synchronizing incoming WhatsApp booking inquiries directly with firestore database states',
      'Engineered complex Booking Inquiries Action Hub in the Admin Portal containing buyer demographic details, custom item summaries, and dynamic shipping address cards',
      'Designed active administrative quantitative controllers for editing customer checkout selections and prices directly before authorizing transaction completion',
      'Configured high-contrast corner desktop HUD notifications alert panel with quick direct-action paths (Confirm, Edit, Cancel) to review real-time booking alerts',
      'Implemented robust fallback operations supporting automated stock decrement and order history synchronization upon order validation'
    ]
  },
  {
    version: '0.2.6.3',
    title: 'Durable Multi-Device Sync & Account Security',
    changes: [
      'Migrated name, phone, default delivery options, cart checklists, and order history entries to persistent remote Firestore storage',
      'Configured secure cross-device retrieval to automatically restore boutique items, selections, and histories upon logging in on any device',
      'Engineered stateful password verification mechanisms for Simi Secure Sandbox Mode mock accounts to authenticate logins correctly cross-device',
      'Optimized and hardened firestore.rules validation patterns for wishlist arrays, user profile details, and sandbox credentials'
    ]
  },
  {
    version: '0.2.5.3',
    title: 'Hardened Rules & Secure Direct Query Migrations',
    changes: [
      'Migrated customer management retrieval and administrative promotions from legacy server routes to direct, secure, client-side Firestore queries & updates',
      'Engineered optimized Attribute-Based Access Control paths inside the live security policies (firestore.rules) to fully restrict administrative fields (role, isAdmin) to pre-authorized accounts and prevent self-promotion bypasses',
      'Configured secure isAdmin() validation matching both nested document pathways under users/ and optimized admins/ markers to fully eliminate permission errors'
    ]
  },
  {
    version: '0.2.4.3',
    title: 'Aesthetic Filter Refinements & Layout Polish',
    changes: [
      'Refactored the collection filter panel to feature a clean transparent background and removed unnecessary outer borders for a spacious border-free canvas',
      'Optimized spacing between sections inside the collection view by reducing padding to keep content tight and centered',
      'Refined the layout of inactive-state and expanded-state filters for an intuitive, sleek jewelry catalog experience'
    ]
  },
  {
    version: '0.2.3.2',
    title: 'Catalog Curation & Direct Badge Hierarchy',
    changes: [
      'Streamlined home layout and category sub-sections by integrating Best-Seller products directly into Classic Collections',
      'Preserved clear high-contrast Best-Seller Badges on individual product cards for visual distinction without layout redundancy',
      'Added dynamic category context tags matching active items during browser navigation filter states'
    ]
  },
  {
    version: '0.2.2.2',
    title: 'Clean Passcode Access & Security Refinements',
    changes: [
      'Migrated from multi-step OTP authentication to a direct passcode (PIN) verification gate for faster administrator entry',
      'Configured secure passcode validation and removed hint labels inside the verification dialog',
      'Optimized active administrative component mount timings and simplified form states'
    ]
  },
  {
    version: '0.2.1.1',
    title: 'Real-Time Sync Diagnostics & Sanitized Dynamic Payload Engine',
    changes: [
      'Resolved local state synchronization issues when dynamically adding or deleting boutique product cards via the Admin Portal',
      'Implemented automated metadata tracking to preserve intentional product catalog modifications and empty states across page refreshes',
      'Hardened database write resilience by automatically scanning and sanitizing undefined parameters from custom schema fields (tamilName, arrivalDate, sizes, etc.)',
      'Configured extended Attribute-Based Access Control policies in Firestore security rules to securely allow custom jewelry payload additions'
    ]
  },
  {
    version: '0.2.0.0',
    title: 'Cloud Core Realization & Hardened Security Integration',
    changes: [
      'Successfully synchronized the product catalog with a live production Google Cloud Firestore Database instance',
      'Configured hardened, Zero-Trust Attribute-Based Access Control security rules to prevent unauthorized catalog edits',
      'Engineered an authentic server-less collection load mechanism with graceful fail-safe seeding of default boutique jewelry',
      'Implemented offline optimistic local states to guarantee lightning-fast frontend visual responsiveness'
    ]
  },
  {
    version: '0.1.9.0',
    title: 'Boutique Catalog Realization & Dynamic Cache Patching',
    changes: [
      'Cleared all temporary, auxiliary mock ornaments to prepare Simi’s boutique store for authentic catalog products',
      'Deployed our flagship Broad Royal Temple Vala (Set of 2) handmade piece as the inaugural real product listing',
      'Upgraded the active products store to dynamically detect and patch the local layout with the latest production product lineup',
      'Optimized the storefront framework to gracefully scale and display solo or small curated product listings beautifully'
    ]
  },
  {
    version: '0.1.8.0',
    title: 'Seamless Cart Scrolling & Smart Pincode Lookup',
    changes: [
      'Engineered a unified single-scroll container in My Bag wrapping selections, destinations, and coupon modules',
      'Implemented automated smooth target scroll down to the delivery panel on opening the drawer',
      'Configured full Street Address fields with optimized vertical space for typing detailed lines',
      'Deployed a live Indian Postal API lookups hook to fetch and auto-fill City, District, and State by Pincode',
      'Customized smarter localized region presets with responsive context-aware input placeholder guidelines (e.g. "eg: Kochi", "eg: Ernakulam" for Kerala)',
      'Upgraded checkout payload generation to compile crystal clear street address structures for seamless WhatsApp order fulfillment'
    ]
  },
  {
    version: '0.1.7.0',
    title: 'Custom Metadata & Clean Core UI',
    changes: [
      'Added options in the Admin Portal to select and schedule the date of arrival for each product card',
      'Configured new newest model catalog order to sort items chronologically by arrival date',
      'Updated product detail panels to hide specifications if they are left blank or empty',
      'Revised label from "Aura Availability" to "Availability" on active product cards',
      'Cleaned up outer assurance tags (secure bank transfer, 100% quality checked, 6 mo polish warranty) from detail views'
    ]
  },
  {
    version: '0.1.6.0',
    title: 'Visual Polish & Performance Refinement',
    changes: [
      'Improved user interface design across pages with a less cluttered, much cleaner presentation',
      'Integrated structural category navigation (Navbar 2) for rapid search access',
      'Smoothed out component spacing, margins, and typography ratios',
      'Minor bug fixes in desktop sticky header transitions'
    ]
  },
  {
    version: '0.1.5',
    title: 'Aesthetic Upgrades & User Flow',
    changes: [
      'Added secondary navigation bar (Navbar 2) with sliding scroll animations',
      'Polished home page layout, banner transitions, and hover motion response',
      'Integrated real customer reviews & feedback carousel',
      'Cleaned up obsolete placeholders and streamlined the overall brand presentation'
    ]
  },
  {
    version: '0.1.4',
    title: 'WhatsApp Seamless Checkout',
    changes: [
      'Implemented automated WhatsApp order generation from cart checkouts',
      'Integrated click-to-chat client routing for personalized support and billing inquiries'
    ]
  },
  {
    version: '0.1.3',
    title: 'Visual Alignment & Bug Hotfixes',
    changes: [
      'Perfected the brand logo typography alignment and vector graphics rendering',
      'Fixed responsive menu overlay bugs and cart state sync on local browser reloads'
    ]
  },
  {
    version: '0.1.2',
    title: 'Advanced Filtering & Administrative Access',
    changes: [
      'Built custom responsive budget slider and gold-purities filters',
      'Introduced Admin Portal for in-app product management, inventory updates, and list edits'
    ]
  },
  {
    version: '0.1.1',
    title: 'Base Prototype Design',
    changes: [
      'Engineered initial offline-first e-commerce app prototype with high-density gold covering concepts',
      'Drafted product schemas, Anklets (Kolus), Bangles, and Mala Necklace collections'
    ]
  }
];

export default function PatchNotesModal({ isOpen, onClose }: PatchNotesModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-stone-950/95 backdrop-blur-md"
        />

        {/* Patch notes panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.3 }}
          className="relative bg-[#0c0812] border border-stone-850 rounded-3xl w-full max-w-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-10 p-6 sm:p-8 space-y-6 max-h-[85vh] flex flex-col"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-stone-950/80 hover:bg-amber-400 text-stone-200 hover:text-stone-950 border border-stone-850/40 transition-all focus:outline-none"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="space-y-1.5 pr-8">
            <span className="text-amber-500 text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-400" />
              Website Development Log
            </span>
            <h2 className="text-2xl font-serif font-black text-stone-100 flex items-center gap-2">
              <History className="w-6 h-6 text-amber-500 shrink-0" />
              Version Chronicles
            </h2>
            <p className="text-stone-400 text-xs">
              Follow our aesthetic evolution, design changes, and feature milestones as we craft Simi's ultimate online catalog. This app runs on current version <span className="font-mono bg-stone-900 border border-stone-800 text-amber-400 px-1.5 py-0.5 rounded text-[11px] font-bold">v0.3.2.4</span>.
            </p>
          </div>

          {/* Timeline list */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 my-2 scrollbar-thin">
            {PATCH_HISTORY.map((node, i) => (
              <div key={node.version} className="relative flex gap-4">
                {/* Timeline connector line & bullet */}
                <div className="flex flex-col items-center">
                  <div className={`w-3.5 h-3.5 rounded-full border border-amber-500/50 flex items-center justify-center ${i === 0 ? 'bg-amber-500' : 'bg-stone-900'}`}>
                    {i === 0 && <span className="w-1.5 h-1.5 bg-[#0c0812] rounded-full animate-ping" />}
                  </div>
                  {i < PATCH_HISTORY.length - 1 && (
                    <div className="w-0.5 flex-1 bg-stone-850/70 border-dashed border-l border-stone-800 my-2" />
                  )}
                </div>

                {/* Note Content */}
                <div className="space-y-1.5 flex-1 pb-4">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-sm font-mono font-bold text-amber-400">
                      v{node.version}
                    </span>
                    <h3 className="text-stone-250 font-serif font-semibold text-sm">
                      {node.title}
                    </h3>
                  </div>
                  <ul className="list-disc pl-4 text-xs text-stone-400 space-y-1">
                    {node.changes.map((change, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Footer badge with status */}
          <div className="pt-2 border-t border-stone-850 flex items-center justify-between text-[11px] text-stone-500 font-mono">
            <span>Production Release</span>
            <span className="flex items-center gap-1 text-emerald-500">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live & Insured
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
