import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { User } from '../types';

// Extend User type for auth purposes
interface AuthUser extends User {
  password?: string; // Should be hashed in a real app
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => void;
  signup: (name: string, email: string, password: string) => void;
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_DB_KEY = 'quanta_users_db';
const CURRENT_USER_KEY = 'quanta_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(CURRENT_USER_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse auth data from localStorage", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((email: string, password: string) => {
    const db = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]') as AuthUser[];
    const foundUser = db.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      const { password, ...userToStore } = foundUser;
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userToStore));
      setUser(userToStore);
    } else {
      throw new Error("Invalid email or password.");
    }
  }, []);
  
  const signup = useCallback((name: string, email: string, password: string) => {
    const db = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]') as AuthUser[];
    const existingUser = db.find(u => u.email === email);

    if (existingUser) {
      throw new Error("An account with this email already exists.");
    }

    const newUser: AuthUser = { id: new Date().toISOString(), name, email, password };
    db.push(newUser);
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(db));
    // Does not log in automatically, user must now log in after signing up.
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUserData: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updatedUserData };
    setUser(updatedUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

    // Also update the user in the "DB"
    const db = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]') as AuthUser[];
    const userIndex = db.findIndex(u => u.id === user.id);
    if (userIndex > -1) {
      // Keep password from old record
      const oldPassword = db[userIndex].password;
      db[userIndex] = { ...updatedUser, password: oldPassword };
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(db));
    }
  }, [user]);

  const value = { user, loading, login, signup, logout, updateUser };

  return React.createElement(AuthContext.Provider, { value: value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};