import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import axios from "axios";
import { API } from "@/App";
import { TrendingUp, Clock, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_receivables: 0,
    current: 0,
    overdue_1_15: 0,
    overdue_16_30: 0,
    overdue_31_45: 0,
    overdue_45_plus: 0,
    stats_table: null,
    monthly_chart: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/dashboard/stats`, {
          withCredentials: true,
        });
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
        </div>
      </Layout>
    );
  }

  const totalOverdue = stats.overdue_1_15 + stats.overdue_16_30 + stats.overdue_31_45 + stats.overdue_45_plus;
  const overduePercentage = stats.total_receivables > 0 
    ? Math.round((totalOverdue / stats.total_receivables) * 100) 
    : 0;

  // Chart max value
  const chartMax = Math.max(...(stats.monthly_chart || []).map(m => Math.max(m.sales || 0, m.receipts || 0)), 1);

  return (
    <Layout>
      <div data-testid="dashboard-page">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your business</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Receivables */}
          <div className="lg:col-span-2 space-y-6">
            {/* Total Receivables Card */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Total Receivables</h2>
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex items-end gap-4 mb-4">
                <span className="text-4xl font-bold font-mono">{formatCurrency(stats.total_receivables)}</span>
                {totalOverdue > 0 && (
                  <span className="text-orange-600 text-sm font-medium mb-1">
                    {formatCurrency(totalOverdue)} overdue
                  </span>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div 
                    className="bg-green-500 transition-all" 
                    style={{ width: `${stats.total_receivables > 0 ? ((stats.current / stats.total_receivables) * 100) : 0}%` }}
                  />
                  <div 
                    className="bg-orange-500 transition-all" 
                    style={{ width: `${overduePercentage}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Current</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-500 rounded-full"></span> Overdue</span>
              </div>
            </div>

            {/* Overdue Breakdown */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Overdue Breakdown</h2>
              <div className="grid grid-cols-5 gap-3">
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                  <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <div className="text-xs text-gray-500 mb-1">Current</div>
                  <div className="font-bold font-mono text-sm text-green-700">{formatCurrency(stats.current)}</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <Clock className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                  <div className="text-xs text-gray-500 mb-1">1-15 Days</div>
                  <div className="font-bold font-mono text-sm text-yellow-700">{formatCurrency(stats.overdue_1_15)}</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <Clock className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                  <div className="text-xs text-gray-500 mb-1">16-30 Days</div>
                  <div className="font-bold font-mono text-sm text-orange-700">{formatCurrency(stats.overdue_16_30)}</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
                  <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                  <div className="text-xs text-gray-500 mb-1">31-45 Days</div>
                  <div className="font-bold font-mono text-sm text-red-700">{formatCurrency(stats.overdue_31_45)}</div>
                </div>
                <div className="text-center p-3 bg-red-100 rounded-lg border border-red-200">
                  <AlertCircle className="w-5 h-5 text-red-700 mx-auto mb-1" />
                  <div className="text-xs text-gray-500 mb-1">45+ Days</div>
                  <div className="font-bold font-mono text-sm text-red-800">{formatCurrency(stats.overdue_45_plus)}</div>
                </div>
              </div>
            </div>

            {/* Sales Chart */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Sales & Receipts (This Fiscal Year)</h2>
              <div className="h-40 flex items-end gap-1">
                {(stats.monthly_chart || []).map((month, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 justify-center h-32">
                      <div 
                        className="w-3 bg-blue-500 rounded-t transition-all"
                        style={{ height: `${(month.sales / chartMax) * 100}%` }}
                        title={`Sales: ${formatCurrency(month.sales)}`}
                      />
                      <div 
                        className="w-3 bg-green-500 rounded-t transition-all"
                        style={{ height: `${(month.receipts / chartMax) * 100}%` }}
                        title={`Receipts: ${formatCurrency(month.receipts)}`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500">{month.month}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs justify-center">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded"></span> Sales</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> Receipts</span>
              </div>
            </div>
          </div>

          {/* Right Column - Stats Table */}
          <div className="space-y-6">
            {/* Sales, Receipts & Dues Table */}
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Sales, Receipts & Dues</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Period</th>
                      <th className="text-right p-3 font-medium text-gray-600">Sales</th>
                      <th className="text-right p-3 font-medium text-gray-600">Receipts</th>
                      <th className="text-right p-3 font-medium text-gray-600">Dues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.stats_table && (
                      <>
                        <tr className="border-t">
                          <td className="p-3 font-medium">Today</td>
                          <td className="p-3 text-right font-mono">{formatCurrency(stats.stats_table.today?.sales)}</td>
                          <td className="p-3 text-right font-mono text-green-600">{formatCurrency(stats.stats_table.today?.receipts)}</td>
                          <td className="p-3 text-right font-mono text-orange-600">{formatCurrency(stats.stats_table.today?.dues)}</td>
                        </tr>
                        <tr className="border-t bg-gray-50">
                          <td className="p-3 font-medium">This Week</td>
                          <td className="p-3 text-right font-mono">{formatCurrency(stats.stats_table.this_week?.sales)}</td>
                          <td className="p-3 text-right font-mono text-green-600">{formatCurrency(stats.stats_table.this_week?.receipts)}</td>
                          <td className="p-3 text-right font-mono text-orange-600">{formatCurrency(stats.stats_table.this_week?.dues)}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-3 font-medium">This Month</td>
                          <td className="p-3 text-right font-mono">{formatCurrency(stats.stats_table.this_month?.sales)}</td>
                          <td className="p-3 text-right font-mono text-green-600">{formatCurrency(stats.stats_table.this_month?.receipts)}</td>
                          <td className="p-3 text-right font-mono text-orange-600">{formatCurrency(stats.stats_table.this_month?.dues)}</td>
                        </tr>
                        <tr className="border-t bg-gray-50">
                          <td className="p-3 font-medium">This Quarter</td>
                          <td className="p-3 text-right font-mono">{formatCurrency(stats.stats_table.this_quarter?.sales)}</td>
                          <td className="p-3 text-right font-mono text-green-600">{formatCurrency(stats.stats_table.this_quarter?.receipts)}</td>
                          <td className="p-3 text-right font-mono text-orange-600">{formatCurrency(stats.stats_table.this_quarter?.dues)}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-3 font-medium">This Year</td>
                          <td className="p-3 text-right font-mono">{formatCurrency(stats.stats_table.this_year?.sales)}</td>
                          <td className="p-3 text-right font-mono text-green-600">{formatCurrency(stats.stats_table.this_year?.receipts)}</td>
                          <td className="p-3 text-right font-mono text-orange-600">{formatCurrency(stats.stats_table.this_year?.dues)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border p-4">
              <h2 className="font-semibold mb-3">Quick Actions</h2>
              <div className="space-y-2">
                <a href="/invoices" className="block p-3 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium">
                  + Create Invoice
                </a>
                <a href="/customers" className="block p-3 bg-gray-50 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium">
                  + Add Customer
                </a>
                <a href="/approval-queue" className="block p-3 bg-orange-50 rounded-lg text-orange-700 hover:bg-orange-100 transition-colors text-sm font-medium">
                  View Approval Queue
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
