// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./synergy_resources/credit_app/context/AuthContext";
import ProtectedRoute from "./synergy_resources/credit_app/components/ProtectedRoute";

import Sidebar from "./synergy_resources/credit_app/components/Sidebar";
import Topbar from "./synergy_resources/credit_app/components/Topbar";
import Footer from "./synergy_resources/credit_app/components/Footer";
import Toaster from "./synergy_resources/credit_app/components/Toaster";

// Score pages
import OriginScore from "./synergy_resources/credit_app/pages/dashboard/OriginScore.jsx";
import DestinationScore from "./synergy_resources/credit_app/pages/dashboard/DestinationScore.jsx";
import GlobalAverage from "./synergy_resources/credit_app/pages/dashboard/GlobalAverage.jsx";

// Auth (public)
import Login from "./synergy_resources/credit_app/pages/Auth/signin/Login";
import Signup from "./synergy_resources/credit_app/pages/Auth/signup/Signup";

// Static (public)
import Terms from "./synergy_resources/credit_app/pages/Static/Terms";
import Privacy from "./synergy_resources/credit_app/pages/Static/Privacy";
import About from "./synergy_resources/credit_app/pages/Static/About";
import Contact from "./synergy_resources/credit_app/pages/Static/Contact";

// Dashboard pages (protected)
import AccountsOverview from "./synergy_resources/credit_app/pages/dashboard/AccountsOverview";
import CreditHistory from "./synergy_resources/credit_app/pages/dashboard/CreditHistory";
import BehaviorTrends from "./synergy_resources/credit_app/pages/dashboard/BehaviorTrends";
import RiskProfile from "./synergy_resources/credit_app/pages/dashboard/RiskProfile";
import BankingInsights from "./synergy_resources/credit_app/pages/dashboard/BankingInsights";
import GlobalComparison from "./synergy_resources/credit_app/pages/dashboard/GlobalComparison";
import GlobalScore from "./synergy_resources/credit_app/pages/dashboard/GlobalScore";
import ActiveAccountDetail from "./synergy_resources/credit_app/pages/dashboard/ActiveAccountDetail";

// ---------- Layouts ----------
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

function PublicLayout() {
  return (
    <div className="app">
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

// ---------- App ----------
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public: auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Public: static */}
          <Route element={<PublicLayout />}>
            <Route path="/legal/terms" element={<Terms />} />
            <Route path="/legal/privacy" element={<Privacy />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Route>

          {/* Protected: dashboard */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/score" replace />} />
              <Route path="/score" element={<GlobalScore />} />

              {/* NEW: separate pages for origin/destination/global */}
              <Route path="/score-origin" element={<OriginScore />} />
              <Route path="/score-destination" element={<DestinationScore />} />
              <Route path="/score-global" element={<GlobalAverage />} />

              {/* Main sections */}
              <Route path="/accounts-overview" element={<AccountsOverview />} />
              <Route path="/credit-history" element={<CreditHistory />} />
              <Route path="/behavior-trends" element={<BehaviorTrends />} />
              <Route path="/risk-profile" element={<RiskProfile />} />
              <Route path="/banking-insights" element={<BankingInsights />} />
              <Route path="/global-comparison" element={<GlobalComparison />} />

              {/* Detail */}
              <Route path="/active-accounts/:id" element={<ActiveAccountDetail />} />

              {/* Legacy redirects */}
              <Route path="/active-accounts" element={<Navigate to="/accounts-overview" replace />} />
              <Route path="/account-mix" element={<Navigate to="/accounts-overview" replace />} />
              <Route path="/utilization" element={<Navigate to="/accounts-overview" replace />} />
              <Route path="/payment-history" element={<Navigate to="/credit-history" replace />} />
              <Route path="/credit-length" element={<Navigate to="/credit-history" replace />} />
              <Route path="/recent-behavior" element={<Navigate to="/behavior-trends" replace />} />
              <Route path="/inquiries" element={<Navigate to="/behavior-trends" replace />} />
              <Route path="/adverse-records" element={<Navigate to="/risk-profile" replace />} />
              <Route path="/alt-data" element={<Navigate to="/risk-profile" replace />} />
              <Route path="/banking" element={<Navigate to="/banking-insights" replace />} />
              <Route path="/country-normalization" element={<Navigate to="/global-comparison" replace />} />
              <Route path="/score-scale" element={<Navigate to="/global-comparison" replace />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
