'use client';

import { HiClock, HiCheckCircle, HiPaperAirplane, HiExclamationCircle } from 'react-icons/hi';

interface StatsCardsProps {
  pendingCount: number;
  sentCount: number;
  failedCount: number;
  totalCount: number;
}

export default function StatsCards({ pendingCount, sentCount, failedCount, totalCount }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Messages Card */}
      <div className="bg-background rounded-xl p-6 border border-current/20 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-text-secondary mb-2">
              Total
            </p>
            <p className="text-3xl font-bold text-foreground">
              {totalCount}
            </p>
          </div>
          <div className="p-3 bg-primary/10 rounded-xl">
            <HiPaperAirplane className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>

      {/* Pending Messages Card */}
      <div className="bg-background rounded-xl p-6 border border-current/20 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-text-secondary mb-2">
              Pendientes
            </p>
            <p className="text-3xl font-bold text-foreground">
              {pendingCount}
            </p>
          </div>
          <div className="p-3 bg-yellow-500/10 rounded-xl">
            <HiClock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Sent Messages Card */}
      <div className="bg-background rounded-xl p-6 border border-current/20 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-text-secondary mb-2">
              Enviados
            </p>
            <p className="text-3xl font-bold text-foreground">
              {sentCount}
            </p>
          </div>
          <div className="p-3 bg-green-500/10 rounded-xl">
            <HiCheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      {/* Failed Messages Card */}
      <div className="bg-background rounded-xl p-6 border border-current/20 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-text-secondary mb-2">
              Fallidos
            </p>
            <p className="text-3xl font-bold text-foreground">
              {failedCount}
            </p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-xl">
            <HiExclamationCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>
    </div>
  );
}