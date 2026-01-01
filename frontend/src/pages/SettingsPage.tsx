"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, isLoading, updateUserIntegrations } = useAuth();
  const [isGmailConnected, setIsGmailConnected] = useState(user?.gmail_connected ?? false);
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(user?.google_calendar_connected ?? false);
  const [isNotionConnected, setIsNotionConnected] = useState(user?.notion_connected ?? false);
  const [isGranolaConnected, setIsGranolaConnected] = useState(user?.granola_connected ?? false);
  const [isInAppNotificationsEnabled, setIsInAppNotificationsEnabled] = useState(
    JSON.parse(localStorage.getItem('inAppNotificationsEnabled') || 'true')
  );

  useEffect(() => {
    if (user) {
      setIsGmailConnected(user.gmail_connected);
      setIsGoogleCalendarConnected(user.google_calendar_connected);
      setIsNotionConnected(user.notion_connected);
      setIsGranolaConnected(user.granola_connected);
    }
  }, [user]);

  const handleToggleIntegration = (integrationName: keyof typeof user, isChecked: boolean) => {
    if (!user) return;

    updateUserIntegrations({ [integrationName]: isChecked });
    showSuccess(`${integrationName.replace(/_/g, ' ').replace('connected', 'Connected').replace('gmail', 'Gmail').replace('google calendar', 'Google Calendar').replace('notion', 'Notion').replace('granola', 'Granola')} ${isChecked ? 'enabled' : 'disabled'}.`);
  };

  const handleToggleNotifications = (isChecked: boolean) => {
    setIsInAppNotificationsEnabled(isChecked);
    localStorage.setItem('inAppNotificationsEnabled', JSON.stringify(isChecked));
    showSuccess(`In-app notifications ${isChecked ? 'enabled' : 'disabled'}.`);
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <p className="text-lg">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-8">
      <div className="container max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <Card className="mb-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Integrations</CardTitle>
            <CardDescription>Manage your connections to external services.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="gmail-toggle" className="text-base font-medium">
                Gmail
              </Label>
              <Switch
                id="gmail-toggle"
                checked={isGmailConnected}
                onCheckedChange={(checked) => {
                  setIsGmailConnected(checked);
                  handleToggleIntegration('gmail_connected', checked);
                }}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="google-calendar-toggle" className="text-base font-medium">
                Google Calendar
              </Label>
              <Switch
                id="google-calendar-toggle"
                checked={isGoogleCalendarConnected}
                onCheckedChange={(checked) => {
                  setIsGoogleCalendarConnected(checked);
                  handleToggleIntegration('google_calendar_connected', checked);
                }}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="notion-toggle" className="text-base font-medium">
                Notion
              </Label>
              <Switch
                id="notion-toggle"
                checked={isNotionConnected}
                onCheckedChange={(checked) => {
                  setIsNotionConnected(checked);
                  handleToggleIntegration('notion_connected', checked);
                }}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="granola-toggle" className="text-base font-medium">
                Granola
              </Label>
              <Switch
                id="granola-toggle"
                checked={isGranolaConnected}
                onCheckedChange={(checked) => {
                  setIsGranolaConnected(checked);
                  handleToggleIntegration('granola_connected', checked);
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Notification Preferences</CardTitle>
            <CardDescription>Control how you receive notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="in-app-notifications-toggle" className="text-base font-medium">
                In-app Notifications (Mock)
              </Label>
              <Switch
                id="in-app-notifications-toggle"
                checked={isInAppNotificationsEnabled}
                onCheckedChange={handleToggleNotifications}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              *Note: Actual notification delivery is a post-MVP feature. This toggle is for UI demonstration.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};