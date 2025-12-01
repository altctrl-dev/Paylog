'use client';

/**
 * AI Insights Panel Component (v3)
 *
 * Displays AI-generated insights with:
 * - Gradient background (blue to purple)
 * - Sparkles icon
 * - Main insight text
 * - Link to detailed analysis
 *
 * Matches the mockup design:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ ✨ AI Insights                                              │
 * │ 3 payments due this week totaling ₹45,000...                │
 * │ [View detailed analysis →]                                  │
 * └─────────────────────────────────────────────────────────────┘
 */

import * as React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'suggestion';
  link?: string;
  linkText?: string;
}

export interface AIInsightsPanelProps {
  insights: AIInsight[];
  className?: string;
}

// ============================================================================
// Single Insight Card
// ============================================================================

interface InsightCardProps {
  insight: AIInsight;
}

function InsightCard({ insight }: InsightCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden p-4',
        'bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-purple-500/10',
        'border-blue-500/20',
        'transition-all duration-300 hover:shadow-lg'
      )}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl" />

      <div className="relative flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Sparkles className="h-5 w-5 text-blue-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {insight.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {insight.description}
          </p>

          {/* Link */}
          {insight.link && (
            <Link
              href={insight.link}
              className={cn(
                'inline-flex items-center gap-1 mt-2',
                'text-sm text-blue-400 hover:text-blue-300 hover:underline',
                'transition-colors'
              )}
            >
              {insight.linkText || 'View detailed analysis'}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AIInsightsPanel({ insights, className }: AIInsightsPanelProps) {
  if (insights.length === 0) {
    return null;
  }

  // For now, show only the first insight (as in mockup)
  // Can be expanded to show multiple insights in a carousel/stack
  const primaryInsight = insights[0];

  return (
    <div className={cn('space-y-3', className)}>
      <InsightCard insight={primaryInsight} />
    </div>
  );
}

// ============================================================================
// Simple Single Insight (for dashboard)
// ============================================================================

export interface SimpleAIInsightProps {
  title?: string;
  description: string;
  link?: string;
  linkText?: string;
  className?: string;
}

export function SimpleAIInsight({
  title = 'AI Insights',
  description,
  link = '/reports',
  linkText = 'View detailed analysis',
  className,
}: SimpleAIInsightProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden p-4',
        'bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10',
        'border-blue-500/20',
        'transition-all duration-300 hover:shadow-lg',
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl" />

      <div className="relative flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Sparkles className="h-5 w-5 text-blue-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>

          {/* Link */}
          {link && (
            <Link
              href={link}
              className={cn(
                'inline-flex items-center gap-1 mt-2',
                'text-sm text-blue-400 hover:text-blue-300 hover:underline',
                'transition-colors'
              )}
            >
              {linkText}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

export default AIInsightsPanel;
