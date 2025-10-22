/**
 * Login Page
 * User authentication login form
 */

"use client";

import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { Button, CardHeader, CardTitle, Input } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LoginPage() {
  const { signIn, isLoading } = useAuth();
  const { toast } = useToast();
  const emailId = useId();
  const passwordId = useId();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const { error } = await signIn(formData);

    if (error) {
      toast({
        title: "Sign In Failed",
        description: error,
        type: "error",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
        type: "success",
      });
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === "rememberMe" ? e.target.checked : e.target.value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <p className="text-sm text-slate-600">Enter your credentials to access your account</p>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div className="space-y-2">
          <label htmlFor={emailId} className="text-sm font-medium text-slate-700">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              id={emailId}
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange("email")}
              className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
              disabled={isLoading}
              autoComplete="email"
              autoFocus
            />
          </div>
          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <label htmlFor={passwordId} className="text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              id={passwordId}
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange("password")}
              className={`pl-10 pr-10 ${errors.password ? "border-red-500" : ""}`}
              disabled={isLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleChange("rememberMe")}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              disabled={isLoading}
            />
            <span className="text-sm text-slate-600">Remember me</span>
          </label>

          <Link
            prefetch={false}
            href="/reset-password"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isLoading} isLoading={isLoading}>
          <LogIn className="w-4 h-4 mr-2" />
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              prefetch={false}
              href="/signup"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </form>
    </>
  );
}
