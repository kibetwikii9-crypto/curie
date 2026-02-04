'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Sparkles,
  Check,
  ChevronRight,
  X,
  Zap,
  MessageSquare,
  Settings,
  BookOpen,
  BarChart3,
  Users,
  Rocket,
  Award,
  Target,
  Play,
  SkipForward,
  RotateCcw,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OnboardingStep {
  step_key: string;
  title: string;
  description: string;
  order: number;
  is_required: boolean;
  is_completed: boolean;
  completed_at: string | null;
}

interface OnboardingStats {
  total_steps: number;
  completed_steps: number;
  required_steps: number;
  optional_steps: number;
  percentage: number;
  status: string;
  is_complete: boolean;
}

export default function OnboardingPage() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Queries
  const { data: stats } = useQuery<OnboardingStats>({
    queryKey: ['onboarding-stats'],
    queryFn: async () => {
      const response = await api.get('/api/onboarding/stats');
      return response.data;
    },
  });

  const { data: steps = [] } = useQuery<OnboardingStep[]>({
    queryKey: ['onboarding-progress'],
    queryFn: async () => {
      const response = await api.get('/api/onboarding/progress/');
      return response.data;
    },
  });

  // Mutations
  const completeStepMutation = useMutation({
    mutationFn: async (stepKey: string) => {
      await api.post(`/api/onboarding/complete-step/${stepKey}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-stats'] });
    },
  });

  const resetStepMutation = useMutation({
    mutationFn: async (stepKey: string) => {
      await api.post(`/api/onboarding/reset-step/${stepKey}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-stats'] });
    },
  });

  const skipStepMutation = useMutation({
    mutationFn: async (stepKey: string) => {
      await api.post(`/api/onboarding/skip-step/${stepKey}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-stats'] });
      // Move to next step after skipping
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    },
  });

  const getStepIcon = (stepKey: string) => {
    switch (stepKey) {
      case 'welcome':
        return <Rocket className="h-8 w-8" />;
      case 'connect_channel':
        return <MessageSquare className="h-8 w-8" />;
      case 'configure_ai_rules':
        return <Settings className="h-8 w-8" />;
      case 'add_knowledge':
        return <BookOpen className="h-8 w-8" />;
      case 'review_analytics':
        return <BarChart3 className="h-8 w-8" />;
      case 'invite_team':
        return <Users className="h-8 w-8" />;
      default:
        return <Zap className="h-8 w-8" />;
    }
  };

  const getStepColor = (stepKey: string) => {
    switch (stepKey) {
      case 'welcome':
        return 'from-purple-500 to-pink-600';
      case 'connect_channel':
        return 'from-blue-500 to-cyan-600';
      case 'configure_ai_rules':
        return 'from-orange-500 to-red-600';
      case 'add_knowledge':
        return 'from-green-500 to-emerald-600';
      case 'review_analytics':
        return 'from-indigo-500 to-purple-600';
      case 'invite_team':
        return 'from-pink-500 to-rose-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getStepAction = (stepKey: string) => {
    switch (stepKey) {
      case 'welcome':
        return { label: 'Get Started', url: null };
      case 'connect_channel':
        return { label: 'Connect Channel', url: '/dashboard/integrations' };
      case 'configure_ai_rules':
        return { label: 'Setup AI Rules', url: '/dashboard/ai-rules' };
      case 'add_knowledge':
        return { label: 'Add Knowledge', url: '/dashboard/knowledge' };
      case 'review_analytics':
        return { label: 'View Analytics', url: '/dashboard/analytics' };
      case 'invite_team':
        return { label: 'Invite Team', url: '/dashboard/users' };
      default:
        return { label: 'Continue', url: null };
    }
  };

  const handleCompleteStep = async (stepKey: string) => {
    await completeStepMutation.mutateAsync(stepKey);
    // Move to next step after completing
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleStepAction = (step: OnboardingStep) => {
    const action = getStepAction(step.step_key);
    if (action.url) {
      router.push(action.url);
    } else {
      handleCompleteStep(step.step_key);
    }
  };

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div className="space-y-6">
      {/* Enhanced Hero Header */}
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-lg p-1 shadow-lg">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Rocket className="h-8 w-8 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Getting Started
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Complete these steps to get the most out of Curie
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Steps</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.total_steps}</p>
              </div>
              <Target className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.completed_steps}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Required</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.required_steps}</p>
              </div>
              <Sparkles className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Optional</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.optional_steps}</p>
              </div>
              <Award className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-100">Progress</p>
                <p className="text-2xl font-bold mt-1">{stats.percentage}%</p>
              </div>
              <TrendingUp className="h-10 w-10 text-cyan-200" />
            </div>
          </div>
        </div>
      )}

      {/* Main Wizard */}
      {stats && !stats.is_complete ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Steps List (Sidebar) */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Your Progress
              </h2>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Completion</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{stats.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-primary-600 rounded-full h-3 transition-all"
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <button
                    key={step.step_key}
                    onClick={() => setCurrentStepIndex(index)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      currentStepIndex === index
                        ? 'bg-primary-50 dark:bg-primary-900/10 border-2 border-primary-200 dark:border-primary-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {step.is_completed ? (
                        <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {index + 1}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{step.title}</p>
                        {step.is_required && (
                          <p className="text-xs text-orange-600 dark:text-orange-400">Required</p>
                        )}
                      </div>
                      {currentStepIndex === index && (
                        <ChevronRight className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Current Step Details (Main Content) */}
          {currentStep && (
            <div className="lg:col-span-2">
              <div
                className={`bg-gradient-to-br ${getStepColor(
                  currentStep.step_key
                )} rounded-lg p-1 shadow-lg`}
              >
                <div className="bg-white dark:bg-gray-900 rounded-lg p-8">
                  {/* Step Header */}
                  <div className="flex items-start gap-4 mb-6">
                    <div
                      className={`p-4 bg-gradient-to-br ${getStepColor(
                        currentStep.step_key
                      )} rounded-lg text-white shadow-lg`}
                    >
                      {getStepIcon(currentStep.step_key)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{currentStep.title}</h2>
                        {currentStep.is_required && (
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-semibold rounded-full">
                            Required
                          </span>
                        )}
                        {currentStep.is_completed && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">{currentStep.description}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        Step {currentStep.order} of {steps.length}
                      </p>
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
                    {/* Specific instructions for each step */}
                    {currentStep.step_key === 'welcome' && (
                      <div className="space-y-4">
                        <p className="text-gray-700 dark:text-gray-300">
                          Welcome to Curie! Let's get you set up in just a few simple steps.
                        </p>
                        <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                          <li className="flex items-start gap-2">
                            <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span>Connect your communication channels (Telegram, WhatsApp, etc.)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span>Configure AI rules to automate your conversations</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span>Add knowledge to help your AI respond accurately</span>
                          </li>
                        </ul>
                      </div>
                    )}

                    {currentStep.step_key === 'connect_channel' && (
                      <div className="space-y-4">
                        <p className="text-gray-700 dark:text-gray-300">
                          Connect your communication channels to start receiving messages.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <MessageSquare className="h-8 w-8 text-blue-600 mb-2" />
                            <p className="font-medium text-gray-900 dark:text-white">Telegram</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bot integration</p>
                          </div>
                          <div className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <MessageSquare className="h-8 w-8 text-green-600 mb-2" />
                            <p className="font-medium text-gray-900 dark:text-white">WhatsApp</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Business API</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStep.step_key === 'configure_ai_rules' && (
                      <div className="space-y-4">
                        <p className="text-gray-700 dark:text-gray-300">
                          Set up AI rules to automate responses and actions based on message content.
                        </p>
                        <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                          <li className="flex items-start gap-2">
                            <Settings className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            <span>Create rules for common questions</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Settings className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            <span>Set up automatic lead capture</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Settings className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            <span>Configure handoff rules for complex queries</span>
                          </li>
                        </ul>
                      </div>
                    )}

                    {currentStep.step_key === 'add_knowledge' && (
                      <div className="space-y-4">
                        <p className="text-gray-700 dark:text-gray-300">
                          Add FAQs and knowledge entries to help your AI provide accurate responses.
                        </p>
                        <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                          <li className="flex items-start gap-2">
                            <BookOpen className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>Upload product information</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <BookOpen className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>Add frequently asked questions</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <BookOpen className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>Import existing documentation</span>
                          </li>
                        </ul>
                      </div>
                    )}

                    {currentStep.step_key === 'review_analytics' && (
                      <div className="space-y-4">
                        <p className="text-gray-700 dark:text-gray-300">
                          Explore your dashboard and see how your AI is performing.
                        </p>
                        <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                          <li className="flex items-start gap-2">
                            <BarChart3 className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                            <span>View conversation metrics</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <BarChart3 className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                            <span>Track lead conversion rates</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <BarChart3 className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                            <span>Monitor AI response quality</span>
                          </li>
                        </ul>
                      </div>
                    )}

                    {currentStep.step_key === 'invite_team' && (
                      <div className="space-y-4">
                        <p className="text-gray-700 dark:text-gray-300">
                          Add team members to collaborate and handle conversations together.
                        </p>
                        <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                          <li className="flex items-start gap-2">
                            <Users className="h-5 w-5 text-pink-600 flex-shrink-0 mt-0.5" />
                            <span>Invite team members via email</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Users className="h-5 w-5 text-pink-600 flex-shrink-0 mt-0.5" />
                            <span>Assign roles and permissions</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Users className="h-5 w-5 text-pink-600 flex-shrink-0 mt-0.5" />
                            <span>Set up handoff routing</span>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {currentStepIndex > 0 && (
                        <button
                          onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          Previous
                        </button>
                      )}
                      {currentStep.is_completed && (
                        <button
                          onClick={() => resetStepMutation.mutate(currentStep.step_key)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 inline-flex items-center gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reset Step
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!currentStep.is_required && !currentStep.is_completed && (
                        <button
                          onClick={() => skipStepMutation.mutate(currentStep.step_key)}
                          disabled={skipStepMutation.isPending}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 inline-flex items-center gap-2"
                        >
                          <SkipForward className="h-4 w-4" />
                          Skip
                        </button>
                      )}
                      {!currentStep.is_completed ? (
                        <button
                          onClick={() => handleStepAction(currentStep)}
                          disabled={completeStepMutation.isPending}
                          className={`px-6 py-3 text-sm font-medium text-white bg-gradient-to-r ${getStepColor(
                            currentStep.step_key
                          )} rounded-lg hover:opacity-90 shadow-lg inline-flex items-center gap-2`}
                        >
                          <Play className="h-4 w-4" />
                          {getStepAction(currentStep.step_key).label}
                        </button>
                      ) : !isLastStep ? (
                        <button
                          onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                          className="px-6 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-md inline-flex items-center gap-2 transition-all"
                        >
                          Next Step
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : stats && stats.is_complete ? (
        /* Completion Celebration */
        <div className="text-center py-16 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-700">
          <div className="mx-auto w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <Award className="h-16 w-16 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            🎉 Congratulations!
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            You've completed all onboarding steps! You're now ready to use Curie to its full potential.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-md font-medium inline-flex items-center gap-2 transition-all"
            >
              <Rocket className="h-5 w-5" />
              Go to Dashboard
            </button>
            <button
              onClick={() => {
                // Reset first step to let users review
                if (steps.length > 0) {
                  resetStepMutation.mutate(steps[0].step_key);
                  setCurrentStepIndex(0);
                }
              }}
              className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium inline-flex items-center gap-2"
            >
              <RotateCcw className="h-5 w-5" />
              Review Steps
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
