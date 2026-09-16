import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SetupPage } from './pages/SetupPage';

function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center text-muted-fg">
        Carregando sessão…
      </main>
    );
  }
  return user ? <HomePage /> : <Navigate to="/login" replace />;
}

export function App() {
  const { user, loading, configured } = useAuth();

  if (!configured) {
    return <SetupPage />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          loading ? (
            <main className="grid min-h-screen place-items-center text-muted-fg">
              Carregando sessão…
            </main>
          ) : user ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route path="/" element={<Gate />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
