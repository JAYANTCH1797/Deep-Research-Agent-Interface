import React from 'react';
import { TimelineStep } from './TimelineStep';
import { ResearchStep } from './ResearchInterface';

interface ActivityTimelineProps {
  steps: ResearchStep[];
}

export function ActivityTimeline({ steps }: ActivityTimelineProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <h2 className="mb-6">Research Progress</h2>
        <div className="space-y-6">
          {steps.map((step, index) => (
            <TimelineStep
              key={step.id}
              step={step}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}