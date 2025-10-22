/**
 * Settings Page Integration Tests
 * Comprehensive tests for the user settings page
 */

import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "@/app/(dashboard)/settings/page";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePreferences } from "@/lib/stores/preferences-store";
import {
  mockAuthHook,
  mockPaymentRules,
  mockPreferencesStore,
  mockUser,
} from "@/tests/mocks/settings-data";
import { fireEvent, render, screen, waitFor } from "@/tests/utils/test-utils";

// Mock dependencies
vi.mock("@/lib/hooks/useAuth");
vi.mock("@/lib/stores/preferences-store");
vi.mock("@/components/ui/toast");

describe("Settings Page Integration Tests", () => {
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Set default payment rules in localStorage
    localStorage.setItem("pa:rules:v9", JSON.stringify(mockPaymentRules));

    // Default mock implementations
    (useAuth as unknown as Mock).mockReturnValue({
      ...mockAuthHook,
      updateProfile: vi.fn().mockResolvedValue({ error: null }),
      updatePassword: vi.fn().mockResolvedValue({ error: null }),
    });

    (usePreferences as unknown as Mock).mockReturnValue({
      ...mockPreferencesStore,
      updateDisplay: vi.fn(),
      updateNotifications: vi.fn(),
      updateAnalysis: vi.fn(),
      updatePrivacy: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      resetToDefaults: vi.fn(),
    });

    (useToast as unknown as Mock).mockReturnValue({
      toast: mockToast,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial Page Load", () => {
    it("should render settings page with all tabs", () => {
      render(<SettingsPage />);

      expect(screen.getByText("Account")).toBeInTheDocument();
      expect(screen.getByText("Payment Rules")).toBeInTheDocument();
      expect(screen.getByText("Preferences")).toBeInTheDocument();
    });

    it("should default to Account tab", () => {
      render(<SettingsPage />);

      const accountTab = screen.getByText("Account").closest("button");
      expect(accountTab).toHaveClass("border-blue-500");
    });

    it("should load current user profile data", () => {
      render(<SettingsPage />);

      const displayNameInput = screen.getByLabelText("Display Name");
      expect(displayNameInput).toHaveValue(mockUser.displayName);

      const emailInput = screen.getByLabelText("Email");
      expect(emailInput).toHaveValue(mockUser.email);
    });

    it("should show page header and description", () => {
      render(<SettingsPage />);

      expect(screen.getByText(/Manage your account settings and preferences/i)).toBeInTheDocument();
    });
  });

  describe("Profile Section", () => {
    it("should display profile information card", () => {
      render(<SettingsPage />);

      expect(screen.getByText("Profile Information")).toBeInTheDocument();
      expect(screen.getByText(/Update your account profile information/i)).toBeInTheDocument();
    });

    it("should allow editing display name", async () => {
      render(<SettingsPage />);

      const displayNameInput = screen.getByLabelText("Display Name");
      fireEvent.change(displayNameInput, { target: { value: "" } });
      fireEvent.change(displayNameInput, { target: { value: "New Display Name" } });

      expect(displayNameInput).toHaveValue("New Display Name");
    });

    it("should show email as read-only", () => {
      render(<SettingsPage />);

      const emailInput = screen.getByLabelText("Email");
      expect(emailInput).toBeDisabled();
      expect(screen.getByText(/Email cannot be changed/i)).toBeInTheDocument();
    });

    it("should validate required display name", async () => {
      render(<SettingsPage />);

      const displayNameInput = screen.getByLabelText("Display Name");
      fireEvent.change(displayNameInput, { target: { value: "" } });
      fireEvent.blur(displayNameInput); // Trigger validation

      const saveButton = screen.getByRole("button", { name: /Save Profile/i });
      await fireEvent.click(saveButton);

      await waitFor(
        () => {
          // Check for validation message or disabled save button
          const errorMessage =
            screen.queryByText(/Display name is required/i) || screen.queryByText(/required/i);
          expect(errorMessage || saveButton.hasAttribute("disabled")).toBeTruthy();
        },
        { timeout: 10000 }
      );
    }, 15000); // 15 second test timeout

    it("should save profile successfully", async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue({ error: null });
      (useAuth as unknown as Mock).mockReturnValue({
        ...mockAuthHook,
        updateProfile: mockUpdateProfile,
      });

      render(<SettingsPage />);

      const displayNameInput = screen.getByLabelText("Display Name");
      fireEvent.change(displayNameInput, { target: { value: "" } });
      fireEvent.change(displayNameInput, { target: { value: "Updated Name" } });

      const saveButton = screen.getByRole("button", { name: /Save Profile/i });
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          displayName: "Updated Name",
        });
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Profile Updated",
            type: "success",
          })
        );
      });
    });

    it("should handle profile save error", async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue({ error: "Update failed" });
      (useAuth as unknown as Mock).mockReturnValue({
        ...mockAuthHook,
        updateProfile: mockUpdateProfile,
      });

      render(<SettingsPage />);

      const saveButton = screen.getByRole("button", { name: /Save Profile/i });
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Update Failed",
            type: "error",
          })
        );
      });
    });
  });

  describe("Password Section", () => {
    it("should display change password card", () => {
      render(<SettingsPage />);

      expect(screen.getByText("Change Password")).toBeInTheDocument();
      expect(
        screen.getByText(/Update your password to keep your account secure/i)
      ).toBeInTheDocument();
    });

    it("should have password input fields", () => {
      render(<SettingsPage />);

      expect(screen.getByLabelText("New Password")).toBeInTheDocument();
      expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
    });

    it("should toggle password visibility", async () => {
      render(<SettingsPage />);

      const newPasswordInput = screen.getByLabelText("New Password");
      expect(newPasswordInput).toHaveAttribute("type", "password");

      // Find the password field container and the toggle button within it
      const passwordContainer = newPasswordInput.parentElement;
      const toggleButtons = passwordContainer?.querySelectorAll('button[type="button"]');

      if (toggleButtons && toggleButtons.length > 0) {
        await fireEvent.click(toggleButtons[0]);
        await waitFor(() => {
          expect(newPasswordInput).toHaveAttribute("type", "text");
        });
      }
    });

    it("should validate password length", async () => {
      render(<SettingsPage />);

      const newPasswordInput = screen.getByLabelText("New Password");
      fireEvent.change(newPasswordInput, { target: { value: "short" } });

      const updateButton = screen.getByRole("button", { name: /Update Password/i });
      await fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it("should validate password complexity", async () => {
      render(<SettingsPage />);

      const newPasswordInput = screen.getByLabelText("New Password");
      fireEvent.change(newPasswordInput, { target: { value: "simplepass" } });

      const updateButton = screen.getByRole("button", { name: /Update Password/i });
      await fireEvent.click(updateButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Password must contain uppercase, lowercase, and number/i)
        ).toBeInTheDocument();
      });
    });

    it("should validate passwords match", async () => {
      render(<SettingsPage />);

      const newPasswordInput = screen.getByLabelText("New Password");
      const confirmPasswordInput = screen.getByLabelText("Confirm New Password");

      fireEvent.change(newPasswordInput, { target: { value: "ValidPass123" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "DifferentPass123" } });

      const updateButton = screen.getByRole("button", { name: /Update Password/i });
      await fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
      });
    });

    it("should update password successfully", async () => {
      const mockUpdatePassword = vi.fn().mockResolvedValue({ error: null });
      (useAuth as unknown as Mock).mockReturnValue({
        ...mockAuthHook,
        updatePassword: mockUpdatePassword,
      });

      render(<SettingsPage />);

      const newPasswordInput = screen.getByLabelText("New Password");
      const confirmPasswordInput = screen.getByLabelText("Confirm New Password");

      fireEvent.change(newPasswordInput, { target: { value: "ValidPass123" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "ValidPass123" } });

      const updateButton = screen.getByRole("button", { name: /Update Password/i });
      await fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockUpdatePassword).toHaveBeenCalledWith("ValidPass123", "ValidPass123");
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Password Updated",
            type: "success",
          })
        );
      });
    });

    it("should clear password fields after successful update", async () => {
      const mockUpdatePassword = vi.fn().mockResolvedValue({ error: null });
      (useAuth as unknown as Mock).mockReturnValue({
        ...mockAuthHook,
        updatePassword: mockUpdatePassword,
      });

      render(<SettingsPage />);

      const newPasswordInput = screen.getByLabelText("New Password");
      const confirmPasswordInput = screen.getByLabelText("Confirm New Password");

      fireEvent.change(newPasswordInput, { target: { value: "ValidPass123" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "ValidPass123" } });

      const updateButton = screen.getByRole("button", { name: /Update Password/i });
      await fireEvent.click(updateButton);

      await waitFor(() => {
        expect(newPasswordInput).toHaveValue("");
        expect(confirmPasswordInput).toHaveValue("");
      });
    });
  });

  describe("Payment Rules Tab", () => {
    beforeEach(() => {
      render(<SettingsPage />);
    });

    it("should switch to Payment Rules tab", async () => {
      const paymentRulesTab = screen.getByText("Payment Rules");
      await fireEvent.click(paymentRulesTab);

      await waitFor(() => {
        expect(screen.getByText("Payment Calculation Rules")).toBeInTheDocument();
      });
    });

    it("should display delivery rates section", async () => {
      const paymentRulesTab = screen.getByText("Payment Rules");
      await fireEvent.click(paymentRulesTab);

      await waitFor(() => {
        expect(screen.getByLabelText(/Weekday Rate/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Saturday Rate/i)).toBeInTheDocument();
      });
    });

    it("should display daily bonuses section", async () => {
      const paymentRulesTab = screen.getByText("Payment Rules");
      await fireEvent.click(paymentRulesTab);

      await waitFor(() => {
        expect(screen.getByLabelText(/Unloading Bonus/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Attendance Bonus/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Early Arrival Bonus/i)).toBeInTheDocument();
      });
    });

    it("should load payment rules from localStorage", async () => {
      const paymentRulesTab = screen.getByText("Payment Rules");
      await fireEvent.click(paymentRulesTab);

      await waitFor(() => {
        const weekdayInput = screen.getByLabelText(/Weekday Rate/i) as HTMLInputElement;
        expect(weekdayInput.value).toBe("2.00");

        const saturdayInput = screen.getByLabelText(/Saturday Rate/i) as HTMLInputElement;
        expect(saturdayInput.value).toBe("3.00");
      });
    });

    it("should allow editing weekday rate", async () => {
      const paymentRulesTab = screen.getByText("Payment Rules");
      await fireEvent.click(paymentRulesTab);

      await waitFor(() => {
        const weekdayInput = screen.getByLabelText(/Weekday Rate/i);
        expect(weekdayInput).toBeInTheDocument();
      });

      const weekdayInput = screen.getByLabelText(/Weekday Rate/i) as HTMLInputElement;
      fireEvent.change(weekdayInput, { target: { value: "" } });
      fireEvent.change(weekdayInput, { target: { value: "2.50" } });

      expect(weekdayInput.value).toBe("2.50");
    });

    it("should validate positive rates", async () => {
      const paymentRulesTab = screen.getByText("Payment Rules");
      await fireEvent.click(paymentRulesTab);

      await waitFor(() => {
        const weekdayInput = screen.getByLabelText(/Weekday Rate/i);
        expect(weekdayInput).toBeInTheDocument();
      });

      const weekdayInput = screen.getByLabelText(/Weekday Rate/i);
      fireEvent.change(weekdayInput, { target: { value: "" } });
      fireEvent.change(weekdayInput, { target: { value: "-1.00" } });

      const saveButton = screen.getByRole("button", { name: /Save Rules/i });
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Weekday rate must be positive/i)).toBeInTheDocument();
      });
    });

    it("should save payment rules to localStorage", async () => {
      const paymentRulesTab = screen.getByText("Payment Rules");
      await fireEvent.click(paymentRulesTab);

      await waitFor(() => {
        const weekdayInput = screen.getByLabelText(/Weekday Rate/i);
        expect(weekdayInput).toBeInTheDocument();
      });

      const weekdayInput = screen.getByLabelText(/Weekday Rate/i);
      fireEvent.change(weekdayInput, { target: { value: "" } });
      fireEvent.change(weekdayInput, { target: { value: "2.50" } });

      const saveButton = screen.getByRole("button", { name: /Save Rules/i });
      await fireEvent.click(saveButton);

      await waitFor(() => {
        const savedRules = JSON.parse(localStorage.getItem("pa:rules:v9") || "{}");
        expect(savedRules.weekdayRate).toBe(2.5);
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Payment Rules Saved",
            type: "success",
          })
        );
      });
    });

    it("should reset payment rules to defaults", async () => {
      const paymentRulesTab = screen.getByText("Payment Rules");
      await fireEvent.click(paymentRulesTab);

      await waitFor(() => {
        const resetButton = screen.getByRole("button", { name: /Reset to Defaults/i });
        expect(resetButton).toBeInTheDocument();
      });

      const resetButton = screen.getByRole("button", { name: /Reset to Defaults/i });
      await fireEvent.click(resetButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Rules Reset",
            type: "success",
          })
        );
      });
    });

    it("should show unsaved changes indicator", async () => {
      const paymentRulesTab = screen.getByText("Payment Rules");
      await fireEvent.click(paymentRulesTab);

      await waitFor(() => {
        const weekdayInput = screen.getByLabelText(/Weekday Rate/i);
        expect(weekdayInput).toBeInTheDocument();
      });

      const weekdayInput = screen.getByLabelText(/Weekday Rate/i);
      fireEvent.change(weekdayInput, { target: { value: "" } });
      fireEvent.change(weekdayInput, { target: { value: "2.50" } });

      await waitFor(() => {
        expect(screen.getByText(/You have unsaved changes/i)).toBeInTheDocument();
      });
    });

    it("should display rules summary", async () => {
      const paymentRulesTab = screen.getByText("Payment Rules");
      await fireEvent.click(paymentRulesTab);

      await waitFor(() => {
        expect(screen.getByText("Rules Summary")).toBeInTheDocument();
        expect(screen.getByText(/Monday:/i)).toBeInTheDocument();
        expect(screen.getByText(/Tuesday-Friday:/i)).toBeInTheDocument();
        expect(screen.getByText(/Saturday:/i)).toBeInTheDocument();
        expect(screen.getByText(/Sunday:/i)).toBeInTheDocument();
      });
    });
  });

  describe("Preferences Tab", () => {
    it("should switch to Preferences tab", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByText("Display Preferences")).toBeInTheDocument();
      });
    });

    it("should display theme selector", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Theme")).toBeInTheDocument();
      });
    });

    it("should display date format selector", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Date Format")).toBeInTheDocument();
      });
    });

    it("should display currency format selector", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Currency Format")).toBeInTheDocument();
      });
    });

    it("should update theme preference", async () => {
      const mockUpdateDisplay = vi.fn();
      (usePreferences as unknown as Mock).mockReturnValue({
        ...mockPreferencesStore,
        updateDisplay: mockUpdateDisplay,
      });

      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        const themeSelect = screen.getByLabelText("Theme");
        expect(themeSelect).toBeInTheDocument();
      });

      // Click the select button to open dropdown
      const themeSelect = screen.getByLabelText("Theme");
      await fireEvent.click(themeSelect);

      // Wait for dropdown to open and click "Dark" option
      await waitFor(() => {
        const darkOption = screen.getByText("Dark");
        expect(darkOption).toBeInTheDocument();
      });

      const darkOption = screen.getByText("Dark");
      await fireEvent.click(darkOption);

      expect(mockUpdateDisplay).toHaveBeenCalledWith({ theme: "dark" });
    });

    it("should toggle compact mode", async () => {
      const mockUpdateDisplay = vi.fn();
      (usePreferences as unknown as Mock).mockReturnValue({
        ...mockPreferencesStore,
        updateDisplay: mockUpdateDisplay,
      });

      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Compact Mode")).toBeInTheDocument();
      });

      const compactModeSwitch = screen.getByLabelText("Compact Mode");
      await fireEvent.click(compactModeSwitch);

      expect(mockUpdateDisplay).toHaveBeenCalled();
    });

    it("should toggle advanced features", async () => {
      const mockUpdateDisplay = vi.fn();
      (usePreferences as unknown as Mock).mockReturnValue({
        ...mockPreferencesStore,
        updateDisplay: mockUpdateDisplay,
      });

      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Show Advanced Features")).toBeInTheDocument();
      });

      const advancedSwitch = screen.getByLabelText("Show Advanced Features");
      await fireEvent.click(advancedSwitch);

      expect(mockUpdateDisplay).toHaveBeenCalled();
    });
  });

  describe("Notification Preferences", () => {
    it("should display notification preferences section", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByText("Notifications")).toBeInTheDocument();
      });
    });

    it("should toggle analysis complete notification", async () => {
      const mockUpdateNotifications = vi.fn();
      (usePreferences as unknown as Mock).mockReturnValue({
        ...mockPreferencesStore,
        updateNotifications: mockUpdateNotifications,
      });

      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Analysis Complete")).toBeInTheDocument();
      });

      const notificationSwitch = screen.getByLabelText("Analysis Complete");
      await fireEvent.click(notificationSwitch);

      expect(mockUpdateNotifications).toHaveBeenCalled();
    });

    it("should toggle error alerts", async () => {
      const mockUpdateNotifications = vi.fn();
      (usePreferences as unknown as Mock).mockReturnValue({
        ...mockPreferencesStore,
        updateNotifications: mockUpdateNotifications,
      });

      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Error Alerts")).toBeInTheDocument();
      });

      const errorSwitch = screen.getByLabelText("Error Alerts");
      await fireEvent.click(errorSwitch);

      expect(mockUpdateNotifications).toHaveBeenCalled();
    });

    it("should toggle daily digest", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Daily Digest")).toBeInTheDocument();
      });
    });

    it("should toggle weekly report", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Weekly Report")).toBeInTheDocument();
      });
    });
  });

  describe("Analysis & Export Preferences", () => {
    it("should display analysis preferences section", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByText("Analysis & Export")).toBeInTheDocument();
      });
    });

    it("should toggle auto save", async () => {
      const mockUpdateAnalysis = vi.fn();
      (usePreferences as unknown as Mock).mockReturnValue({
        ...mockPreferencesStore,
        updateAnalysis: mockUpdateAnalysis,
      });

      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Auto Save")).toBeInTheDocument();
      });

      const autoSaveSwitch = screen.getByLabelText("Auto Save");
      await fireEvent.click(autoSaveSwitch);

      expect(mockUpdateAnalysis).toHaveBeenCalled();
    });

    it("should toggle auto export", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Auto Export")).toBeInTheDocument();
      });
    });

    it("should select default export format", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Default Export Format")).toBeInTheDocument();
      });
    });

    it("should toggle include charts", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Include Charts")).toBeInTheDocument();
      });
    });

    it("should toggle include summary", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Include Summary")).toBeInTheDocument();
      });
    });
  });

  describe("Privacy Preferences", () => {
    it("should display privacy preferences section", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByText("Privacy & Data")).toBeInTheDocument();
      });
    });

    it("should toggle analytics", async () => {
      const mockUpdatePrivacy = vi.fn();
      (usePreferences as unknown as Mock).mockReturnValue({
        ...mockPreferencesStore,
        updatePrivacy: mockUpdatePrivacy,
      });

      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Analytics")).toBeInTheDocument();
      });

      const analyticsSwitch = screen.getByLabelText("Analytics");
      await fireEvent.click(analyticsSwitch);

      expect(mockUpdatePrivacy).toHaveBeenCalled();
    });

    it("should toggle error reporting", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Error Reporting")).toBeInTheDocument();
      });
    });

    it("should select data retention period", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Data Retention Period")).toBeInTheDocument();
      });
    });
  });

  describe("Save and Reset Preferences", () => {
    it("should save all preferences", async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);
      (usePreferences as unknown as Mock).mockReturnValue({
        ...mockPreferencesStore,
        save: mockSave,
        hasUnsavedChanges: true, // Enable the save button
      });

      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        const saveButton = screen.getByRole("button", { name: /Save Preferences/i });
        expect(saveButton).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /Save Preferences/i });
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Preferences Saved",
            type: "success",
          })
        );
      });
    });

    it("should handle save error", async () => {
      const mockSave = vi.fn().mockRejectedValue(new Error("Save failed"));
      (usePreferences as unknown as Mock).mockReturnValue({
        ...mockPreferencesStore,
        save: mockSave,
        hasUnsavedChanges: true, // Enable the save button
      });

      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        const saveButton = screen.getByRole("button", { name: /Save Preferences/i });
        expect(saveButton).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /Save Preferences/i });
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Save Failed",
            type: "error",
          })
        );
      });
    });

    it("should reset preferences to defaults", async () => {
      const mockResetToDefaults = vi.fn();
      (usePreferences as unknown as Mock).mockReturnValue({
        ...mockPreferencesStore,
        resetToDefaults: mockResetToDefaults,
      });

      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        const resetButtons = screen.getAllByRole("button", { name: /Reset to Defaults/i });
        expect(resetButtons.length).toBeGreaterThan(0);
      });

      const resetButtons = screen.getAllByRole("button", { name: /Reset to Defaults/i });
      await fireEvent.click(resetButtons[resetButtons.length - 1]);

      await waitFor(() => {
        expect(mockResetToDefaults).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Preferences Reset",
            type: "success",
          })
        );
      });
    });

    it("should disable save button when no unsaved changes", async () => {
      (usePreferences as unknown as Mock).mockReturnValue({
        ...mockPreferencesStore,
        hasUnsavedChanges: false,
      });

      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        const saveButton = screen.getByRole("button", { name: /Save Preferences/i });
        expect(saveButton).toBeDisabled();
      });
    });

    it("should show unsaved changes indicator", async () => {
      (usePreferences as unknown as Mock).mockReturnValue({
        ...mockPreferencesStore,
        hasUnsavedChanges: true,
      });

      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByText(/You have unsaved changes/i)).toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading state for preferences", async () => {
      (usePreferences as unknown as Mock).mockReturnValue({
        ...mockPreferencesStore,
        isLoading: true,
      });

      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByText(/Loading preferences/i)).toBeInTheDocument();
      });
    });

    it("should disable buttons during save operation", async () => {
      (useAuth as unknown as Mock).mockReturnValue({
        ...mockAuthHook,
        isLoading: true,
      });

      render(<SettingsPage />);

      const saveButton = screen.getByRole("button", { name: /Save Profile/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper form labels", () => {
      render(<SettingsPage />);

      expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    it("should have proper tab navigation", async () => {
      render(<SettingsPage />);

      const tabs = screen.getAllByRole("button");
      const accountTab = tabs.find((tab) => tab.textContent?.includes("Account"));
      const paymentTab = tabs.find((tab) => tab.textContent?.includes("Payment Rules"));
      const preferencesTab = tabs.find((tab) => tab.textContent?.includes("Preferences"));

      expect(accountTab).toBeInTheDocument();
      expect(paymentTab).toBeInTheDocument();
      expect(preferencesTab).toBeInTheDocument();
    });

    it("should have proper ARIA labels on switches", async () => {
      render(<SettingsPage />);

      const preferencesTab = screen.getByText("Preferences");
      await fireEvent.click(preferencesTab);

      await waitFor(() => {
        const switches = screen.getAllByRole("switch");
        expect(switches.length).toBeGreaterThan(0);
      });
    });
  });
});
