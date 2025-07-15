import React, { useState } from 'react';
import { SearchInterface } from '../components/SearchInterface';
import { ResearchInterface } from '../components/ResearchInterface';
import { ThemeProvider } from '../components/ThemeProvider';
import { BackendStatusProvider } from '../components/BackendStatusProvider';

export default function App() {
  const [currentView, setCurrentView] = useState<'search' | 'research'>('search');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentView('research');
  };

  const handleBackToSearch = () => {
    setCurrentView('search');
    setSearchQuery('');
  };

  return (
    <ThemeProvider defaultTheme="system">
      <BackendStatusProvider>
        <div className="min-h-screen bg-background">
          {currentView === 'search' ? (
            <SearchInterface onSearch={handleSearch} />
          ) : (
            <ResearchInterface 
              query={searchQuery} 
              onBackToSearch={handleBackToSearch}
            />
          )}
        </div>
      </BackendStatusProvider>
    </ThemeProvider>
  );
}