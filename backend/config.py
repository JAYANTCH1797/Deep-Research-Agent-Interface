import os
import json
from typing import Literal, Optional
from dataclasses import dataclass

@dataclass
class ResearchAgentConfig:
    """Configuration for the Research Agent"""
    
    # Mode selection
    demo_mode: bool = os.getenv("DEMO_MODE", "true").lower() == "true"
    
    # AI Models
    query_generator_model: str = "gpt-4o-mini-search-preview-2025-03-11"                # For complex query generation
    web_searcher_model: str = "gpt-4o-search-preview"    # For web search with browsing
    reflection_model: str = "o4-mini"                     # For research reflection
    answer_model: str = "o4-mini"                        # For final answer generation
    
    # Research Parameters
    initial_queries_count: int = 3
    max_research_loops: int = 2
    max_sources_per_query: int = 10
    
    # Performance Settings
    search_timeout_seconds: int = 30
    parallel_search_limit: int = 5
    
    # Quality Thresholds
    min_sources_for_sufficiency: int = 5
    content_relevance_threshold: float = 0.7
    
    # API Configuration
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    
    def validate(self) -> bool:
        """Validate that required API keys are present or demo mode is enabled"""
        # If demo mode is enabled, no API keys are required
        if self.demo_mode:
            return True
            
        # Require an OpenAI API key when not in demo mode
        if self.openai_api_key.strip():
            return True
            
        # No valid API keys found
        return False

# Global config instance
config = ResearchAgentConfig()

# Timeline phase types
TimelinePhase = Literal["generating_queries", "search_web", "reflection", "generating_answer"]
NodeStatus = Literal["pending", "in_progress", "completed", "error"]