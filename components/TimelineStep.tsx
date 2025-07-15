import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Badge } from './ui/badge';
import { ResearchStep } from './ResearchInterface';

interface TimelineStepProps {
  step: ResearchStep;
  isLast: boolean;
}

export function TimelineStep({ step, isLast }: TimelineStepProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'active':
        return <div className="h-5 w-5 rounded-full border-2 border-blue-600 bg-blue-100 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (step.status) {
      case 'completed':
        return <Badge variant="secondary" className="text-green-700 bg-green-100">Completed</Badge>;
      case 'active':
        return <Badge variant="secondary" className="text-blue-700 bg-blue-100">In Progress</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const truncateText = (text: string, maxLines: number = 2) => {
    const words = text.split(' ');
    const wordsPerLine = 8; // Approximate words per line
    const maxWords = maxLines * wordsPerLine;
    
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  return (
    <div className="relative">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-2.5 top-12 w-0.5 h-full bg-border" />
      )}
      
      <div className="flex gap-4">
        {/* Status indicator */}
        <div className="flex-shrink-0 mt-1">
          {getStatusIcon()}
        </div>
        
        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="font-medium">{step.title}</h3>
              {getStatusBadge()}
            </div>
          </div>
          
          {/* Messages */}
          {step.messages.length > 0 && (
            <div className="space-y-2">
              {/* Latest message preview */}
              <div className="text-sm text-muted-foreground leading-relaxed">
                {step.status === 'active' && step.messages.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-pulse" />
                    {step.messages[step.messages.length - 1].content}
                  </div>
                )}
                
                {step.status === 'completed' && step.summary && (
                  <p>{truncateText(step.summary)}</p>
                )}
              </div>
              
              {/* Expandable detailed content */}
              {step.status === 'completed' && step.expandedContent && (
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronRight className="h-3 w-3 mr-1" />
                          Show details
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="bg-muted/50 rounded-md p-3 border">
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono">
                        {step.expandedContent}
                      </pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}