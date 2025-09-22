/**
 * EmptyState Component
 * Reusable component for displaying empty states across the application
 */

import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from './card';
import { Button } from './button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions = [],
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      <Card>
        <CardContent className="p-8 text-center">
          <Icon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
          <p className="text-slate-600 mb-4">{description}</p>
          {actions.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'primary'}
                  onClick={action.onClick}
                >
                  {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}