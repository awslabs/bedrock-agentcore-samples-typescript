"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

export interface WorkOrderDraftData {
  title: string;
  description: string;
  type: "EMERGENCY" | "SCHEDULED" | "REGULATORY" | "PREVENTIVE" | "CORRECTIVE";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  equipmentId?: string;
  assignedPersonnelId?: string;
  estimatedCost?: number;
  estimatedDuration?: string;
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  requiredResources?: string[];
  safetyRequirements?: string[];
  status?: "CREATED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD";
  digitalTwinAlertId?: string;
}

interface WorkOrderDraftProps {
  data?: WorkOrderDraftData | { draftData?: WorkOrderDraftData; [key: string]: unknown };
  draftData?: WorkOrderDraftData;
  onApprove?: (data: WorkOrderDraftData) => void | Promise<void>;
  onReject?: (reason?: string) => void | Promise<void>;
  status?: "pending" | "approved" | "rejected";
  className?: string;
}

export const WorkOrderDraft = ({
  data,
  draftData,
  onApprove,
  onReject,
  status = "pending",
  className,
}: WorkOrderDraftProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle nested data structure
  let workOrderData: WorkOrderDraftData | undefined;
  
  if (draftData) {
    workOrderData = draftData;
  } else if (data) {
    if ('draftData' in data && typeof data.draftData === 'object') {
      workOrderData = data.draftData as WorkOrderDraftData;
    } else {
      workOrderData = data as WorkOrderDraftData;
    }
  }

  // Show error if no data
  if (!workOrderData) {
    return (
      <div className={cn("rounded-lg border-2 border-red-500 bg-white p-4", className)}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">No Work Order Data</h3>
            <p className="text-sm text-red-700 mt-1">Unable to display work order - no data received.</p>
            <details className="text-xs mt-2">
              <summary className="cursor-pointer text-red-600">Debug Info</summary>
              <pre className="mt-2 bg-red-50 p-2 rounded overflow-auto max-h-48 text-xs">
                {JSON.stringify({ data, draftData, status }, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove?.(workOrderData);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject?.("User rejected the work order draft");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn("rounded-lg border-2 bg-white p-4 space-y-4", className)}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {status === "pending" && "📋 Work Order Draft"}
          {status === "approved" && "✅ Work Order Approved"}
          {status === "rejected" && "❌ Work Order Rejected"}
        </h3>
        <div className="flex flex-wrap gap-2">
          {workOrderData.type && (
            <Badge variant="outline">{workOrderData.type}</Badge>
          )}
          {workOrderData.priority && (
            <Badge variant="destructive">{workOrderData.priority}</Badge>
          )}
        </div>
      </div>

      {/* Title */}
      {workOrderData.title && (
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-1">Title</h4>
          <p className="text-sm">{workOrderData.title}</p>
        </div>
      )}

      {/* Description */}
      {workOrderData.description && (
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-1">Description</h4>
          <p className="text-sm whitespace-pre-wrap">{workOrderData.description}</p>
        </div>
      )}

      {/* Cost and Duration */}
      {(workOrderData.estimatedCost !== undefined || workOrderData.estimatedDuration) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {workOrderData.estimatedCost !== undefined && (
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-1">💰 Estimated Cost</h4>
              <p className="text-sm">${workOrderData.estimatedCost.toLocaleString()}</p>
            </div>
          )}
          {workOrderData.estimatedDuration && (
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-1">⏱️ Duration</h4>
              <p className="text-sm">{workOrderData.estimatedDuration}</p>
            </div>
          )}
        </div>
      )}

      {/* Schedule */}
      {workOrderData.scheduledStartDate && (
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-1">📅 Scheduled Start</h4>
          <p className="text-sm">
            {new Date(workOrderData.scheduledStartDate).toLocaleString()}
          </p>
        </div>
      )}

      {/* Required Resources */}
      {workOrderData.requiredResources && workOrderData.requiredResources.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-1">🔧 Required Resources</h4>
          <ul className="text-sm list-disc list-inside space-y-1">
            {workOrderData.requiredResources.slice(0, 5).map((resource, i) => (
              <li key={i}>{resource}</li>
            ))}
            {workOrderData.requiredResources.length > 5 && (
              <li className="text-gray-500">
                ...and {workOrderData.requiredResources.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Safety Requirements */}
      {workOrderData.safetyRequirements && workOrderData.safetyRequirements.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-1">⚠️ Safety Requirements</h4>
          <ul className="text-sm list-disc list-inside space-y-1">
            {workOrderData.safetyRequirements.slice(0, 5).map((req, i) => (
              <li key={i}>{req}</li>
            ))}
            {workOrderData.safetyRequirements.length > 5 && (
              <li className="text-gray-500">
                ...and {workOrderData.safetyRequirements.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Equipment ID */}
      {workOrderData.equipmentId && (
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-1">🏭 Equipment ID</h4>
          <p className="text-sm font-mono">{workOrderData.equipmentId}</p>
        </div>
      )}

      {/* Digital Twin Alert Link */}
      {workOrderData.digitalTwinAlertId && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-blue-900 mb-1">🤖 Linked to Digital Twin Alert</h4>
              <p className="text-sm text-blue-700 mb-2">
                This work order addresses a predicted equipment failure detected by the digital twin system.
              </p>
              <p className="text-xs text-blue-600 font-mono">
                Alert ID: {workOrderData.digitalTwinAlertId}
              </p>
              <div className="mt-2 text-xs text-blue-700 bg-blue-100 rounded px-2 py-1 inline-block">
                <span className="font-semibold">Impact:</span> When this work order is created, 
                the predicted throughput impact will be removed from the forecast (maintenance prevents failure)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assigned Personnel */}
      {workOrderData.assignedPersonnelId && (
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-1">👤 Assigned Personnel</h4>
          <p className="text-sm font-mono">{workOrderData.assignedPersonnelId}</p>
        </div>
      )}

      {/* Actions */}
      {status === "pending" && (
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReject}
            disabled={isProcessing}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isProcessing}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {isProcessing ? "Creating..." : "Approve & Create"}
          </Button>
        </div>
      )}

      {status === "approved" && (
        <div className="flex items-center gap-2 text-green-600 text-sm font-medium pt-4 border-t">
          <CheckCircle2 className="h-5 w-5" />
          Work order has been created successfully
        </div>
      )}

      {status === "rejected" && (
        <div className="flex items-center gap-2 text-red-600 text-sm font-medium pt-4 border-t">
          <XCircle className="h-5 w-5" />
          Work order was rejected by user
        </div>
      )}
    </div>
  );
};
