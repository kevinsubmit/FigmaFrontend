import { 
  ArrowLeft,
  ChevronLeft, 
  ChevronRight, 
  User, 
  Bell, 
  ShieldCheck, 
  Store, 
  MessageSquare, 
  Info, 
  CreditCard, 
  LogOut,
  Share2,
  Star,
  CheckCircle2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from "sonner@2.0.3";
import authService from '../services/auth.service';
import { LANGUAGE_OPTIONS, useLanguage } from '../contexts/LanguageContext';
import vipService from '../services/vip.service';

type SettingsSection = 'main' | 'language' | 'partnership' | 'about' | 'feedback' | 'vip' | 'notifications' | 'password' | 'phone';

interface SettingsProps {
  onBack: () => void;
  initialSection?: SettingsSection;
}

export function Settings({ onBack, initialSection = 'main' }: SettingsProps) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [vipBadge, setVipBadge] = useState('VIP 0');
  const { language, setLanguage, t } = useLanguage();
  const selectedLanguageLabel = LANGUAGE_OPTIONS.find((option) => option.code === language)?.name ?? 'English';

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [activeSection]);

  useEffect(() => {
    const loadVip = async () => {
      try {
        const status = await vipService.getStatus();
        setVipBadge(`VIP ${status.current_level.level}`);
      } catch (error) {
        console.error('Failed to load VIP status:', error);
      }
    };
    loadVip();
  }, []);

  const renderSectionHeader = (title: string) => (
    <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-[#333]">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={handleSectionBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-lg font-bold">{title}</h1>
        <div className="w-8" />
      </div>
    </div>
  );

  const handleLogout = () => {
    authService.logout();
    toast.success(t('settings.logoutSuccess'));
    navigate('/login', { replace: true });
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
      title: t('settings.account'),
      items: [
        { label: t('settings.profileSettings'), icon: User, action: () => navigate('/edit-profile') },
        { label: t('settings.changePassword'), icon: ShieldCheck, action: () => navigate('/change-password') },
        { label: t('settings.phoneNumber'), icon: Bell, action: () => navigate('/phone-management') },
        { label: t('settings.vipMembership'), icon: Star, badge: vipBadge, action: () => navigate('/vip-description', { state: { from: 'settings' } }) },
        { 
          label: t('settings.language'), 
          icon: Share2, // Using Share2 as a proxy for language/globe if Globe is not checked
          badge: selectedLanguageLabel,
          action: () => navigate('/language')
        },
        { label: t('settings.notifications'), icon: Bell, action: () => navigate('/notifications') },
      ]
    },
    {
      title: t('settings.platform'),
      items: [
        { label: t('settings.feedbackSupport'), icon: MessageSquare, action: () => navigate('/feedback-support') },
        { label: t('settings.partnershipInquiry'), icon: Store, action: () => navigate('/partnership') },
        { label: t('settings.privacySafety'), icon: ShieldCheck, action: () => navigate('/privacy-safety') },
      ]
    },
    {
      title: t('settings.others'),
      items: [
        { label: t('settings.aboutUs'), icon: Info, action: () => navigate('/about') },
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
              <div className="flex items-center justify-between px-4 py-3 pt-[calc(env(safe-area-inset-top))]">
                <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-lg font-bold">{t('settings.title')}</h1>
                <div className="w-8" />
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
                {t('settings.logout')}
              </button>
              
              <div className="text-center pb-10">
                   <p className="text-xs text-gray-700">Figma Make Beauty Platform • v1.2.0</p>
              </div>
            </div>
          </motion.div>
        ) : activeSection === 'language' ? (
          <motion.div 
            key="language"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="pb-16"
          >
            {renderSectionHeader(t('settings.language'))}

            <div className="px-6 pt-6">
              <p className="text-gray-400 mb-8 leading-relaxed">
                {t('settings.languageDescription')}
              </p>

              <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
                {LANGUAGE_OPTIONS.map((lang, idx, arr) => (
                  <div key={lang.code}>
                    <button
                      onClick={() => {
                        setLanguage(lang.code);
                        toast.success(t('settings.languageChanged', { language: lang.name }));
                        setTimeout(() => setActiveSection('main'), 500);
                      }}
                      className="w-full flex items-center justify-between p-5 hover:bg-[#1a1a1a] transition-colors"
                    >
                      <div className="flex flex-col items-start">
                        <span className={`text-base font-medium ${language === lang.code ? 'text-[#D4AF37]' : 'text-white'}`}>
                          {lang.native}
                        </span>
                        <span className="text-xs text-gray-500">{lang.name}</span>
                      </div>
                      {language === lang.code && (
                        <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
                      )}
                    </button>
                    {idx < arr.length - 1 && <div className="h-px bg-[#222] mx-5" />}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : activeSection === 'vip' ? (
          <motion.div 
            key="vip"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="pb-20"
          >
            {renderSectionHeader('VIP Membership')}

            <div className="px-6 pt-6">
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
            </div>
          </motion.div>
        ) : activeSection === 'partnership' ? (
          <motion.div 
            key="partnership"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="pb-16"
          >
            {renderSectionHeader('Partner with Us')}

            <div className="px-6 pt-6">
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
            </div>
          </motion.div>
        ) : activeSection === 'feedback' ? (
          <motion.div 
            key="feedback"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="pb-16"
          >
            {renderSectionHeader('Feedback & Support')}

            <div className="px-6 pt-6">
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
            </div>
          </motion.div>
        ) : activeSection === 'notifications' ? (
          <motion.div 
            key="notifications"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="pb-16"
          >
            {renderSectionHeader('Notifications')}

            <div className="px-6 pt-6">
              <p className="text-gray-400 mb-8 leading-relaxed">
                Manage your notification preferences
              </p>

              <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white mb-1">Push Notifications</h4>
                    <p className="text-xs text-gray-500">Receive updates about your bookings</p>
                  </div>
                  <button
                    onClick={() => {
                      setNotificationEnabled(!notificationEnabled);
                      toast.success(notificationEnabled ? 'Notifications disabled' : 'Notifications enabled');
                    }}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      notificationEnabled ? 'bg-[#D4AF37]' : 'bg-gray-700'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        notificationEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeSection === 'password' ? (
          <motion.div 
            key="password"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="pb-16"
          >
            {renderSectionHeader('Change Password')}

            <div className="px-6 pt-6">
              <p className="text-gray-400 mb-8 leading-relaxed">
                Update your account password
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                </div>
                <button
                  onClick={() => {
                    toast.success('Password updated successfully');
                    setTimeout(() => setActiveSection('main'), 1000);
                  }}
                  className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl hover:bg-[#B8941F] transition-colors"
                >
                  Update Password
                </button>
              </div>
            </div>
          </motion.div>
        ) : activeSection === 'phone' ? (
          <motion.div 
            key="phone"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="pb-16"
          >
            {renderSectionHeader('Phone Number')}

            <div className="px-6 pt-6">
              <p className="text-gray-400 mb-8 leading-relaxed">
                Manage your phone number
              </p>

              <div className="space-y-4">
                <div className="bg-[#111] border border-[#222] rounded-xl p-5">
                  <p className="text-sm text-gray-400 mb-2">Current Phone Number</p>
                  <p className="text-lg font-medium">+1 (555) 123-4567</p>
                </div>
                <button
                  onClick={() => {
                    toast.info('Phone number update feature coming soon');
                  }}
                  className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl hover:bg-[#B8941F] transition-colors"
                >
                  Change Phone Number
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="other"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pb-16"
          >
            {renderSectionHeader('Coming Soon')}
            <div className="px-6 py-20 text-center">
              <h3 className="text-xl font-bold mb-4">Coming Soon</h3>
              <p className="text-gray-500">This section is currently under development.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
