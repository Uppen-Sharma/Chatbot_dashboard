import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const BotDashboardPage = lazy(() => import("./dashboard/Dashboard"));
const LoginPage = lazy(() => import("./Login"));

// Auth guard - checks localStorage for login flag.
// Unauthenticated users are redirected to /login.
function ProtectedRoute({ children }) {
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
