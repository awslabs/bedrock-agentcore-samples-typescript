'use client';

import { MapViewer } from '@/components/MapViewer';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function MapPageContent() {
  const searchParams = useSearchParams();
  const chatSessionId = searchParams.get('chatSessionId') || '';

  if (!chatSessionId) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            No Chat Session ID
          </h2>
          <p className="text-gray-500">
            Please provide a chatSessionId query parameter
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <MapViewer 
        chatSessionId={chatSessionId}
        height="100vh"
      />
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen w-full">
        <div className="text-gray-500">Loading map...</div>
      </div>
    }>
      <MapPageContent />
    </Suspense>
  );
}
