import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  title: string;
  backTo?: string;
  action?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, backTo, action }) => {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          className="p-2 -ml-2 rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-wide">{title}</h1>
        <div className="min-w-[2rem] flex justify-end">{action}</div>
      </div>
    </div>
  );
};
