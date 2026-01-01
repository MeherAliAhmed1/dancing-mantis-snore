import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      // We use window.location to force a full reload so AuthContext picks up the new token
      // purely from mounting logic, ensuring a clean state.
      window.location.href = '/dashboard';
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <Loader2 className="mr-2 h-8 w-8 animate-spin" />
      <p className="text-lg">Logging in...</p>
    </div>
  );
};