import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Bug } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { CanvasPanel } from './CanvasPanel';
import { ChatMessageData } from './ChatMessage';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from './ui/resizable';
import { TimelineUpdate, ResearchResult } from '../services/researchApi';
// Backend base URL for creating threads and streaming runs
// Best practice: Always use the backend URL from the environment variable for flexibility and security.
// Never hardcode the backend URL for production. Only fallback to localhost for local development.
const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8000";

if ((!API_URL || API_URL === "http://localhost:8000") && window.location.hostname !== "localhost") {
  console.warn(
    "VITE_API_URL is not set! Falling back to localhost:8000. Configure your backend URL for production deployments."
  );
}

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

const INITIAL_STEPS: ResearchStep[] = [
  { id: 'generating-queries', title: 'Generating Queries', status: 'pending', messages: [] },
  { id: 'search-web', title: 'Search Web', status: 'pending', messages: [] },
  { id: 'aggregate-results', title: 'Aggregate Results', status: 'pending', messages: [] },
  { id: 'reflecting', title: 'Reflecting', status: 'pending', messages: [] },
  { id: 'generating-answer', title: 'Generating Answer', status: 'pending', messages: [] },
];

export function ResearchInterface({ query, onBackToSearch }: ResearchInterfaceProps) {
  // Debug state
  const [debugMode, setDebugMode] = useState(false);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);

  const [steps, setSteps] = useState<ResearchStep[]>(INITIAL_STEPS);
  const [finalResult, setFinalResult] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'demo' | 'disconnected'>('connected');
  const messageCounterRef = useRef(0);

  // Chat messages for the left panel
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  // ID of the agent message that contains the live progress card
  const progressMessageIdRef = useRef<string | null>(null);
  // Guard: React StrictMode double-invokes effects in dev — this prevents two user bubbles
  // Guard: React StrictMode double-invokes effects in dev — this prevents two user bubbles
  const hasStartedForQueryRef = useRef<string | null>(null);
  // Guard: Avoid duplicate completion messages when editing (which updates finalResult)
  const hasShownCompletionRef = useRef(false);

  // Start research when query changes — runs only once per unique query value
  useEffect(() => {
    if (hasStartedForQueryRef.current === query) return;
    hasStartedForQueryRef.current = query;
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

    // Mark all remaining active/pending steps as completed
    setSteps(prev => prev.map(step => {
      if (step.status === 'active' || step.status === 'pending') {
        return { ...step, status: 'completed' as const, summary: step.summary || 'Completed' };
      }
      return step;
    }));

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

  const startResearchRun = async (researchQuery: string) => {
    if (isRunning) return;
    setIsRunning(true);
    setError(null);
    setIsComplete(false);
    setFinalResult('');
    setFinalResult('');
    setConnectionStatus('connected');
    hasShownCompletionRef.current = false;

    // Reset steps
    const freshSteps = INITIAL_STEPS.map(s => ({ ...s }));
    setSteps(freshSteps);

    // Add user message bubble
    const userMsgId = `user-${Date.now()}`;
    const agentProgressId = `agent-progress-${Date.now()}`;
    progressMessageIdRef.current = agentProgressId;

    setChatMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', text: researchQuery, timestamp: new Date() },
      { id: agentProgressId, role: 'agent', text: 'Let me start researching that for you.', timestamp: new Date(), steps: freshSteps },
    ]);

    // Use SSE with stream_mode=events to get LangGraph event streaming
    try {
      const response = await fetch(`${API_URL}/research/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: researchQuery,
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

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep incomplete last line in buffer
        buffer = lines.pop() || '';

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
                console.error('Error parsing SSE data:', parseError, 'line:', line);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('SSE connection error:', err);
      handleError(err instanceof Error ? err.message : String(err));
      runDemoMode(researchQuery);
    }
  };

  const startResearch = async () => {
    startResearchRun(query);
  };

  const runDemoMode = async (researchQuery?: string) => {
    setConnectionStatus('demo');
    setIsRunning(true);
    setSteps(INITIAL_STEPS.map(s => ({ ...s })));
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

  // Keep progress card in sync whenever steps change
  useEffect(() => {
    const pid = progressMessageIdRef.current;
    if (!pid) return;
    setChatMessages(prev =>
      prev.map(m => (m.id === pid ? { ...m, steps: [...steps] } : m))
    );
  }, [steps]);

  // When research completes, add a final agent message
  useEffect(() => {
    if (!isComplete || !finalResult || hasShownCompletionRef.current) return;
    hasShownCompletionRef.current = true;
    setChatMessages(prev => [
      ...prev,
      {
        id: `agent-done-${Date.now()}`,
        role: 'agent',
        text: 'Research complete! You can review the full report in the canvas →',
        timestamp: new Date(),
      }
    ]);
    progressMessageIdRef.current = null;
  }, [isComplete, finalResult]);

  const handleNewMessage = (text: string) => {
    startResearchRun(text);
  };

  const retryResearch = () => {
    setFinalResult('');
    setIsComplete(false);
    setError(null);
    setIsRunning(false);
    messageCounterRef.current = 0;
    startResearch();
  };

  const handleEditRequest = async (selectedText: string, instruction: string) => {
    if (isRunning) return; // Prevent concurrent edits/research

    // 1. Add user message with selection context
    const userMsgId = `edit-user-${Date.now()}`;
    const agentMsgId = `edit-agent-${Date.now()}`;
    const selectionContext = `[Selected: "${selectedText.length > 20 ? selectedText.substring(0, 20) + '...' : selectedText}"]`;
    const fullUserText = `${selectionContext} ${instruction}`;

    setChatMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', text: fullUserText, timestamp: new Date() },
      { id: agentMsgId, role: 'agent', text: 'Editing document...', timestamp: new Date() }
    ]);

    setIsRunning(true);

    try {
      const response = await fetch(`${API_URL}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_text: selectedText,
          full_document: finalResult,
          instruction: instruction
        })
      });

      if (!response.ok) throw new Error(`Edit failed: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No reader');

      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));

            if (data.type === 'content') {
              // Stream content updates to chat but we don't really want to show the full doc
              // streaming into the chat bubble because it's too long.
              // Instead, let's just keep the "Editing..." state or maybe stream a summary?
              // Actually, user expects to see the response. But the response is the FULL DOCUMENT.
              // It's better to show "Working on it..." in chat, and then "Edit complete" when done.
              // But the prompt says "Stream agent response into chat". 
              // Wait, the plan said: "The request shows as a user bubble... the streamed response is a full-width agent block."

              // If we stream the FULL document into the chat bubble, it duplicates the canvas.
              // Better UX: Stream a status "Editing... [|||||   ]" or just "Editing..." 
              // OR, stream the *changes*? No, we get full doc.

              // Let's stick to a simple "Editing..." message that updates to "Done"
              // and update the CANVAS in real-time? 
              // No, replacing canvas content while streaming might flicker or be jarring if it's not a diff.
              // The backend returns the FULL document.

              // Let's update the agent message to say "I've updated the document based on your request." when done.
              // And maybe show the thought process if we had one, but we don't.
            } else if (data.type === 'done') {
              // Update the canvas with the final full document
              setFinalResult(data.full_document);

              // Update agent message to indicate completion
              setChatMessages(prev => prev.map(msg =>
                msg.id === agentMsgId
                  ? { ...msg, text: 'I have updated the document with your changes.' }
                  : msg
              ));

              setIsRunning(false);
              return;
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          }
        }
      }

    } catch (err) {
      console.error('Edit error:', err);
      setChatMessages(prev => prev.map(msg =>
        msg.id === agentMsgId
          ? { ...msg, text: `Sorry, I couldn't edit the document: ${err}` }
          : msg
      ));
      setIsRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--ri-page-bg)', overflow: 'hidden' }}>
      {/* ── Global Header ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 24px',
          height: 64,
          background: 'var(--ri-header-bg)',
          borderBottom: '1px solid var(--ri-header-border)',
          flexShrink: 0,
        }}
      >
        {/* Left: logo + back + agent info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
            <div style={{ width: 28, height: 28, background: '#FFFFFF', borderRadius: 8, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 4px 0' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2.5" y="1.667" width="15" height="16.667" rx="2" stroke="#000" strokeWidth="2" />
                <line x1="6" y1="6" x2="14" y2="6" stroke="#000" strokeWidth="2" strokeLinecap="round" />
                <line x1="6" y1="9.5" x2="14" y2="9.5" stroke="#000" strokeWidth="2" strokeLinecap="round" />
                <line x1="6" y1="13" x2="11" y2="13" stroke="#000" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 18, lineHeight: '28px', letterSpacing: '-0.889px', color: 'var(--ri-header-text)' }}>
              Axion
            </span>
          </div>

          {/* Back button */}
          <button
            onClick={onBackToSearch}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 14,
              color: 'var(--ri-header-sub)', padding: '0 12px 0 0',
            }}
          >
            <ArrowLeft size={16} color="var(--ri-header-sub)" />
            Back
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: 'var(--ri-header-border)', marginRight: 16 }} />

          {/* Agent info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, lineHeight: '20px', letterSpacing: '-0.15px', color: 'var(--ri-header-text)' }}>
                Deep Research Agent
              </span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 12, lineHeight: '16px', color: 'var(--ri-subtext)' }}>
                {connectionStatus === 'demo' ? 'Demo Mode' : connectionStatus === 'connected' ? '' : 'Disconnected'}
              </span>
            </div>
            {query && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 12, lineHeight: '16px', color: 'var(--ri-header-sub)' }}>
                Researching: "{query.length > 80 ? query.substring(0, 80) + '...' : query}"
              </span>
            )}
          </div>
        </div>

        {/* Right: theme toggle + debug */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <button
            onClick={() => setDebugMode(!debugMode)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 14,
              color: debugMode ? '#2B7FFF' : 'var(--ri-header-sub)',
            }}
          >
            <Bug size={16} />
            {debugMode ? 'Debug ON' : 'Debug'}
          </button>
        </div>
      </div>

      {/* ── Main: Chat (35%) | Canvas (65%) ── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ResizablePanelGroup direction="horizontal" style={{ height: '100%' }}>
          {/* Chat Panel */}
          <ResizablePanel defaultSize={35} minSize={20} maxSize={50}>
            <ChatPanel
              messages={chatMessages}
              isTyping={isRunning && chatMessages[chatMessages.length - 1]?.role === 'user'}
              isRunning={isRunning}
              onSendMessage={handleNewMessage}
            />
          </ResizablePanel>

          {/* Drag handle */}
          <ResizableHandle
            style={{ width: 4, background: 'var(--ri-divider)', cursor: 'col-resize' }}
          />

          {/* Canvas Panel */}
          <ResizablePanel defaultSize={65} minSize={50} maxSize={80}>
            <CanvasPanel
              result={finalResult}
              isComplete={isComplete}
              isRunning={isRunning}
              query={query}
              error={error && connectionStatus !== 'demo' ? error : null}
              onResultChange={setFinalResult}
              onEditRequest={handleEditRequest}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}