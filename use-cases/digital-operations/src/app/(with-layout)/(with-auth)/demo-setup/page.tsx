"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';

const client = generateClient<Schema>();

type SeedStatus = {
  actionItems: boolean;
  workoverJobs: boolean;
};

export default function DemoSetupPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SeedStatus>({
    actionItems: false,
    workoverJobs: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const createActionItems = async () => {
    // Debug: Check what models are available
    console.log('Available models:', Object.keys(client.models || {}));
    console.log('ActionItem model:', client.models?.ActionItem);
    
    if (!client.models?.ActionItem) {
      throw new Error('ActionItem model not found. Make sure the schema has been deployed.');
    }

    const actionItems = [
      {
        alertId: 'alert-001',
        type: 'immediate' as const,
        action: 'Inspect CBM water disposal system for scaling',
        description: 'High TDS levels detected in produced water from Well SJ-15A. Inspect disposal lines and injection equipment for mineral scaling that could cause system failure.',
        expectedValue: 'Prevent $85K disposal system replacement',
        risk: 'Medium - potential environmental compliance violation',
        status: 'pending' as const,
        source: 'Water Quality Monitoring System'
      },
      {
        alertId: 'alert-002',
        type: 'immediate' as const,
        action: 'Replace aging wellhead assembly on Well SJ-22B',
        description: 'Wellhead installed in 1987 showing signs of corrosion and potential gas migration. Replace before winter freeze-thaw cycles worsen condition.',
        expectedValue: 'Prevent methane seepage and regulatory violations',
        risk: 'High - safety and environmental risk',
        status: 'pending' as const,
        source: 'Field Inspection Report'
      },
      {
        alertId: 'alert-003',
        type: 'scheduled' as const,
        action: 'Optimize dewatering pump schedule for Fruitland Formation wells',
        description: 'Adjust pump cycles on 12 CBM wells to improve gas production efficiency while managing produced water volumes per BLM requirements.',
        expectedValue: '$125K/month increased gas revenue',
        risk: 'Low - operational optimization',
        status: 'pending' as const,
        source: 'Production Optimization AI'
      },
      {
        alertId: 'alert-004',
        type: 'preventive' as const,
        action: 'Conduct baseline water quality sampling near Well SJ-08C',
        description: 'Establish pre-drilling baseline for domestic water wells within 1-mile radius before commencing infill drilling program.',
        expectedValue: 'Mitigate future litigation risk',
        risk: 'Low - regulatory compliance',
        status: 'pending' as const,
        source: 'Environmental Compliance System'
      },
      {
        alertId: 'alert-005',
        type: 'immediate' as const,
        action: 'Repair cement bond on legacy well SJ-45A',
        description: 'Cement bond log indicates poor isolation between Fruitland coal and overlying aquifer. Gas migration detected in nearby domestic well.',
        expectedValue: 'Prevent regulatory shutdown and fines',
        risk: 'High - environmental and regulatory',
        status: 'pending' as const,
        source: 'Wellbore Integrity Monitoring'
      },
      {
        alertId: 'alert-006',
        type: 'scheduled' as const,
        action: 'Install methane detection sensors at surface facilities',
        description: 'Deploy continuous methane monitoring at compressor stations and well pads to comply with new EPA methane regulations.',
        expectedValue: 'Avoid $500K in potential fines',
        risk: 'Medium - regulatory compliance',
        status: 'pending' as const,
        source: 'Regulatory Compliance System'
      }
    ];

    await Promise.all(
      actionItems.map(item => client.models.ActionItem.create(item))
    );
  };

  const createWorkoverJobs = async () => {
    if (!client.models?.WorkoverJob) {
      throw new Error('WorkoverJob model not found. Make sure the schema has been deployed.');
    }

    const workoverJobs = [
      {
        wellName: 'SJ-15A (Fruitland Coal)',
        location: 'T30N R6W Sec 15',
        jobType: 'workover' as const,
        priority: 'high' as const,
        status: 'queued' as const,
        estimatedDuration: '4 days',
        scheduledDate: '2026-01-15',
        rigAssigned: 'Rig #3',
        description: 'Replace failed dewatering pump and install new progressive cavity pump system for CBM production',
        estimatedCost: '$145K',
        financialMetrics: {
          incrementalOilBOPD: 0,
          incrementalGasMCFD: 285,
          presentValue: 1850000,
          rateOfReturn: 38.2,
          paybackMonths: 12
        }
      },
      {
        wellName: 'SJ-22B (Pictured Cliffs)',
        location: 'T30N R6W Sec 22',
        jobType: 'completion' as const,
        priority: 'medium' as const,
        status: 'inProgress' as const,
        estimatedDuration: '6 days',
        scheduledDate: '2026-01-12',
        rigAssigned: 'Rig #1',
        description: 'Complete tight gas sand horizontal well with multi-stage hydraulic fracturing',
        estimatedCost: '$285K',
        financialMetrics: {
          incrementalOilBOPD: 45,
          incrementalGasMCFD: 1250,
          presentValue: 5200000,
          rateOfReturn: 52.8,
          paybackMonths: 7
        }
      },
      {
        wellName: 'SJ-08C (Fruitland Coal)',
        location: 'T30N R6W Sec 8',
        jobType: 'maintenance' as const,
        priority: 'medium' as const,
        status: 'queued' as const,
        estimatedDuration: '3 days',
        scheduledDate: '2026-01-20',
        description: 'Remedial cementing to isolate coal seam from overlying aquifer and prevent gas migration',
        estimatedCost: '$95K',
        financialMetrics: {
          incrementalOilBOPD: 0,
          incrementalGasMCFD: 125,
          presentValue: 680000,
          rateOfReturn: 24.5,
          paybackMonths: 15
        }
      },
      {
        wellName: 'SJ-45A (Legacy Oil Well)',
        location: 'T30N R6W Sec 45',
        jobType: 'workover' as const,
        priority: 'high' as const,
        status: 'queued' as const,
        estimatedDuration: '5 days',
        scheduledDate: '2026-01-18',
        rigAssigned: 'Rig #2',
        description: 'Plug and abandon aging wellbore with poor cement bond, install new directional well to access bypassed reserves',
        estimatedCost: '$195K',
        financialMetrics: {
          incrementalOilBOPD: 65,
          incrementalGasMCFD: 380,
          presentValue: 3100000,
          rateOfReturn: 45.7,
          paybackMonths: 9
        }
      },
      {
        wellName: 'SJ-33D (CBM Infill)',
        location: 'T30N R6W Sec 33',
        jobType: 'completion' as const,
        priority: 'low' as const,
        status: 'queued' as const,
        estimatedDuration: '3 days',
        scheduledDate: '2026-01-25',
        description: 'Complete new coalbed methane infill well with cavity completion and install artificial lift',
        estimatedCost: '$125K',
        financialMetrics: {
          incrementalOilBOPD: 0,
          incrementalGasMCFD: 195,
          presentValue: 1250000,
          rateOfReturn: 28.3,
          paybackMonths: 14
        }
      }
    ];

    await Promise.all(
      workoverJobs.map(job => client.models.WorkoverJob.create(job))
    );
  };
  
  const seedAllData = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      setMessage("Creating action items...");
      await createActionItems();
      setStatus(prev => ({ ...prev, actionItems: true }));

      setMessage("Creating workover jobs...");
      await createWorkoverJobs();
      setStatus(prev => ({ ...prev, workoverJobs: true }));
      
      setMessage("✓ All demo data created successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error seeding data:", err);
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!confirm("Are you sure you want to delete all demo data? This cannot be undone.")) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage("Clearing all demo data...");

    try {
      // Check if models are available before attempting to delete
      if (!client.models?.WorkoverJob || !client.models?.ActionItem) {
        console.warn('Models not available, cannot clear database data');
        setMessage("⚠️ Models not deployed yet - no database data to clear");
        setStatus({
          actionItems: false,
          workoverJobs: false,
        });
        return;
      }

      // Delete workover jobs
      const workoverJobs = await client.models.WorkoverJob.list({});
      await Promise.all(
        workoverJobs.data.map(item => client.models.WorkoverJob.delete({ id: item.id }))
      );

      // Delete action items
      const actionItems = await client.models.ActionItem.list({});
      await Promise.all(
        actionItems.data.map(item => client.models.ActionItem.delete({ id: item.id }))
      );

      setStatus({
        actionItems: false,
        workoverJobs: false,
      });

      setMessage("✓ All demo data cleared successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while clearing data");
      console.error("Error clearing data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto py-8 px-4 max-w-4xl pb-16">
        <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mission Control Demo Setup</h1>
        <p className="text-muted-foreground">
          Create sample data for the mission control demonstration including action items and workover jobs
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {message && !error && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Setup</CardTitle>
            <CardDescription>
              Create all demo data at once for the mission control demonstration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={seedAllData}
              disabled={loading }
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Demo Data...
                </>
              ) : (
                "Create All Demo Data"
              )}
            </Button>
            
            <Button
              onClick={clearAllData}
              disabled={loading }
              variant="destructive"
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing Data...
                </>
              ) : (
                "Clear All Demo Data"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Creation Status</CardTitle>
            <CardDescription>
              Track which demo datasets have been created
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(status).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  {value ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo Data Overview</CardTitle>
            <CardDescription>
              Data created for the mission control demonstration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Action Items</h4>
                <p className="text-sm text-gray-600">
                  Sample action items for immediate, scheduled, and preventive maintenance tasks
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Workover Jobs</h4>
                <p className="text-sm text-gray-600">
                  Sample workover rig jobs with financial metrics and scheduling information
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
