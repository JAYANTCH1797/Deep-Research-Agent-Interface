export interface TimelineUpdate {
  phase: 'generating_queries' | 'search_web' | 'reflection' | 'generating_answer';
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress_message?: string;
  completion_message?: string;
  details?: Record<string, any>;
  task_history?: string[];
  timestamp: string;
}

export interface ResearchResult {
  success: boolean;
  final_answer: string;
  citations: string[];
  research_summary: {
    total_queries?: number;
    total_sources?: number;
    research_loops?: number;
    completion_time?: string;
  };
  error?: string;
  errors?: string[];
  warnings?: string[];
}

export interface WebSocketMessage {
  type: 'timeline_update' | 'research_complete' | 'research_started' | 'error';
  data?: TimelineUpdate | ResearchResult;
  question?: string;
  message?: string;
}

class ResearchApiClient {
  private baseUrl: string;
  private wsUrl: string;

  constructor(baseUrl?: string) {
    // Use environment variable in production, fallback to localhost for development
    let apiUrl = (globalThis as any).__VITE_API_URL__ || 'http://localhost:8000';
    
    // Handle relative URLs in production
    if (baseUrl) {
      apiUrl = baseUrl;
    } else if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // In production, try to construct the backend URL from the current location
      // This assumes the backend is on the same domain but different subdomain
      const currentHost = window.location.hostname;
      if (currentHost.includes('research-agent-frontend')) {
        apiUrl = `https://${currentHost.replace('research-agent-frontend', 'research-agent-backend')}`;
      } else {
        apiUrl = apiUrl || `${window.location.protocol}//${window.location.hostname}:8000`;
      }
    }
    
    this.baseUrl = apiUrl;
    this.wsUrl = this.baseUrl.replace('http', 'ws');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
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
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Health check timed out');
        } else if (error.message.includes('fetch')) {
          console.log('Health check network error - backend likely not running');
        } else {
          console.log('Health check failed:', error.message);
        }
      }
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
      let errorMessage = 'Unable to connect to backend server';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Backend server not found. Make sure to run: npm start';
        } else {
          errorMessage = error.message;
        }
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  async runResearch(question: string): Promise<ResearchResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      
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
        final_answer: 'I apologize, but I encountered an error while conducting research. Please ensure the backend server is running by executing "npm start" in your terminal.',
        citations: [],
        research_summary: {},
        error: errorMessage
      };
    }
  }

  createWebSocketConnection(
    question: string,
    onUpdate: (update: TimelineUpdate) => void,
    onComplete: (result: ResearchResult) => void,
    onError: (error: string) => void
  ): WebSocket {
    const ws = new WebSocket(`${this.wsUrl}/research/ws`);

    // Set a connection timeout
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.close();
        onError('Connection timeout. Please check if the backend server is running.');
      }
    }, 10000);

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      console.log('WebSocket connected');
      ws.send(JSON.stringify({ question }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'research_started':
            console.log('Research started for:', message.question);
            break;

          case 'timeline_update':
            if (message.data) {
              onUpdate(message.data as TimelineUpdate);
            }
            break;

          case 'research_complete':
            if (message.data) {
              onComplete(message.data as ResearchResult);
            }
            ws.close();
            break;

          case 'error':
            onError(message.message || 'Unknown error');
            ws.close();
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        onError('Error parsing server response');
      }
    };

    ws.onerror = (error) => {
      clearTimeout(connectionTimeout);
      console.error('WebSocket error:', error);
      onError('Connection error. Make sure the backend server is running (npm start).');
    };

    ws.onclose = (event) => {
      clearTimeout(connectionTimeout);
      if (event.code !== 1000) {
        console.error('WebSocket closed unexpectedly:', event.code, event.reason);
        if (event.code === 1006) {
          onError('Cannot connect to backend server. Please run: npm start');
        } else {
          onError('Connection closed unexpectedly');
        }
      }
    };

    return ws;
  }

  async *streamResearch(question: string): AsyncIterable<TimelineUpdate | ResearchResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      const response = await fetch(`${this.baseUrl}/research/stream`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, stream: true }),
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
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'final_result') {
                  yield data.data as ResearchResult;
                } else if (data.type === 'complete') {
                  return;
                } else {
                  yield data as TimelineUpdate;
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
      
      throw new Error(errorMessage);
    }
  }
}

// Export singleton instance
export const researchApi = new ResearchApiClient();

// Export types and client class
export { ResearchApiClient };