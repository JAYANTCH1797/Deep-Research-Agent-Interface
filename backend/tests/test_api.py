import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
import json

from api import app
from streaming import StreamingWriter

# Create test client
client = TestClient(app)

# Test fixtures
@pytest.fixture
def mock_research_result():
    """Create a mock research result"""
    return {
        "success": True,
        "final_answer": "Here is the answer to your question.",
        "citations": [
            {"title": "Source 1", "url": "https://example.com/1"},
            {"title": "Source 2", "url": "https://example.com/2"}
        ],
        "research_summary": {
            "queries_generated": 3,
            "sources_found": 5
        },
        "errors": [],
        "warnings": []
    }

# Test API endpoints
def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    # Verify expected fields in health response
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert data.get("version") == "2.0.0"
    assert data.get("streaming") == "native_langgraph"
    assert data.get("websocket_enabled") is True

def test_research_endpoint_success(mock_research_result):
    """Test the research endpoint with successful results via stream_research"""
    # Fake async generator for stream_research
    async def fake_stream(question):
        yield {"type": "complete", "data": mock_research_result}

    # Patch the workflow's stream_research method
    with patch("api.research_workflow.stream_research", new=fake_stream):
        # Make API call (no stream flag needed)
        response = client.post(
            "/research",
            json={"question": "What is quantum computing?"}
        )
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["final_answer"] == mock_research_result["final_answer"]
        assert data["citations"] == mock_research_result["citations"]
        assert data["research_summary"] == mock_research_result["research_summary"]

def test_research_endpoint_empty_question():
    """Test the research endpoint with an empty question"""
    response = client.post(
        "/research",
        json={"question": ""}
    )
    # Empty question is handled and returns a 200 with error payload
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "Question cannot be empty" in data.get("error", "")

def test_research_endpoint_error():
    """Test the research endpoint error handling via stream_research"""
    # Fake stream_research to raise exception
    async def fake_stream(question):
        # Async generator that immediately errors
        raise Exception("Research error")
        if False:
            yield None

    # Patch the workflow's stream_research method
    with patch("api.research_workflow.stream_research", new=fake_stream):
        # Make API call
        response = client.post(
            "/research",
            json={"question": "What is quantum computing?"}
        )
        # Error is caught and returned
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "Research error" in data.get("error", "")

@pytest.mark.asyncio
async def test_websocket_connection():
    """Test that the WebSocket route is registered"""
    # The WebSocket endpoint should be available at /research/ws
    routes = [route.path for route in app.routes]
    assert "/research/ws" in routes

def test_research_stream_events(monkeypatch):
    """Test the SSE streaming endpoint emits node_start events when stream_mode=events"""
    # Fake events generator
    async def fake_events(question):
        yield {"type": "node_start", "node": "generate_queries", "data": {}, "timestamp": 0}
    # Patch the workflow's event stream method
    monkeypatch.setattr("api.research_workflow.stream_research_events", fake_events)

    # Invoke the streaming endpoint in event mode using client.stream
    with client.stream("POST", "/research/stream", json={"question": "Test question", "stream_mode": "events"}) as response:
        assert response.status_code == 200

        # Collect non-empty lines
        lines = [line for line in response.iter_lines() if line]
        # Find the first data line (skip 'event:' lines)
        data_line = next(l for l in lines if l.startswith("data: "))
        # Parse payload (strip the 'data: ' prefix)
        payload = json.loads(data_line.replace("data: ", ""))
        assert payload["type"] == "node_start"
