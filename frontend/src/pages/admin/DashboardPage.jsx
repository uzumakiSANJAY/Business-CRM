import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/shared/Layout.jsx';
import KPICards from '../../components/admin/KPICards.jsx';
import MonthlyChart from '../../components/admin/MonthlyChart.jsx';
import DailyCollectionTable from '../../components/admin/DailyCollectionTable.jsx';
import VendorOutstandingTable from '../../components/admin/VendorOutstandingTable.jsx';
import {
  getDashboardStats, getMonthlyChart, getDailyCollections, getVendorTable,
} from '../../api/dashboard.api.js';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats });
  const { data: monthly, isLoading: monthlyLoading } = useQuery({ queryKey: ['monthly-chart'], queryFn: getMonthlyChart });
  const { data: daily, isLoading: dailyLoading } = useQuery({ queryKey: ['daily-collections'], queryFn: getDailyCollections });
  const { data: vendors, isLoading: vendorsLoading } = useQuery({ queryKey: ['vendor-table'], queryFn: getVendorTable });

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        {/* KPI Row */}
        <KPICards stats={stats} isLoading={statsLoading} />

        {/* Chart + Daily */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <MonthlyChart data={monthly} isLoading={monthlyLoading} />
          </div>
          <DailyCollectionTable data={daily} isLoading={dailyLoading} />
        </div>

        {/* Vendor Outstanding Table */}
        <VendorOutstandingTable data={vendors} isLoading={vendorsLoading} />
      </div>
    </Layout>
  );
}
