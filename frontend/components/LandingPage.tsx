'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { MessageSquare, Zap, Globe, Shield, Sparkles } from 'lucide-react';
import Image from 'next/image';
import AuthModal from './AuthModal';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');
  const [isFromFreeTrial, setIsFromFreeTrial] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard/integrations');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 relative overflow-hidden">
      {/* Navigation */}
      <nav className="relative z-50 px-4 sm:px-6 lg:px-8 py-6 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-main-no-tagline.png"
              alt="Automify"
              width={200}
              height={66}
              className="h-14 w-auto select-none pointer-events-none"
              priority
              draggable={false}
            />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Automify
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setIsFromFreeTrial(true);
                setAuthModalTab('signin');
                setShowAuthModal(true);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsFromFreeTrial(true);
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Text */}
            <div className="order-1">
              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent mb-6 leading-tight">
                AI That Replies to Your Customers and Turns Conversations Into Sales
              </h1>
              
              {/* Subheadline */}
              <p className="text-xl sm:text-2xl text-gray-800 font-medium mb-10 leading-relaxed">
                Automify AI answers customer messages, captures leads, and books sales automatically — 24/7.
              </p>

              {/* CTA Button */}
              <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
                <button
                  onClick={() => {
                    setIsFromFreeTrial(true);
                    setAuthModalTab('signup');
                    setShowAuthModal(true);
                  }}
                  className="px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all shadow-lg hover:scale-105"
                >
                  Start Automating Conversations
                </button>
              </div>
              <p className="text-sm text-gray-600">Setup in 5 minutes • No coding required • Free trial</p>
            </div>

            {/* Right Side - Image */}
            <div className="order-2">
              <div className="relative w-full aspect-[6/5]">
                <Image
                  src="/hero-conv.png"
                  alt="Automify AI Conversations"
                  width={600}
                  height={500}
                  className="w-full h-full object-contain rounded-2xl shadow-2xl select-none"
                  priority
                  loading="eager"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iI2UwZTdmZiIvPjwvc3ZnPg=="
                  draggable={false}
                  onError={(e) => {
                    console.log('Image load error');
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="relative z-40 px-4 sm:px-6 lg:px-8 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Manage All Your Customer Conversations in One Place
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Automify connects WhatsApp, Instagram, Telegram, and email so you can manage every customer interaction from a single dashboard.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { name: 'WhatsApp', logo: '/channels/whatsapp.png', desc: 'Automate replies and capture leads instantly.' },
              { name: 'Instagram', logo: '/channels/intagram.png', desc: 'Turn DMs and comments into customers.' },
              { name: 'Facebook', logo: '/channels/messenger.png', desc: 'Respond to Messenger inquiries automatically.' },
              { name: 'Telegram', logo: '/channels/telegram.png', desc: 'Build powerful automation bots.' },
              { name: 'Email', logo: '/channels/gmail.png', desc: 'Manage support and customer conversations.' },
            ].map((platform) => (
              <button
                key={platform.name}
                onClick={() => {
                  setIsFromFreeTrial(true);
                  setAuthModalTab('signin');
                  setShowAuthModal(true);
                }}
                className="p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all border border-gray-200 hover:border-purple-400 cursor-pointer transform hover:-translate-y-1"
              >
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <Image
                    src={platform.logo}
                    alt={platform.name}
                    width={64}
                    height={64}
                    className="object-contain select-none pointer-events-none"
                    draggable={false}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <h3 className="font-bold text-gray-900 text-lg text-center mb-2">{platform.name}</h3>
                <p className="text-sm text-gray-600 text-center">{platform.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="relative z-40 px-4 sm:px-6 lg:px-8 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Stop Losing Customers to Slow Replies
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold text-xl">❌</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Customers expect instant replies</h3>
                <p className="text-gray-700">Slow responses lead to lost leads and frustrated customers.</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-xl">✅</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Automify responds instantly</h3>
                <p className="text-gray-700">AI automatically replies to messages across WhatsApp, Instagram, Email, websites and Telegram.</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold text-xl">❌</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Too many messages to manage</h3>
                <p className="text-gray-700">Switching between apps wastes time and causes missed conversations.</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-xl">✅</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">One unified inbox</h3>
                <p className="text-gray-700">Manage all your customer conversations from a single dashboard.</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold text-xl">❌</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Leads get lost in conversations</h3>
                <p className="text-gray-700">Businesses often miss opportunities because messages are not tracked.</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-xl">✅</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Automated lead capture</h3>
                <p className="text-gray-700">Automify collects customer details and organizes leads automatically.</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold text-xl">❌</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Customer support is expensive</h3>
                <p className="text-gray-700">Hiring support teams increases operational costs.</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-xl">✅</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-powered support</h3>
                <p className="text-gray-700">Automify answers common questions and reduces support workload.</p>
              </div>
            </div>
          </div>
          <div className="text-center mt-12">
            <button
              onClick={() => {
                setIsFromFreeTrial(true);
                setAuthModalTab('signup');
                setShowAuthModal(true);
              }}
              className="px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all shadow-lg hover:scale-105"
            >
              Create Your AI Assistant
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-40 px-4 sm:px-6 lg:px-8 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powering Thousands of Automated Conversations
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10K+', label: 'Conversations Automated Daily', icon: '💬', desc: 'Businesses rely on Automify to handle customer messages.' },
              { value: '99.9%', label: 'Platform Uptime', icon: '⚡', desc: 'Reliable infrastructure that keeps your automation running.' },
              { value: '5+', label: 'Messaging Integrations', icon: '🔗', desc: 'Connect the platforms your customers already use.' },
              { value: '<2s', label: 'Instant AI Responses', icon: '🤖', desc: 'Reply to customers in under 2 seconds.' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-bold text-purple-600 mb-1">{stat.value}</div>
                <div className="text-sm font-semibold text-gray-900 mb-2">{stat.label}</div>
                <div className="text-xs text-gray-600">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="relative z-40 px-4 sm:px-6 lg:px-8 py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">See How Automify Handles Customer Conversations</h3>
              <p className="text-gray-700">Automify AI responds instantly to customer questions across WhatsApp and Instagram.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Chat Preview 1 */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                    WA
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">WhatsApp</div>
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      Live
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] text-sm">
                      What are your pricing plans?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-gray-200 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[85%] text-sm">
                      We offer Starter, Professional, and Enterprise plans. Would you like help choosing the right one? 🚀
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Preview 2 */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center text-white font-bold">
                    IG
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Instagram</div>
                    <div className="text-xs text-purple-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
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
                    <div className="bg-gray-200 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[85%] text-sm">
                      Yes! Automify integrates with Shopify and other e-commerce platforms to automate customer support. 🛍️
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
                  setIsFromFreeTrial(true);
                  setShowAuthModal(true);
                }}
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl transition-all shadow-lg hover:scale-105"
              >
                Start Your Free Trial
                <Sparkles className="h-5 w-5" />
              </button>
              <p className="text-sm text-gray-600 mt-3">Setup in 5 minutes • No credit card required</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-40 px-4 sm:px-6 lg:px-8 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Powerful Tools to Automate Customer Conversations
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Automify combines AI, automation, and analytics to help you manage messages and convert more customers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Globe,
                title: 'Omnichannel Messaging',
                description: 'Manage WhatsApp, Instagram, Telegram, and more from one unified inbox.',
              },
              {
                icon: Sparkles,
                title: 'Smart AI Replies',
                description: 'Automify understands customer questions and responds instantly.',
              },
              {
                icon: Zap,
                title: 'Workflow Automation',
                description: 'Create rules that automate replies and qualify leads.',
              },
              {
                icon: Shield,
                title: 'Enterprise Security',
                description: 'Protect conversations with secure infrastructure.',
              },
              {
                icon: MessageSquare,
                title: 'AI Knowledge Training',
                description: 'Upload documents and FAQs to train your AI assistant.',
              },
              {
                icon: Zap,
                title: 'Conversation Analytics',
                description: 'Track performance and customer behavior.',
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-purple-400 hover:bg-white transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-2"
                >
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-700">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-12">
            <p className="text-lg text-gray-700 mb-4">Ready to automate your customer conversations?</p>
            <button
              onClick={() => {
                setAuthModalTab('signup');
                setIsFromFreeTrial(true);
                setShowAuthModal(true);
              }}
              className="px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all shadow-lg hover:scale-105"
            >
              Start Your Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-40 px-4 sm:px-6 lg:px-8 py-12 bg-gray-900 text-white">
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
              <p className="text-gray-400 text-sm mb-4">
                Automate customer conversations across WhatsApp, Instagram, Telegram, and more — all from one intelligent platform.
              </p>
              <p className="text-sm text-gray-500">Start automating today</p>
              <button
                onClick={() => {
                  setAuthModalTab('signup');
                  setIsFromFreeTrial(true);
                  setShowAuthModal(true);
                }}
                className="mt-3 px-6 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Start Free Trial
              </button>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Templates</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Automify AI. All rights reserved. Powered by Tekmify Global Solutions Ltd
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => {
          setShowAuthModal(false);
          setIsFromFreeTrial(false); // Reset when modal closes
        }}
        initialTab={authModalTab}
        isFromFreeTrial={isFromFreeTrial}
      />
    </div>
  );
}
