import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, IndianRupee, CalendarDays, Wallet, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OwnerNavbar from "../components/OwnerNavbar";
import { useApi } from "../hooks/useApi";

const formatMoney = (amount) => `₹${Number(amount || 0).toFixed(2)}`;
const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleString();
};

const OwnerPayments = () => {
  const navigate = useNavigate();
  const { request } = useApi();
  const [loading, setLoading] = useState(true);
  const [todaySummary, setTodaySummary] = useState({ total: 0, transactions: [] });
  const [monthSummary, setMonthSummary] = useState({ total: 0, transactions: [] });

  const fetchPayments = async () => {
    setLoading(true);
    const [todayRes, monthRes] = await Promise.all([
      request({ url: "/api/shop/earnings/today", method: "get" }, { showToast: false }),
      request({ url: "/api/shop/earnings/month", method: "get" }, { showToast: false }),
    ]);

    if (todayRes?.data?.success) {
      setTodaySummary({
        total: Number(todayRes.data.total || 0),
        transactions: Array.isArray(todayRes.data.transactions) ? todayRes.data.transactions : [],
      });
    }

    if (monthRes?.data?.success) {
      setMonthSummary({
        total: Number(monthRes.data.total || 0),
        transactions: Array.isArray(monthRes.data.transactions) ? monthRes.data.transactions : [],
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentTransactions = useMemo(() => {
    const combined = [...todaySummary.transactions, ...monthSummary.transactions];
    const uniqueById = new Map();
    combined.forEach((t) => {
      const key = String(t.uniqueTransactionId || `${t.orderId || "na"}_${t.date || "na"}`);
      if (!uniqueById.has(key)) uniqueById.set(key, t);
    });
    return [...uniqueById.values()]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 15);
  }, [monthSummary.transactions, todaySummary.transactions]);

  return (
    <>
      <OwnerNavbar />
      <div className="pt-[90px] px-4 md:px-8 pb-10 min-h-screen bg-[#fff9f6]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <button
                onClick={() => navigate("/")}
                className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Owner Payments</h1>
              <p className="text-sm text-gray-500">Track today/month earnings and recent transactions</p>
            </div>
            <button
              onClick={fetchPayments}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-orange-100 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold flex items-center gap-2">
                <CalendarDays size={14} />
                Today Earnings
              </p>
              <p className="text-3xl font-black text-emerald-600 mt-2">{formatMoney(todaySummary.total)}</p>
              <p className="text-xs text-gray-500 mt-1">{todaySummary.transactions.length} transactions</p>
            </div>
            <div className="bg-white rounded-2xl border border-orange-100 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold flex items-center gap-2">
                <Wallet size={14} />
                Month Earnings
              </p>
              <p className="text-3xl font-black text-orange-600 mt-2">{formatMoney(monthSummary.total)}</p>
              <p className="text-xs text-gray-500 mt-1">{monthSummary.transactions.length} transactions</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-bold text-gray-800">Recent Transactions</h2>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-gray-500">Loading payments...</div>
            ) : recentTransactions.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No payment transactions found yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Order</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((tx, idx) => {
                      const isCredit = String(tx.type || "").toLowerCase() === "credit";
                      return (
                        <tr key={tx.uniqueTransactionId || idx} className="border-t">
                          <td className="px-4 py-3 text-gray-700">{formatDateTime(tx.date)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${isCredit ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                              {isCredit ? "CREDIT" : "DEBIT"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{tx.orderId ? String(tx.orderId).slice(-8) : "-"}</td>
                          <td className={`px-4 py-3 text-right font-bold ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
                            {isCredit ? "+" : "-"} {formatMoney(tx.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OwnerPayments;
