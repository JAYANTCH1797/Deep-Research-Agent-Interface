import asyncio
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional, AsyncIterator
from langgraph.graph import StateGraph, START, END
from langgraph.constants import Send
from langchain_core.messages import HumanMessage, AIMessage

from backend.state import OverallState, WebSearchState
from backend.nodes import (
    generate_queries_node, 
    web_search_node, 
    aggregate_search_results,
    reflection_node, 
    answer_generation_node
)
from backend.config import config


class ImprovedResearchWorkflow:
    """
    Enhanced LangGraph workflow using native streaming capabilities
    """
    
    def __init__(self):
        self.graph = self._build_graph()
        self.app = self.graph.compile()
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow with native streaming support"""
        
        # Create the graph with typed state
        workflow = StateGraph(OverallState)
        
        # Add nodes
        workflow.add_node("generate_queries", generate_queries_node)
        workflow.add_node("web_search", web_search_node)
        workflow.add_node("aggregate_results", aggregate_search_results)
        workflow.add_node("reflection", reflection_node)
        workflow.add_node("answer_generation", answer_generation_node)
        
        # Define the main research flow
        workflow.add_edge(START, "generate_queries")
        
        # Handle parallel web searches
        workflow.add_conditional_edges(
            "generate_queries",
            self._route_to_parallel_searches,
            ["web_search"]
        )
        
        # After web search, aggregate results
        workflow.add_edge("web_search", "aggregate_results")
        
        # After aggregation, reflect on the information
        workflow.add_edge("aggregate_results", "reflection")
        
        # After reflection, either continue research or generate final answer
        workflow.add_conditional_edges(
            "reflection",
            self._decide_research_complete,
            ["generate_queries", "answer_generation"]
        )
        
        # Final answer generation completes the workflow
        workflow.add_edge("answer_generation", END)
        
        return workflow
    
    def _route_to_parallel_searches(self, state: OverallState) -> List[Send]:
        """Route each query to parallel web search tasks"""
        queries = state.get("query_list", [])
        follow_up_queries = state.get("follow_up_queries", [])
        
        # Determine which queries to search
        if follow_up_queries:
            search_queries = follow_up_queries
            task_prefix = f"followup_{state.get('research_loop_count', 1)}"
        else:
            search_queries = queries
            task_prefix = "initial"
        
        # Create Send instructions for parallel execution
        sends = []
        for i, query in enumerate(search_queries):
            sends.append(Send("web_search", {
                "query": query,
                "task_id": f"{task_prefix}_{i}",
                "original_question": state.get("original_question", ""),
                "is_followup": bool(follow_up_queries)
            }))
        
        return sends
    
    def _decide_research_complete(self, state: OverallState) -> str:
        """Decide whether to continue research or generate final answer"""
        is_sufficient = state.get("is_sufficient", True)
        research_loop_count = state.get("research_loop_count", 0)
        follow_up_queries = state.get("follow_up_queries", [])
        
        # Check termination conditions
        max_loops_reached = research_loop_count >= config.max_research_loops
        no_follow_ups = len(follow_up_queries) == 0
        
        if is_sufficient or max_loops_reached or no_follow_ups:
            return "answer_generation"
        else:
            return "generate_queries"
    
    async def stream_research(self, question: str) -> AsyncIterator[Dict[str, Any]]:
        """
        Stream research using LangGraph's native streaming capabilities
        Based on: https://langchain-ai.github.io/langgraph/cloud/how-tos/use_stream_react/
        """
        # Initialize state
        initial_state = OverallState(
            messages=[HumanMessage(content=question)],
            original_question=question,
            query_list=[],
            rationale="",
            search_results=[],
            sources_gathered=[],
            is_sufficient=False,
            knowledge_gap="",
            follow_up_queries=[],
            research_loop_count=0,
            total_queries_run=0,
            final_answer="",
            citations=[],
            research_summary={},
            timeline_updates=[],
            current_phase="generating_queries",
            errors=[],
            warnings=[]
        )
        
        print(f"[DEBUG] Starting LangGraph stream for: {question}")
        
        # Stream with native LangGraph streaming - stream_mode="values"
        try:
            async for chunk in self.app.astream(
                initial_state,
                stream_mode="values",  # Stream state values after each node
                config={"configurable": {"thread_id": f"research-{int(time.time())}"}}
            ):
                # Transform LangGraph state updates to frontend format
                current_phase = chunk.get("current_phase", "unknown")
                
                # Serialize chunk to JSON-safe structure
                cleaned_data: Dict[str, Any] = {}
                for k, v in chunk.items():
                    if k == "messages":
                        cleaned_msgs = []
                        for msg in v:
                            if isinstance(msg, HumanMessage):
                                cleaned_msgs.append({"type": "human", "content": msg.content})
                            elif isinstance(msg, AIMessage):
                                cleaned_msgs.append({"type": "ai", "content": msg.content})
                            else:
                                cleaned_msgs.append(str(msg))
                        cleaned_data["messages"] = cleaned_msgs
                    else:
                        cleaned_data[k] = v
                
                # Build streaming update with cleaned data
                update = {
                    "type": "state_update",
                    "node": current_phase,
                    "timestamp": time.time(),
                    "data": cleaned_data
                }
                
                print(f"[DEBUG] Streaming state update: phase={current_phase}")
                yield update
            
            # Send final completion signal with the last chunk (cleaned)
            # Re-serialize the last chunk to JSON-safe structure
            final_cleaned: Dict[str, Any] = {}
            for k, v in chunk.items():
                if k == "messages":
                    msgs = []
                    for msg in v:
                        if isinstance(msg, HumanMessage):
                            msgs.append({"type": "human", "content": msg.content})
                        elif isinstance(msg, AIMessage):
                            msgs.append({"type": "ai", "content": msg.content})
                        else:
                            msgs.append(str(msg))
                    final_cleaned["messages"] = msgs
                else:
                    final_cleaned[k] = v
            yield {
                "type": "complete",
                "data": final_cleaned
            }
            
        except Exception as e:
            print(f"[DEBUG] Error in stream_research: {e}")
            yield {
                "type": "error",
                "error": str(e),
                "timestamp": time.time()
            }
    
    async def stream_research_events(self, question: str) -> AsyncIterator[Dict[str, Any]]:
        """
        Stream research using LangGraph's event streaming for more granular updates
        Based on LangGraph astream_events for detailed node-level events
        """
        # Initialize state
        initial_state = OverallState(
            messages=[HumanMessage(content=question)],
            original_question=question,
            query_list=[],
            rationale="",
            search_results=[],
            sources_gathered=[],
            is_sufficient=False,
            knowledge_gap="",
            follow_up_queries=[],
            research_loop_count=0,
            total_queries_run=0,
            final_answer="",
            citations=[],
            research_summary={},
            timeline_updates=[],
            current_phase="generating_queries",
            errors=[],
            warnings=[]
        )
        
        print(f"[DEBUG] Starting LangGraph event stream for: {question}")
        
        # Generate thread ID once for consistent state tracking
        thread_id = f"research-{int(time.time())}"
        config = {"configurable": {"thread_id": thread_id}}
        
        # Store the final state as we process events
        final_state_data = {}
        
        # Stream with event-based streaming for granular updates
        try:
            async for event in self.app.astream_events(
                initial_state,
                version="v1",
                config=config
            ):
                # Transform LangGraph events to frontend-friendly format
                event_type = event.get("event", "")
                event_name = event.get("name", "")
                
                if event_type == "on_chain_start":
                    yield {
                        "type": "node_start",
                        "node": event_name,
                        "data": {"message": f"Starting {event_name}"},
                        "timestamp": time.time()
                    }
                elif event_type == "on_chain_end":
                    # Capture final answer if this is the answer_generation node
                    if event_name == "answer_generation":
                        output_data = event.get("data", {})
                        if output_data and isinstance(output_data, dict):
                            final_state_data.update(output_data.get("output", {}))
                    
                    yield {
                        "type": "node_complete", 
                        "node": event_name,
                        "data": event.get("data", {}),
                        "timestamp": time.time()
                    }
                elif event_type == "on_chain_stream":
                    yield {
                        "type": "node_stream",
                        "node": event_name,
                        "data": event.get("data", {}),
                        "timestamp": time.time()
                    }
                elif event_type == "on_chat_model_stream":
                    # Handle LLM streaming tokens
                    yield {
                        "type": "llm_token",
                        "node": event_name,
                        "data": event.get("data", {}),
                        "timestamp": time.time()
                    }
                else:
                    # Forward other events
                    yield {
                        "type": "event",
                        "event_type": event_type,
                        "node": event_name,
                        "data": event.get("data", {}),
                        "timestamp": time.time()
                    }
                    
        except Exception as e:
            print(f"[DEBUG] Error in stream_research_events: {e}")
            yield {
                "type": "error",
                "error": str(e),
                "timestamp": time.time()
            }
        
        # After streaming is complete, get the final state and emit complete event
        try:
            # Try to get the final state from LangGraph
            final_state = await self.app.aget_state(config)
            if final_state and hasattr(final_state, 'values'):
                state_values = final_state.values
                # Merge with captured data, preferring state values
                final_data = {**final_state_data, **state_values}
            else:
                # Use captured data if state retrieval fails
                final_data = final_state_data
                
            yield {
                "type": "complete",
                "final_result": {
                    "final_answer": final_data.get("final_answer", ""),
                    "citations": final_data.get("citations", []),
                    "research_summary": final_data.get("research_summary", {}),
                    "sources_gathered": final_data.get("sources_gathered", []),
                    "total_queries_run": final_data.get("total_queries_run", 0),
                    "research_loop_count": final_data.get("research_loop_count", 0)
                },
                "timestamp": time.time()
            }
        except Exception as e:
            print(f"[DEBUG] Error getting final state: {e}")
            # Use captured data as fallback
            yield {
                "type": "complete",
                "final_result": {
                    "final_answer": final_state_data.get("final_answer", "Research completed."),
                    "citations": final_state_data.get("citations", []),
                    "research_summary": final_state_data.get("research_summary", {})
                },
                "timestamp": time.time()
            }


# Create global workflow instance
workflow_instance = ImprovedResearchWorkflow()

# Backward compatibility functions
async def run_research_stream(question: str) -> AsyncIterator[Dict[str, Any]]:
    """Backward compatibility wrapper for streaming research"""
    async for update in workflow_instance.stream_research(question):
        yield update

async def run_research_events(question: str) -> AsyncIterator[Dict[str, Any]]:
    """Backward compatibility wrapper for event streaming"""
    async for event in workflow_instance.stream_research_events(question):
        yield event

async def run_research_agent(question: str, stream_callback=None) -> Dict[str, Any]:
    """Backward compatibility wrapper for WebSocket callback-based streaming"""
    final_result = None
    
    try:
        async for update in workflow_instance.stream_research(question):
            if stream_callback:
                await stream_callback(update)
            
            if update.get("type") == "complete":
                final_result = update.get("data", {})
    
    except Exception as e:
        if stream_callback:
            await stream_callback({
                "type": "error",
                "error": str(e),
                "timestamp": time.time()
            })
        raise e
    
    return final_result or {
        "final_answer": "Research completed but no final result available",
        "citations": [],
        "research_summary": {},
        "errors": ["No final result received"]
    } 