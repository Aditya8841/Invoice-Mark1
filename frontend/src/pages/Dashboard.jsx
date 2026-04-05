import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import axios from "axios";
import { API } from "@/App";
import { TrendingUp, Clock, AlertTriangle, AlertCircle } from "lucide-react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_receivables: 0,
    overdue_1_15: 0,
    overdue_16_30: 0,
    overdue_31_45: 0,
    overdue_45_plus: 0,
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

  return (
    <Layout>
      <div data-testid="dashboard-page">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your receivables</p>
        </div>

        {/* Total Receivables - Full Width */}
        <div className="mb-6">
          <div className="stat-card bg-gradient-to-r from-blue-700 to-blue-600 border-0">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-blue-100" />
              <span className="stat-label text-blue-100">Total Receivables</span>
            </div>
            <p className="stat-value text-white" data-testid="total-receivables">
              {formatCurrency(stats.total_receivables)}
            </p>
          </div>
        </div>

        {/* Overdue Breakdown Grid */}
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Overdue by Days</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card border-l-4 border-l-yellow-400">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="stat-label">1 - 15 Days</span>
            </div>
            <p className="stat-value text-yellow-600" data-testid="overdue-1-15">
              {formatCurrency(stats.overdue_1_15)}
            </p>
          </div>

          <div className="stat-card border-l-4 border-l-orange-400">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="stat-label">16 - 30 Days</span>
            </div>
            <p className="stat-value text-orange-600" data-testid="overdue-16-30">
              {formatCurrency(stats.overdue_16_30)}
            </p>
          </div>

          <div className="stat-card border-l-4 border-l-red-400">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="stat-label">31 - 45 Days</span>
            </div>
            <p className="stat-value text-red-600" data-testid="overdue-31-45">
              {formatCurrency(stats.overdue_31_45)}
            </p>
          </div>

          <div className="stat-card border-l-4 border-l-red-600">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="stat-label">45+ Days</span>
            </div>
            <p className="stat-value text-red-700" data-testid="overdue-45-plus">
              {formatCurrency(stats.overdue_45_plus)}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
