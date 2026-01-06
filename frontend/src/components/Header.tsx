import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, Bell, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  notificationCount: number;
}

export const Header: React.FC<HeaderProps> = ({ notificationCount }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background px-4 py-3 shadow-sm">
      <div className="container flex items-center justify-between h-14">
        <Link to="/dashboard" className="flex items-center"> {/* Wrap h1 with Link */}
          <h1 className="text-xl font-bold hover:text-primary transition-colors">Daily Action Hub</h1>
        </Link>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                  {notificationCount}
                </span>
              )}
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={`${import.meta.env.VITE_AVATAR_API_URL}?seed=${user.name}`} alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};