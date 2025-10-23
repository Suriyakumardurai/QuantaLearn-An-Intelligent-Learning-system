import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { BrainCircuitIcon } from './Icons';

interface AuthPageProps {}

const AuthFormContainer: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="w-full max-w-md mx-auto bg-secondary p-8 rounded-2xl shadow-xl border border-border-color">
      <div className="text-center mb-8">
        <BrainCircuitIcon className="w-12 h-12 text-accent mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-text-primary">Welcome to QuantaLearn</h1>
        <p className="text-text-secondary mt-2">{title}</p>
      </div>
      {children}
    </div>
);

export const AuthPage: React.FC<AuthPageProps> = () => {
  const [view, setView] = useState<'login' | 'signup'>('login');
  const { login, signup } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    try {
        login(email, password);
    } catch(err: any) {
        setError(err.message);
    }
  };
  
  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError('Please fill in all fields.');
      return;
    }
    try {
        signup(name, email, password);
        setSignupSuccess(true);
        setView('login');
        // Clear fields for login
        setName('');
        setPassword('');
        setError('');
    } catch(err: any) {
        setError(err.message);
    }
  };

  const renderForm = () => {
    if (view === 'login') {
      return (
        <AuthFormContainer title="Log in to continue">
          <form onSubmit={handleLogin} className="space-y-6">
            {signupSuccess && <p className="text-green-600 text-center p-2 bg-green-500/10 rounded-lg">Signup successful! Please log in.</p>}
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none"/>
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none" />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-highlight transition-all duration-300">Login</button>
            <p className="text-center text-text-secondary">Don't have an account? <button type="button" onClick={() => { setView('signup'); setError(''); setSignupSuccess(false); }} className="font-semibold text-accent hover:underline">Sign up</button></p>
          </form>
        </AuthFormContainer>
      );
    }

    if (view === 'signup') {
      return (
        <AuthFormContainer title="Create your account">
          <form onSubmit={handleSignup} className="space-y-6">
            <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none" />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none" />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-highlight transition-all duration-300">Sign Up</button>
            <p className="text-center text-text-secondary">Already have an account? <button type="button" onClick={() => { setView('login'); setError(''); }} className="font-semibold text-accent hover:underline">Log in</button></p>
          </form>
        </AuthFormContainer>
      );
    }
    
    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-primary">
      {renderForm()}
    </div>
  );
};