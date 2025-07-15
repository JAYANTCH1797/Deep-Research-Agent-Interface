import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from typing import Dict, Any, List

from langgraph.graph import StateGraph, START, END
from langgraph.constants import Send

from workflow import ResearchWorkflow, run_research_agent
from state import OverallState, WebSearchState
from streaming import StreamingWriter
from config import config

# Test fixtures
@pytest.fixture
def research_workflow():
    """Create a research workflow instance"""
    return ResearchWorkflow()

@pytest.fixture
def mock_writer():
    """Create a mock StreamingWriter for testing"""
    writer = AsyncMock(spec=StreamingWriter)
    writer.send_progress_update = AsyncMock()
    writer.send_completion_update = AsyncMock()
    writer.send_error_update = AsyncMock()
    return writer

@pytest.fixture
def basic_state():
    """Create a basic state for testing"""
    return {
        "original_question": "What is quantum computing?",
        "messages": [],
        "query_list": [
            "quantum computing fundamentals",
            "quantum bits vs classical bits",
            "quantum computing applications"
        ],
        "rationale": "These queries cover the basics of quantum computing.",
        "search_results": [],
        "sources_gathered": [],
        "research_loop_count": 0
    }

# Tests for workflow construction
def test_workflow_initialization(research_workflow):
    """Test that the workflow is properly initialized"""
    assert research_workflow.graph is not None
    assert research_workflow.app is not None

def test_workflow_graph_structure(research_workflow):
    """Test that the workflow graph has the correct structure"""
    graph = research_workflow.graph
    
    # Check that all expected nodes are present
    expected_nodes = {
        "generate_queries", 
        "web_search", 
        "aggregate_results", 
        "reflection", 
        "answer_generation"
    }
    
    # Get nodes from the graph
    actual_nodes = set(research_workflow.graph.nodes.keys())
    
    # Check all expected nodes are present (ignoring START and END which are special)
    for node in expected_nodes:
        assert node in actual_nodes

# Tests for routing logic
@pytest.mark.asyncio
async def test_route_to_parallel_searches(research_workflow, basic_state):
    """Test the routing to parallel web searches"""
    # Test initial search routing
    sends = research_workflow._route_to_parallel_searches(basic_state)
    
    # Assertions
    assert len(sends) == 3  # Should match the number of queries
    for i, send in enumerate(sends):
        assert send.target == "web_search"
        assert send.state["query"] == basic_state["query_list"][i]
        assert "task_id" in send.state
        assert send.state["task_id"].startswith("initial_")
        assert send.state["original_question"] == basic_state["original_question"]
        assert send.state["is_followup"] is False

@pytest.mark.asyncio
async def test_route_to_parallel_searches_followup(research_workflow, basic_state):
    """Test the routing to parallel web searches with follow-up queries"""
    # Modify state to include follow-up queries
    state = basic_state.copy()
    state["follow_up_queries"] = [
        "quantum error correction",
        "quantum supremacy examples"
    ]
    state["research_loop_count"] = 1
    
    # Test follow-up search routing
    sends = research_workflow._route_to_parallel_searches(state)
    
    # Assertions
    assert len(sends) == 2  # Should match the number of follow-up queries
    for i, send in enumerate(sends):
        assert send.target == "web_search"
        assert send.state["query"] == state["follow_up_queries"][i]
        assert send.state["task_id"].startswith("followup_1_")
        assert send.state["is_followup"] is True

def test_decide_research_complete_sufficient(research_workflow):
    """Test the decision to complete research when information is sufficient"""
    state = {
        "is_sufficient": True,
        "research_loop_count": 1,
        "follow_up_queries": ["query1", "query2"]
    }
    
    result = research_workflow._decide_research_complete(state)
    assert result == "answer_generation"

def test_decide_research_complete_max_loops(research_workflow):
    """Test the decision to complete research when max loops reached"""
    state = {
        "is_sufficient": False,
        "research_loop_count": config.max_research_loops,
        "follow_up_queries": ["query1", "query2"]
    }
    
    result = research_workflow._decide_research_complete(state)
    assert result == "answer_generation"

def test_decide_research_complete_no_followups(research_workflow):
    """Test the decision to complete research when no follow-up queries"""
    state = {
        "is_sufficient": False,
        "research_loop_count": 1,
        "follow_up_queries": []
    }
    
    result = research_workflow._decide_research_complete(state)
    assert result == "answer_generation"

def test_decide_research_continue(research_workflow):
    """Test the decision to continue research"""
    state = {
        "is_sufficient": False,
        "research_loop_count": 1,
        "follow_up_queries": ["query1", "query2"]
    }
    
    result = research_workflow._decide_research_complete(state)
    assert result == "generate_queries"  # This will route to more searches

# Tests for node wrappers
@pytest.mark.asyncio
async def test_generate_queries_wrapper(research_workflow, basic_state, mock_writer):
    """Test the generate queries wrapper"""
    state = basic_state.copy()
    state["_writer"] = mock_writer
    
    with patch("workflow.generate_queries_node") as mock_node:
        mock_node.return_value = {
            "query_list": ["q1", "q2", "q3"],
            "rationale": "Test rationale",
            "current_phase": "search_web"
        }
        
        # Execute wrapper
        result = await research_workflow._generate_queries_wrapper(state)
        
        # Verify node was called with correct arguments
        mock_node.assert_called_once_with(state, mock_writer)
        
        # Verify result is passed through
        assert result["query_list"] == ["q1", "q2", "q3"]
        assert result["rationale"] == "Test rationale"
        assert result["current_phase"] == "search_web"

# Tests for demo mode
@pytest.mark.asyncio
async def test_run_demo_research(research_workflow, mock_writer):
    """Test the demo research flow"""
    result = await research_workflow._run_demo_research("What is quantum computing?", mock_writer.send_update)
    
    # Verify demo output structure
    assert "success" in result
    assert result["success"] is True
    assert "final_answer" in result
    assert len(result["final_answer"]) > 0
    assert "citations" in result
    assert len(result["citations"]) > 0
    
    # Verify streaming updates were sent
    assert mock_writer.send_update.called

# Integration test for run_research_agent
@pytest.mark.asyncio
async def test_run_research_agent_demo_mode():
    """Test the main research agent entry point in demo mode"""
    # Force demo mode
    with patch("config.config.demo_mode", True):
        result = await run_research_agent("What is quantum computing?")
        
        # Verify result structure
        assert "success" in result
        assert result["success"] is True
        assert "final_answer" in result
        assert len(result["final_answer"]) > 0
        assert "citations" in result
        assert "research_summary" in result

@pytest.mark.asyncio
async def test_run_research_agent_error_handling():
    """Test error handling in the research agent entry point"""
    # Force validation to fail
    with patch("config.config.validate", return_value=False):
        result = await run_research_agent("What is quantum computing?")
        
        # Verify error structure
        assert "success" in result
        assert result["success"] is False
        assert "error" in result
        assert "Missing required API keys" in result["error"]
