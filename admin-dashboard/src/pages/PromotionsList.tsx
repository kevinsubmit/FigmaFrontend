import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { getPromotions, Promotion } from '../api/promotions';

const PromotionsList: React.FC = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getPromotions({ active_only: false, limit: 100 });
        setPromotions(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <AdminLayout>
      <TopBar
        title="Promotions"
        action={
          <button
            onClick={() => navigate('/admin/promotions/new')}
            className="rounded-full bg-gold-500 px-3 py-1 text-xs font-semibold text-white"
          >
            New
          </button>
        }
      />
      <div className="px-4 pt-6 space-y-4">
        {loading ? (
          <div className="text-slate-500">Loading promotions...</div>
        ) : (
          promotions.map((promo) => (
            <button
              key={promo.id}
              onClick={() => navigate(`/admin/promotions/${promo.id}/edit`)}
              className="w-full text-left card-surface p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{promo.scope}</p>
                  <h3 className="text-base font-semibold">{promo.title}</h3>
                  <p className="text-xs text-slate-500">{promo.start_at} → {promo.end_at}</p>
                </div>
                <span className="badge">{promo.discount_type}</span>
              </div>
            </button>
          ))
        )}
        {!loading && promotions.length === 0 && (
          <div className="text-slate-500 text-sm">No promotions yet.</div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PromotionsList;
