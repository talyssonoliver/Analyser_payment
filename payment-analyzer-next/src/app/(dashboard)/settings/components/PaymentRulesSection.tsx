/**
 * Payment Rules Section Component
 * Handles payment calculation rules configuration
 */

"use client";

import { DollarSign, RefreshCw, Save } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface PaymentRules {
  weekdayRate: number;
  saturdayRate: number;
  unloadingBonus: number;
  attendanceBonus: number;
  earlyBonus: number;
}

const DEFAULT_RULES: PaymentRules = {
  weekdayRate: 2.0,
  saturdayRate: 3.0,
  unloadingBonus: 30.0,
  attendanceBonus: 25.0,
  earlyBonus: 50.0,
};

export function PaymentRulesSection() {
  const { toast } = useToast();
  const [paymentRules, setPaymentRules] = useState<PaymentRules>(DEFAULT_RULES);
  const [paymentRulesChanged, setPaymentRulesChanged] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const baseId = useId();

  // Load payment rules from localStorage on component mount
  useEffect(() => {
    const savedRules = localStorage.getItem("pa:rules:v9");
    if (savedRules) {
      try {
        const rules = JSON.parse(savedRules);
        setPaymentRules({
          weekdayRate: rules.weekdayRate || 2.0,
          saturdayRate: rules.saturdayRate || 3.0,
          unloadingBonus: rules.unloadingBonus || 30.0,
          attendanceBonus: rules.attendanceBonus || 25.0,
          earlyBonus: rules.earlyBonus || 50.0,
        });
      } catch (error) {
        console.error("Error loading payment rules:", error);
      }
    }
  }, []);

  const handlePaymentRuleChange =
    (field: keyof PaymentRules) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value) || 0;
      setPaymentRules((prev) => ({ ...prev, [field]: value }));
      setPaymentRulesChanged(true);

      // Clear any errors for this field
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    };

  const handleSavePaymentRules = () => {
    // Validate payment rules
    const newErrors: Record<string, string> = {};

    if (paymentRules.weekdayRate < 0) {
      newErrors.weekdayRate = "Weekday rate must be positive";
    }
    if (paymentRules.saturdayRate < 0) {
      newErrors.saturdayRate = "Saturday rate must be positive";
    }
    if (paymentRules.unloadingBonus < 0) {
      newErrors.unloadingBonus = "Unloading bonus must be positive";
    }
    if (paymentRules.attendanceBonus < 0) {
      newErrors.attendanceBonus = "Attendance bonus must be positive";
    }
    if (paymentRules.earlyBonus < 0) {
      newErrors.earlyBonus = "Early bonus must be positive";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Save to localStorage
    localStorage.setItem("pa:rules:v9", JSON.stringify(paymentRules));
    setPaymentRulesChanged(false);
    setErrors({});

    toast({
      title: "Payment Rules Saved",
      description: "Payment calculation rules have been successfully updated.",
      type: "success",
    });
  };

  const handleResetPaymentRules = () => {
    setPaymentRules(DEFAULT_RULES);
    setPaymentRulesChanged(true);
    setErrors({});

    toast({
      title: "Rules Reset",
      description: "Payment rules have been reset to default values.",
      type: "success",
    });
  };

  return (
    <Card variant="secondary">
      <CardHeader>
        <CardTitle className="!text-blue-600 font-bold flex items-center space-x-2">
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
              <label
                htmlFor={`${baseId}-weekdayRate`}
                className="text-sm font-medium text-slate-700"
              >
                Weekday Rate (Mon-Fri)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">
                  £
                </span>
                <Input
                  id={`${baseId}-weekdayRate`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentRules.weekdayRate.toFixed(2)}
                  onChange={handlePaymentRuleChange("weekdayRate")}
                  className={`pl-7 ${errors.weekdayRate ? "border-red-500" : ""}`}
                />
              </div>
              {errors.weekdayRate && <p className="text-sm text-red-500">{errors.weekdayRate}</p>}
              <p className="text-xs text-slate-500">Amount paid per consignment on weekdays</p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`${baseId}-saturdayRate`}
                className="text-sm font-medium text-slate-700"
              >
                Saturday Rate
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">
                  £
                </span>
                <Input
                  id={`${baseId}-saturdayRate`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentRules.saturdayRate.toFixed(2)}
                  onChange={handlePaymentRuleChange("saturdayRate")}
                  className={`pl-7 ${errors.saturdayRate ? "border-red-500" : ""}`}
                />
              </div>
              {errors.saturdayRate && <p className="text-sm text-red-500">{errors.saturdayRate}</p>}
              <p className="text-xs text-slate-500">Amount paid per consignment on Saturdays</p>
            </div>
          </div>
        </div>

        {/* Daily Bonuses */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="text-sm font-medium text-slate-700">Daily Bonuses</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label
                htmlFor={`${baseId}-unloadingBonus`}
                className="text-sm font-medium text-slate-700"
              >
                Unloading Bonus
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">
                  £
                </span>
                <Input
                  id={`${baseId}-unloadingBonus`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentRules.unloadingBonus.toFixed(2)}
                  onChange={handlePaymentRuleChange("unloadingBonus")}
                  className={`pl-7 ${errors.unloadingBonus ? "border-red-500" : ""}`}
                />
              </div>
              {errors.unloadingBonus && (
                <p className="text-sm text-red-500">{errors.unloadingBonus}</p>
              )}
              <p className="text-xs text-slate-500">
                Daily bonus (all days except Monday & Sunday)
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`${baseId}-attendanceBonus`}
                className="text-sm font-medium text-slate-700"
              >
                Attendance Bonus
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">
                  £
                </span>
                <Input
                  id={`${baseId}-attendanceBonus`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentRules.attendanceBonus.toFixed(2)}
                  onChange={handlePaymentRuleChange("attendanceBonus")}
                  className={`pl-7 ${errors.attendanceBonus ? "border-red-500" : ""}`}
                />
              </div>
              {errors.attendanceBonus && (
                <p className="text-sm text-red-500">{errors.attendanceBonus}</p>
              )}
              <p className="text-xs text-slate-500">Daily bonus (weekdays only: Mon-Fri)</p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`${baseId}-earlyBonus`}
                className="text-sm font-medium text-slate-700"
              >
                Early Arrival Bonus
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">
                  £
                </span>
                <Input
                  id={`${baseId}-earlyBonus`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentRules.earlyBonus.toFixed(2)}
                  onChange={handlePaymentRuleChange("earlyBonus")}
                  className={`pl-7 ${errors.earlyBonus ? "border-red-500" : ""}`}
                />
              </div>
              {errors.earlyBonus && <p className="text-sm text-red-500">{errors.earlyBonus}</p>}
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
                <strong>Monday:</strong> £{paymentRules.weekdayRate.toFixed(2)}/consignment + £
                {paymentRules.attendanceBonus.toFixed(2)} attendance + £
                {paymentRules.earlyBonus.toFixed(2)} early arrival
              </div>
              <div>
                <strong>Tuesday-Friday:</strong> £{paymentRules.weekdayRate.toFixed(2)}/consignment
                + £{paymentRules.unloadingBonus.toFixed(2)} unloading + £
                {paymentRules.attendanceBonus.toFixed(2)} attendance + £
                {paymentRules.earlyBonus.toFixed(2)} early arrival
              </div>
              <div>
                <strong>Saturday:</strong> £{paymentRules.saturdayRate.toFixed(2)}/consignment + £
                {paymentRules.unloadingBonus.toFixed(2)} unloading
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
          variant="secondary"
          onClick={handleResetPaymentRules}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Reset to Defaults
        </Button>

        <div className="flex items-center gap-3">
          {paymentRulesChanged && (
            <span className="text-sm text-amber-600">You have unsaved changes</span>
          )}
          <Button
            onClick={handleSavePaymentRules}
            disabled={!paymentRulesChanged}
            variant="primary"
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Rules
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
