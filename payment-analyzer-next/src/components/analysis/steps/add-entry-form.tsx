
/**
 * Add Entry Form Component (Refactored)
 * Form for adding new manual entries, using react-hook-form and zod.
 */

'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Save, X, Calculator, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn, formatCurrency, getDayName } from '@/lib/utils';
import { calculateExpectedPayment } from '@/lib/utils/payment-utils';
import { PaymentRules } from '@/lib/domain/entities';
import { createManualEntrySchema, ManualEntryFormValues } from '@/lib/domain/schemas/manual-entry-schema';
import type { ManualEntryData } from './manual-entry';

interface AddEntryFormProps {
  readonly onAdd: (entry: Omit<ManualEntryData, 'id' | 'expectedAmount' | 'difference'>) => void;
  readonly onCancel: () => void;
  readonly existingDates: Date[];
  readonly paymentRules?: PaymentRules;
  readonly initialDate?: Date;
}

export function AddEntryForm({
  onAdd,
  onCancel,
  existingDates,
  paymentRules,
  initialDate = new Date(),
}: AddEntryFormProps) {
  const manualEntrySchema = useMemo(() => {
    return createManualEntrySchema(existingDates);
  }, [existingDates]);

  const form = useForm<ManualEntryFormValues>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: {
      date: format(initialDate, 'yyyy-MM-dd'),
      consignments: 0,
      paidAmount: 0,
    },
  });

  const { isSubmitting } = form.formState;

  const watchedValues = form.watch();
  const selectedDate = useMemo(() => new Date(watchedValues.date), [watchedValues.date]);
  const dayOfWeek = selectedDate.getDay();
  const dayName = getDayName(selectedDate);
  const isSunday = dayOfWeek === 0;

  const preview = useMemo(() => {
    const consignmentCount = watchedValues.consignments || 0;
    const paidAmountValue = watchedValues.paidAmount || 0;

    const calculation = calculateExpectedPayment(selectedDate, consignmentCount, paymentRules);
    const difference = paidAmountValue - calculation.expectedAmount;
    
    return {
      rate: calculation.basePayment / (consignmentCount || 1),
      basePayment: calculation.basePayment,
      bonuses: calculation.bonuses,
      totalBonuses: calculation.totalBonuses,
      expectedAmount: calculation.expectedAmount,
      difference,
    };
  }, [watchedValues, selectedDate, paymentRules]);

  function onSubmit(values: ManualEntryFormValues) {
    onAdd({
      date: new Date(values.date),
      consignments: values.consignments,
      paidAmount: values.paidAmount,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-900">Add New Entry</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        {isSunday ? 'Warning: Sunday is typically non-working.' : ''}
                      </FormDescription>
                      <FormMessage />
                      {watchedValues.date && (
                        <div className="mt-2 flex items-center space-x-2">
                          <Badge variant="secondary" size="sm">
                            {dayName}
                          </Badge>
                          {dayOfWeek === 6 && (
                            <Badge variant="info" size="sm">
                              Saturday Rate
                            </Badge>
                          )}
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="consignments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consignments</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paidAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid Amount (£)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {watchedValues.date && watchedValues.consignments > 0 && (
                <Card variant="flat" className="bg-blue-50">
                  <CardContent>
                    <div className="flex items-center space-x-2 mb-3">
                      <Calculator className="w-4 h-4 text-blue-600" />
                      <h5 className="font-medium text-blue-900">Calculation Preview</h5>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-slate-600">Base Pay</div>
                          <div className="font-semibold">
                            {watchedValues.consignments || 0} × £{preview.rate.toFixed(2)} = {formatCurrency(preview.basePayment)}
                          </div>
                        </div>
    
                        <div>
                          <div className="text-slate-600">Bonuses</div>
                          <div className="space-y-1">
                            {preview.bonuses.unloading > 0 && (
                              <div className="text-xs">Unloading: {formatCurrency(preview.bonuses.unloading)}</div>
                            )}
                            {preview.bonuses.attendance > 0 && (
                              <div className="text-xs">Attendance: {formatCurrency(preview.bonuses.attendance)}</div>
                            )}
                            {preview.bonuses.early > 0 && (
                              <div className="text-xs">Early: {formatCurrency(preview.bonuses.early)}</div>
                            )}
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(preview.totalBonuses)}
                          </div>
                        </div>
    
                        <div>
                          <div className="text-slate-600">Expected</div>
                          <div className="font-semibold text-blue-700">
                            {formatCurrency(preview.expectedAmount)}
                          </div>
                        </div>
    
                        <div>
                          <div className="text-slate-600">Difference</div>
                          <div className={cn(
                            'font-semibold',
                            preview.difference >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {preview.difference >= 0 ? '+' : ''}{formatCurrency(preview.difference)}
                          </div>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Add Entry
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
