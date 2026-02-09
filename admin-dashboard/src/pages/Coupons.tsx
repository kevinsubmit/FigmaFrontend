import React, { useEffect, useState } from 'react';
import { Ticket } from 'lucide-react';
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
      <TopBar title="优惠券管理" subtitle="发放优惠券并查看模板列表" />
      <div className="px-4 py-5 space-y-4 lg:px-6">
        <div className="card-surface p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Coupons overview</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{coupons.length} 个优惠券模板</h2>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Ticket className="h-5 w-5 text-blue-600" />
          </div>
        </div>

        <div className="card-surface p-5 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Grant Coupon</p>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Recipient phone"
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
          />
          <select
            value={selectedCoupon}
            onChange={(event) => setSelectedCoupon(event.target.value)}
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
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
            className="w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-white"
          >
            Grant Coupon
          </button>
        </div>

        <div className="card-surface p-5 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Templates</p>
          {loading ? (
            <div className="text-slate-500">Loading coupons...</div>
          ) : (
            <div className="overflow-auto rounded-xl border border-blue-100 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-blue-50">
                  <tr className="text-xs uppercase tracking-[0.15em] text-slate-500">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="border-t border-blue-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{coupon.name}</td>
                      <td className="px-4 py-3 text-slate-700">{coupon.type}</td>
                      <td className="px-4 py-3 text-slate-700">{coupon.discount_value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Coupons;
