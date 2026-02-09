import React from 'react';
import { MessageSquare } from 'lucide-react';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';

const Reviews: React.FC = () => (
  <AdminLayout>
    <TopBar title="评价管理" subtitle="评价审核与回复能力将在此页扩展" />
    <div className="px-4 py-5 lg:px-6">
      <div className="card-surface p-6 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Reviews 模块待上线</h2>
          <p className="mt-1 text-sm text-slate-600">
            当前版本保留占位页，下一阶段可接入评价列表、筛选、回复与屏蔽流程。
          </p>
        </div>
      </div>
    </div>
  </AdminLayout>
);

export default Reviews;
