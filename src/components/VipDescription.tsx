import React from 'react';
import { ChevronLeft, Crown, Sparkles, Star, ShieldCheck, Gem } from 'lucide-react';
import { motion } from 'motion/react';

interface VipDescriptionProps {
  onBack: () => void;
}

export function VipDescription({ onBack }: VipDescriptionProps) {
  const tiers = [
    { 
      level: "VIP 1-3", 
      title: "Silver Perks", 
      color: "text-slate-400",
      bgColor: "bg-slate-400/10",
      benefits: ["5% off all services", "Birthday gift coupon", "Member-only events"] 
    },
    { 
      level: "VIP 4-6", 
      title: "Gold Status", 
      color: "text-[#D4AF37]",
      bgColor: "bg-[#D4AF37]/10",
      benefits: ["10% off all services", "Priority booking", "Free soak-off service"] 
    },
    { 
      level: "VIP 7-9", 
      title: "Platinum Luxe", 
      color: "text-blue-300",
      bgColor: "bg-blue-300/10",
      benefits: ["15% off all services", "Free hand mask with every visit", "Skip the line queue"] 
    },
    { 
      level: "VIP 10", 
      title: "Diamond Elite", 
      color: "text-[#D4AF37]",
      bgColor: "bg-[#D4AF37]/10",
      benefits: ["20% off all services", "Personal style consultant", "Free premium drink & snacks"] 
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-12">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center px-4 h-16">
          <button onClick={onBack} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="ml-2 text-lg font-medium tracking-tight">VIP Membership</h1>
        </div>
      </header>

      <div className="pt-24 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#D4AF37]/10 mb-6">
            <Crown className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <h2 className="text-2xl font-light tracking-widest uppercase mb-4">Elite Rewards Program</h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
            Elevate your experience with our tiered rewards. The more you pamper yourself, the more exclusive your benefits become.
          </p>
        </motion.div>

        {/* Tiers */}
        <div className="space-y-6">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.level}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-6 rounded-2xl border border-white/5 bg-[#111] relative overflow-hidden`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className={`text-lg font-medium text-[#D4AF37] mb-1 italic`}>{tier.level}</h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">{tier.title}</p>
                </div>
                {index === 3 ? <Gem className="w-6 h-6 text-[#D4AF37]" /> : 
                 index === 2 ? <Star className="w-6 h-6 text-blue-300" /> : 
                 index === 1 ? <Star className="w-6 h-6 text-[#D4AF37]" /> : 
                 <ShieldCheck className="w-6 h-6 text-slate-400" />}
              </div>

              <ul className="space-y-3">
                {tier.benefits.map((benefit, bIndex) => (
                  <li key={bIndex} className="flex items-start gap-3">
                    <Sparkles className="w-3 h-3 text-[#D4AF37] mt-1 flex-shrink-0" />
                    <span className="text-sm text-zinc-300 leading-snug">{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* How to Redeem */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 p-8 border border-[#D4AF37]/20 rounded-2xl bg-gradient-to-b from-[#D4AF37]/5 to-transparent"
        >
          <h4 className="text-[#D4AF37] font-medium mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
            <Sparkles className="w-4 h-4" /> Redemption Logic
          </h4>
          <p className="text-sm text-zinc-400 leading-relaxed italic">
            "Points are accumulated automatically with every visit. To redeem your benefits, simply present your digital membership card to your technician during checkout. All vouchers and tier rewards must be redeemed in-store."
          </p>
        </motion.div>

        <p className="text-[10px] text-center text-zinc-600 mt-12 uppercase tracking-widest">
          Figma Make Nails • Exclusive American Salon Program
        </p>
      </div>
    </div>
  );
}