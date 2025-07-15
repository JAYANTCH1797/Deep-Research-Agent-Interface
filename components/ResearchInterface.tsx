import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { ArrowLeft, AlertCircle, Wifi, WifiOff, Play, Bug, Eye, EyeOff } from 'lucide-react';
import { ActivityTimeline } from './ActivityTimeline';
import { ResultsPanel } from './ResultsPanel';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';
import { Alert, AlertDescription } from './ui/alert';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from './ui/resizable';
import { TimelineUpdate, ResearchResult } from '../services/researchApi';
// Backend base URL for creating threads and streaming runs
const API_URL = "http://localhost:8000";

interface ResearchInterfaceProps {
  query: string;
  onBackToSearch: () => void;
}

// Debug event interface
interface DebugEvent {
  id: string;
  timestamp: Date;
  type: 'node_start' | 'node_complete' | 'complete' | 'error';
  nodeId?: string;
  data: any;
  rawData: string;
}

export type ResearchStep = {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  messages: Array<{
    id: string;
    content: string;
    timestamp: Date;
    isComplete?: boolean;
  }>;
  summary?: string;
  expandedContent?: string;
};

export function ResearchInterface({ query, onBackToSearch }: ResearchInterfaceProps) {
  // Debug state
  const [debugMode, setDebugMode] = useState(false);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  const [steps, setSteps] = useState<ResearchStep[]>([
    {
      id: 'generating-queries',
      title: 'Generating Queries',
      status: 'pending',
      messages: []
    },
    {
      id: 'search-web',
      title: 'Search Web',
      status: 'pending',
      messages: []
    },
    {
      id: 'aggregate-results',
      title: 'Aggregate Results',
      status: 'pending',
      messages: []
    },
    {
      id: 'reflecting',
      title: 'Reflecting',
      status: 'pending',
      messages: []
    },
    {
      id: 'generating-answer',
      title: 'Generating Answer',
      status: 'pending',
      messages: []
    }
  ]);

  const [finalResult, setFinalResult] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'demo' | 'disconnected'>('connected');
  const messageCounterRef = useRef(0);
  // We'll create a new thread and stream updates via SSE

  // Start research when query changes
  useEffect(() => {
    startResearch();
  }, [query]);

  const getMessageId = () => {
    return `msg-${Date.now()}-${++messageCounterRef.current}`;
  };

  const mapPhaseToStepId = (phase: string): string => {
    const phaseMap: Record<string, string> = {
      'generating_queries': 'generating-queries',
      'search_web': 'search-web',
      'aggregate_results': 'aggregate-results',
      'reflection': 'reflecting',
      'generating_answer': 'generating-answer'
    };
    return phaseMap[phase] || phase;
  };

  const mapNodeIdToStepId = (nodeId: string): string => {
    const mapping: Record<string, string> = {
      'generate_queries': 'generating-queries',
      'web_search': 'search-web',
      'aggregate_results': 'aggregate-results',
      'reflection': 'reflecting',
      'answer_generation': 'generating-answer'
    };
    return mapping[nodeId] || nodeId;
  };

  const getStartMessage = (nodeId: string, input: any): string => {
    // Extract the actual input from nested structure if needed
    const actualInput = input?.input || input;
    
    const messages: Record<string, string> = {
      'generate_queries': 'Analyzing your question to identify key research areas...',
      'web_search': `Searching for: "${actualInput.query?.substring(0, 50) || 'information'}..."`,
      'aggregate_results': 'Analyzing collected information for consistency...',
      'reflection': 'Cross-referencing facts across multiple sources...',
      'answer_generation': 'Synthesizing information from all sources...'
    };
    return messages[nodeId] || 'Processing...';
  };

  const getSummary = (nodeId: string, output: any): string => {
    // Extract the actual data from the nested structure
    const actualOutput = output?.output || output;
    
    switch (nodeId) {
      case 'generate_queries':
        return `Generated ${actualOutput.query_list?.length || 0} targeted search queries`;
      case 'web_search':
        return `Found sources from search query`;
      case 'aggregate_results':
        return `Processed ${actualOutput.sources_gathered?.length || 0} sources`;
      case 'reflection':
        return `Identified ${actualOutput.follow_up_queries?.length || 0} follow-up areas`;
      case 'answer_generation':
        return `Generated answer with ${actualOutput.citations?.length || 0} citations`;
      default:
        return 'Step completed';
    }
  };

  const getExpandedContent = (nodeId: string, output: any): string => {
    // Extract the actual data from the nested structure
    const actualOutput = output?.output || output;
    
    switch (nodeId) {
      case 'generate_queries':
        const queries = actualOutput.query_list || [];
        const rationale = actualOutput.rationale || 'Not provided';
        return `Generated Queries (${queries.length}):
${queries.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n') || 'None'}

Strategy & Rationale:
${rationale}

Research Phase: ${actualOutput.current_phase || 'Unknown'}
Original Question: ${actualOutput.original_question || 'Not provided'}`;

      case 'web_search':
        const searchResults = actualOutput.search_results || [];
        const sources = actualOutput.sources_gathered || [];
        
        let content = `Search Results Summary:\n`;
        if (searchResults.length > 0) {
          content += `Total Results: ${searchResults.length}\n\n`;
          
          searchResults.forEach((result: any, i: number) => {
            content += `🔍 Search ${i + 1}: "${result.query || 'Unknown query'}"\n`;
            content += `📊 Relevance Score: ${result.relevance_score || 'N/A'}\n`;
            if (result.summary) {
              // Show first 300 characters of summary
              const summary = result.summary.length > 300 
                ? result.summary.substring(0, 300) + '...' 
                : result.summary;
              content += `📄 Summary Preview: ${summary}\n`;
            }
            if (result.sources && result.sources.length > 0) {
              content += `🔗 Sources Found: ${result.sources.length}\n`;
              content += result.sources.slice(0, 3).map((source: string, idx: number) => 
                `   ${idx + 1}. ${source}`).join('\n');
              if (result.sources.length > 3) {
                content += `\n   ... and ${result.sources.length - 3} more`;
              }
            }
            content += '\n\n';
          });
        }
        
        content += `Total Unique Sources: ${sources.length}`;
        return content;

      case 'aggregate_results':
        const sourcesGathered = actualOutput.sources_gathered || [];
        const researchSummary = actualOutput.research_summary || {};
        
        let aggContent = `Information Processing:\n`;
        aggContent += `📚 Sources Processed: ${sourcesGathered.length}\n`;
        aggContent += `✅ Information Sufficient: ${actualOutput.is_sufficient ? 'Yes' : 'No'}\n`;
        
        if (actualOutput.knowledge_gap) {
          aggContent += `❓ Knowledge Gap: ${actualOutput.knowledge_gap}\n`;
        }
        
        if (Object.keys(researchSummary).length > 0) {
          aggContent += `\n📊 Research Summary:\n`;
          Object.entries(researchSummary).forEach(([key, value]) => {
            aggContent += `   ${key}: ${value}\n`;
          });
        }
        
        if (sourcesGathered.length > 0) {
          aggContent += `\n🔗 Key Sources:\n`;
          sourcesGathered.slice(0, 5).forEach((source: any, i: number) => {
            if (typeof source === 'string') {
              aggContent += `   ${i + 1}. ${source}\n`;
            } else if (source.url) {
              aggContent += `   ${i + 1}. ${source.title || source.url}\n`;
            }
          });
          if (sourcesGathered.length > 5) {
            aggContent += `   ... and ${sourcesGathered.length - 5} more sources\n`;
          }
        }
        
        return aggContent;

      case 'reflection':
        const followUpQueries = actualOutput.follow_up_queries || [];
        const warnings = actualOutput.warnings || [];
        const errors = actualOutput.errors || [];
        
        let reflContent = `Research Analysis:\n`;
        reflContent += `🔄 Research Loop: ${actualOutput.research_loop_count || 0}\n`;
        reflContent += `📊 Total Queries Run: ${actualOutput.total_queries_run || 0}\n`;
        reflContent += `✅ Information Adequate: ${actualOutput.is_sufficient ? 'Yes' : 'No'}\n`;
        
        if (actualOutput.knowledge_gap) {
          reflContent += `❓ Identified Gaps: ${actualOutput.knowledge_gap}\n`;
        }
        
        if (followUpQueries.length > 0) {
          reflContent += `\n🎯 Follow-up Research Areas (${followUpQueries.length}):\n`;
          followUpQueries.forEach((query: string, i: number) => {
            reflContent += `   ${i + 1}. ${query}\n`;
          });
        }
        
        if (warnings.length > 0) {
          reflContent += `\n⚠️ Research Warnings:\n`;
          warnings.forEach((warning: string, i: number) => {
            reflContent += `   ${i + 1}. ${warning}\n`;
          });
        }
        
        if (errors.length > 0) {
          reflContent += `\n❌ Issues Encountered:\n`;
          errors.forEach((error: string, i: number) => {
            reflContent += `   ${i + 1}. ${error}\n`;
          });
        }
        
        reflContent += `\n📍 Next Phase: ${actualOutput.current_phase || 'Unknown'}`;
        
        return reflContent;

      case 'answer_generation':
        const finalAnswer = actualOutput.final_answer || '';
        const citations = actualOutput.citations || [];
        const researchStats = actualOutput.research_summary || {};
        
        let answerContent = `Answer Generation Complete:\n`;
        answerContent += `📝 Answer Length: ${finalAnswer.length} characters\n`;
        answerContent += `📚 Citations Included: ${citations.length}\n`;
        
        if (Object.keys(researchStats).length > 0) {
          answerContent += `\n📊 Research Statistics:\n`;
          Object.entries(researchStats).forEach(([key, value]) => {
            answerContent += `   ${key}: ${value}\n`;
          });
        }
        
        answerContent += `\n🔄 Research Loops: ${actualOutput.research_loop_count || 0}\n`;
        answerContent += `🔍 Total Queries: ${actualOutput.total_queries_run || 0}\n`;
        answerContent += `📚 Sources Used: ${actualOutput.sources_gathered?.length || 0}\n`;
        
        if (citations.length > 0) {
          answerContent += `\n📖 Citations:\n`;
          citations.slice(0, 10).forEach((citation: string, i: number) => {
            answerContent += `   ${i + 1}. ${citation}\n`;
          });
          if (citations.length > 10) {
            answerContent += `   ... and ${citations.length - 10} more citations\n`;
          }
        }
        
        if (finalAnswer && finalAnswer.length > 0) {
          const preview = finalAnswer.length > 200 
            ? finalAnswer.substring(0, 200) + '...' 
            : finalAnswer;
          answerContent += `\n📄 Answer Preview:\n${preview}`;
        }
        
        return answerContent;

      default:
        return `Step completed successfully.\n\nPhase: ${actualOutput.current_phase || 'Unknown'}\nDuration: ${output.duration || 'N/A'}ms`;
    }
  };

  const handleNodeStart = (event: MessageEvent) => {
    const payload = JSON.parse(event.data);
    const stepId = mapNodeIdToStepId(payload.nodeId);
    
    // Add debug logging
    if (debugMode) {
      console.log(`🚀 Node Start Debug - ${payload.nodeId}:`, {
        payload,
        extractedInput: payload.input?.input || payload.input,
        stepId
      });
      
      const debugEvent: DebugEvent = {
        id: `start-${Date.now()}`,
        timestamp: new Date(),
        type: 'node_start',
        nodeId: payload.nodeId,
        data: payload,
        rawData: event.data
      };
      setDebugEvents(prev => [...prev, debugEvent]);
    }
    
    setSteps(prev => prev.map(step => {
      if (step.id !== stepId) return step;
      
      return {
        ...step,
        status: 'active' as const,
        messages: [
          ...step.messages,
          {
            id: getMessageId(),
            content: getStartMessage(payload.nodeId, payload.input),
            timestamp: new Date(payload.timestamp * 1000),
            isComplete: false
          }
        ]
      };
    }));
  };

  const handleNodeComplete = (event: MessageEvent) => {
    const payload = JSON.parse(event.data);
    const stepId = mapNodeIdToStepId(payload.nodeId);
    
    // Add debug logging
    if (debugMode) {
      console.log(`🔍 Node Complete Debug - ${payload.nodeId}:`, {
        payload,
        extractedOutput: payload.output?.output || payload.output,
        stepId
      });
      
      const debugEvent: DebugEvent = {
        id: `complete-${Date.now()}`,
        timestamp: new Date(),
        type: 'node_complete',
        nodeId: payload.nodeId,
        data: payload,
        rawData: event.data
      };
      setDebugEvents(prev => [...prev, debugEvent]);
    }
    
    setSteps(prev => prev.map(step => {
      if (step.id !== stepId) return step;
      
      return {
        ...step,
        status: 'completed' as const,
        summary: getSummary(payload.nodeId, payload.output),
        expandedContent: getExpandedContent(payload.nodeId, payload.output),
        messages: step.messages.map((msg, idx) => 
          idx === step.messages.length - 1 
            ? { ...msg, isComplete: true }
            : msg
        )
      };
    }));
  };

  const handleComplete = (event: MessageEvent) => {
    const payload = JSON.parse(event.data);
    console.log('Research complete:', payload);
    
    if (payload.final_result) {
      setFinalResult(payload.final_result.final_answer || '');
      setIsComplete(true);
      setError(null);
    } else {
      setError('Research completed but no final result available');
      setIsComplete(true);
    }
    
    setIsRunning(false);
  };


  const updateStepFromTimeline = (update: TimelineUpdate) => {
    const stepId = mapPhaseToStepId(update.phase);
    
    setSteps(prev => prev.map(step => {
      if (step.id !== stepId) return step;

      let newMessages = [...step.messages];
      let newStatus = step.status;

      // Handle status updates
      if (update.status === 'in_progress' && step.status === 'pending') {
        newStatus = 'active';
      } else if (update.status === 'completed') {
        newStatus = 'completed';
      } else if (update.status === 'error') {
        newStatus = 'error';
      }

      // Add progress message
      if (update.progress_message && update.status === 'in_progress') {
        newMessages.push({
          id: getMessageId(),
          content: update.progress_message,
          timestamp: new Date(update.timestamp),
          isComplete: false
        });
      }

      // Handle completion
      if (update.status === 'completed' && update.completion_message) {
        // Mark last message as complete if exists
        if (newMessages.length > 0) {
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            isComplete: true
          };
        }

        return {
          ...step,
          status: newStatus,
          messages: newMessages,
          summary: update.completion_message,
          expandedContent: update.task_history?.join('\n\n') || update.details ? JSON.stringify(update.details, null, 2) : undefined
        };
      }

      return {
        ...step,
        status: newStatus,
        messages: newMessages
      };
    }));
  };



  const handleError = (errorMessage: string) => {
    console.error('Research error:', errorMessage);
    setError(errorMessage);
    setIsRunning(false);
    
    // Check if this is a connection error
    if (errorMessage.includes('connect') || errorMessage.includes('backend') || errorMessage.includes('server')) {
      setConnectionStatus('disconnected');
    }
    
    // Mark current active step as error
    setSteps(prev => prev.map(step => 
      step.status === 'active' ? { ...step, status: 'error' } : step
    ));
  };

  const startResearch = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setError(null);
    
    // Reset steps and final result
    setSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending' as const,
      messages: [],
      summary: undefined,
      expandedContent: undefined
    })));
    setFinalResult('');
    setConnectionStatus('connected');
    
    // Use SSE with stream_mode=events to get LangGraph event streaming
    try {
      const response = await fetch(`${API_URL}/research/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: query, 
          stream_mode: 'events'  // This triggers LangGraph astream_events
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('id: ')) {
            // Skip SSE id lines
            continue;
          } else if (line.startsWith('event: ')) {
            // Extract event type for next data line
            continue;
          } else if (line.startsWith('data: ')) {
            // Parse the JSON data
            const jsonData = line.substring(6);
            if (jsonData.trim()) {
              try {
                const eventData = JSON.parse(jsonData);
                
                // Create a MessageEvent-like object for our handlers
                const messageEvent = {
                  data: jsonData,
                  type: eventData.type
                } as MessageEvent;

                // Route to appropriate handler based on event type
                if (eventData.type === 'node_start') {
                  handleNodeStart(messageEvent);
                } else if (eventData.type === 'node_complete') {
                  handleNodeComplete(messageEvent);
                } else if (eventData.type === 'complete') {
                  handleComplete(messageEvent);
                  return; // End the stream
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('SSE connection error:', err);
      handleError(err instanceof Error ? err.message : String(err));
      runDemoMode();
    }
  };

  const runDemoMode = async () => {
    setConnectionStatus('demo');
    setIsRunning(true);
    
    // Reset state
    setSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending' as const,
      messages: [],
      summary: undefined,
      expandedContent: undefined
    })));
    
    await simulateResearchProcess();
  };

  const simulateResearchProcess = async () => {
    // Fallback demo mode - show a simple message
    setFinalResult(`# Demo Mode - Backend Not Available

## Research Interface Demo

This is a demonstration of the research interface. The backend server is not available, so we're showing you how the interface would work with real research data.

## To Use Real Research:

1. Start the backend server by running: \`npm start\`
2. Ensure you have the required API keys configured
3. The interface will automatically connect to the backend and perform real research

## Features Demonstrated:

- **Multi-step research process**: Query generation, web search, result aggregation, reflection, and answer generation
- **Real-time progress tracking**: See each step as it happens
- **Detailed step information**: Expand each step to see what happened
- **Comprehensive final results**: Get well-researched answers with citations

*Note: This is a demonstration. For real research results, please start the backend server.*`);

    setIsComplete(true);
    setIsRunning(false);
  };

  const retryResearch = () => {
    // Reset state
    setSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending',
      messages: [],
      summary: undefined,
      expandedContent: undefined
    })));
    setFinalResult('');
    setIsComplete(false);
    setError(null);
    setIsRunning(false);
    messageCounterRef.current = 0;
    
    // Start new research
    startResearch();
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'demo':
        return <Play className="h-4 w-4 text-orange-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'demo':
        return 'Demo Mode';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToSearch}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate">Deep Research Agent</h1>
                {getStatusIcon()}
                <span className="text-sm text-muted-foreground">
                  {getStatusText()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                Researching: "{query}"
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDebugMode(!debugMode)}
              className="gap-1"
              title={debugMode ? "Disable Debug Mode" : "Enable Debug Mode"}
            >
              <Bug className="h-4 w-4" />
              {debugMode ? "Debug ON" : "Debug"}
            </Button>
            {debugMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className="gap-1"
                title={showDebugPanel ? "Hide Debug Panel" : "Show Debug Panel"}
              >
                {showDebugPanel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
        
        {/* Demo Mode Alert */}
        {connectionStatus === 'demo' && (
          <div className="mt-4">
            <Alert>
              <Play className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Running in demo mode. For real research, start the backend with: npm start</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryResearch}
                  disabled={isRunning}
                  className="gap-1"
                >
                  <Wifi className="h-3 w-3" />
                  Try Backend
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Error Alert */}
        {error && connectionStatus !== 'demo' && (
          <div className="mt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryResearch}
                    disabled={isRunning}
                  >
                    Retry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runDemoMode}
                    disabled={isRunning}
                  >
                    Demo Mode
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      {/* Main content with resizable panels */}
      <div className="h-[calc(100vh-5rem)]">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left panel - Activity Timeline */}
          <ResizablePanel defaultSize={40} minSize={25} maxSize={70}>
            <div className="h-full bg-card/50">
              <ActivityTimeline steps={steps} />
            </div>
          </ResizablePanel>
          
          {/* Resizable handle */}
          <ResizableHandle className="w-px bg-border hover:bg-border/80 transition-colors" />
          
          {/* Right panel - Results */}
          <ResizablePanel defaultSize={50} maxSize={80} minSize={30}>
            <div className="h-screen overflow-y-auto pb-24">
              <ResultsPanel
                result={finalResult}
                isComplete={isComplete}
                query={query}
                error={error}
                onRetry={() => startResearch()}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Debug Panel */}
      {debugMode && showDebugPanel && (
        <div className="border-t bg-card">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Debug Panel - SSE Events
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDebugEvents([])}
                  disabled={debugEvents.length === 0}
                >
                  Clear Events
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDebugPanel(false)}
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-4 bg-muted/30">
              {debugEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No debug events captured yet. Start a research query to see SSE events.
                </p>
              ) : (
                debugEvents.map((event, _index) => (
                  <div
                    key={event.id}
                    className="border rounded p-3 bg-background space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          event.type === 'node_start' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : event.type === 'node_complete'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : event.type === 'complete'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {event.type}
                        </span>
                        {event.nodeId && (
                          <span className="text-sm font-medium">
                            {event.nodeId}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {event.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View Event Data
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {JSON.stringify(event.data, null, 2)}
                        </pre>
                      </details>
                      
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View Raw SSE Data
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {event.rawData}
                        </pre>
                      </details>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {debugEvents.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                Total Events: {debugEvents.length} | 
                Check browser console for detailed logs when debug mode is active.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}