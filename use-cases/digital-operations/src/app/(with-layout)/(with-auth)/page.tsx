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

const DigitalOperations = () => {
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
      icon: TrendingUp,
      title: 'Production Optimization',
      description: 'Analyze well performance, identify production decline patterns, and optimize field operations across upstream, midstream, and downstream assets.',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: AlertTriangle,
      title: 'Predictive Maintenance',
      description: 'AI-powered equipment monitoring and failure prediction to minimize downtime and optimize maintenance schedules across facilities.',
      color: 'text-amber-600 dark:text-amber-400'
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description: 'Query production data, equipment status, and operational metrics with natural language to make data-driven decisions.',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: FileCheck,
      title: 'Work Order Management',
      description: 'Streamline workover operations, maintenance scheduling, and resource allocation with intelligent prioritization and cost analysis.',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: Users,
      title: 'Asset Intelligence',
      description: 'Comprehensive visibility into wells, facilities, and equipment with automated alerts for anomalies and performance issues.',
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      icon: Shield,
      title: 'Compliance & Safety',
      description: 'Monitor regulatory compliance, environmental metrics, and safety indicators with automated reporting and risk assessment.',
      color: 'text-cyan-600 dark:text-cyan-400'
    }
  ];

  const metrics = [
    { label: 'Active Wells', value: '1,247', status: 'STABLE' },
    { label: 'Production Today', value: '98.2%', status: 'OPTIMAL' },
    { label: 'Avg Response', value: '<2min', status: 'EXCELLENT' },
    { label: 'Cost Savings', value: '$2.4M', status: 'POSITIVE' }
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
                AI-Powered Energy Operations
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Digital Operations
              </span>
            </h1>
            
            <p className="max-w-3xl mx-auto text-xl md:text-2xl text-slate-600 dark:text-slate-400 leading-relaxed">
              Intelligent operations management for the energy industry. 
              <span className="block mt-2 font-semibold text-slate-900 dark:text-slate-100">
                Production optimization • Asset intelligence • Predictive maintenance
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
                    <Zap className="group-hover:scale-110 transition-transform" />
                    Start New Session
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
                Setup Demo Data
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
            Comprehensive Operational Intelligence
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Integrate data across your operations to optimize production, reduce costs, and improve decision-making
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

      {/* Use Cases Section */}
      <div className="bg-slate-100 dark:bg-slate-900/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              Example Use Cases
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              What You Can Do
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Ask questions in natural language to analyze operations, optimize production, and manage assets
            </p>
          </div>

          <div className="space-y-4 max-w-4xl mx-auto">
            {[
              { 
                title: 'Production Analysis', 
                description: 'Which wells in T30N-R06W are most responsible for gas production being lower today than in July 2023?',
                icon: TrendingUp
              },
              { 
                title: 'Well Performance', 
                description: 'Which wells have recently dropped off in production and what are the potential causes?',
                icon: BarChart3
              },
              { 
                title: 'Work Order Status', 
                description: 'What is the status of my workover rig queue and which jobs should be prioritized?',
                icon: FileCheck
              },
              { 
                title: 'Maintenance Planning', 
                description: 'Draft a work order to address the P-2201 centrifugal pump repair with cost estimates',
                icon: AlertTriangle
              },
              { 
                title: 'Emergency Response', 
                description: 'Show me all emergency work orders from last night and their current status',
                icon: Clock
              },
              { 
                title: 'Resource Optimization', 
                description: 'How can I fit this maintenance into my current schedule and what are the cost implications?',
                icon: Users
              }
            ].map((useCase, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-slate-800/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <useCase.icon className="size-5 text-blue-700 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {useCase.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 italic">
                      &quot;{useCase.description}&quot;
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
                  Try It Now
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
            <Zap className="size-16 mx-auto mb-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Ready to Optimize Your Operations?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Experience how AI-powered digital operations can transform your energy business with intelligent insights and automated workflows.
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
                  <Zap className="group-hover:scale-110 transition-transform" />
                  Get Started
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

export default DigitalOperations;
