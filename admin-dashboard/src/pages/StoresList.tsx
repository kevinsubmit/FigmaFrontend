import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Store as StoreIcon } from 'lucide-react';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { getStoreById, getStores, Store } from '../api/stores';
import { useAuth } from '../context/AuthContext';

const StoresList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const queryParams = useMemo(() => {
    return { limit: 100 };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (user?.store_id) {
          const store = await getStoreById(user.store_id);
          setStores(store ? [store] : []);
        } else {
          const data = await getStores(queryParams);
          setStores(data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [queryParams, user?.store_id]);

  return (
    <AdminLayout>
      <TopBar title="店铺管理" subtitle="查看并进入店铺详情配置" />
      <div className="px-4 pt-5 pb-4 space-y-4 lg:px-6">
        <div className="card-surface p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Stores overview</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">共 {stores.length} 家店铺</h2>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <StoreIcon className="h-5 w-5 text-blue-600" />
          </div>
        </div>

        {loading ? (
          <div className="card-surface p-6 text-slate-500">Loading stores...</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => navigate(`/admin/stores/${store.id}`)}
                className="w-full text-left card-surface p-4 hover:border-blue-200 hover:bg-blue-50/40 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{store.name}</h3>
                    <p className="mt-2 text-xs text-slate-500 inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-blue-500" />
                      {store.address}
                    </p>
                  </div>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">
                    #{store.id}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        {!loading && stores.length === 0 && (
          <div className="card-surface p-6 text-slate-500 text-sm">No stores found.</div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StoresList;
