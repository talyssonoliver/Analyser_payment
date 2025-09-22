/**
 * Entry Row Component
 * Individual row for displaying and editing manual entries
 */

'use client';

import { useState, useEffect, ComponentType } from 'react';
import { 
  loadFramerMotion, 
  StaticDiv,
  type MotionDivProps
} from '@/lib/optimization/dynamic-motion';
import { format } from 'date-fns';
import { Edit2, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency, getDayName } from '@/lib/utils';
import { PaymentRules } from '@/lib/domain/entities';
import type { ManualEntryData } from './manual-entry';

interface EntryRowProps {
  entry: ManualEntryData;
  isEditing: boolean;
  onUpdate: (updates: Partial<ManualEntryData>) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRemove: () => void;
  disabled: boolean;
  paymentRules?: PaymentRules;
}

export function EntryRow({
  entry,
  isEditing,
  onUpdate,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
  disabled,
}: EntryRowProps) {
  const [editValues, setEditValues] = useState({
    date: format(entry.date, 'yyyy-MM-dd'),
    consignments: typeof entry.consignments === 'number' ? entry.consignments.toString() : String(entry.consignments || 0),
    paidAmount: typeof entry.paidAmount === 'number' ? entry.paidAmount.toString() : String(entry.paidAmount || 0),
  });

  // Dynamic motion loading
  const [motionComponents, setMotionComponents] = useState<{
    MotionDiv: ComponentType<MotionDivProps>;
  }>({
    MotionDiv: StaticDiv,
  });

  useEffect(() => {
    // Load framer-motion only when component mounts
    loadFramerMotion().then(({ motion }) => {
      setMotionComponents({
        MotionDiv: motion.div as ComponentType<MotionDivProps>,
      });
    });
  }, []);

  const dayName = getDayName(entry.date);
  const dayOfWeek = entry.date.getDay();
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;

  const handleSave = () => {
    const newDate = new Date(editValues.date);
    const newConsignments = parseInt(editValues.consignments) || 0;
    const newPaidAmount = parseFloat(editValues.paidAmount) || 0;

    onUpdate({
      date: newDate,
      consignments: newConsignments,
      paidAmount: newPaidAmount,
    });
    
    onSaveEdit();
  };

  const handleCancel = () => {
    // Reset to original values
    setEditValues({
      date: format(entry.date, 'yyyy-MM-dd'),
      consignments: typeof entry.consignments === 'number' ? entry.consignments.toString() : String(entry.consignments || 0),
      paidAmount: typeof entry.paidAmount === 'number' ? entry.paidAmount.toString() : String(entry.paidAmount || 0),
    });
    onCancelEdit();
  };

  const getDifferenceColor = (difference: number) => {
    if (Math.abs(difference) < 0.01) return 'text-slate-600';
    return difference >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getDifferenceIcon = (difference: number) => {
    if (Math.abs(difference) < 0.01) return '';
    return difference >= 0 ? '+' : '';
  };

  const { MotionDiv } = motionComponents;

  if (isEditing) {
    return (
      <MotionDiv
        initial={{ backgroundColor: '#f8fafc' }}
        animate={{ backgroundColor: '#ffffff' }}
        className="px-4 py-4 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Date
            </label>
            <Input
              type="date"
              value={editValues.date}
              onChange={(e) => setEditValues(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Consignments
            </label>
            <Input
              type="number"
              value={editValues.consignments}
              onChange={(e) => setEditValues(prev => ({ ...prev, consignments: e.target.value }))}
              min="0"
              step="1"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Paid Amount (£)
            </label>
            <Input
              type="number"
              value={editValues.paidAmount}
              onChange={(e) => setEditValues(prev => ({ ...prev, paidAmount: e.target.value }))}
              min="0"
              step="0.01"
            />
          </div>

          <div className="flex items-end space-x-2">
            <Button
              onClick={handleSave}
            >
              <Save className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </MotionDiv>
    );
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="px-4 py-4 hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center justify-between">
        {/* Date and day info */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-900">
                {format(entry.date, 'dd/MM/yyyy')}
              </span>
              
              <Badge 
                variant={isSunday ? 'warning' : isSaturday ? 'info' : 'secondary'}
                >
                {dayName}
              </Badge>
            </div>
            
            <div className="text-sm text-slate-600 mt-1">
              {entry.consignments} consignments
            </div>
          </div>
        </div>

        {/* Payment info */}
        <div className="flex items-center space-x-6 text-sm">
          <div className="text-right">
            <div className="text-slate-600">Expected</div>
            <div className="font-semibold">
              {formatCurrency(entry.expectedAmount || 0)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-slate-600">Paid</div>
            <div className="font-semibold">
              {formatCurrency(entry.paidAmount)}
            </div>
          </div>

          <div className="text-right min-w-[80px]">
            <div className="text-slate-600">Difference</div>
            <div className={cn(
              'font-semibold',
              getDifferenceColor(entry.difference || 0)
            )}>
              {getDifferenceIcon(entry.difference || 0)}
              {formatCurrency(Math.abs(entry.difference || 0))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={onStartEdit}
              disabled={disabled}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              onClick={onRemove}
              disabled={disabled}
              className="text-slate-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </MotionDiv>
  );
}