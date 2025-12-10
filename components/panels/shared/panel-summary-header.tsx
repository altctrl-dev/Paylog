'use client';

import * as React from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

export interface PanelSummaryHeaderProps {
  title: string;
  subtitle?: string;
  badges?: Array<{ label: string; variant?: BadgeVariant }>;
  meta?: React.ReactNode;
  className?: string;
}

export function PanelSummaryHeader({
  title,
  subtitle,
  badges,
  meta,
  className,
}: PanelSummaryHeaderProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {badges && badges.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {badges.map((badge, index) => (
              <Badge key={index} variant={badge.variant}>
                {badge.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {meta && <div className="text-sm text-muted-foreground">{meta}</div>}
    </div>
  );
}
