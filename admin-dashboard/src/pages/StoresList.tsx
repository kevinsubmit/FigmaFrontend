import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      <TopBar title="Stores" />
      <div className="px-4 pt-6 space-y-4">
        {loading ? (
          <div className="text-gray-500">Loading stores...</div>
        ) : (
          stores.map((store) => (
            <button
              key={store.id}
              onClick={() => navigate(`/admin/stores/${store.id}`)}
              className="w-full text-left card-surface p-4"
            >
              <h3 className="text-base font-semibold">{store.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{store.address}</p>
            </button>
          ))
        )}
        {!loading && stores.length === 0 && (
          <div className="text-gray-500 text-sm">No stores found.</div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StoresList;
