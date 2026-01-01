import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold">Welcome to Daily Action Hub</CardTitle>
          <CardDescription className="text-muted-foreground">Sign in to manage your meeting follow-ups.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={login} disabled={isLoading} className="w-full text-lg py-6">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign in with Google"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};