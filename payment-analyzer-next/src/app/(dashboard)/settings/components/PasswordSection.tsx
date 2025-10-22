/**
 * Password Section Component
 * Handles password change functionality
 */

"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface PasswordSectionProps {
  userEmail: string;
  updatePassword: (newPassword: string, confirmPassword: string) => Promise<{ error?: string }>;
  isLoading: boolean;
}

export function PasswordSection({ userEmail, updatePassword, isLoading }: PasswordSectionProps) {
  const { toast } = useToast();
  const newPasswordId = useId();
  const confirmPasswordId = useId();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};

    if (!passwordForm.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      newErrors.newPassword = "Password must contain uppercase, lowercase, and number";
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const { error } = await updatePassword(passwordForm.newPassword, passwordForm.confirmPassword);

    if (error) {
      toast({
        title: "Password Update Failed",
        description: error,
        type: "error",
      });
    } else {
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
        type: "success",
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setErrors({});
    }
  };

  const handlePasswordChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Card variant="secondary">
      <form onSubmit={handlePasswordSubmit}>
        <CardHeader>
          <CardTitle className="!text-blue-600 font-bold">Change Password</CardTitle>
          <p className="text-sm text-slate-600">
            Update your password to keep your account secure.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Hidden username field for accessibility */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={userEmail}
            readOnly
            tabIndex={-1}
            style={{ display: "none" }}
          />

          {/* New Password */}
          <div className="space-y-2">
            <label htmlFor={newPasswordId} className="text-sm font-medium text-slate-700">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                id={newPasswordId}
                type={showPasswords.new ? "text" : "password"}
                placeholder="Enter new password"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange("newPassword")}
                className={`pl-10 pr-10 ${errors.newPassword ? "border-red-500" : ""}`}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                disabled={isLoading}
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="text-sm text-red-500">{errors.newPassword}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label htmlFor={confirmPasswordId} className="text-sm font-medium text-slate-700">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                id={confirmPasswordId}
                type={showPasswords.confirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange("confirmPassword")}
                className={`pl-10 pr-10 ${errors.confirmPassword ? "border-red-500" : ""}`}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                disabled={isLoading}
              >
                {showPasswords.confirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            isLoading={isLoading}
            leftIcon={<Lock className="w-4 h-4" />}
          >
            Update Password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
