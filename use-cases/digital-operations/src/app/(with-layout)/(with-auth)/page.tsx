'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Users, 
  FileCheck,
  Zap,
  BarChart3,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

import { createChat } from '@/../utils/chatStore';

const ChatBotDemo = () => {
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const router = useRouter();

  const handleNewChat = async () => {
    setIsCreatingChat(true);
    try {
      const sessionId = await createChat();
      router.push(`/chat?id=${sessionId}`);
    } catch (error) {
      console.error('Error creating chat session:', error);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const features = [
    {
      icon: Shield,
      title: 'Comprehensive Safety Monitoring',
      description: 'Real-time integration of near-miss events, weather alerts, active permits, and personnel status across all refinery operations.',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: AlertTriangle,
      title: 'Proactive Risk Assessment',
      description: 'AI-powered analysis of atmospheric conditions, equipment status, and historical risk factors to prevent incidents before they occur.',
      color: 'text-amber-600 dark:text-amber-400'
    },
    {
      icon: TrendingUp,
      title: '24-Hour Risk Forecasting',
      description: 'Generate comprehensive operational forecasts analyzing planned activities, resource availability, and potential emergency scenarios.',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: FileCheck,
      title: 'Automated Permit Management',
      description: 'Track hot work, confined space, and crane lift permits with 100% compliance monitoring and automatic status updates.',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: Users,
      title: 'Personnel Readiness Tracking',
      description: 'Monitor fatigue levels, certification status, and crew assignments to ensure optimal safety performance.',
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      icon: BarChart3,
      title: 'Leading & Lagging Indicators',
      description: 'Analyze safety observations, near-miss patterns, and incident trends to identify risks and implement preventive actions.',
      color: 'text-cyan-600 dark:text-cyan-400'
    }
  ];

  const metrics = [
    { label: 'Permit Compliance', value: '100%', status: 'STABLE' },
    { label: 'Safety Observations', value: '15+', status: 'POSITIVE' },
    { label: 'Response Time', value: '<5min', status: 'OPTIMAL' },
    { label: 'Recordable Incidents', value: '0', status: 'EXCELLENT' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-cyan-600/10 dark:from-blue-600/5 dark:to-cyan-600/5" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9nPjwvc3ZnPg==')] opacity-40" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
              <Zap className="size-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                AI-Powered Refinery Safety Management
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                SAFE-AI
              </span>
            </h1>
            
            <p className="max-w-3xl mx-auto text-xl md:text-2xl text-slate-600 dark:text-slate-400 leading-relaxed">
              Comprehensive safety intelligence for refinery operations. 
              <span className="block mt-2 font-semibold text-slate-900 dark:text-slate-100">
                Real-time monitoring • Predictive analytics • Proactive risk management
              </span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button 
                onClick={handleNewChat}
                disabled={isCreatingChat}
                size="lg"
                className="h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all group"
              >
                {isCreatingChat ? (
                  <>
                    <Clock className="animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  <>
                    <Shield className="group-hover:scale-110 transition-transform" />
                    Start Safety Session
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline"
                size="lg"
                className="h-14 px-8 text-lg"
                onClick={() => router.push('/demo-setup')}
              >
                View Demo Setup
              </Button>
            </div>

            {/* Metrics Bar */}
            <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {metrics.map((metric, index) => (
                <div 
                  key={index}
                  className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-slate-800"
                >
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {metric.value}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Key Capabilities
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Comprehensive Safety Intelligence
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            SAFE-AI integrates multiple data streams to provide actionable insights and decision support for refinery safety operations
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className={`size-12 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`size-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Card>
          ))}
        </div>
      </div>

      {/* Demo Scenarios Section */}
      <div className="bg-slate-100 dark:bg-slate-900/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              Interactive Demo
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Experience a Day in Refinery Safety
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Follow Firas Toumi, Safety Manager, through five critical scenarios demonstrating SAFE-AI&apos;s capabilities
            </p>
          </div>

          <div className="space-y-4 max-w-4xl mx-auto">
            {[
              { 
                title: 'Morning Safety Brief', 
                description: 'Comprehensive status integrating overnight events, current risks, and weather impacts',
                time: '07:00 AM'
              },
              { 
                title: 'Critical Decision Point', 
                description: 'Detailed safety assessment for FCCU catalyst changeout with permit and personnel review',
                time: '09:30 AM'
              },
              { 
                title: 'Emergency Response Planning', 
                description: '24-hour risk forecast analyzing operations, resources, and potential scenarios',
                time: '11:00 AM'
              },
              { 
                title: 'Incident Prevention Analysis', 
                description: 'Leading and lagging safety indicators analysis with pattern identification',
                time: '02:00 PM'
              },
              { 
                title: 'End of Shift Handover', 
                description: 'Comprehensive report highlighting critical events, active risks, and priority actions',
                time: '04:30 PM'
              }
            ].map((scenario, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-slate-800/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold shrink-0 group-hover:scale-110 transition-transform">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {scenario.title}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {scenario.time}
                      </Badge>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      {scenario.description}
                    </p>
                  </div>
                  <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button 
              onClick={handleNewChat}
              disabled={isCreatingChat}
              size="lg"
              className="h-12 px-8 shadow-lg hover:shadow-xl transition-all group"
            >
              {isCreatingChat ? (
                <>
                  <Clock className="animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  Begin Demo Experience
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="relative overflow-hidden border-2 border-blue-200 dark:border-blue-900">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20" />
          <CardContent className="relative p-12 text-center">
            <Shield className="size-16 mx-auto mb-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Ready to Transform Refinery Safety?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Experience how SAFE-AI combines real-time monitoring, predictive analytics, and proactive risk management to create safer refinery operations.
            </p>
            <Button 
              onClick={handleNewChat}
              disabled={isCreatingChat}
              size="lg"
              className="h-14 px-8 text-lg shadow-lg hover:shadow-xl transition-all group"
            >
              {isCreatingChat ? (
                <>
                  <Clock className="animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <Shield className="group-hover:scale-110 transition-transform" />
                  Launch SAFE-AI Session
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatBotDemo;
