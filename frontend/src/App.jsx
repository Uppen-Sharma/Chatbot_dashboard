import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

const BotDashboardPage = lazy(() => import("./dashboard/Dashboard"));
const LoginPage = lazy(() => import("./Login"));

// Auth guard:
// - In 'prod' mode: NGINX + oauth2-proxy protects all routes BEFORE React loads.
//   If the user reaches here, they are already authenticated. Trust the proxy.
// - In 'dev' mode: fall back to the localStorage flag set on mock-login.
function ProtectedRoute({ children }) {
  const authMode = import.meta.env.VITE_AUTH_MODE || "dev";
  if (authMode === "prod") {
    // Session is managed by oauth2-proxy at the proxy layer.
    // React should not second-guess it — just render the app.
    return children;
  }
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-500 font-medium">
            Loading...
          </div>
        }
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Dashboard route - protected for authenticated users */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <BotDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
