'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CheckCircle2, Circle, ArrowRight, Zap, MessageSquare, BookOpen, BarChart3 } from 'lucide-react';

interface Step {
  step_key: string;
  title: string;
  description: string;
  order: number;
  is_required: boolean;
  is_completed: boolean;
  completed_at: string | null;
}

export default function OnboardingPage() {
  const queryClient = useQueryClient();

  const { data: steps = [], isLoading } = useQuery<Step[]>({
    queryKey: ['onboarding', 'progress'],
    queryFn: async () => {
      const response = await api.get('/api/onboarding/progress/');
      return response.data;
    },
  });

  const completeStepMutation = useMutation({
    mutationFn: async (stepKey: string) => {
      await api.post(`/api/onboarding/complete-step/${stepKey}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  const getIcon = (stepKey: string) => {
    switch (stepKey) {
      case 'welcome':
        return Zap;
      case 'connect_channel':
        return MessageSquare;
      case 'configure_ai_rules':
      case 'add_knowledge':
        return BookOpen;
      case 'review_analytics':
        return BarChart3;
      default:
        return CheckCircle2;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const completedCount = steps.filter(s => s.is_completed).length;
  const totalCount = steps.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Onboarding & Setup Wizard
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Guided setup to get your platform configured
        </p>
      </div>

      {/* Progress Summary */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Setup Progress
          </h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {completedCount} of {totalCount} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
          Setup Steps
        </h3>
        <div className="space-y-4">
          {steps.map((step, idx) => {
            const Icon = getIcon(step.step_key);
            const isLast = idx === steps.length - 1;
            
            return (
              <div key={step.step_key} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step.is_completed
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {step.is_completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 h-16 mt-2 ${
                        step.is_completed ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {step.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {step.description}
                  </p>
                  {step.is_completed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      Completed
                    </span>
                  ) : (
                    <button
                      onClick={() => completeStepMutation.mutate(step.step_key)}
                      className="inline-flex items-center px-3 py-1.5 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
