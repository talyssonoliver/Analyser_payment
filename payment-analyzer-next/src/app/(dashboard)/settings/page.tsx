/**
 * Settings Page
 * User profile and application settings management
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePreferences, type Theme, type DateFormat, type CurrencyFormat, type NumberFormat } from '@/lib/stores/preferences-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectOption } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { User, Mail, Save, Eye, EyeOff, Lock, Settings, Bell, BarChart, Shield, RefreshCw, DollarSign } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateProfile, updatePassword, isLoading } = useAuth();
  const { preferences, updateDisplay, updateNotifications, updateAnalysis, updatePrivacy, save, hasUnsavedChanges, isLoading: preferencesLoading, resetToDefaults } = usePreferences();
  const { toast } = useToast();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'preferences' | 'payment-rules'>('profile');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Payment rules state
  const [paymentRules, setPaymentRules] = useState({
    weekdayRate: 2.00,
    saturdayRate: 3.00,
    unloadingBonus: 30.00,
    attendanceBonus: 25.00,
    earlyBonus: 50.00,
  });
  const [paymentRulesChanged, setPaymentRulesChanged] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!profileForm.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const { error } = await updateProfile({
      displayName: profileForm.displayName.trim(),
    });

    if (error) {
      toast({
        title: 'Update Failed',
        description: error,
        type: 'error',
      });
    } else {
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
        type: 'success',
      });
      setErrors({});
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!passwordForm.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase, and number';
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const { error } = await updatePassword(passwordForm.newPassword, passwordForm.confirmPassword);

    if (error) {
      toast({
        title: 'Password Update Failed',
        description: error,
        type: 'error',
      });
    } else {
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully updated.',
        type: 'success',
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setErrors({});
    }
  };

  const handlePreferencesSave = async () => {
    try {
      await save();
      toast({
        title: 'Preferences Saved',
        description: 'Your preferences have been successfully updated.',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save preferences. Please try again.',
        type: 'error',
      });
    }
  };

  const handleResetPreferences = () => {
    resetToDefaults();
    toast({
      title: 'Preferences Reset',
      description: 'All preferences have been reset to default values.',
      type: 'success',
    });
  };

  // Theme options
  const themeOptions: SelectOption[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];

  // Date format options
  const dateFormatOptions: SelectOption[] = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  ];

  // Currency format options
  const currencyFormatOptions: SelectOption[] = [
    { value: 'symbol', label: 'Symbol (£)' },
    { value: 'code', label: 'Code (GBP)' },
    { value: 'name', label: 'Name (British Pound)' },
  ];

  // Number format options
  const numberFormatOptions: SelectOption[] = [
    { value: 'standard', label: 'Standard (1,234.56)' },
    { value: 'compact', label: 'Compact (1.2K)' },
  ];

  // Export format options
  const exportFormatOptions: SelectOption[] = [
    { value: 'pdf', label: 'PDF' },
    { value: 'excel', label: 'Excel' },
    { value: 'csv', label: 'CSV' },
  ];

  // History retention options
  const historyRetentionOptions: SelectOption[] = [
    { value: '30', label: '30 days' },
    { value: '60', label: '60 days' },
    { value: '90', label: '90 days' },
    { value: '180', label: '6 months' },
    { value: '365', label: '1 year' },
  ];

  // Data retention options
  const dataRetentionOptions: SelectOption[] = [
    { value: '90', label: '90 days' },
    { value: '180', label: '6 months' },
    { value: '365', label: '1 year' },
    { value: '730', label: '2 years' },
  ];

  const handleProfileChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePasswordChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Load payment rules from localStorage on component mount
  useEffect(() => {
    const savedRules = localStorage.getItem('pa:rules:v9');
    if (savedRules) {
      try {
        const rules = JSON.parse(savedRules);
        setPaymentRules({
          weekdayRate: rules.weekdayRate || 2.00,
          saturdayRate: rules.saturdayRate || 3.00,
          unloadingBonus: rules.unloadingBonus || 30.00,
          attendanceBonus: rules.attendanceBonus || 25.00,
          earlyBonus: rules.earlyBonus || 50.00,
        });
      } catch (error) {
        console.error('Error loading payment rules:', error);
      }
    }
  }, []);

  const handlePaymentRuleChange = (field: keyof typeof paymentRules) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setPaymentRules(prev => ({ ...prev, [field]: value }));
    setPaymentRulesChanged(true);
    
    // Clear any errors for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSavePaymentRules = () => {
    // Validate payment rules
    const newErrors: Record<string, string> = {};
    
    if (paymentRules.weekdayRate < 0) {
      newErrors.weekdayRate = 'Weekday rate must be positive';
    }
    if (paymentRules.saturdayRate < 0) {
      newErrors.saturdayRate = 'Saturday rate must be positive';
    }
    if (paymentRules.unloadingBonus < 0) {
      newErrors.unloadingBonus = 'Unloading bonus must be positive';
    }
    if (paymentRules.attendanceBonus < 0) {
      newErrors.attendanceBonus = 'Attendance bonus must be positive';
    }
    if (paymentRules.earlyBonus < 0) {
      newErrors.earlyBonus = 'Early bonus must be positive';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Save to localStorage
    localStorage.setItem('pa:rules:v9', JSON.stringify(paymentRules));
    setPaymentRulesChanged(false);
    setErrors({});
    
    toast({
      title: 'Payment Rules Saved',
      description: 'Payment calculation rules have been successfully updated.',
      type: 'success',
    });
  };

  const handleResetPaymentRules = () => {
    const defaultRules = {
      weekdayRate: 2.00,
      saturdayRate: 3.00,
      unloadingBonus: 30.00,
      attendanceBonus: 25.00,
      earlyBonus: 50.00,
    };
    
    setPaymentRules(defaultRules);
    setPaymentRulesChanged(true);
    setErrors({});
    
    toast({
      title: 'Rules Reset',
      description: 'Payment rules have been reset to default values.',
      type: 'success',
    });
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'payment-rules', label: 'Payment Rules', icon: DollarSign },
    { id: 'preferences', label: 'Preferences', icon: Settings },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <Card>
          <form onSubmit={handleProfileSubmit}>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <p className="text-sm text-slate-600">
                Update your account profile information.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Display Name */}
              <div className="space-y-2">
                <label htmlFor="displayName" className="text-sm font-medium text-slate-700">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Enter your display name"
                    value={profileForm.displayName}
                    onChange={handleProfileChange('displayName')}
                    className={`pl-10 ${errors.displayName ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.displayName && (
                  <p className="text-sm text-red-500">{errors.displayName}</p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    className="pl-10 bg-slate-50"
                    disabled
                  />
                </div>
                <p className="text-sm text-slate-500">
                  Email cannot be changed. Contact support if you need to update your email.
                </p>
              </div>
            </CardContent>

            <CardFooter>
              <Button 
                type="submit" 
                disabled={isLoading}
                isLoading={isLoading}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {activeTab === 'password' && (
        <Card>
          <form onSubmit={handlePasswordSubmit}>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <p className="text-sm text-slate-600">
                Update your password to keep your account secure.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange('newPassword')}
                    className={`pl-10 pr-10 ${errors.newPassword ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    disabled={isLoading}
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-red-500">{errors.newPassword}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange('confirmPassword')}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    disabled={isLoading}
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            </CardContent>

            <CardFooter>
              <Button 
                type="submit" 
                disabled={isLoading}
                isLoading={isLoading}
              >
                <Lock className="w-4 h-4 mr-2" />
                Update Password
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {activeTab === 'payment-rules' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Payment Calculation Rules</span>
            </CardTitle>
            <p className="text-sm text-slate-600">
              Configure payment rates and bonuses used in analysis calculations.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Delivery Rates */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-700">Delivery Rates</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="weekdayRate" className="text-sm font-medium text-slate-700">
                    Weekday Rate (Mon-Fri)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">£</span>
                    <Input
                      id="weekdayRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentRules.weekdayRate.toFixed(2)}
                      onChange={handlePaymentRuleChange('weekdayRate')}
                      className={`pl-7 ${errors.weekdayRate ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.weekdayRate && (
                    <p className="text-sm text-red-500">{errors.weekdayRate}</p>
                  )}
                  <p className="text-xs text-slate-500">Amount paid per consignment on weekdays</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="saturdayRate" className="text-sm font-medium text-slate-700">
                    Saturday Rate
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">£</span>
                    <Input
                      id="saturdayRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentRules.saturdayRate.toFixed(2)}
                      onChange={handlePaymentRuleChange('saturdayRate')}
                      className={`pl-7 ${errors.saturdayRate ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.saturdayRate && (
                    <p className="text-sm text-red-500">{errors.saturdayRate}</p>
                  )}
                  <p className="text-xs text-slate-500">Amount paid per consignment on Saturdays</p>
                </div>
              </div>
            </div>

            {/* Daily Bonuses */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-slate-700">Daily Bonuses</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="unloadingBonus" className="text-sm font-medium text-slate-700">
                    Unloading Bonus
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">£</span>
                    <Input
                      id="unloadingBonus"
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentRules.unloadingBonus.toFixed(2)}
                      onChange={handlePaymentRuleChange('unloadingBonus')}
                      className={`pl-7 ${errors.unloadingBonus ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.unloadingBonus && (
                    <p className="text-sm text-red-500">{errors.unloadingBonus}</p>
                  )}
                  <p className="text-xs text-slate-500">Daily bonus (all days except Monday & Sunday)</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="attendanceBonus" className="text-sm font-medium text-slate-700">
                    Attendance Bonus
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">£</span>
                    <Input
                      id="attendanceBonus"
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentRules.attendanceBonus.toFixed(2)}
                      onChange={handlePaymentRuleChange('attendanceBonus')}
                      className={`pl-7 ${errors.attendanceBonus ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.attendanceBonus && (
                    <p className="text-sm text-red-500">{errors.attendanceBonus}</p>
                  )}
                  <p className="text-xs text-slate-500">Daily bonus (weekdays only: Mon-Fri)</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="earlyBonus" className="text-sm font-medium text-slate-700">
                    Early Arrival Bonus
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">£</span>
                    <Input
                      id="earlyBonus"
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentRules.earlyBonus.toFixed(2)}
                      onChange={handlePaymentRuleChange('earlyBonus')}
                      className={`pl-7 ${errors.earlyBonus ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.earlyBonus && (
                    <p className="text-sm text-red-500">{errors.earlyBonus}</p>
                  )}
                  <p className="text-xs text-slate-500">Daily bonus (weekdays only: Mon-Fri)</p>
                </div>
              </div>
            </div>

            {/* Rules Summary */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-slate-700">Rules Summary</h4>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong>Monday:</strong> £{paymentRules.weekdayRate.toFixed(2)}/consignment + £{paymentRules.attendanceBonus.toFixed(2)} attendance + £{paymentRules.earlyBonus.toFixed(2)} early arrival
                  </div>
                  <div>
                    <strong>Tuesday-Friday:</strong> £{paymentRules.weekdayRate.toFixed(2)}/consignment + £{paymentRules.unloadingBonus.toFixed(2)} unloading + £{paymentRules.attendanceBonus.toFixed(2)} attendance + £{paymentRules.earlyBonus.toFixed(2)} early arrival
                  </div>
                  <div>
                    <strong>Saturday:</strong> £{paymentRules.saturdayRate.toFixed(2)}/consignment + £{paymentRules.unloadingBonus.toFixed(2)} unloading
                  </div>
                  <div>
                    <strong>Sunday:</strong> Rest day (no work)
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleResetPaymentRules}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            
            <div className="flex items-center gap-3">
              {paymentRulesChanged && (
                <span className="text-sm text-amber-600">
                  You have unsaved changes
                </span>
              )}
              <Button
                onClick={handleSavePaymentRules}
                disabled={!paymentRulesChanged}
                variant={paymentRulesChanged ? 'primary' : 'outline'}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Rules
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {activeTab === 'preferences' && (
        <div className="space-y-6">
          {preferencesLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-pulse">Loading preferences...</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
          {/* Display Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Display Preferences</span>
              </CardTitle>
              <p className="text-sm text-slate-600">
                Customize how information is displayed in the application.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Theme */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="theme-select" className="text-sm font-medium text-slate-700">Theme</label>
                  <Select
                    id="theme-select"
                    value={preferences?.display?.theme ?? 'system'}
                    onChange={(value) => updateDisplay({ theme: value as Theme })}
                    options={themeOptions}
                  />
                  <p className="text-xs text-slate-500">Choose your preferred color theme</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="date-format-select" className="text-sm font-medium text-slate-700">Date Format</label>
                  <Select
                    id="date-format-select"
                    value={preferences?.display?.dateFormat ?? 'DD/MM/YYYY'}
                    onChange={(value) => updateDisplay({ dateFormat: value as DateFormat })}
                    options={dateFormatOptions}
                  />
                  <p className="text-xs text-slate-500">Format for displaying dates</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="currency-format-select" className="text-sm font-medium text-slate-700">Currency Format</label>
                  <Select
                    id="currency-format-select"
                    value={preferences?.display?.currencyFormat ?? 'symbol'}
                    onChange={(value) => updateDisplay({ currencyFormat: value as CurrencyFormat })}
                    options={currencyFormatOptions}
                  />
                  <p className="text-xs text-slate-500">How currency values are displayed</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="number-format-select" className="text-sm font-medium text-slate-700">Number Format</label>
                  <Select
                    id="number-format-select"
                    value={preferences?.display?.numberFormat ?? 'standard'}
                    onChange={(value) => updateDisplay({ numberFormat: value as NumberFormat })}
                    options={numberFormatOptions}
                  />
                  <p className="text-xs text-slate-500">Format for displaying numbers</p>
                </div>
              </div>

              {/* Display Options */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-slate-700">Display Options</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="compact-mode-switch" className="text-sm font-medium text-slate-700">Compact Mode</label>
                      <p className="text-xs text-slate-500">Reduce spacing and use smaller elements</p>
                    </div>
                    <Switch
                      id="compact-mode-switch"
                      checked={preferences?.display?.compactMode ?? false}
                      onChange={(checked) => updateDisplay({ compactMode: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="advanced-features-switch" className="text-sm font-medium text-slate-700">Show Advanced Features</label>
                      <p className="text-xs text-slate-500">Display advanced analysis tools and options</p>
                    </div>
                    <Switch
                      id="advanced-features-switch"
                      checked={preferences?.display?.showAdvancedFeatures ?? false}
                      onChange={(checked) => updateDisplay({ showAdvancedFeatures: checked })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notifications</span>
              </CardTitle>
              <p className="text-sm text-slate-600">
                Configure when and how you receive notifications.
              </p>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="analysis-complete-switch" className="text-sm font-medium text-slate-700">Analysis Complete</label>
                    <p className="text-xs text-slate-500">Notify when file analysis is finished</p>
                  </div>
                  <Switch
                    id="analysis-complete-switch"
                    checked={preferences?.notifications?.analysisComplete ?? true}
                    onChange={(checked) => updateNotifications({ analysisComplete: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="error-alerts-switch" className="text-sm font-medium text-slate-700">Error Alerts</label>
                    <p className="text-xs text-slate-500">Notify about errors and issues</p>
                  </div>
                  <Switch
                    id="error-alerts-switch"
                    checked={preferences?.notifications?.errorAlerts ?? true}
                    onChange={(checked) => updateNotifications({ errorAlerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="daily-digest-switch" className="text-sm font-medium text-slate-700">Daily Digest</label>
                    <p className="text-xs text-slate-500">Daily summary of your analysis activity</p>
                  </div>
                  <Switch
                    id="daily-digest-switch"
                    checked={preferences?.notifications?.dailyDigest ?? false}
                    onChange={(checked) => updateNotifications({ dailyDigest: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="weekly-report-switch" className="text-sm font-medium text-slate-700">Weekly Report</label>
                    <p className="text-xs text-slate-500">Weekly insights and trends report</p>
                  </div>
                  <Switch
                    id="weekly-report-switch"
                    checked={preferences?.notifications?.weeklyReport ?? false}
                    onChange={(checked) => updateNotifications({ weeklyReport: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart className="w-5 h-5" />
                <span>Analysis & Export</span>
              </CardTitle>
              <p className="text-sm text-slate-600">
                Configure analysis behavior and export settings.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Auto Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="auto-save-switch" className="text-sm font-medium text-slate-700">Auto Save</label>
                    <p className="text-xs text-slate-500">Automatically save analysis results</p>
                  </div>
                  <Switch
                    id="auto-save-switch"
                    checked={preferences?.analysis?.autoSave ?? true}
                    onChange={(checked) => updateAnalysis({ autoSave: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="auto-export-switch" className="text-sm font-medium text-slate-700">Auto Export</label>
                    <p className="text-xs text-slate-500">Automatically export completed analyses</p>
                  </div>
                  <Switch
                    id="auto-export-switch"
                    checked={preferences?.analysis?.autoExport ?? false}
                    onChange={(checked) => updateAnalysis({ autoExport: checked })}
                  />
                </div>
              </div>

              {/* Export Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <div className="space-y-2">
                  <label htmlFor="export-format-select" className="text-sm font-medium text-slate-700">Default Export Format</label>
                  <Select
                    id="export-format-select"
                    value={preferences?.analysis?.defaultExportFormat ?? 'pdf'}
                    onChange={(value) => updateAnalysis({ defaultExportFormat: value as 'pdf' | 'excel' | 'csv' })}
                    options={exportFormatOptions}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="history-retention-select" className="text-sm font-medium text-slate-700">History Retention</label>
                  <Select
                    id="history-retention-select"
                    value={(preferences?.analysis?.maxHistoryDays ?? 90).toString()}
                    onChange={(value) => updateAnalysis({ maxHistoryDays: parseInt(value) })}
                    options={historyRetentionOptions}
                  />
                  <p className="text-xs text-slate-500">How long to keep analysis history</p>
                </div>
              </div>

              {/* Include Options */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-slate-700">Export Content</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="include-charts-switch" className="text-sm font-medium text-slate-700">Include Charts</label>
                      <p className="text-xs text-slate-500">Add charts to exports</p>
                    </div>
                    <Switch
                      id="include-charts-switch"
                      checked={preferences?.analysis?.includeCharts ?? true}
                      onChange={(checked) => updateAnalysis({ includeCharts: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="include-summary-switch" className="text-sm font-medium text-slate-700">Include Summary</label>
                      <p className="text-xs text-slate-500">Add summary section to exports</p>
                    </div>
                    <Switch
                      id="include-summary-switch"
                      checked={preferences?.analysis?.includeSummary ?? true}
                      onChange={(checked) => updateAnalysis({ includeSummary: checked })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Privacy & Data</span>
              </CardTitle>
              <p className="text-sm text-slate-600">
                Control data collection and retention settings.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="analytics-switch" className="text-sm font-medium text-slate-700">Analytics</label>
                    <p className="text-xs text-slate-500">Help improve the app by sharing usage analytics</p>
                  </div>
                  <Switch
                    id="analytics-switch"
                    checked={preferences?.privacy?.analyticsEnabled ?? true}
                    onChange={(checked) => updatePrivacy({ analyticsEnabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="error-reporting-switch" className="text-sm font-medium text-slate-700">Error Reporting</label>
                    <p className="text-xs text-slate-500">Automatically send error reports to help fix bugs</p>
                  </div>
                  <Switch
                    id="error-reporting-switch"
                    checked={preferences?.privacy?.errorReportingEnabled ?? true}
                    onChange={(checked) => updatePrivacy({ errorReportingEnabled: checked })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <label htmlFor="data-retention-select" className="text-sm font-medium text-slate-700">Data Retention Period</label>
                  <Select
                    id="data-retention-select"
                    value={(preferences?.privacy?.dataRetentionDays ?? 365).toString()}
                    onChange={(value) => updatePrivacy({ dataRetentionDays: parseInt(value) })}
                    options={dataRetentionOptions}
                  />
                  <p className="text-xs text-slate-500">
                    How long your personal data is stored before automatic deletion
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={handleResetPreferences}
                  disabled={preferencesLoading}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset to Defaults
                </Button>

                <div className="flex gap-3">
                  {hasUnsavedChanges && (
                    <span className="text-sm text-amber-600 self-center">
                      You have unsaved changes
                    </span>
                  )}
                  <Button
                    onClick={handlePreferencesSave}
                    disabled={preferencesLoading || !hasUnsavedChanges}
                    isLoading={preferencesLoading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}