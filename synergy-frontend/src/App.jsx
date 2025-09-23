import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./synergy_resources/credit_app/context/AuthContext";
import ProtectedRoute from "./synergy_resources/credit_app/components/ProtectedRoute";

import Sidebar from "./synergy_resources/credit_app/components/Sidebar";
import Topbar from "./synergy_resources/credit_app/components/Topbar";
import Footer from "./synergy_resources/credit_app/components/Footer";
import Toaster from "./synergy_resources/credit_app/components/Toaster";

// Auth pages
import Login from "./synergy_resources/credit_app/pages/Auth/signin/Login";
import Signup from "./synergy_resources/credit_app/pages/Auth/signup/Signup";

// Dashboard pages
import GlobalScore from "./synergy_resources/credit_app/pages/dashboard/GlobalScore";
import ScoreScale from "./synergy_resources/credit_app/pages/dashboard/ScoreScale";
import PaymentHistory from "./synergy_resources/credit_app/pages/dashboard/PaymentHistory";
import Utilization from "./synergy_resources/credit_app/pages/dashboard/Utilization";
import CreditLength from "./synergy_resources/credit_app/pages/dashboard/CreditLength";
import AccountMix from "./synergy_resources/credit_app/pages/dashboard/AccountMix";
import ActiveAccounts from "./synergy_resources/credit_app/pages/dashboard/ActiveAccounts";
import ActiveAccountDetail from "./synergy_resources/credit_app/pages/dashboard/ActiveAccountDetail";
import Inquiries from "./synergy_resources/credit_app/pages/dashboard/Inquiries";
import AdverseRecords from "./synergy_resources/credit_app/pages/dashboard/AdverseRecords";
import RecentBehavior from "./synergy_resources/credit_app/pages/dashboard/RecentBehavior";
import AltData from "./synergy_resources/credit_app/pages/dashboard/AltData";
import Banking from "./synergy_resources/credit_app/pages/dashboard/Banking";
import CountryNormalization from "./synergy_resources/credit_app/pages/dashboard/CountryNormalization";


function DashboardLayout() {
  return (
    <div className="app">
      <Sidebar />
      <div className="content">
        <Topbar />
        <main className="main">
          <Outlet />
        </main>
        <Footer />
        <Toaster />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          {/* uncoomment below 2 lines for live */}
          
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} /> 

          {/* Protected shell */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/score" replace />} />
              <Route path="/score" element={<GlobalScore />} />
              <Route path="/score-scale" element={<ScoreScale />} />
              <Route path="/payment-history" element={<PaymentHistory />} />
              <Route path="/utilization" element={<Utilization />} />
              <Route path="/credit-length" element={<CreditLength />} />
              <Route path="/account-mix" element={<AccountMix />} />
              <Route path="/active-accounts" element={<ActiveAccounts />} />
              <Route path="/active-accounts/:id" element={<ActiveAccountDetail />} />
              <Route path="/inquiries" element={<Inquiries />} />
              <Route path="/adverse-records" element={<AdverseRecords />} />
              <Route path="/recent-behavior" element={<RecentBehavior />} />
              <Route path="/alt-data" element={<AltData />} />
              <Route path="/banking" element={<Banking />} />
              <Route path="/country-normalization" element={<CountryNormalization />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
