import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { AlertCircle, CheckCircle, Loader2, Terminal, ExternalLink, X } from 'lucide-react';
import { researchApi } from '../services/researchApi';

interface BackendStatus {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastChecked: Date | null;
  checkBackend: () => Promise<void>;
}

const BackendStatusContext = createContext<BackendStatus | undefined>(undefined);

export function useBackendStatus() {
  const context = useContext(BackendStatusContext);
  if (!context) {
    throw new Error('useBackendStatus must be used within BackendStatusProvider');
  }
  return context;
}

interface BackendStatusProviderProps {
  children: React.ReactNode;
}

export function BackendStatusProvider({ children }: BackendStatusProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Don't start loading immediately
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false);

  const checkBackend = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await researchApi.testConnection();
      setIsConnected(result.success);
      setHasAttemptedConnection(true);
      
      if (!result.success) {
        setError(result.error || 'Backend connection failed');
        // Only show banner after we've actually tried to connect
        setShowBanner(true);
      } else {
        setShowBanner(false);
      }
    } catch (err) {
      setIsConnected(false);
      setHasAttemptedConnection(true);
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      
      // Only show banner for actual connection attempts
      setShowBanner(true);
    } finally {
      setIsLoading(false);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    // Wait a bit before the first check to let backend start
    const initialCheckTimer = setTimeout(() => {
      checkBackend();
    }, 2000);
    
    // Then check periodically
    const interval = setInterval(() => {
      // Only check periodically if we haven't connected yet
      if (!isConnected) {
        checkBackend();
      }
    }, 10000); // Check every 10 seconds instead of 30
    
    return () => {
      clearTimeout(initialCheckTimer);
      clearInterval(interval);
    };
  }, [isConnected]);

  const copyStartCommand = async () => {
    try {
      await navigator.clipboard.writeText('npm start');
      // Show temporary success feedback
      const originalError = error;
      setError('Command copied to clipboard!');
      setTimeout(() => setError(originalError), 2000);
    } catch (err) {
      console.log('Copy failed, but command is: npm start');
    }
  };

  const openBackendDocs = () => {
    window.open('http://localhost:8000/docs', '_blank');
  };

  const value: BackendStatus = {
    isConnected,
    isLoading,
    error,
    lastChecked,
    checkBackend
  };

  return (
    <BackendStatusContext.Provider value={value}>
      {/* Backend Status Banner - Only show if we've attempted connection and failed */}
      {showBanner && hasAttemptedConnection && !isConnected && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
          <div className="container mx-auto px-4 py-3">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Backend server not running - using demo mode</span>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyStartCommand}
                    className="gap-1"
                  >
                    <Terminal className="h-3 w-3" />
                    Copy: npm start
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkBackend}
                    disabled={isLoading}
                    className="gap-1"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    Retry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBanner(false)}
                    className="gap-1"
                  >
                    <X className="h-3 w-3" />
                    Dismiss
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}
      
      {/* Main content with padding if banner is shown */}
      <div className={showBanner && hasAttemptedConnection && !isConnected ? 'pt-16' : ''}>
        {children}
      </div>
      
      {/* Backend Status Indicator (bottom right) - Only show after first check */}
      {hasAttemptedConnection && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
              ) : isConnected ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-orange-500" />
              )}
              <span className="text-sm">
                {isLoading ? 'Checking...' : isConnected ? 'Backend Connected' : 'Demo Mode'}
              </span>
            </div>
            
            {isConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={openBackendDocs}
                className="h-6 w-6 p-0"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}
    </BackendStatusContext.Provider>
  );
}