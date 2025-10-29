/**
 * Activity Feed Component
 * Recent invoice activities list
 * Sprint 12, Phase 2: UI Components
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RecentActivityItem, ACTIVITY_TYPE } from '@/types/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  CheckCircle2,
  ArrowRightCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  activities: RecentActivityItem[];
  isLoading?: boolean;
}

// Activity type icon mapping
const ACTIVITY_ICONS = {
  [ACTIVITY_TYPE.CREATED]: FileText,
  [ACTIVITY_TYPE.PAID]: CheckCircle2,
  [ACTIVITY_TYPE.STATUS_CHANGE]: ArrowRightCircle,
  [ACTIVITY_TYPE.REJECTED]: XCircle,
};

// Activity type color mapping
const ACTIVITY_COLORS = {
  [ACTIVITY_TYPE.CREATED]: 'text-info',
  [ACTIVITY_TYPE.PAID]: 'text-success',
  [ACTIVITY_TYPE.STATUS_CHANGE]: 'text-warning',
  [ACTIVITY_TYPE.REJECTED]: 'text-destructive',
};

export const ActivityFeed = React.memo(function ActivityFeed({
  activities,
  isLoading = false,
}: ActivityFeedProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Clock className="h-12 w-12 text-muted-foreground mb-3" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.type];
            const colorClass = ACTIVITY_COLORS[activity.type];
            const relativeTime = formatDistanceToNow(new Date(activity.timestamp), {
              addSuffix: true,
            });

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0"
              >
                <div
                  className={`h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 ${colorClass}`}
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/invoices/${activity.invoice_id}`}
                      className="font-medium text-sm text-foreground hover:text-primary transition-colors truncate"
                    >
                      {activity.invoice_number}
                    </Link>
                    <Badge variant="outline" className="shrink-0 capitalize text-xs">
                      {activity.type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {activity.user_name}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={new Date(activity.timestamp).toISOString()}
                    >
                      {relativeTime}
                    </time>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
