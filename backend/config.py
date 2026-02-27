import os
from typing import Literal
from dataclasses import dataclass, field
from typing import List

@dataclass
class ResearchAgentConfig:
    """Configuration for the Research Agent (Google Gemini backend)"""

    # Mode selection — false by default so real research runs without manual override
    demo_mode: bool = os.getenv("DEMO_MODE", "false").lower() == "true"

    # ── Google AI / Gemini models ────────────────────────────────────────────
    # gemini-2.0-flash is fast and capable; use gemini-1.5-pro for higher quality
    query_generator_model: str = "gemini-3-flash-preview"  # Query generation
    web_searcher_model: str = "gemini-3-flash-preview"     # Web search analysis
    reflection_model: str = "gemini-3-flash-preview"       # Reflection / gap analysis
    answer_model: str = "gemini-3-flash-preview"           # Final answer synthesis

    # ── Research Parameters ──────────────────────────────────────────────────
    initial_queries_count: int = 3
    max_research_loops: int = 2
    max_sources_per_query: int = 10

    # ── Performance Settings ─────────────────────────────────────────────────
    search_timeout_seconds: int = 30
    parallel_search_limit: int = 5

    # ── Quality Thresholds ───────────────────────────────────────────────────
    min_sources_for_sufficiency: int = 5
    content_relevance_threshold: float = 0.7

    # ── API Configuration ────────────────────────────────────────────────────
    google_ai_api_key: str = os.getenv("GOOGLE_AI_API_KEY", "")

    # ── CORS origins (comma-separated list via env var) ──────────────────────
    cors_origins: List[str] = field(default_factory=lambda: [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:3000"
        ).split(",")
        if o.strip()
    ])

    def validate(self) -> bool:
        """Validate that required API keys are present or demo mode is enabled"""
        if self.demo_mode:
            return True
        return bool(self.google_ai_api_key.strip())


# Global config instance
config = ResearchAgentConfig()

# Timeline phase types
TimelinePhase = Literal["generating_queries", "search_web", "reflection", "generating_answer"]
NodeStatus = Literal["pending", "in_progress", "completed", "error"]