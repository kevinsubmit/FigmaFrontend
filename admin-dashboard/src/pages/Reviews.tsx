import React from 'react';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';

const Reviews: React.FC = () => (
  <AdminLayout>
    <TopBar title="Reviews" />
    <div className="px-4 py-6 text-gray-500">
      Reviews moderation will be added next.
    </div>
  </AdminLayout>
);

export default Reviews;
