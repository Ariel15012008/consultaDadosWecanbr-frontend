// src/contexts/UserContext.tsx
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import api from "@/utils/axiosInstance";

interface User {
  nome: string;
  email: string;
  matricula: string;
  gestor: boolean;
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const didLogout = useRef(false);

  const silentAuth = async () => {
    try {
      const res = await api.get("/user/me");
      
      if (res.status === 200) {
        const data = res.data;
        setUser(data);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Erro na autenticação:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    await silentAuth();
  };

  const logout = async () => {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("logged_user");
      
      await api.post("/user/logout");
      
      setIsAuthenticated(false);
      setUser(null);
      didLogout.current = true;
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  };

  useEffect(() => {
    if (!didLogout.current) {
      silentAuth();
    }
  }, []);

  const value: UserContextType = {
    user,
    isAuthenticated,
    isLoading,
    logout,
    refreshUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}