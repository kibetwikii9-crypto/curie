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

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 relative overflow-hidden">
      {/* 3D Animated Background */}
      <Suspense fallback={<div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center">Loading...</div>}>
        <AnimatedBackground3D />
      </Suspense>

      {/* Navigation */}
      <nav className="relative z-50 px-4 sm:px-6 lg:px-8 py-6 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-main-no-tagline.png"
              alt="Automify"
              width={200}
              height={66}
              className="h-14 w-auto"
              priority
            />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Automify
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setAuthModalTab('signin');
                setShowAuthModal(true);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthModalTab('signup');
                setShowAuthModal(true);
              }}
              className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all shadow-lg shadow-purple-500/30"
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
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent mb-6 leading-tight">
              Multi-Channel AI Business Assistant
              <span className="block mt-2 bg-gradient-to-r from-[#007FFF] via-[#0088FF] to-[#D4AF37] bg-clip-text text-transparent">
                That Works Everywhere
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-gray-800 font-medium mb-10 leading-relaxed">
              Connect with customers across WhatsApp, Telegram, Instagram, and more. 
              Powered by AI that understands context and delivers personalized experiences.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <button
                onClick={() => {
                  setAuthModalTab('signup');
                  setShowAuthModal(true);
                }}
                className="px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all shadow-lg hover:scale-105"
              >
                Get Started Free
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-16">No credit card required • Setup in 5 minutes</p>

            {/* Optional Visual Element */}
            <div className="relative mt-16">
              <div className="relative mx-auto max-w-3xl">
                <div className="absolute inset-0 bg-gradient-to-r from-[#007FFF]/30 to-[#D4AF37]/30 rounded-2xl blur-3xl animate-pulse-slow" />
                <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl hover:border-[#007FFF]/50 transition-all duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center text-center group">
                      <div className="w-16 h-16 rounded-full bg-[#007FFF]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <MessageSquare className="h-8 w-8 text-[#007FFF] group-hover:animate-bounce" />
                      </div>
                      <h3 className="font-semibold text-white mb-2">Multi-Channel</h3>
                      <p className="text-sm text-gray-300">Connect everywhere your customers are</p>
                    </div>
                    <div className="flex flex-col items-center text-center group">
                      <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Zap className="h-8 w-8 text-yellow-400 group-hover:animate-bounce" />
                      </div>
                      <h3 className="font-semibold text-white mb-2">AI-Powered</h3>
                      <p className="text-sm text-gray-300">Intelligent responses that understand context</p>
                    </div>
                    <div className="flex flex-col items-center text-center group">
                      <div className="w-16 h-16 rounded-full bg-gray-400/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Shield className="h-8 w-8 text-gray-300 group-hover:animate-bounce" />
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

      {/* Integrations Section */}
      <section className="relative z-40 px-4 sm:px-6 lg:px-8 py-20 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Connect Your Channels in Minutes
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              One platform to manage all your customer conversations
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { name: 'WhatsApp', logo: '/channels/whatsapp.png', desc: 'Business API' },
              { name: 'Instagram', logo: '/channels/instagram.png', desc: 'Direct Messages' },
              { name: 'Facebook', logo: '/channels/facebook.png', desc: 'Messenger' },
              { name: 'Telegram', logo: '/channels/telegram.png', desc: 'Bot API' },
              { name: 'Email', logo: '/channels/gmail.png', desc: 'Gmail & More' },
            ].map((platform) => (
              <div
                key={platform.name}
                className="p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all border border-gray-200"
              >
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <Image
                    src={platform.logo}
                    alt={platform.name}
                    width={64}
                    height={64}
                    className="object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <h3 className="font-bold text-gray-900 text-lg text-center mb-1">{platform.name}</h3>
                <p className="text-sm text-gray-600 text-center">{platform.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-40 px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10K+', label: 'Messages Daily', icon: '💬' },
              { value: '99.9%', label: 'Uptime', icon: '⚡' },
              { value: '5+', label: 'Integrations', icon: '🔗' },
              { value: '<2s', label: 'Response Time', icon: '⏱️' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-bold text-purple-600 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-700">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md rounded-3xl p-8 border border-white/10 hover:border-[#007FFF]/30 transition-all duration-500 shadow-2xl">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-3">See It In Action</h3>
              <p className="text-gray-300">Watch how our AI handles real customer conversations</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Chat Preview 1 */}
              <div className="bg-black/40 rounded-2xl p-6 border border-[#007FFF]/20">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                    WA
                  </div>
                  <div>
                    <div className="font-semibold text-white">WhatsApp</div>
                    <div className="text-xs text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                      Live
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-[#007FFF] text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] text-sm">
                      What are your pricing plans?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-white/10 text-gray-200 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[85%] text-sm">
                      We have 3 plans: Starter ($29/mo), Professional ($99/mo), and Enterprise (custom). 
                      Each includes multi-channel support and AI responses. Would you like details on a specific plan? 🚀
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Preview 2 */}
              <div className="bg-black/40 rounded-2xl p-6 border border-purple-500/20">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center text-white font-bold">
                    IG
                  </div>
                  <div>
                    <div className="font-semibold text-white">Instagram</div>
                    <div className="text-xs text-purple-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                      Live
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] text-sm">
                      Do you integrate with Shopify?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-white/10 text-gray-200 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[85%] text-sm">
                      Yes! We integrate with Shopify, WooCommerce, and major e-commerce platforms. 
                      You can sync products, track orders, and handle customer inquiries automatically. 🛍️
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center mt-8">
              <button
                onClick={() => {
                  setAuthModalTab('signup');
                  setShowAuthModal(true);
                }}
                className="group inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-[#007FFF] to-[#0066CC] hover:from-[#0066CC] hover:to-[#007FFF] rounded-xl transition-all shadow-lg shadow-[#007FFF]/30 hover:shadow-xl hover:shadow-[#007FFF]/50 hover:scale-105"
              >
                Try It Free Now
                <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform" />
              </button>
              <p className="text-sm text-gray-400 mt-3">No credit card required • 14-day free trial</p>
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
                  className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-[#007FFF] hover:bg-white/10 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-2"
                >
                  <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
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

