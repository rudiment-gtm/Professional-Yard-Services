'use client';

import { ServiceType } from '@/lib/types';
import { SERVICE_CONFIG } from '@/lib/constants';
import clsx from 'clsx';

interface ServiceBadgeProps {
  service: ServiceType;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export default function ServiceBadge({
  service,
  size = 'md',
  showDot = false,
}: ServiceBadgeProps) {
  const config = SERVICE_CONFIG[service];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      )}
      style={{
        color: config.color,
        borderColor: `${config.color}40`,
        backgroundColor: `${config.color}15`,
      }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: config.color }}
        />
      )}
      {config.label}
    </span>
  );
}
