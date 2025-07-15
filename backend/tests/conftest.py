import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
import os

from streaming import StreamingWriter

# Set environment variables for testing
os.environ["DEMO_MODE"] = "true"  # Use demo mode for tests by default
os.environ["GEMINI_API_KEY"] = "fake-api-key-for-testing"

# Shared fixtures for all tests
@pytest.fixture
def mock_writer():
    """Create a mock StreamingWriter for testing"""
    # Create a real StreamingWriter instance with a mock callback
    # This ensures all attributes and methods work as expected
    callback = AsyncMock()
    writer = StreamingWriter(callback=callback)
    
    # Mock the send_update method to avoid actual async calls
    writer.send_update = AsyncMock()
    
    return writer

@pytest.fixture
def mock_callback():
    """Create a mock streaming callback"""
    return MagicMock()

@pytest.fixture
def basic_state():
    """Create a basic state for testing"""
    return {
        "original_question": "What is the impact of climate change on coral reefs?",
        "messages": [],
        "query_list": [],
        "search_results": [],
        "sources_gathered": [],
        "task_id": "test_task_1"
    }

@pytest.fixture
def mock_search_results():
    """Create mock search results for testing"""
    return [
        {
            "query": "climate change effects on coral bleaching",
            "summary": "Summary 1",
            "sources": ["https://example.com/1"],
            "task_id": "test_1",
            "relevance_score": 0.9,
            "timestamp": "2025-06-27T10:00:00"
        },
        {
            "query": "rising ocean temperatures impact on coral reefs",
            "summary": "Summary 2",
            "sources": ["https://example.com/2"],
            "task_id": "test_2",
            "relevance_score": 0.8,
            "timestamp": "2025-06-27T10:01:00"
        }
    ]

@pytest.fixture
def mock_gemini_response():
    """Create a mock Gemini API response"""
    response = MagicMock()
    response.text = "Test response from Gemini API"
    response.candidates = [MagicMock()]
    response.candidates[0].grounding_metadata.prompt_feedback.blocked = False
    response.candidates[0].grounding_metadata.grounding_chunks = [
        {"url": "https://example.com/test"}
    ]
    return response
