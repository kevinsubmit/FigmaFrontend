import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner@2.0.3';
import { LANGUAGE_OPTIONS, useLanguage } from '../contexts/LanguageContext';

export function LanguageSettings() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-safe animate-in fade-in duration-300">
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-[#333]">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-lg font-bold">{t('settings.language')}</h1>
          <div className="w-8" />
        </div>
      </div>

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
    </div>
  );
}

export default LanguageSettings;
