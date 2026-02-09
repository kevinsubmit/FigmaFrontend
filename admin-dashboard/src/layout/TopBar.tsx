import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  title: string;
  backTo?: string;
  action?: React.ReactNode;
  subtitle?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title, backTo, action, subtitle }) => {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-blue-100">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <button
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          className="p-2 -ml-2 rounded-full border border-transparent text-slate-500 hover:text-blue-600 hover:bg-blue-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-lg font-semibold tracking-wide text-slate-900">{title}</h1>
          {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
        </div>

        <div className="min-w-[2rem] flex justify-end text-slate-600">{action}</div>
      </div>
    </div>
  );
};
