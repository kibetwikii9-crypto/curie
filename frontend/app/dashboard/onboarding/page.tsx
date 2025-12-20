'use client';

import { CheckCircle2, Circle, ArrowRight, Clock, Zap, MessageSquare, BookOpen, BarChart3 } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Welcome & Setup',
    description: 'Get started with your account',
    icon: Zap,
    completed: true,
  },
  {
    id: 2,
    title: 'Connect Channels',
    description: 'Integrate your communication channels',
    icon: MessageSquare,
    completed: false,
  },
  {
    id: 3,
    title: 'Configure AI Rules',
    description: 'Set up your automation rules',
    icon: BookOpen,
    completed: false,
  },
  {
    id: 4,
    title: 'Add Knowledge Base',
    description: 'Upload FAQs and responses',
    icon: BookOpen,
    completed: false,
  },
  {
    id: 5,
    title: 'Review Analytics',
    description: 'Explore your dashboard',
    icon: BarChart3,
    completed: false,
  },
];

export default function OnboardingPage() {
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

      {/* Coming Soon Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              Interactive Onboarding Coming Soon
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              A step-by-step interactive onboarding wizard is in development to help you set up your platform quickly.
            </p>
          </div>
        </div>
      </div>

      {/* Step-Based Onboarding Flow Preview */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
          Setup Progress
        </h3>
        <div className="space-y-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === steps.length - 1;
            return (
              <div key={step.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step.completed
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 h-16 mt-2 ${
                        step.completed ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-700'
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
                  {step.completed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion Checklist */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Setup Checklist
        </h3>
        <div className="space-y-3">
          {[
            { task: 'Account created', completed: true },
            { task: 'Email verified', completed: true },
            { task: 'First channel connected', completed: false },
            { task: 'AI rules configured', completed: false },
            { task: 'Knowledge base populated', completed: false },
            { task: 'Team members invited', completed: false },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600" />
              )}
              <span
                className={`text-sm ${
                  item.completed
                    ? 'text-gray-600 dark:text-gray-400 line-through'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {item.task}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Guided Setup Explanation */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          What to Expect
        </h3>
        <div className="space-y-3">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Interactive Guidance
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Step-by-step instructions will guide you through each setup phase, ensuring nothing is missed.
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Progress Tracking
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Visual progress indicators show your setup completion status and next steps.
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Quick Setup
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get your platform fully configured in minutes with our guided setup wizard.
            </p>
          </div>
        </div>
        <button
          disabled
          className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
        >
          Start Setup Wizard
          <ArrowRight className="h-4 w-4 ml-2" />
        </button>
      </div>
    </div>
  );
}

