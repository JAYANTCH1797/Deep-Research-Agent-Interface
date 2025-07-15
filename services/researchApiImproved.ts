export interface ResearchState {
  messages: any[];
  original_question: string;
  query_list: string[];
  search_results: any[];
  final_answer: string;
  citations: string[];
  research_summary: Record<string, any>;
  current_phase: string;
  errors: string[];
}

export interface StreamEvent {
  type: 'state_update' | 'node_start' | 'node_complete' | 'node_stream' | 'complete' | 'error';
  node?: string;
  data?: any;
  error?: string;
  timestamp?: string;
}

export interface ResearchResult {
  success: boolean;
  final_answer: string;
  citations: string[];
  research_summary: Record<string, any>;
  error?: string;
}

class ImprovedResearchApiClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log('Health check HTTP error:', response.status, response.statusText);
        return false;
      }
      
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.log('Health check failed:', error);
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        return { 
          success: false, 
          error: 'Backend server is not running. Start it with: npm start' 
        };
      }
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  async runResearch(question: string): Promise<ResearchResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
      
      const response = await fetch(`${this.baseUrl}/research`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      let errorMessage = 'Research failed';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Research timed out. The query may be too complex.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Cannot connect to backend server. Please start the backend first.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        final_answer: 'I apologize, but I encountered an error while conducting research.',
        citations: [],
        research_summary: {},
        error: errorMessage
      };
    }
  }

  async *streamResearch(
    question: string, 
    streamMode: 'values' | 'events' = 'values'
  ): AsyncIterable<StreamEvent> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      const response = await fetch(`${this.baseUrl}/research/stream`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, stream_mode: streamMode }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                yield event as StreamEvent;
                
                if (event.type === 'complete') {
                  return;
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      let errorMessage = 'Failed to stream research';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Research stream timed out';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Cannot connect to backend server';
        } else {
          errorMessage = error.message;
        }
      }
      
      yield {
        type: 'error',
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Utility method to convert stream events to timeline updates
  streamEventToTimelineUpdate(event: StreamEvent): any {
    switch (event.type) {
      case 'node_start':
        return {
          phase: this.mapNodeToPhase(event.node || ''),
          status: 'in_progress',
          progress_message: event.data?.message || `Starting ${event.node}`,
          timestamp: new Date().toISOString()
        };
      
      case 'node_complete':
        return {
          phase: this.mapNodeToPhase(event.node || ''),
          status: 'completed',
          completion_message: `Completed ${event.node}`,
          details: event.data,
          timestamp: new Date().toISOString()
        };
      
      case 'state_update':
        return {
          phase: event.data?.current_phase || 'unknown',
          status: 'in_progress',
          progress_message: `Updated state`,
          details: event.data,
          timestamp: new Date().toISOString()
        };
      
      default:
        return null;
    }
  }

  private mapNodeToPhase(node: string): string {
    const nodeMap: Record<string, string> = {
      'generate_queries': 'generating_queries',
      'web_search': 'search_web',
      'aggregate_results': 'search_web',
      'reflection': 'reflection',
      'answer_generation': 'generating_answer'
    };
    return nodeMap[node] || node;
  }
}

// Export singleton instance
export const improvedResearchApi = new ImprovedResearchApiClient();

// Export types and client class
export { ImprovedResearchApiClient }; 