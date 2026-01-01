import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Gift, 
  Bell, 
  ShieldCheck, 
  Store, 
  MessageSquare, 
  Info, 
  CreditCard, 
  LogOut,
  Share2,
  Copy,
  CheckCircle2,
  Star,
  Users
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from "sonner@2.0.3";

type SettingsSection = 'main' | 'referral' | 'language' | 'partnership' | 'about' | 'feedback' | 'vip';

interface SettingsProps {
  onBack: () => void;
  initialSection?: SettingsSection;
}

export function Settings({ onBack, initialSection = 'main' }: SettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isCopied, setIsCopied] = useState(false);

  const referralCode = "GOLDEN99";

  const handleCopyCode = () => {
    const textToCopy = referralCode;
    
    // Always attempt the fallback first or in combination if the modern API is blocked by policy
    // In many iframe/sandbox environments, navigator.clipboard is present but throws NotAllowedError
    fallbackCopyTextToClipboard(textToCopy);
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    try {
      // Create a temporary input element
      const textArea = document.createElement("textarea");
      textArea.value = text;
      
      // Ensure it's not visible but part of the document
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      
      // Execute copy command
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setIsCopied(true);
        toast.success("Referral code copied!");
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        // If execCommand also fails, at least show the code to the user clearly
        toast.error("Copy blocked by browser. Please manually copy: " + text);
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      toast.error("Please manually copy the code: " + text);
    }
  };

  const handleLogout = () => {
    toast.success("Successfully logged out");
    onBack();
  };

  const handleSectionBack = () => {
    if (activeSection === initialSection && initialSection !== 'main') {
      onBack();
    } else {
      setActiveSection('main');
    }
  };

  const sections = [
    {
      title: "Account & Preferences",
      items: [
        { label: 'Profile Settings', icon: User, action: () => console.log('Profile') },
        { label: 'VIP Membership', icon: Star, badge: "VIP 3", action: () => setActiveSection('vip') },
        { 
          label: 'Language', 
          icon: Share2, // Using Share2 as a proxy for language/globe if Globe is not checked
          badge: selectedLanguage,
          action: () => setActiveSection('language') 
        },
        { label: 'Notifications', icon: Bell, action: () => setActiveSection('notifications') },
      ]
    },
    {
      title: "Promotions",
      items: [
        { 
          label: 'Refer a Friend', 
          icon: Gift, 
          badge: "Get $10", 
          action: () => setActiveSection('referral') 
        },
      ]
    },
    {
      title: "Platform",
      items: [
        { label: 'Feedback & Support', icon: MessageSquare, action: () => setActiveSection('feedback') },
        { label: 'Partnership Inquiry', icon: Store, action: () => setActiveSection('partnership') },
        { label: 'Privacy & Safety', icon: ShieldCheck, action: () => console.log('Privacy') },
      ]
    },
    {
      title: "Others",
      items: [
        { label: 'About Us', icon: Info, action: () => setActiveSection('about') },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-24 relative overflow-x-hidden">
      <AnimatePresence mode="wait">
        {activeSection === 'main' ? (
          <motion.div 
            key="main"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="animate-in fade-in"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-[#333]">
              <div className="flex items-center px-4 h-16 pt-[calc(env(safe-area-inset-top))]">
                <button onClick={onBack} className="p-2 -ml-2 text-white hover:text-[#D4AF37] transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold ml-2">Settings</h1>
              </div>
            </div>

            {/* Menu Sections */}
            <div className="px-4 mt-6 space-y-8">
              {sections.map((section, sIdx) => (
                <div key={sIdx}>
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1">
                    {section.title}
                  </h3>
                  <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
                    {section.items.map((item, iIdx) => (
                      <div key={iIdx}>
                        <button
                          onClick={item.action}
                          className="w-full flex items-center justify-between p-4 hover:bg-[#1a1a1a] transition-all active:scale-[0.98]"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#222] flex items-center justify-center">
                              <item.icon className="w-5 h-5 text-gray-400" />
                            </div>
                            <span className="text-base font-medium text-white">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {item.badge && (
                              <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D4AF37]/20 uppercase">
                                {item.badge}
                              </span>
                            )}
                            <ChevronRight className="w-5 h-5 text-gray-700" />
                          </div>
                        </button>
                        {iIdx < section.items.length - 1 && (
                          <div className="h-px bg-[#222] mx-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-4 mt-4 bg-[#111] border border-[#222] text-red-400 font-bold rounded-2xl hover:bg-red-500/5 hover:border-red-500/20 transition-all active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
              
              <div className="text-center pb-10">
                   <p className="text-xs text-gray-700">Figma Make Beauty Platform • v1.2.0</p>
              </div>
            </div>
          </motion.div>
        ) : activeSection === 'referral' ? (
          <motion.div 
            key="referral"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="px-6 pt-10"
          >
            <button onClick={handleSectionBack} className="mb-8 flex items-center text-gray-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>

            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Gift className="w-10 h-10 text-[#D4AF37]" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Refer a Friend</h2>
              <p className="text-gray-400 leading-relaxed max-w-xs mx-auto">
                Share the glow! Both you and your friend will receive <span className="text-[#D4AF37] font-bold">1 Free Coupon ($10 value)</span> after their first booking.
              </p>
            </div>

            <div className="bg-[#111] border border-[#222] rounded-3xl p-6 mb-8 text-center">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Your Referral Code</p>
              <div className="bg-black border border-[#333] p-4 rounded-2xl flex items-center justify-between group">
                <span className="text-2xl font-bold tracking-[0.3em] text-white ml-2">{referralCode}</span>
                <button 
                  onClick={handleCopyCode}
                  className="w-12 h-12 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                >
                  {isCopied ? <CheckCircle2 className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <button className="w-full py-4 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors">
                <Share2 className="w-5 h-5" />
                Share with Friends
              </button>
              <div className="flex items-center gap-4 py-4 text-xs text-gray-500 justify-center">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 12 Referrals</span>
                <span className="h-1 w-1 bg-gray-700 rounded-full" />
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-[#D4AF37]" /> 2 Coupons Earned</span>
              </div>
            </div>
          </motion.div>
        ) : activeSection === 'language' ? (
          <motion.div 
            key="language"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="px-6 pt-10"
          >
            <button onClick={handleSectionBack} className="mb-8 flex items-center text-gray-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>

            <h2 className="text-3xl font-bold mb-2">Language</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Select your preferred language for the application interface.
            </p>

            <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
              {[
                { name: 'English', native: 'English' },
                { name: 'Spanish', native: 'Español' },
                { name: 'Chinese', native: '简体中文' },
                { name: 'Korean', native: '한국어' },
                { name: 'French', native: 'Français' },
                { name: 'Vietnamese', native: 'Tiếng Việt' }
              ].map((lang, idx, arr) => (
                <div key={lang.name}>
                  <button
                    onClick={() => {
                      setSelectedLanguage(lang.name);
                      toast.success(`Language changed to ${lang.name}`);
                      setTimeout(() => setActiveSection('main'), 500);
                    }}
                    className="w-full flex items-center justify-between p-5 hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex flex-col items-start">
                      <span className={`text-base font-medium ${selectedLanguage === lang.name ? 'text-[#D4AF37]' : 'text-white'}`}>
                        {lang.native}
                      </span>
                      <span className="text-xs text-gray-500">{lang.name}</span>
                    </div>
                    {selectedLanguage === lang.name && (
                      <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
                    )}
                  </button>
                  {idx < arr.length - 1 && <div className="h-px bg-[#222] mx-5" />}
                </div>
              ))}
            </div>
          </motion.div>
        ) : activeSection === 'vip' ? (
          <motion.div 
            key="vip"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="px-6 pt-10 pb-20"
          >
            <button onClick={handleSectionBack} className="mb-8 flex items-center text-gray-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>

            <div className="relative mb-10 p-8 rounded-[2rem] bg-gradient-to-br from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] text-black overflow-hidden shadow-2xl shadow-[#D4AF37]/20">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Star className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 opacity-70">Current Tier</p>
                <h2 className="text-5xl font-black mb-4 italic tracking-tighter">VIP 3</h2>
                <div className="h-1.5 w-full bg-black/10 rounded-full mb-3 overflow-hidden">
                  <div className="h-full bg-black w-[65%] rounded-full" />
                </div>
                <p className="text-xs font-bold flex justify-between">
                  <span>850 / 1200 EXP</span>
                  <span>Next: VIP 4</span>
                </p>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
              VIP Benefits Program
            </h3>

            <div className="space-y-4">
              {[
                { level: "VIP 1-3", title: "Silver Perks", benefits: ["5% off all services", "Birthday gift coupon", "Member-only events"] },
                { level: "VIP 4-6", title: "Gold Status", benefits: ["10% off all services", "Priority booking", "Free soak-off service"] },
                { level: "VIP 7-9", title: "Platinum Luxe", benefits: ["15% off all services", "Free hand mask with every visit", "Skip the line queue"] },
                { level: "VIP 10", title: "Diamond Elite", benefits: ["20% off all services", "Personal style consultant", "Free premium drink & snacks"] },
              ].map((tier, idx) => (
                <div key={idx} className="bg-[#111] border border-[#222] rounded-2xl p-5 hover:border-[#D4AF37]/30 transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[#D4AF37] font-black italic">{tier.level}</span>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{tier.title}</span>
                  </div>
                  <ul className="space-y-2">
                    {tier.benefits.map((benefit, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-3 text-sm text-gray-400">
                        <CheckCircle2 className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="mt-8 text-center text-[10px] text-gray-600 uppercase tracking-widest leading-loose">
              Points are earned with every dollar spent.<br/>
              $1 = 1 EXP
            </p>
          </motion.div>
        ) : activeSection === 'partnership' ? (
          <motion.div 
            key="partnership"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="px-6 pt-10"
          >
            <button onClick={handleSectionBack} className="mb-8 flex items-center text-gray-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>

            <h2 className="text-3xl font-bold mb-2">Partner with Us</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Are you a salon owner? Join our network and reach thousands of new customers in your area.
            </p>

            <div className="space-y-6">
              <div className="bg-[#111] border border-[#222] p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Store className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">List Your Salon</h4>
                    <p className="text-xs text-gray-500">Get discovered by local beauty seekers</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Advanced Booking</h4>
                    <p className="text-xs text-gray-500">Manage appointments with ease</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-4 text-center">Contact our Partnership Team</p>
                <div className="grid grid-cols-2 gap-4">
                  <button className="flex flex-col items-center gap-3 p-6 bg-[#111] border border-[#222] rounded-2xl hover:border-[#25D366]/50 transition-all active:scale-95 group">
                    <div className="w-12 h-12 bg-[#25D366]/10 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-[#25D366]" />
                    </div>
                    <span className="text-sm font-bold">WhatsApp</span>
                  </button>
                  <button className="flex flex-col items-center gap-3 p-6 bg-[#111] border border-[#222] rounded-2xl hover:border-white/50 transition-all active:scale-95 group">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                      <Share2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-bold">iMessage</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeSection === 'feedback' ? (
          <motion.div 
            key="feedback"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="px-6 pt-10"
          >
            <button onClick={handleSectionBack} className="mb-8 flex items-center text-gray-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>

            <h2 className="text-3xl font-bold mb-2">Feedback & Support</h2>
            <p className="text-gray-400 mb-10 leading-relaxed">
              How can we help you today? Select your preferred way to reach our support team.
            </p>

            <div className="space-y-4">
              <button className="w-full flex items-center gap-4 p-5 bg-[#111] border border-[#222] rounded-2xl hover:bg-[#1a1a1a] transition-all active:scale-[0.98]">
                <div className="w-12 h-12 bg-[#25D366]/10 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-[#25D366]" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-bold">WhatsApp Support</h4>
                  <p className="text-xs text-gray-500">Fastest response time</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>

              <button className="w-full flex items-center gap-4 p-5 bg-[#111] border border-[#222] rounded-2xl hover:bg-[#1a1a1a] transition-all active:scale-[0.98]">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-bold">iMessage</h4>
                  <p className="text-xs text-gray-500">Standard for iPhone users</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>

              <button className="w-full flex items-center gap-4 p-5 bg-[#111] border border-[#222] rounded-2xl hover:bg-[#1a1a1a] transition-all active:scale-[0.98]">
                <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-bold">Instagram DM</h4>
                  <p className="text-xs text-gray-500">Follow us for nail inspo</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <div className="mt-12 p-6 bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-2xl text-center">
              <p className="text-sm text-gray-400 italic">"Our team usually responds within 2 hours during business hours."</p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="other"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-6 pt-10 text-center"
          >
            <button onClick={handleSectionBack} className="mb-8 flex items-center text-gray-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <div className="py-20">
               <h3 className="text-xl font-bold mb-4">Coming Soon</h3>
               <p className="text-gray-500">This section is currently under development.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}