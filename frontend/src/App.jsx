import { useEffect } from 'react';
import { useAuth } from './auth';
import { navigate, takeRedirectAfterAuth, useRoute } from './router';
import Header from './components/Header';
import AuthPage from './pages/AuthPage';
import Home from './pages/Home';
import ProfileSetup from './pages/ProfileSetup';
import MySkills from './pages/MySkills';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import BoardPage from './pages/BoardPage';

const PUBLIC_ROUTES = ['/auth'];

export default function App() {
  const { user, loading } = useAuth();
  const path = useRoute();

  // Not logged in -> send to /auth. Logged in -> never show /auth.
  useEffect(() => {
    if (loading) return;
    if (!user && !PUBLIC_ROUTES.includes(path)) navigate('/auth');
    if (user && path === '/auth') navigate(takeRedirectAfterAuth() || '/');
  }, [user, loading, path]);

  let content = null;
  if (loading) {
    content = <div className="spinner">Loading…</div>;
  } else if (!user) {
    content = path === '/auth' ? <AuthPage /> : null;
  } else if (path === '/auth') {
    content = <div className="spinner">Signing you in…</div>;
  } else if (path === '/') {
    content = <Home />;
  } else if (path === '/setup') {
    content = <ProfileSetup />;
  } else if (path === '/skills') {
    content = <MySkills />;
  } else if (path === '/search') {
    content = <SearchPage />;
  } else if (path === '/board') {
    content = <BoardPage />;
  } else if (path === '/profile') {
    content = <ProfilePage />;
  } else if (path.startsWith('/users/')) {
    content = <ProfilePage userId={path.slice('/users/'.length)} />;
  } else {
    content = (
      <div className="spinner">
        Page not found. <a href="#/">Go home</a>
      </div>
    );
  }

  return (
    <div className="app">
      <Header path={path} />
      {content}
    </div>
  );
}
