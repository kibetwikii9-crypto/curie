'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { MessageSquare, Zap, Globe, Shield, ArrowRight, Sparkles } from 'lucide-react';
import Image from 'next/image';
import AuthModal from './AuthModal';
import dynamic from 'next/dynamic';

// Dynamically import 3D background for better performance
const AnimatedBackground3D = dynamic(() => import('./AnimatedBackground3D'), {
  ssr: false,
  loading: () => null,
});

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      
      const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007FFF]"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black relative overflow-hidden">
      {/* 3D Animated Background - ALWAYS SHOW FOR TESTING */}
      <Suspense fallback={<div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center text-white">Loading 3D Scene...</div>}>
        <AnimatedBackground3D />
      </Suspense>

      {/* Navigation */}
      <nav className="relative z-50 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-main-no-tagline.png"
              alt="Automify"
              width={200}
              height={66}
              className="h-14 w-auto dark:hidden"
              priority
            />
            <Image
              src="/logo-white-no-tagline.png"
              alt="Automify"
              width={200}
              height={66}
              className="h-14 w-auto hidden dark:block"
              priority
            />
            <span className="text-2xl font-bold text-[#007FFF]">
              Automify
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setAuthModalTab('signin');
                setShowAuthModal(true);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-200 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthModalTab('signup');
                setShowAuthModal(true);
              }}
              className="px-6 py-2 text-sm font-semibold text-white bg-[#007FFF] hover:bg-[#0066CC] rounded-lg transition-colors shadow-lg shadow-[#007FFF]/20"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-40 px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Multi-Channel AI Business Assistant
              <span className="block mt-2 bg-gradient-to-r from-[#007FFF] via-[#0088FF] to-[#D4AF37] bg-clip-text text-transparent">
                That Works Everywhere
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-gray-200 mb-10 leading-relaxed">
              Connect with customers across WhatsApp, Telegram, Instagram, and more. 
              Powered by AI that understands context and delivers personalized experiences.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button
                onClick={() => {
                  setAuthModalTab('signup');
                  setShowAuthModal(true);
                }}
                className="group px-8 py-4 text-lg font-semibold text-white bg-[#007FFF] hover:bg-[#0066CC] rounded-lg transition-all shadow-lg shadow-[#007FFF]/30 hover:shadow-xl hover:shadow-[#007FFF]/40 flex items-center gap-2"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => {
                  setAuthModalTab('signin');
                  setShowAuthModal(true);
                }}
                className="px-8 py-4 text-lg font-semibold text-white bg-white/10 backdrop-blur-sm border-2 border-white/20 hover:border-[#007FFF] hover:bg-white/20 rounded-lg transition-all"
              >
                Sign In
              </button>
            </div>

            {/* Optional Visual Element */}
            <div className="relative mt-16">
              <div className="relative mx-auto max-w-3xl">
                <div className="absolute inset-0 bg-gradient-to-r from-[#007FFF]/30 to-[#D4AF37]/30 rounded-2xl blur-3xl" />
                <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-[#007FFF]/20 flex items-center justify-center mb-4">
                        <MessageSquare className="h-8 w-8 text-[#007FFF]" />
                      </div>
                      <h3 className="font-semibold text-white mb-2">Multi-Channel</h3>
                      <p className="text-sm text-gray-300">Connect everywhere your customers are</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center mb-4">
                        <Zap className="h-8 w-8 text-yellow-400" />
                      </div>
                      <h3 className="font-semibold text-white mb-2">AI-Powered</h3>
                      <p className="text-sm text-gray-300">Intelligent responses that understand context</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-gray-400/20 flex items-center justify-center mb-4">
                        <Shield className="h-8 w-8 text-gray-300" />
                      </div>
                      <h3 className="font-semibold text-white mb-2">Enterprise-Grade</h3>
                      <p className="text-sm text-gray-300">Secure, scalable, and reliable</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learn More Section */}
      <section className="relative z-40 px-4 sm:px-6 lg:px-8 py-20 bg-black/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need to Scale
            </h2>
            <p className="text-lg text-gray-200 max-w-2xl mx-auto">
              Powerful features designed to help you engage customers, automate workflows, and grow your business.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Globe,
                title: 'Omnichannel Support',
                description: 'Manage conversations from WhatsApp, Telegram, Instagram, Facebook, and more from one unified dashboard.',
                color: 'text-[#007FFF]',
                bgColor: 'bg-[#007FFF]/10',
              },
              {
                icon: Sparkles,
                title: 'AI-Powered Responses',
                description: 'Leverage advanced AI to understand context, provide accurate answers, and maintain natural conversations.',
                color: 'text-yellow-600 dark:text-yellow-400',
                bgColor: 'bg-yellow-400/10',
              },
              {
                icon: Zap,
                title: 'Automation & Rules',
                description: 'Create custom automation rules, handle common queries automatically, and escalate when needed.',
                color: 'text-[#007FFF]',
                bgColor: 'bg-[#007FFF]/10',
              },
              {
                icon: Shield,
                title: 'Security & Compliance',
                description: 'Enterprise-grade security with role-based access control, audit logs, and data encryption.',
                color: 'text-gray-600 dark:text-gray-400',
                bgColor: 'bg-gray-400/10',
              },
              {
                icon: MessageSquare,
                title: 'Knowledge Base',
                description: 'Build and maintain a comprehensive knowledge base that your AI can reference for accurate responses.',
                color: 'text-[#007FFF]',
                bgColor: 'bg-[#007FFF]/10',
              },
              {
                icon: Zap,
                title: 'Analytics & Insights',
                description: 'Track performance, understand customer behavior, and make data-driven decisions with detailed analytics.',
                color: 'text-yellow-600 dark:text-yellow-400',
                bgColor: 'bg-yellow-400/10',
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-[#007FFF] hover:bg-white/10 transition-all hover:shadow-lg"
                >
                  <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-40 px-4 sm:px-6 lg:px-8 py-12 bg-black/50 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image
                  src="/logo-white-no-tagline.png"
                  alt="Automify"
                  width={180}
                  height={60}
                  className="h-12 w-auto"
                  priority
                />
              </div>
              <p className="text-gray-400 text-sm">
                Multi-channel AI Business Assistant platform for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Integrations
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Automify. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        initialTab={authModalTab}
      />
    </div>
  );
}

