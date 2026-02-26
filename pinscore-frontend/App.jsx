import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }    from './context/AuthContext';
import ProtectedRoute      from './components/layout/ProtectedRoute';
import Dashboard           from './pages/Dashboard';
import Login               from './pages/Login';
import Register            from './pages/Register';
import ScorePage           from './pages/ScorePage';
import FansPage            from './pages/FansPage';          // Day 4 Task 8
import AttributionPage     from './pages/AttributionPage';  // Day 4 Task 8

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"          element={<Navigate to="/dashboard" replace />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/register"  element={<Register />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
          />
          <Route
            path="/score"
            element={<ProtectedRoute><ScorePage /></ProtectedRoute>}
          />
          <Route
            path="/fans"
            element={<ProtectedRoute><FansPage /></ProtectedRoute>}
          />
          <Route
            path="/attribution"
            element={<ProtectedRoute><AttributionPage /></ProtectedRoute>}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
