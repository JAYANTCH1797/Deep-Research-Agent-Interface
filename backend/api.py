import os
import sys
import json
import asyncio
import time
from datetime import datetime
import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, AsyncIterator
from uuid import uuid4

# Add parent directory to path to ensure imports work correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))) 

from backend.workflow import ImprovedResearchWorkflow
from backend.config import config

app = FastAPI(title="Deep Research Agent API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)

# Initialize the research workflow
research_workflow = ImprovedResearchWorkflow()

# API Models
class ResearchRequest(BaseModel):
    question: str
    stream_mode: str = "values"  # "values" or "events"

class ResearchResult(BaseModel):
    success: bool
    final_answer: str
    citations: list
    research_summary: dict
    error: Optional[str] = None

@app.get("/")
@app.head("/")
async def root():
    return {"message": "Deep Research Agent API v2.0", "status": "healthy"}

@app.get("/health")
@app.head("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "streaming": "native_langgraph",
        "websocket_enabled": True
    }

@app.get("/config")
@app.head("/config")
async def get_config():
    """Get current configuration status"""
    return {
        "demo_mode": config.demo_mode,
        "openai_api_key_configured": bool(config.openai_api_key.strip()),
        "config_valid": config.validate(),
        "models": {
            "query_generator": config.query_generator_model,
            "web_searcher": config.web_searcher_model,
            "reflection": config.reflection_model,
            "answer": config.answer_model
        },
        "research_parameters": {
            "initial_queries_count": config.initial_queries_count,
            "max_research_loops": config.max_research_loops,
            "max_sources_per_query": config.max_sources_per_query,
            "search_timeout_seconds": config.search_timeout_seconds
        }
    }

@app.post("/research/stream")
async def research_stream_endpoint(request: ResearchRequest):
    """
    Stream research using LangGraph's native streaming capabilities via Server-Sent Events
    """
    try:
        if not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        async def generate_stream():
            # SSE event counter for Last-Event-ID support
            event_counter = 0
            try:
                print(f"[DEBUG] Starting research stream for: {request.question}")
                
                # Track node states for timeline
                node_states = {
                    "generate_queries": {"status": "pending", "phase": "generating_queries"},
                    "web_search": {"status": "pending", "phase": "search_web"},
                    "aggregate_results": {"status": "pending", "phase": "search_web"},
                    "reflection": {"status": "pending", "phase": "reflection"},
                    "answer_generation": {"status": "pending", "phase": "generating_answer"}
                }
                
                if request.stream_mode == "events":
                    # Only emit node_start and node_complete events to avoid serialization issues
                    node_start_times: Dict[str, float] = {}
                    final_answer = ""
                    citations = []
                    
                    async for event in research_workflow.stream_research_events(request.question):
                        event_type = event.get("type")  # "node_start" or "node_complete"
                        node_name = event.get("node", "")
                        # Only emit for top-level nodes we care about
                        if node_name not in node_states:
                            continue
                        ts = event.get("timestamp", time.time())
                        if event_type == "node_start":
                            node_start_times[node_name] = ts
                            payload = {
                                "type": "node_start",
                                "nodeId": node_name,
                                "nodeType": node_name,
                                "input": event.get("data", {}),
                                "timestamp": ts
                            }
                        elif event_type == "node_complete":
                            start_ts = node_start_times.get(node_name, ts)
                            duration_ms = int((ts - start_ts) * 1000)
                            raw_out = event.get("data", {})
                            output_str = json.dumps(raw_out, default=str)
                            
                            # Capture final answer from answer_generation node
                            if node_name == "answer_generation":
                                output_data = json.loads(output_str)
                                if "output" in output_data:
                                    final_answer = output_data["output"].get("final_answer", "")
                                    citations = output_data["output"].get("citations", [])
                            
                            payload = {
                                "type": "node_complete",
                                "nodeId": node_name,
                                "output": json.loads(output_str),
                                "status": "success",
                                "duration": duration_ms,
                                "timestamp": ts
                            }
                        else:
                            continue
                        # Build SSE frame with id, event, data
                        frame = (
                            f"id: {event_counter}\n"
                            f"event: {payload['type']}\n"
                            f"data: {json.dumps(payload)}\n\n"
                        )
                        event_counter += 1
                        yield frame.encode("utf-8")
                    
                    # After all events are streamed, emit a complete event
                    # The final_answer and citations were captured from answer_generation node
                    
                    # Emit complete event
                    complete_payload = {
                        "type": "complete",
                        "final_result": {
                            "final_answer": final_answer,
                            "citations": citations,
                            "research_summary": {
                                "completion_time": datetime.now().isoformat()
                            }
                        },
                        "timestamp": time.time()
                    }
                    
                    complete_frame = (
                        f"id: {event_counter}\n"
                        f"event: complete\n"
                        f"data: {json.dumps(complete_payload)}\n\n"
                    )
                    event_counter += 1
                    yield complete_frame.encode("utf-8")
                    
                else:
                    # State-based streaming for state updates
                    async for update in research_workflow.stream_research(request.question):
                        # Extract current phase from state
                        if update.get("type") == "state_update":
                            state_data = update.get("data", {})
                            current_phase = state_data.get("current_phase", "unknown")
                            
                            # Convert to timeline format
                            timeline_update = {
                                "type": "timeline_update",
                                "data": {
                                    "phase": current_phase,
                                    "status": "in_progress",
                                    "progress_message": f"Processing {current_phase}...",
                                    "details": {
                                        "queries_count": len(state_data.get("query_list", [])),
                                        "search_results_count": len(state_data.get("search_results", [])),
                                        "research_loop": state_data.get("research_loop_count", 0)
                                    },
                                    "timestamp": datetime.now().isoformat()
                                }
                            }
                            yield (f"data: {json.dumps(timeline_update)}\n\n").encode("utf-8")
                        
                        elif update.get("type") == "complete":
                            # Send final result
                            final_data = update.get("data", {})
                            final_result = {
                                "type": "research_complete",
                                "data": {
                                    "success": True,
                                    "final_answer": final_data.get("final_answer", ""),
                                    "citations": final_data.get("citations", []),
                                    "research_summary": final_data.get("research_summary", {}),
                                    "errors": final_data.get("errors", [])
                                }
                            }
                            # Final completion SSE event with id
                            complete_frame = (
                                f"id: {event_counter}\n"
                                f"event: complete\n"
                                f"data: {json.dumps(final_result)}\n\n"
                            )
                            yield complete_frame.encode("utf-8")
                        
                        # Forward the update
                        yield (f"data: {json.dumps(update)}\n\n").encode("utf-8")
                
            except Exception as e:
                print(f"[DEBUG] Stream error: {e}")
                error_event = {
                    "type": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                yield (f"data: {json.dumps(error_event)}\n\n").encode("utf-8")
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/research/ws")
async def research_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time research streaming using LangGraph native streaming
    """
    await websocket.accept()
    print(f"[DEBUG] WebSocket connection accepted")
    
    try:
        while True:
            # Receive question from client
            data = await websocket.receive_text()
            request_data = json.loads(data)
            question = request_data.get("question", "")
            stream_mode = request_data.get("stream_mode", "values")
            
            if not question.strip():
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "error": "Question cannot be empty"
                }))
                continue
            
            print(f"[DEBUG] Received question via WebSocket: {question}")
            
            # Send research started signal
            await websocket.send_text(json.dumps({
                "type": "research_started",
                "question": question,
                "timestamp": datetime.now().isoformat()
            }))
            
            try:
                # Track node states for real-time updates
                node_states = {
                    "generate_queries": {"status": "pending", "phase": "generating_queries"},
                    "web_search": {"status": "pending", "phase": "search_web"}, 
                    "aggregate_results": {"status": "pending", "phase": "search_web"},
                    "reflection": {"status": "pending", "phase": "reflection"},
                    "answer_generation": {"status": "pending", "phase": "generating_answer"}
                }
                
                if stream_mode == "events":
                    # Event-based streaming
                    async for event in research_workflow.stream_research_events(question):
                        # Update node states and send timeline updates
                        if event.get("type") == "node_start":
                            node_name = event.get("node", "")
                            if node_name in node_states:
                                node_states[node_name]["status"] = "in_progress"
                                timeline_update = {
                                    "type": event.get("type", "timeline_update"),
                                    "data": {
                                        "phase": node_states[node_name]["phase"],
                                        "status": "in_progress",
                                        "progress_message": f"Running {node_name}...",
                                        "timestamp": datetime.now().isoformat()
                                    }
                                }
                                await websocket.send_text(json.dumps(timeline_update))
                        
                        elif event.get("type") == "node_complete":
                            node_name = event.get("node", "")
                            if node_name in node_states:
                                node_states[node_name]["status"] = "completed"
                                timeline_update = {
                                    "type": event.get("type", "timeline_update"),
                                    "data": {
                                        "phase": node_states[node_name]["phase"],
                                        "status": "completed",
                                        "completion_message": f"Completed {node_name}",
                                        "timestamp": datetime.now().isoformat()
                                    }
                                }
                                await websocket.send_text(json.dumps(timeline_update))
                        
                        # Send the event
                        await websocket.send_text(json.dumps(event))
                else:
                    # State-based streaming
                    async for update in research_workflow.stream_research(question):
                        if update.get("type") == "state_update":
                            state_data = update.get("data", {})
                            current_phase = state_data.get("current_phase", "unknown")
                            
                            # Send timeline update
                            timeline_update = {
                                "type": "timeline_update",
                                "data": {
                                    "phase": current_phase,
                                    "status": "in_progress",
                                    "progress_message": f"Processing {current_phase}...",
                                    "details": {
                                        "queries_count": len(state_data.get("query_list", [])),
                                        "search_results_count": len(state_data.get("search_results", [])),
                                        "research_loop": state_data.get("research_loop_count", 0)
                                    },
                                    "timestamp": datetime.now().isoformat()
                                }
                            }
                            await websocket.send_text(json.dumps(timeline_update))
                        
                        elif update.get("type") == "complete":
                            # Send final result
                            final_data = update.get("data", {})
                            final_result = {
                                "type": "research_complete",
                                "data": {
                                    "success": True,
                                    "final_answer": final_data.get("final_answer", ""),
                                    "citations": final_data.get("citations", []),
                                    "research_summary": final_data.get("research_summary", {}),
                                    "errors": final_data.get("errors", [])
                                }
                            }
                            await websocket.send_text(json.dumps(final_result))
                            break
                        
                        # Send the update
                        await websocket.send_text(json.dumps(update))
                
            except Exception as e:
                print(f"[DEBUG] Research error: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }))
                
    except WebSocketDisconnect:
        print(f"[DEBUG] WebSocket disconnected")
    except Exception as e:
        print(f"[DEBUG] WebSocket error: {e}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error", 
                "error": str(e)
            }))
        except:
            pass

@app.post("/research")
async def research_endpoint(request: ResearchRequest):
    """
    Run research without streaming (collect all results)
    """
    try:
        if not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        print(f"[DEBUG] Running non-streaming research for: {request.question}")
        
        # Collect all streaming results
        final_result = None
        async for update in research_workflow.stream_research(request.question):
            if update.get("type") == "complete":
                final_result = update.get("data", {})
        
        if final_result is None:
            raise HTTPException(status_code=500, detail="No final result received")
        
        return {
            "success": True,
            "final_answer": final_result.get("final_answer", ""),
            "citations": final_result.get("citations", []),
            "research_summary": final_result.get("research_summary", {}),
            "errors": final_result.get("errors", [])
        }
        
    except Exception as e:
        return {
            "success": False,
            "final_answer": "Error occurred during research process.",
            "citations": [],
            "research_summary": {"error": str(e)},
            "error": str(e)
        }

@app.post("/threads")
async def create_thread():
    """
    Create a new thread for LangGraph SDK useStream hook.
    """
    thread_id = str(uuid4())
    return {"thread_id": thread_id}

@app.post("/threads/{thread_id}/runs")
async def run_thread(thread_id: str, payload: Dict[str, Any]):
    """
    Create and stream a run on a thread to support LangGraph SDK useStream.
    """
    input_data = payload.get("input", {})
    messages = input_data.get("messages", [])
    if not messages or not isinstance(messages, list):
        raise HTTPException(status_code=400, detail="Missing messages in request")
    first = messages[0]
    question = first.get("content")
    if not question:
        raise HTTPException(status_code=400, detail="First message missing content")
    # Delegate to the existing streaming research endpoint
    return await research_stream_endpoint(ResearchRequest(question=question))

# Allow SSE streaming via GET for EventSource (reads question from query params)
@app.get("/threads/{thread_id}/runs")
@app.head("/threads/{thread_id}/runs")
async def run_thread_get(thread_id: str, question: str):
    """
    SSE endpoint for streaming research via thread with GET supporting EventSource.
    """
    # Delegate to POST handler by constructing payload
    payload = {"input": {"messages": [{"type": "human", "content": question}]}}
    return await run_thread(thread_id, payload)

def start_server(host: str = "0.0.0.0", port: int = 8000, reload: bool = False):
    """Start the FastAPI server using uvicorn"""
    print(f"[DEBUG] Starting server on {host}:{port} (reload={reload})")
    uvicorn.run(app, host=host, port=port, reload=reload)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 