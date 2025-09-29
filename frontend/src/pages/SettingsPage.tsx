import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, Shield } from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface AppSettings {
  signupEnabled: boolean;
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    signupEnabled: true
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSettings();
      
      if (response.success && response.data) {
        setSettings({
          signupEnabled: response.data.signupEnabled !== undefined ? response.data.signupEnabled : true
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupToggle = async (enabled: boolean) => {
    try {
      setError('');
      
      const newSettings = { signupEnabled: enabled };
      const response = await apiService.updateSettings(newSettings);
      
      if (response.success) {
        setSettings(newSettings);
        toast({
          title: "Settings Updated",
          description: `User registration has been ${enabled ? 'enabled' : 'disabled'}.`,
        });
      } else {
        setError('Failed to save settings');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your application settings
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <div className="w-full max-w-4xl">
          {/* User Registration Settings */}
          <Card className="p-8">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <UserPlus className="h-7 w-7" />
                User Registration
              </CardTitle>
              <CardDescription className="text-lg">
                Control whether new users can register for accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label htmlFor="signup-enabled" className="text-xl font-semibold">
                    Allow User Registration
                  </Label>
                  <p className="text-base text-muted-foreground">
                    When enabled, new users can create accounts through the signup page
                  </p>
                </div>
                <Switch
                  id="signup-enabled"
                  checked={settings.signupEnabled}
                  onCheckedChange={handleSignupToggle}
                  className="scale-125"
                />
              </div>
              
              {!settings.signupEnabled && (
                <Alert className="text-base">
                  <Shield className="h-5 w-5" />
                  <AlertDescription className="text-base">
                    User registration is currently disabled. New users will not be able to create accounts.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
