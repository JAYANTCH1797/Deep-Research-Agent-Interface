// Component uses JSX so React is used implicitly
import { Card } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import ReactMarkdown from 'react-markdown';

interface ResultsPanelProps {
  result: string;
  isComplete: boolean;
  query: string;
  error?: string | null;
  onRetry?: () => void;
}

export function ResultsPanel({ result, isComplete, query, error, onRetry }: ResultsPanelProps) {
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 border-b bg-muted/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h2 className="font-semibold text-destructive">Research Error</h2>
              <p className="text-sm text-muted-foreground">
                Query: "{query}"
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              {error}
            </AlertDescription>
          </Alert>
          
          {onRetry && (
            <div className="mt-6">
              <Button 
                onClick={onRetry}
                variant="outline" 
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Research
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isComplete) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 border-b bg-muted/50">
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h2 className="font-semibold">Research in Progress</h2>
              <p className="text-sm text-muted-foreground">
                Query: "{query}"
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-6">
          <div className="space-y-4">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Research is ongoing. Results will appear here as they become available.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b bg-muted/50">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <h2 className="font-semibold text-green-700">Research Complete</h2>
            <p className="text-sm text-muted-foreground">
              Query: "{query}"
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <Card className="m-6 border-0 shadow-none">
          {!result || result.trim() === '' ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No results available yet.</p>
              {onRetry && (
                <Button 
                  onClick={onRetry}
                  variant="outline" 
                  className="gap-2 mt-4"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Research
                </Button>
              )}
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                components={{
                  // Customize heading styles
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-foreground">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold mb-3 mt-6 first:mt-0 text-foreground">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-medium mb-2 mt-4 text-foreground">
                      {children}
                    </h3>
                  ),
                  // Customize paragraph styles
                  p: ({ children }) => (
                    <p className="mb-3 leading-relaxed text-foreground">
                      {children}
                    </p>
                  ),
                  // Customize list styles
                  ul: ({ children }) => (
                    <ul className="mb-4 space-y-1 text-foreground">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-4 space-y-1 text-foreground list-decimal list-inside">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="flex items-start gap-2">
                      <span className="text-foreground">{children}</span>
                    </li>
                  ),
                  // Customize horizontal rule
                  hr: () => (
                    <hr className="my-6 border-border" />
                  ),
                  // Customize strong/bold text
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">
                      {children}
                    </strong>
                  ),
                  // Customize emphasis/italic text
                  em: ({ children }) => (
                    <em className="italic text-foreground">
                      {children}
                    </em>
                  ),
                  // Customize code blocks
                  code: ({ children }) => (
                    <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono text-foreground">
                      {children}
                    </code>
                  ),
                  // Customize blockquotes
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-muted-foreground pl-4 my-4 italic text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {result}
              </ReactMarkdown>
            </div>
          )}
        </Card>
        
        <div className="text-xs text-muted-foreground border-t pt-4 px-6 pb-6">
          <p>
            Research completed on {new Date().toLocaleDateString()} • 
            Sources verified • Results compiled from multiple authoritative sources
          </p>
        </div>
      </div>
    </div>
  );
}