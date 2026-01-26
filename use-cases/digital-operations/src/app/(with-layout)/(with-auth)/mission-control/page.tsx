'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChatBox } from '@/components/ChatBox';
import { MapViewer } from '@/components/MapViewer';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Wrench,
  Calendar,
  MapPin,
  ExternalLink,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';
import { createChat } from '../../../../../utils/chatStore';
import { executeAthenaQuery, AthenaQueryError } from '@/lib/athenaUtils';

const client = generateClient<Schema>();

interface ActionItem {
  id: string;
  alertId: string;
  type: 'immediate' | 'scheduled' | 'preventive';
  action: string;
  description: string;
  expectedValue?: string;
  risk?: string;
  status: 'pending' | 'approved' | 'rejected' | 'deferred';
  source: string;
}

interface WorkoverJob {
  id: string;
  wellName: string;
  location: string;
  jobType: 'workover' | 'completion' | 'maintenance';
  priority: 'high' | 'medium' | 'low';
  status: 'queued' | 'inProgress' | 'completed' | 'delayed';
  estimatedDuration: string;
  scheduledDate: string;
  rigAssigned?: string;
  description: string;
  estimatedCost: string;
  financialMetrics: {
    incrementalOilBOPD?: number;
    incrementalGasMCFD?: number;
    presentValue: number;
    rateOfReturn: number;
    paybackMonths: number;
  };
}

interface GasProductionData {
  date: string;
  production: number;
  target: number;
}

interface ProductionQueryResult {
  date: string;
  total_daily_gas_rate_mcf: string;
  well_count: string;
}

// Component helper functions
const getActionTypeColor = (type: ActionItem['type']) => {
  switch (type) {
    case 'immediate': return 'destructive';
    case 'scheduled': return 'default';
    case 'preventive': return 'secondary';
  }
};

const getJobPriorityColor = (priority: WorkoverJob['priority']) => {
  switch (priority) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
  }
};

const getJobStatusColor = (status: WorkoverJob['status']) => {
  switch (status) {
    case 'inProgress': return 'default';
    case 'queued': return 'secondary';
    case 'completed': return 'outline';
    case 'delayed': return 'destructive';
  }
};

const getJobStatusDisplayText = (status: WorkoverJob['status']) => {
  switch (status) {
    case 'inProgress': return 'In Progress';
    case 'queued': return 'Queued';
    case 'completed': return 'Completed';
    case 'delayed': return 'Delayed';
  }
};

// Gas Production Chart Component
const GasProductionChart = ({ data, loading, error }: {
  data: GasProductionData[];
  loading?: boolean;
  error?: string | null;
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const maxValue = Math.max(...data.map(d => d.production));
  const minValue = Math.min(...data.map(d => d.production));
  const currentProduction = data[data.length - 1]?.production || 0;

  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `${Math.round(value / 1000)}M`;
    }
    return `${Math.round(value)}K`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${month}/${year}`;
  };

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-red-600" />
            <h3 className="font-semibold text-sm">Daily Gas Production</h3>
            {loading && <span className="text-xs text-gray-500">(Loading...)</span>}
          </div>
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        <div className="mt-2 text-xs">
          <div>
            <p className="text-gray-500">Latest</p>
            <p className="font-semibold">{formatValue(currentProduction)} MCF/D</p>
          </div>
        </div>
      </div>
      <div className="flex-1 p-3">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Loading production data...</p>
            </div>
          </div>
        ) : data.length > 0 ? (
          <div className="h-full relative">
            <svg className="w-full h-full" viewBox="0 0 340 150">
              {/* Chart implementation */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const value = minValue + (maxValue - minValue) * ratio;
                const y = 130 - (ratio * 110);
                return (
                  <g key={i}>
                    <line x1="50" y1={y} x2="310" y2={y} stroke={i === 0 ? "#d1d5db" : "#f3f4f6"} strokeWidth={i === 0 ? "1.5" : "1"} />
                    <text x="45" y={y + 3} fontSize="10" fill="#6b7280" textAnchor="end" fontFamily="system-ui, -apple-system, sans-serif">
                      {formatValue(value)}
                    </text>
                  </g>
                );
              })}
              <line x1="50" y1="20" x2="50" y2="130" stroke="#374151" strokeWidth="2" />
              <line x1="50" y1="130" x2="310" y2="130" stroke="#374151" strokeWidth="2" />
              <polyline
                fill="none"
                stroke="#dc2626"
                strokeWidth="2.5"
                points={data.map((d, i) =>
                  `${50 + (i / (data.length - 1)) * 260},${130 - ((d.production - minValue) / (maxValue - minValue)) * 110}`
                ).join(' ')}
              />
              {data.map((d, i) => {
                const cx = 50 + (i / (data.length - 1)) * 260;
                const cy = 130 - ((d.production - minValue) / (maxValue - minValue)) * 110;
                return (
                  <g key={i}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r="3"
                      fill="#dc2626"
                      stroke="#ffffff"
                      strokeWidth="1"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredPoint(i)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    {hoveredPoint === i && (
                      <g>
                        <rect
                          x={cx - 50}
                          y={cy - 45}
                          width="100"
                          height="35"
                          fill="white"
                          stroke="#dc2626"
                          strokeWidth="1.5"
                          rx="4"
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                        />
                        <text
                          x={cx}
                          y={cy - 30}
                          fontSize="11"
                          fill="#374151"
                          textAnchor="middle"
                          fontWeight="600"
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          {formatFullDate(d.date)}
                        </text>
                        <text
                          x={cx}
                          y={cy - 16}
                          fontSize="12"
                          fill="#dc2626"
                          textAnchor="middle"
                          fontWeight="700"
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          {formatValue(d.production)} MCF/D
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => {
                const dataIndex = Math.round(ratio * (data.length - 1));
                const x = 50 + ratio * 260;
                const date = data[dataIndex]?.date || '';
                return (
                  <g key={i}>
                    <line x1={x} y1="130" x2={x} y2="135" stroke="#374151" strokeWidth="1.5" />
                    <text x={x} y="147" fontSize="10" fill="#6b7280" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif">
                      {formatDate(date)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No production data available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Workover Job Queue Component
const WorkoverJobQueue = ({ jobs }: { jobs: WorkoverJob[] }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-orange-600" />
            <h3 className="font-semibold text-sm">Workover Rig Queue</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            {jobs.filter(j => j.status === 'queued').length} queued
          </Badge>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-2">
            {jobs.map((job) => (
              <Card key={job.id} className="p-2">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-xs">{job.wellName}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        <span>{job.location}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant={getJobPriorityColor(job.priority)} className="text-xs h-4 px-1">
                        {job.priority}
                      </Badge>
                      <Badge variant={getJobStatusColor(job.status)} className="text-xs h-4 px-1">
                        {getJobStatusDisplayText(job.status)}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600">{job.description}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Duration</p>
                      <p className="font-medium">{job.estimatedDuration}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Cost</p>
                      <p className="font-medium">{job.estimatedCost}</p>
                    </div>
                  </div>

                  <div className="border-t pt-2 space-y-1">
                    <p className="text-xs font-medium text-gray-700">Financial Metrics</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {job.financialMetrics.incrementalOilBOPD && (
                        <div>
                          <p className="text-gray-500">Oil Rate</p>
                          <p className="font-medium text-green-600">+{job.financialMetrics.incrementalOilBOPD} BOPD</p>
                        </div>
                      )}
                      {job.financialMetrics.incrementalGasMCFD && (
                        <div>
                          <p className="text-gray-500">Gas Rate</p>
                          <p className="font-medium text-green-600">+{job.financialMetrics.incrementalGasMCFD} MCFD</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500">Present Value</p>
                        <p className="font-medium text-blue-600">
                          ${(job.financialMetrics.presentValue / 1000000).toFixed(1)}M
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">IRR</p>
                        <p className="font-medium text-purple-600">{job.financialMetrics.rateOfReturn}%</p>
                      </div>
                    </div>
                    <div className="text-xs">
                      <p className="text-gray-500">Payback Period</p>
                      <p className="font-medium">{job.financialMetrics.paybackMonths} months</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>{job.scheduledDate}</span>
                    </div>
                    {job.rigAssigned && (
                      <span className="text-blue-600 font-medium">{job.rigAssigned}</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

// Action Review Component
const ActionReview = ({ actionItems, onApprove, onReject, onDefer }: {
  actionItems: ActionItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDefer: (id: string) => void;
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h3 className="font-semibold text-sm">Action Review</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            {actionItems.filter(a => a.status === 'pending').length} pending
          </Badge>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-2">
            {actionItems.map((action) => (
              <Card key={action.id} className="p-2">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getActionTypeColor(action.type)} className="text-xs h-4 px-1">
                          {action.type}
                        </Badge>
                      </div>
                      <p className="font-semibold text-xs mb-1">{action.action}</p>
                      <p className="text-xs text-gray-600 mb-1">{action.description}</p>
                      {action.expectedValue && (
                        <p className="text-xs text-green-600 font-medium">{action.expectedValue}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">Source: {action.source}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1 text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => console.log(`View details for ${action.source}`)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>

                  {action.status === 'pending' ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onApprove(action.id)}
                        className="bg-green-600 hover:bg-green-700 h-6 px-2 text-xs"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDefer(action.id)}
                        className="h-6 px-2 text-xs"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Defer
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onReject(action.id)}
                        className="h-6 px-2 text-xs"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <Badge
                      variant={
                        action.status === 'approved'
                          ? 'default'
                          : action.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="text-xs h-4 px-1"
                    >
                      {action.status === 'approved' && <CheckCircle2 className="h-2 w-2 mr-0.5" />}
                      {action.status === 'rejected' && <XCircle className="h-2 w-2 mr-0.5" />}
                      {action.status === 'deferred' && <Clock className="h-2 w-2 mr-0.5" />}
                      {action.status.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

// Main Component
export default function MissionControlPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [workoverJobs, setWorkoverJobs] = useState<WorkoverJob[]>([]);
  const [loadingWells, setLoadingWells] = useState(true);
  const [wellsError, setWellsError] = useState<string | null>(null);
  const [gasProductionData, setGasProductionData] = useState<GasProductionData[]>([]);
  const [loadingProduction, setLoadingProduction] = useState(true);
  const [productionError, setProductionError] = useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string>('mission-control-session');
  const [isInitializingSession, setIsInitializingSession] = useState(true);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [chatWidth, setChatWidth] = useState(() => {
    // Start at 40% of screen width, or 600px minimum
    if (typeof window !== 'undefined') {
      return Math.max(600, Math.floor(window.innerWidth * 0.4));
    }
    return 600;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Initialize chat session
  useEffect(() => {
    async function initializeChatSession() {
      const urlSessionId = searchParams.get('id');

      if (urlSessionId) {
        try {
          // Check if the session exists
          const result = await client.models.ChatSession.get({ id: urlSessionId });
          if (result.data) {
            console.log('Using existing chat session:', urlSessionId);
            setChatSessionId(urlSessionId);
          } else {
            // Session doesn't exist, create a new one
            console.log('Session not found, creating new session');
            const newSessionId = await createChat();
            setChatSessionId(newSessionId);
            router.replace(`/mission-control?id=${newSessionId}`);
          }
        } catch (error) {
          console.error('Error checking chat session:', error);
          // On error, create a new session
          const newSessionId = await createChat();
          setChatSessionId(newSessionId);
          router.replace(`/mission-control?id=${newSessionId}`);
        }
      } else {
        // No session ID in URL, create a new one
        console.log('No session ID in URL, creating new session');
        const newSessionId = await createChat();
        setChatSessionId(newSessionId);
        router.replace(`/mission-control?id=${newSessionId}`);
      }

      setIsInitializingSession(false);
    }

    initializeChatSession();
  }, [searchParams, router]);

  // Helper function to process production data
  function processProductionData(productionData: ProductionQueryResult[]): GasProductionData[] {
    // Convert monthly production data directly to chart format
    return productionData.map(row => ({
      date: row.date,
      production: Math.round(parseFloat(row.total_daily_gas_rate_mcf) / 1000), // Convert to thousands
      target: 0
    })).reverse(); // Reverse to show oldest to newest
  }

  // Helper function to create or update map layer with query configuration
  async function createOrUpdateWellsLayer(): Promise<void> {
    const layerId = `wells-t30n-r6w-${chatSessionId}`;

    // Query to get wells with production decline calculation
    const athenaQuery = `
      WITH recent_production AS (
        SELECT 
          REPLACE(mp.api, '-', '') as api_clean,
          AVG(CASE WHEN mp.date >= DATE '2024-12-01' AND mp.date < DATE '2025-01-01' 
              THEN CAST(mp.dailygasrate AS DOUBLE) END) as last_month_avg,
          AVG(CASE WHEN mp.date >= DATE '2024-01-01' AND mp.date < DATE '2025-01-01'
              THEN CAST(mp.dailygasrate AS DOUBLE) END) as twelve_month_avg
        FROM upstream.monthly_production mp
        WHERE mp.dailygasrate IS NOT NULL
          AND CAST(mp.dailygasrate AS DOUBLE) > 0
          AND mp.date >= DATE '2024-01-01'
          AND mp.date < DATE '2025-01-01'
        GROUP BY REPLACE(mp.api, '-', '')
      )
      SELECT 
        wh.id,
        wh.name,
        wh.type,
        wh.status,
        wh.latitude,
        wh.longitude,
        wh.ogrid_name,
        wh.last_production_date,
        COALESCE(rp.last_month_avg, 0) as last_month_production,
        COALESCE(rp.twelve_month_avg, 0) as avg_12month_production,
        COALESCE(rp.last_month_avg - rp.twelve_month_avg, 0) as production_decline
      FROM upstream.well_header wh
      LEFT JOIN recent_production rp ON REPLACE(wh.id, '-', '') = rp.api_clean
      WHERE (wh.ulstr LIKE '%-30N-06W' OR wh.ulstr LIKE '%-30N-6W')
      LIMIT 1000
    `;

    const geoJsonMapping = {
      geometryType: 'Point',
      longitudeField: 'longitude',
      latitudeField: 'latitude',
      propertyFields: ['id', 'name', 'type', 'status', 'ogrid_name', 'last_production_date', 
                       'last_month_production', 'avg_12month_production', 'production_decline']
    };

    // Check if layer already exists by querying it directly
    try {
      const existingLayerResult = await client.models.MapLayer.get({ id: layerId });

      if (existingLayerResult.data) {
        console.log('Well map layer already exists, skipping update to avoid unnecessary re-renders');
        // Layer exists, don't update it unless necessary
        // The subscription will handle any updates from other sources
        return;
      } else {
        // Layer doesn't exist, create it
        console.log('Creating well map layer with production decline coloring');
        await client.models.MapLayer.create({
          id: layerId,
          chatSessionId,
          name: 'Wells in T30N R6W',
          description: 'Wells colored by production decline (last month vs 12-month average)',
          type: 'point',
          visible: true,
          athenaQuery,
          athenaDatabase: 'upstream',
          geoJsonMapping: JSON.stringify(geoJsonMapping),
          order: 1,
          source: 'athena-query',
          style: JSON.stringify({
            radius: 6,
            opacity: 0.8,
            strokeWidth: 1,
            strokeColor: '#ffffff',
            colorScale: {
              type: 'linear',
              property: 'production_decline',
              stops: [
                [-100, '#dc2626'],
                [-50, '#f97316'],
                [-10, '#fbbf24'],
                [0, '#d1d5db'],
                [10, '#84cc16'],
                [50, '#22c55e'],
                [100, '#16a34a']
              ],
              defaultColor: '#9ca3af'
            },
            tooltip: {
              title: 'name',
              fields: [
                { property: 'production_decline', label: 'Decline', format: 'number', unit: 'MCF/D' },
                { property: 'last_month_production', label: 'Last Month', format: 'number', unit: 'MCF/D' },
                { property: 'avg_12month_production', label: '12-Mo Avg', format: 'number', unit: 'MCF/D' },
                { property: 'status', label: 'Status', format: 'text' }
              ]
            }
          })
        });
        console.log('Well map layer created successfully with production decline coloring');
      }
    } catch {
      // If get fails, the layer doesn't exist, so create it
      console.log('Layer does not exist, creating new layer with production decline coloring');
      await client.models.MapLayer.create({
        id: layerId,
        chatSessionId,
        name: 'Wells in T30N R6W',
        description: 'Wells colored by production decline (last month vs 12-month average)',
        type: 'point',
        visible: true,
        athenaQuery,
        athenaDatabase: 'upstream',
        geoJsonMapping: JSON.stringify(geoJsonMapping),
        order: 1,
        source: 'athena-query',
        style: JSON.stringify({
          radius: 6,
          opacity: 0.8,
          strokeWidth: 1,
          strokeColor: '#ffffff',
          colorScale: {
            type: 'linear',
            property: 'production_decline',
            stops: [
              [-100, '#dc2626'],
              [-50, '#f97316'],
              [-10, '#fbbf24'],
              [0, '#d1d5db'],
              [10, '#84cc16'],
              [50, '#22c55e'],
              [100, '#16a34a']
            ],
            defaultColor: '#9ca3af'
          },
          tooltip: {
            title: 'name',
            fields: [
              { property: 'production_decline', label: 'Decline', format: 'number', unit: 'MCF/D' },
              { property: 'last_month_production', label: 'Last Month', format: 'number', unit: 'MCF/D' },
              { property: 'avg_12month_production', label: '12-Mo Avg', format: 'number', unit: 'MCF/D' },
              { property: 'status', label: 'Status', format: 'text' }
            ]
          }
        })
      });
      console.log('Well map layer created successfully with production decline coloring');
    }
  }

  async function loadWellsData() {
    try {
      await createOrUpdateWellsLayer();
    } catch (error) {
      console.error('Failed to create wells layer:');

      if (error instanceof AthenaQueryError) {
        console.error('Athena Query Error:', error.message);
        setWellsError(`Athena Error: ${error.message}`);
      } else if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        setWellsError(error.message);
      } else if (error && typeof error === 'object') {
        console.error('Error object:', JSON.stringify(error, null, 2));
        setWellsError('Failed to create wells layer (see console for details)');
      } else {
        console.error('Unknown error type:', typeof error, error);
        setWellsError('Unknown error occurred');
      }
    } finally {
      setLoadingWells(false);
    }
  }

  async function loadProductionData() {
    try {
      const result = await executeAthenaQuery<ProductionQueryResult>(
        `SELECT 
           mp.date,
           SUM(CAST(mp.dailygasrate AS DOUBLE)) as total_daily_gas_rate_mcf,
           COUNT(*) as well_count
         FROM upstream.well_header wh
         JOIN upstream.monthly_production mp ON REPLACE(wh.id, '-', '') = mp.api
         WHERE (wh.ulstr LIKE '%-30N-06W' OR wh.ulstr LIKE '%-30N-6W')
           AND mp.dailygasrate IS NOT NULL
           AND CAST(mp.dailygasrate AS DOUBLE) > 0
           AND mp.date < DATE '2025-02-01'
         GROUP BY mp.date
         ORDER BY mp.date DESC
         LIMIT 24`,
        'upstream'
      );

      const dailyData = processProductionData(result.data);
      setGasProductionData(dailyData);
    } catch (error) {
      console.error('Failed to load production data:');

      if (error instanceof AthenaQueryError) {
        console.error('Athena Query Error:', error.message);
        setProductionError(`Athena Error: ${error.message}`);
      } else if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        setProductionError(error.message);
      } else if (error && typeof error === 'object') {
        console.error('Error object:', JSON.stringify(error, null, 2));
        setProductionError('Failed to load production data (see console for details)');
      } else {
        console.error('Unknown error type:', typeof error, error);
        setProductionError('Unknown error occurred');
      }
    } finally {
      setLoadingProduction(false);
    }
  }

  // Combined data loading with single GraphQL batch
  useEffect(() => {
    async function loadMissionControlData() {
      // Don't load data until session is initialized
      if (!chatSessionId || isInitializingSession) {
        console.log('Waiting for chat session initialization...');
        return;
      }

      console.log('Loading mission control data for session:', chatSessionId);
      setLoadingWells(true);
      setLoadingProduction(true);

      try {
        // Use one custom GraphQL query to fetch all data at once
        const result = await client.graphql({
          query: `
            query GetMissionControlData($chatSessionId: ID!) {
              listActionItems {
                items {
                  id
                  alertId
                  type
                  action
                  description
                  expectedValue
                  risk
                  status
                  source
                  createdAt
                  updatedAt
                }
              }
              listWorkoverJobs {
                items {
                  id
                  wellName
                  location
                  jobType
                  priority
                  status
                  estimatedDuration
                  scheduledDate
                  rigAssigned
                  description
                  estimatedCost
                  financialMetrics {
                    incrementalOilBOPD
                    incrementalGasMCFD
                    presentValue
                    rateOfReturn
                    paybackMonths
                  }
                  createdAt
                  updatedAt
                }
              }
              listMapLayers(filter: { chatSessionId: { eq: $chatSessionId } }) {
                items {
                  id
                  chatSessionId
                  name
                  type
                  visible
                  athenaQuery
                  athenaDatabase
                  geoJsonMapping
                  queryRefreshInterval
                  lastQueryExecutedAt
                  queryError
                  style
                  order
                  description
                  source
                  createdAt
                  updatedAt
                }
              }
            }
          `,
          variables: { chatSessionId }
        });

        // Extract data from the single GraphQL response
        const graphqlResult = result as {
          data?: {
            listActionItems?: { items?: unknown[] };
            listWorkoverJobs?: { items?: unknown[] };
            listMapLayers?: { items?: unknown[] };
          },
          errors?: Array<{ message: string; path?: string[] }>
        };

        // Log GraphQL errors but don't fail the entire load
        if (graphqlResult.errors && graphqlResult.errors.length > 0) {
          console.error('GraphQL errors detected:', graphqlResult.errors);
          
          // Check if errors are related to MapLayers specifically
          const mapLayerErrors = graphqlResult.errors.filter(err => 
            err.path && err.path.some(p => p === 'listMapLayers')
          );
          
          if (mapLayerErrors.length > 0) {
            console.warn('MapLayer-specific errors detected (likely invalid data):', mapLayerErrors);
            console.warn('This usually means there are MapLayer records with null required fields in the database');
          }
        }

        const actionItemsData = graphqlResult.data?.listActionItems?.items || [];
        const workoverJobsData = graphqlResult.data?.listWorkoverJobs?.items || [];
        const mapLayersData = graphqlResult.data?.listMapLayers?.items || [];

        // Filter out null map layers (caused by schema violations)
        const validMapLayers = mapLayersData.filter((layer: unknown) => {
          if (!layer) {
            console.warn('Filtered out null/undefined map layer from GraphQL response');
            return false;
          }
          
          // Additional validation for required fields
          const mapLayer = layer as Record<string, unknown>;
          if (!mapLayer.athenaQuery || !mapLayer.athenaDatabase || !mapLayer.geoJsonMapping) {
            console.warn('Filtered out map layer with missing required fields:', {
              id: mapLayer.id,
              hasAthenaQuery: !!mapLayer.athenaQuery,
              hasAthenaDatabase: !!mapLayer.athenaDatabase,
              hasGeoJsonMapping: !!mapLayer.geoJsonMapping
            });
            return false;
          }
          
          return true;
        });
        
        if (validMapLayers.length !== mapLayersData.length) {
          console.warn(`Filtered out ${mapLayersData.length - validMapLayers.length} invalid map layers with null or missing required fields`);
          console.warn('To fix this, delete or update the invalid MapLayer records in your database');
        }

        // Handle action items
        if (actionItemsData.length > 0) {
          setActionItems(actionItemsData.filter((item: unknown) => item !== null && item !== undefined).map((item: unknown) => {
            const actionItem = item as Record<string, unknown>;
            return {
              id: actionItem.id as string,
              alertId: actionItem.alertId as string,
              type: actionItem.type as ActionItem['type'],
              action: actionItem.action as string,
              description: actionItem.description as string,
              expectedValue: actionItem.expectedValue as string | undefined,
              risk: actionItem.risk as string | undefined,
              status: actionItem.status as ActionItem['status'],
              source: actionItem.source as string,
            };
          }));
        }

        // Handle workover jobs
        if (workoverJobsData.length > 0) {
          setWorkoverJobs(workoverJobsData.filter((job: unknown) => job !== null && job !== undefined).map((job: unknown) => {
            const workoverJob = job as Record<string, unknown>;
            const financialMetrics = workoverJob.financialMetrics as Record<string, unknown>;
            return {
              id: workoverJob.id as string,
              wellName: workoverJob.wellName as string,
              location: workoverJob.location as string,
              jobType: workoverJob.jobType as WorkoverJob['jobType'],
              priority: workoverJob.priority as WorkoverJob['priority'],
              status: workoverJob.status as WorkoverJob['status'],
              estimatedDuration: workoverJob.estimatedDuration as string,
              scheduledDate: workoverJob.scheduledDate as string,
              rigAssigned: workoverJob.rigAssigned as string | undefined,
              description: workoverJob.description as string,
              estimatedCost: workoverJob.estimatedCost as string,
              financialMetrics: {
                incrementalOilBOPD: financialMetrics.incrementalOilBOPD as number | undefined,
                incrementalGasMCFD: financialMetrics.incrementalGasMCFD as number | undefined,
                presentValue: financialMetrics.presentValue as number,
                rateOfReturn: financialMetrics.rateOfReturn as number,
                paybackMonths: financialMetrics.paybackMonths as number,
              },
            };
          }));
        }

        // Start Athena queries for wells and production data (these still need separate calls)
        await Promise.allSettled([
          loadWellsData(),
          loadProductionData()
        ]);

      } catch (error) {
        // Improved error handling with detailed logging
        console.error('Failed to load mission control data:');

        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        } else if (error && typeof error === 'object') {
          console.error('Error object:', JSON.stringify(error, null, 2));

          // Check for GraphQL errors
          if ('errors' in error) {
            console.error('GraphQL errors:', (error as { errors: unknown[] }).errors);
          }

          // Check for network errors
          if ('networkError' in error) {
            console.error('Network error:', (error as { networkError: unknown }).networkError);
          }
        } else {
          console.error('Unknown error type:', typeof error, error);
        }

        // Continue loading wells and production data
        await Promise.allSettled([
          loadWellsData(),
          loadProductionData()
        ]);
      }
    }

    loadMissionControlData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSessionId, isInitializingSession]);

  // Action handlers
  const handleApproveAction = async (actionId: string) => {
    try {
      if (client.models?.ActionItem) {
        await client.models.ActionItem.update({ id: actionId, status: 'approved' });
      }
      setActionItems(items =>
        items.map(item =>
          item.id === actionId ? { ...item, status: 'approved' as const } : item
        )
      );
    } catch (error) {
      console.error('Failed to approve action:', error);
    }
  };

  const handleRejectAction = async (actionId: string) => {
    try {
      if (client.models?.ActionItem) {
        await client.models.ActionItem.update({ id: actionId, status: 'rejected' });
      }
      setActionItems(items =>
        items.map(item =>
          item.id === actionId ? { ...item, status: 'rejected' as const } : item
        )
      );
    } catch (error) {
      console.error('Failed to reject action:', error);
    }
  };

  const handleDeferAction = async (actionId: string) => {
    try {
      if (client.models?.ActionItem) {
        await client.models.ActionItem.update({ id: actionId, status: 'deferred' });
      }
      setActionItems(items =>
        items.map(item =>
          item.id === actionId ? { ...item, status: 'deferred' as const } : item
        )
      );
    } catch (error) {
      console.error('Failed to defer action:', error);
    }
  };

  const toggleChatFullscreen = () => {
    setIsChatFullscreen(!isChatFullscreen);
  };

  // Handle resize drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      // Constrain width between 300px and 80% of screen width
      const maxWidth = Math.floor(window.innerWidth * 0.8);
      const constrainedWidth = Math.max(300, Math.min(maxWidth, newWidth));
      setChatWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  return (
    <div className="h-full w-full flex bg-gray-50">
      {/* Left Side - Four Tile Grid */}
      <div className={`flex-1 p-4 ${isChatFullscreen ? 'hidden' : ''}`}>
        <div className="h-full grid grid-cols-2 grid-rows-2 gap-4">
          {/* Top Left - Gas Production Chart */}
          <Card className="bg-white">
            <GasProductionChart
              data={gasProductionData}
              loading={loadingProduction}
              error={productionError}
            />
          </Card>

          {/* Top Right - Map Component */}
          <Card className="bg-white">
            <div className="h-full flex flex-col">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <h3 className="font-semibold text-sm">Wells Map</h3>
                  </div>
                  {loadingWells && <span className="text-xs text-gray-500">Loading...</span>}
                  {wellsError && <span className="text-xs text-red-500">Error</span>}
                </div>
                <p className="text-xs text-gray-500 mt-1">T30N R6W Township</p>
              </div>
              <div className="flex-1">
                <MapViewer
                  chatSessionId={chatSessionId}
                  height="100%"
                  initialViewState={{
                    longitude: -108.2,
                    latitude: 36.8,
                    zoom: 10
                  }}
                />
              </div>
            </div>
          </Card>

          {/* Bottom Left - Action Review */}
          <Card className="bg-white">
            <ActionReview
              actionItems={actionItems}
              onApprove={handleApproveAction}
              onReject={handleRejectAction}
              onDefer={handleDeferAction}
            />
          </Card>

          {/* Bottom Right - Workover Rig Job Queue */}
          <Card className="bg-white">
            <WorkoverJobQueue jobs={workoverJobs} />
          </Card>
        </div>
      </div>

      {/* Right Side - Chat Box */}
      <div 
        className={`bg-white flex flex-col relative ${isChatFullscreen ? 'fixed inset-0 z-50' : 'border-l max-h-full'}`}
        style={!isChatFullscreen ? { width: `${chatWidth}px`, flexShrink: 0 } : { width: '100%', height: '100%' }}
      >
        {/* Resize Handle */}
        {!isChatFullscreen && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors group z-10"
            onMouseDown={handleResizeStart}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-200 group-hover:bg-blue-500 transition-colors" />
          </div>
        )}
        
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold mb-1">AI Assistant</h2>
            <p className="text-xs text-gray-500">Ask questions about operations and alerts</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleChatFullscreen}
            className="h-8 w-8 p-0"
            title={isChatFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isChatFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          {isInitializingSession ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Initializing chat session...</p>
              </div>
            </div>
          ) : (
            <ChatBox chatSessionId={chatSessionId} />
          )}
        </div>
      </div>
    </div>
  );
}