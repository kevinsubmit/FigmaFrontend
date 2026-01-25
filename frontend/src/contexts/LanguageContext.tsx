import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type LanguageCode = 'en' | 'es' | 'zh' | 'ko' | 'fr' | 'vi';

type Translations = Record<string, string>;

const LANGUAGE_STORAGE_KEY = 'app_language';

export const LANGUAGE_OPTIONS: Array<{ code: LanguageCode; name: string; native: string }> = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'zh', name: 'Chinese', native: '简体中文' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
];

const translations: Record<LanguageCode, Translations> = {
  en: {
    'settings.title': 'Settings',
    'settings.account': 'Account & Preferences',
    'settings.platform': 'Platform',
    'settings.others': 'Others',
    'settings.profileSettings': 'Profile Settings',
    'settings.changePassword': 'Change Password',
    'settings.phoneNumber': 'Phone Number',
    'settings.vipMembership': 'VIP Membership',
    'settings.language': 'Language',
    'settings.notifications': 'Notifications',
    'settings.feedbackSupport': 'Feedback & Support',
    'settings.partnershipInquiry': 'Partnership Inquiry',
    'settings.privacySafety': 'Privacy & Safety',
    'settings.aboutUs': 'About Us',
    'settings.logout': 'Logout',
    'settings.languageDescription': 'Select your preferred language for the application interface.',
    'settings.logoutSuccess': 'Successfully logged out',
    'settings.languageChanged': 'Language changed to {language}',
  },
  es: {
    'settings.title': 'Configuración',
    'settings.account': 'Cuenta y preferencias',
    'settings.platform': 'Plataforma',
    'settings.others': 'Otros',
    'settings.profileSettings': 'Ajustes de perfil',
    'settings.changePassword': 'Cambiar contraseña',
    'settings.phoneNumber': 'Número de teléfono',
    'settings.vipMembership': 'Membresía VIP',
    'settings.language': 'Idioma',
    'settings.notifications': 'Notificaciones',
    'settings.feedbackSupport': 'Comentarios y soporte',
    'settings.partnershipInquiry': 'Consulta de colaboración',
    'settings.privacySafety': 'Privacidad y seguridad',
    'settings.aboutUs': 'Sobre nosotros',
    'settings.logout': 'Cerrar sesión',
    'settings.languageDescription': 'Selecciona tu idioma preferido para la aplicación.',
    'settings.logoutSuccess': 'Sesión cerrada correctamente',
    'settings.languageChanged': 'Idioma cambiado a {language}',
  },
  zh: {
    'settings.title': '设置',
    'settings.account': '账户与偏好',
    'settings.platform': '平台',
    'settings.others': '其他',
    'settings.profileSettings': '个人资料设置',
    'settings.changePassword': '修改密码',
    'settings.phoneNumber': '手机号',
    'settings.vipMembership': 'VIP 会员',
    'settings.language': '语言',
    'settings.notifications': '通知',
    'settings.feedbackSupport': '反馈与支持',
    'settings.partnershipInquiry': '合作咨询',
    'settings.privacySafety': '隐私与安全',
    'settings.aboutUs': '关于我们',
    'settings.logout': '退出登录',
    'settings.languageDescription': '选择你偏好的应用语言。',
    'settings.logoutSuccess': '已退出登录',
    'settings.languageChanged': '语言已切换为 {language}',
  },
  ko: {
    'settings.title': '설정',
    'settings.account': '계정 및 환경설정',
    'settings.platform': '플랫폼',
    'settings.others': '기타',
    'settings.profileSettings': '프로필 설정',
    'settings.changePassword': '비밀번호 변경',
    'settings.phoneNumber': '전화번호',
    'settings.vipMembership': 'VIP 멤버십',
    'settings.language': '언어',
    'settings.notifications': '알림',
    'settings.feedbackSupport': '피드백 및 지원',
    'settings.partnershipInquiry': '파트너십 문의',
    'settings.privacySafety': '개인정보 및 보안',
    'settings.aboutUs': '회사 소개',
    'settings.logout': '로그아웃',
    'settings.languageDescription': '앱에서 사용할 언어를 선택하세요.',
    'settings.logoutSuccess': '로그아웃되었습니다',
    'settings.languageChanged': '언어가 {language}(으)로 변경되었습니다',
  },
  fr: {
    'settings.title': 'Paramètres',
    'settings.account': 'Compte et préférences',
    'settings.platform': 'Plateforme',
    'settings.others': 'Autres',
    'settings.profileSettings': 'Paramètres du profil',
    'settings.changePassword': 'Changer le mot de passe',
    'settings.phoneNumber': 'Numéro de téléphone',
    'settings.vipMembership': 'Adhésion VIP',
    'settings.language': 'Langue',
    'settings.notifications': 'Notifications',
    'settings.feedbackSupport': 'Avis et assistance',
    'settings.partnershipInquiry': 'Demande de partenariat',
    'settings.privacySafety': 'Confidentialité et sécurité',
    'settings.aboutUs': 'À propos',
    'settings.logout': 'Déconnexion',
    'settings.languageDescription': "Choisissez votre langue préférée pour l'application.",
    'settings.logoutSuccess': 'Déconnexion réussie',
    'settings.languageChanged': 'Langue changée en {language}',
  },
  vi: {
    'settings.title': 'Cài đặt',
    'settings.account': 'Tài khoản & tuỳ chọn',
    'settings.platform': 'Nền tảng',
    'settings.others': 'Khác',
    'settings.profileSettings': 'Cài đặt hồ sơ',
    'settings.changePassword': 'Đổi mật khẩu',
    'settings.phoneNumber': 'Số điện thoại',
    'settings.vipMembership': 'Hội viên VIP',
    'settings.language': 'Ngôn ngữ',
    'settings.notifications': 'Thông báo',
    'settings.feedbackSupport': 'Phản hồi & hỗ trợ',
    'settings.partnershipInquiry': 'Yêu cầu hợp tác',
    'settings.privacySafety': 'Quyền riêng tư & an toàn',
    'settings.aboutUs': 'Về chúng tôi',
    'settings.logout': 'Đăng xuất',
    'settings.languageDescription': 'Chọn ngôn ngữ bạn muốn sử dụng cho ứng dụng.',
    'settings.logoutSuccess': 'Đã đăng xuất thành công',
    'settings.languageChanged': 'Đã đổi ngôn ngữ sang {language}',
  },
};

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: string, params?: Record<string, string>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): LanguageCode {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const matched = LANGUAGE_OPTIONS.find((option) => option.code === stored);
  return matched?.code ?? 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(getInitialLanguage);

  const setLanguage = (next: LanguageCode) => {
    setLanguageState(next);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  };

  const t = useMemo(() => {
    return (key: string, params?: Record<string, string>) => {
      const dictionary = translations[language] || translations.en;
      const template = dictionary[key] || translations.en[key] || key;
      if (!params) {
        return template;
      }
      return Object.keys(params).reduce(
        (acc, paramKey) => acc.replaceAll(`{${paramKey}}`, params[paramKey]),
        template
      );
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
