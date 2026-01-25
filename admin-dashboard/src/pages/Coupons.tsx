import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { Coupon, getCoupons, grantCoupon } from '../api/coupons';
import { toast } from 'react-toastify';

const Coupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [selectedCoupon, setSelectedCoupon] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getCoupons();
        setCoupons(data);
      } catch (error) {
        toast.error('Failed to load coupons');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleGrant = async () => {
    if (!phone || !selectedCoupon) {
      toast.error('Phone and coupon are required');
      return;
    }
    try {
      await grantCoupon({ phone, coupon_id: Number(selectedCoupon) });
      toast.success('Coupon granted');
      setPhone('');
      setSelectedCoupon('');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to grant coupon');
    }
  };

  return (
    <AdminLayout>
      <TopBar title="Coupons" />
      <div className="px-4 py-6 space-y-5">
        <div className="card-surface p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Grant Coupon</p>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Recipient phone"
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
          />
          <select
            value={selectedCoupon}
            onChange={(event) => setSelectedCoupon(event.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
          >
            <option value="">Select coupon</option>
            {coupons.map((coupon) => (
              <option key={coupon.id} value={coupon.id}>
                {coupon.name} ({coupon.type} {coupon.discount_value})
              </option>
            ))}
          </select>
          <button
            onClick={handleGrant}
            className="w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-black"
          >
            Grant Coupon
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Templates</p>
          {loading ? (
            <div className="text-gray-500">Loading coupons...</div>
          ) : (
            coupons.map((coupon) => (
              <div key={coupon.id} className="card-surface p-4">
                <h3 className="text-base font-semibold">{coupon.name}</h3>
                <p className="text-xs text-gray-500">{coupon.type} · {coupon.discount_value}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Coupons;
