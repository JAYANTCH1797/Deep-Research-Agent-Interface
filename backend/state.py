from typing import TypedDict, List, Dict, Any, Optional, Annotated
from operator import add
from datetime import datetime
from langchain_core.messages import BaseMessage

class SearchResult(TypedDict):
    """Search result structure"""
    id: str
    query: str
    summary: str
    sources: List[str]
    task_id: str
    relevance_score: float
    timestamp: str

class TimelineUpdate(TypedDict):
    """Timeline update structure"""
    phase: str
    status: str
    message: Optional[str]
    details: Dict[str, Any]

class OverallState(TypedDict):
    """Overall workflow state"""
    messages: List[Any]
    original_question: str
    query_list: List[str]
    rationale: str
    search_results: Annotated[List[SearchResult], add]
    sources_gathered: Annotated[List[str], add]
    is_sufficient: bool
    knowledge_gap: str
    follow_up_queries: List[str]
    research_loop_count: int
    total_queries_run: int
    final_answer: str
    citations: Annotated[List[Dict[str, str]], add]
    research_summary: Dict[str, Any]
    timeline_updates: List[TimelineUpdate]
    current_phase: str
    errors: Annotated[List[str], add]
    warnings: Annotated[List[str], add]

class QueryGenerationState(TypedDict):
    """State subset for query generation node"""
    messages: List[BaseMessage]
    original_question: str

class WebSearchState(TypedDict):
    """State for web search node"""
    query: str
    task_id: str
    original_question: str
    is_followup: bool
    _writer: Optional[Any]

class ReflectionState(TypedDict):
    """State subset for reflection node"""
    search_results: List[SearchResult]
    original_question: str
    research_loop_count: int

class AnswerGenerationState(TypedDict):
    """State subset for answer generation node"""
    search_results: List[SearchResult]
    original_question: str
    sources_gathered: List[str]
    research_loop_count: int