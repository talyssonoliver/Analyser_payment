/**
 * Profile Section Component
 * Handles user profile information updates
 */

"use client";

import { Mail, Save, User } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface ProfileSectionProps {
  user: {
    displayName?: string | null;
    email?: string | null;
  } | null;
  updateProfile: (data: { displayName: string }) => Promise<{ error?: string }>;
  isLoading: boolean;
}

export function ProfileSection({ user, updateProfile, isLoading }: ProfileSectionProps) {
  const { toast } = useToast();
  const displayNameId = useId();
  const emailId = useId();
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!profileForm.displayName.trim()) {
      newErrors.displayName = "Display name is required";
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
        title: "Update Failed",
        description: error,
        type: "error",
      });
    } else {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
        type: "success",
      });
      setErrors({});
    }
  };

  const handleProfileChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Card variant="secondary">
      <form onSubmit={handleProfileSubmit}>
        <CardHeader>
          <CardTitle className="!text-blue-600 font-bold">Profile Information</CardTitle>
          <p className="text-sm text-slate-600">Update your account profile information.</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Display Name */}
          <div className="space-y-2">
            <label htmlFor={displayNameId} className="text-sm font-medium text-slate-700">
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                id={displayNameId}
                type="text"
                placeholder="Enter your display name"
                value={profileForm.displayName}
                onChange={handleProfileChange("displayName")}
                className={`pl-10 ${errors.displayName ? "border-red-500" : ""}`}
                disabled={isLoading}
              />
            </div>
            {errors.displayName && <p className="text-sm text-red-500">{errors.displayName}</p>}
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <label htmlFor={emailId} className="text-sm font-medium text-slate-700">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                id={emailId}
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

        <CardFooter className="justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            isLoading={isLoading}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Profile
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
