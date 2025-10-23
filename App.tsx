
import React from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './components/AuthPage';
import { MainApp } from './components/MainApp';
import { LoaderIcon } from './components/Icons';

const App: React.FC = () => {
  const { user, loading, logout, updateUser } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex justify-center items-center">
        <LoaderIcon className="w-16 h-16 text-accent" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }
  
  return <MainApp user={user} logout={logout} updateUser={updateUser} />;
};

export default App;