import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { getStoreById, Store } from '../api/stores';

const StoreDetail: React.FC = () => {
  const { id } = useParams();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (id) {
          const data = await getStoreById(Number(id));
          setStore(data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <AdminLayout>
      <TopBar title="Store Detail" />
      <div className="px-4 py-6">
        {loading && <div className="text-gray-500">Loading...</div>}
        {!loading && store && (
          <div className="card-surface p-4 space-y-3">
            <h2 className="text-xl font-semibold">{store.name}</h2>
            <p className="text-sm text-gray-400">{store.address}</p>
            <p className="text-sm text-gray-500">{store.phone || 'No phone listed'}</p>
            <span className="badge">Rating {store.rating ?? 'N/A'}</span>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StoreDetail;
