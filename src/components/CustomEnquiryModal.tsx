import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, MessageCircle, Sparkles, HelpCircle, Hammer, 
  Upload, Shield, FileHeart, Check, Info 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface CustomEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledProductName?: string;
}

export default function CustomEnquiryModal({
  isOpen,
  onClose,
  prefilledProductName = ''
}: CustomEnquiryModalProps) {
  const { addToast } = useToast();
  const [jewelryType, setJewelryType] = useState(prefilledProductName ? 'custom-replica' : 'thali-kodi');
  const [replicaName, setReplicaName] = useState(prefilledProductName);
  const [fullName, setFullName] = useState('');
  const [baseMetal, setBaseMetal] = useState('gold-on-silver');
  const [customLength, setCustomLength] = useState('Standard (22 inches)');
  const [engravingText, setEngravingText] = useState('');
  const [enquiryDetails, setEnquiryDetails] = useState('');
  const [sketchUploaded, setSketchUploaded] = useState(false);
  const [sketchName, setSketchName] = useState('');

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setSketchUploaded(true);
    setSketchName('sketch_draft_template.png');
  };

  const getWhatsAppSubmitLink = () => {
    const formatType: Record<string, string> = {
      'thali-kodi': 'Traditional Custom Thali Kodi',
      'bridal-set': 'Full Bridal Wedding Set',
      'wrist-chain': 'Kayi Wrist Chain (wristlet)',
      'repolish': 'Re-Polishing Old Jewelry',
      'custom-replica': `Custom Replica of: ${replicaName || 'Provided Image Sketch'}`
    };

    const msg = `Vanakkam Simi Gold Covering! I wish to submit an inquiry for a custom jewelry casting:
------------------------------------------
👤 *Customer Name:* ${fullName || 'Valued Buyer'}
✨ *Custom Selection:* ${formatType[jewelryType] || jewelryType}
🏷️ *Base Core Metal:* ${baseMetal === 'gold-on-silver' ? '925 Sterling Silver Plated (Lifetime)' : 'Premium Copper Microplating'}
📏 *Length / Dimensions:* ${customLength}
✍️ *Custom Engraving:* ${engravingText || 'None'}
📎 *Sketch Provided:* ${sketchUploaded ? `Yes (${sketchName})` : 'Sketch description attached'}
📝 *Specific Carving Requests:* ${enquiryDetails || 'Standard traditional Tamil castings'}
------------------------------------------
Please consult me with estimated weights, polishing terms, and casting price quote. Thank you!`;

    return `https://wa.me/917907959180?text=${encodeURIComponent(msg)}`;
  };

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

        {/* Form panel container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.3 }}
          className="relative bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-10 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Close trigger */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-stone-950/80 hover:bg-amber-400 text-stone-200 hover:text-stone-950 border border-stone-800/40 transition-all focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Heading */}
          <div className="space-y-1.5 pr-8">
            <span className="text-amber-500 text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-400" />
              Simi's Gold Smith Casting
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100 flex items-center gap-2">
              <Hammer className="w-6 h-6 text-amber-400 shrink-0" />
              Custom Carving Studio
            </h2>
            <p className="text-stone-400 text-xs leading-relaxed">
              We specialize in recreating solid gold jewelry using physical drawings, Unsplash files, or sketches. From custom Thalis, side-mugappus, to thick Kayi chains, our craftsmen use real 925 sterling silver bases covered with 5 layers of pure gold.
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {/* 1. Full name */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-widest font-bold block">
                Your Full Name:
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sunder Rajan"
                className="w-full bg-stone-950 text-stone-200 border border-stone-800 rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-amber-400/50 transition-colors"
                required
              />
            </div>

            {/* 2. Custom Casting Category Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-widest font-bold block">
                Type of Custom Craft:
              </label>
              <select
                value={jewelryType}
                onChange={(e) => setJewelryType(e.target.value)}
                className="w-full bg-stone-950 text-stone-200 border border-stone-800 rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-amber-400/50"
              >
                <option value="thali-kodi">Traditional Thali Kodi / Kodi-Saradu</option>
                <option value="bridal-set">Grand Wedding Jewelry Ensemble / Combo Set</option>
                <option value="wrist-chain">Thick Link Kayi Wrist Chain / Heavy Bracelet</option>
                <option value="repolish">Re-Polishing old copper/silver covering jewels</option>
                <option value="custom-replica">Recreate from drawing / photo replica</option>
              </select>
            </div>

            {/* 2b. Replica Target name if replica selected */}
            {jewelryType === 'custom-replica' && (
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-widest font-bold block">
                  Recreation Target Model Reference:
                </label>
                <input
                  type="text"
                  value={replicaName}
                  onChange={(e) => setReplicaName(e.target.value)}
                  placeholder="e.g. Broad temple peacock bangle"
                  className="w-full bg-stone-950 text-stone-200 border border-stone-800 rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-amber-400/50"
                />
              </div>
            )}

            {/* 3. Base Core Metal choice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-widest font-bold block">
                  Core Metal choice:
                </label>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBaseMetal('gold-on-silver')}
                    className={`flex-1 py-3 text-xs rounded-xl font-bold border transition-all ${baseMetal === 'gold-on-silver' ? 'bg-amber-400 text-stone-950 border-amber-400' : 'bg-stone-950/40 text-stone-400 border-stone-800 hover:border-stone-700'}`}
                  >
                    👑 Gold on Silver (Lifetime)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBaseMetal('gold-on-copper')}
                    className={`flex-1 py-3 text-xs rounded-xl font-bold border transition-all ${baseMetal === 'gold-on-copper' ? 'bg-amber-400 text-stone-950 border-amber-400' : 'bg-stone-950/40 text-stone-400 border-stone-800 hover:border-stone-700'}`}
                  >
                    💍 Plated Brass/Copper
                  </button>
                </div>
              </div>

              {/* 4. Customized Sizing Details */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 uppercase tracking-widest font-bold block">
                  Chain Length / Ring Size requested:
                </label>
                <input
                  type="text"
                  value={customLength}
                  onChange={(e) => setCustomLength(e.target.value)}
                  placeholder="e.g. 24 inches long / Ring size 14"
                  className="w-full bg-stone-950 text-stone-200 border border-stone-800 rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-amber-400/50"
                />
              </div>
            </div>

            {/* 5. Custom Letter Engraving Text */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-widest font-bold block">
                Engraving Text: (Names, Initials, Wedding Date)
              </label>
              <input
                type="text"
                value={engravingText}
                onChange={(e) => setEngravingText(e.target.value)}
                placeholder="e.g. S & R / 15-08-2026"
                className="w-full bg-stone-950 text-stone-200 border border-stone-800 rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-amber-400/50"
              />
            </div>

            {/* 6. Drag and drop file attachment design placeholder */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-widest font-bold block">
                Upload Custom Jewelry Sketch/Photo (Simi Smith Copying):
              </label>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => {
                  setSketchUploaded(true);
                  setSketchName('hand_drawing_draft_jimmiki.webp');
                }}
                className="border-2 border-dashed border-stone-800 hover:border-amber-500/30 bg-stone-950/30 rounded-2xl p-4 text-center cursor-pointer transition-colors space-y-2 select-none"
              >
                {!sketchUploaded ? (
                  <>
                    <Upload className="w-8 h-8 text-stone-500 mx-auto" />
                    <div>
                      <p className="text-xs text-stone-300 font-semibold">Drag & Drop sketch or click to select matching style</p>
                      <p className="text-[10px] text-stone-500 mt-1">Accepts designs from WhatsApp, Pinterest, or Solid Gold catalog</p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2.5 text-emerald-400">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold">{sketchName} attached successfully!</span>
                  </div>
                )}
              </div>
            </div>

            {/* 7. Special requirements text */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-400 uppercase tracking-widest font-bold block">
                Specific Casting Requests & Carvings:
              </label>
              <textarea
                value={enquiryDetails}
                onChange={(e) => setEnquiryDetails(e.target.value)}
                rows={3}
                placeholder="Explain details: e.g. Side-Mugappu should be peacock design with leaf layout, ruby settings. Kodi chain should be double flat link structure."
                className="w-full bg-stone-950 text-stone-200 border border-stone-800 rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-amber-400/50"
              />
            </div>

            {/* Trust aspect */}
            <div className="bg-amber-950/10 border border-amber-500/10 p-3.5 rounded-xl text-xs text-amber-300/80 flex items-start gap-2 max-w-xl">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Casting takes 3 to 7 working days. Once completed, we will share HD video recordings of the finish on WhatsApp before packaging!</span>
            </div>

            {/* WhatsApp CTA */}
            <div className="pt-2">
              <a
                id="submit-enquiry-whatsapp"
                href={getWhatsAppSubmitLink()}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  addToast("Casting specs generated! Forwarding to WhatsApp smithy chat...", "success");
                  setTimeout(() => {
                    onClose();
                  }, 1200); // Give the user time to see the beautiful toast before close
                }}
                className="w-full py-4.5 bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 hover:from-emerald-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 z-20 shadow-md transition-all text-center"
              >
                <MessageCircle className="w-4.5 h-4.5 fill-white text-emerald-600" />
                <span>Submit Custom Casting on WhatsApp</span>
              </a>
              <p className="text-[9px] text-stone-500 text-center font-mono mt-2 uppercase tracking-widest">
                🛡️ Guaranteed exact solid gold look replica
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
