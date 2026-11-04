// Keeps the logged-in user for the whole app (AuthContext).
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, name, email }
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!api.getToken()) {
      setUser(null);
      return null;
    }
    try {
      const me = await api.getMe();
      setUser(me);
      return me;
    } catch (error) {
      if (error.status === 401) api.clearToken();
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = async (email, password) => {
    const { token } = await api.login(email, password);
    api.setToken(token);
    return refresh();
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
