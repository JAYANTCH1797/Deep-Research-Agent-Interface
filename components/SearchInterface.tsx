import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';

interface SearchInterfaceProps {
  onSearch: (query: string) => void;
}

export function SearchInterface({ onSearch }: SearchInterfaceProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header with logo and theme toggle */}
      <div className="flex justify-between items-center p-6">
        <Logo />
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl tracking-tight">Deep Research Agent</h1>
            <p className="text-muted-foreground text-lg">
              Get comprehensive, well-researched answers to your questions
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="What would you like me to research for you?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-14 text-lg pl-6 pr-16 rounded-xl border-2 focus:border-primary"
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-2 top-2 h-10 w-10 rounded-lg"
                disabled={!query.trim()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Try asking: "What are the latest developments in quantum computing?" or
              "Compare renewable energy adoption across different countries"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}