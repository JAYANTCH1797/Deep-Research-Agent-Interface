import asyncio
import json
import re
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from openai import AsyncOpenAI

from backend.state import OverallState, SearchResult, WebSearchState
from backend.search_utils import resolve_urls, get_citations, insert_citation_markers, format_citations_for_display, extract_urls_from_text
from backend.prompts import (
    QUERY_GENERATION_SYSTEM_PROMPT, QUERY_GENERATION_USER_TEMPLATE,
    WEB_SEARCH_ANALYSIS_PROMPT, REFLECTION_SYSTEM_PROMPT, REFLECTION_USER_TEMPLATE,
    ANSWER_GENERATION_SYSTEM_PROMPT, ANSWER_GENERATION_USER_TEMPLATE,
    format_search_results_for_reflection, format_search_results_for_answer, format_sources_list
)
from backend.config import config

# Initialize AI models and tools
def get_llm(model_name: str = None):
    """Get configured language model"""
    model = model_name or config.query_generator_model
    
    # Model-specific settings
    if model == "gpt-4o-search-preview":
        return ChatOpenAI(
            model=model,
            openai_api_key=config.openai_api_key,
            temperature=0.1  # Supports temperature
        )
    else:
        # o4-mini and other models that don't support temperature
        return ChatOpenAI(
            model=model,
            openai_api_key=config.openai_api_key
    )
    
def get_openai_client():
    """Initialize OpenAI API client"""
    return AsyncOpenAI(api_key=config.openai_api_key)

async def generate_queries_node(state: OverallState) -> Dict[str, Any]:
    """
    Phase 1: Generate targeted search queries from user question
    """
    try:
        # Extract question
        question = state.get("original_question", "")
        if not question and state.get("messages"):
            question = state["messages"][0].content
        
        print(f"[DEBUG] Generating queries for: {question}")
        
        # Generate queries using LLM
        llm = get_llm(config.query_generator_model)
        
        prompt = f"{QUERY_GENERATION_SYSTEM_PROMPT}\n\n{QUERY_GENERATION_USER_TEMPLATE.format(question=question)}"
        
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        
        # Parse response
        try:
            # First try to extract valid JSON from the response text
            content = response.content
            # Try to find JSON object markers if embedded in other text
            if '{' in content and '}' in content:
                start = content.find('{')
                end = content.rfind('}')
                if start < end:
                    content = content[start:end+1]
            
            parsed = json.loads(content)
            # Extract queries with fallback
            if "queries" in parsed:
                queries = parsed["queries"]
            else:
                # Try to find a list in any field that might contain queries
                for key, value in parsed.items():
                    if isinstance(value, list) and len(value) > 0 and all(isinstance(q, str) for q in value):
                        queries = value
                        break
                else:
                    queries = [f"{question} research", f"{question} analysis", f"{question} facts"]
            
            # Extract rationale with fallback
            rationale = parsed.get("rationale", "")
            # Handle both 'thought' and 'thoughts' fields if present instead of rationale
            if not rationale:
                for field in ["thought", "thoughts", "reasoning", "explanation"]:
                    if field in parsed:
                        rationale = parsed[field]
                        break
            elif not rationale:
                rationale = "Generated research queries"
        except (json.JSONDecodeError, AttributeError, TypeError) as e:
            # Fallback parsing if JSON fails
            print(f"[DEBUG] JSON parsing failed in query generation: {e}")
            queries = [f"{question} research", f"{question} analysis", f"{question} facts"]
            rationale = "Generated basic research queries"
        
        # Limit queries to config max
        queries = queries[:config.initial_queries_count]
        
        print(f"[DEBUG] Generated {len(queries)} queries: {queries}")
        
        return {
            "query_list": queries,
            "rationale": rationale,
            "original_question": question,
            "current_phase": "search_web"
        }
        
    except Exception as e:
        print(f"[ERROR] Query generation failed: {str(e)}")
        return {
            "errors": [f"Query generation failed: {str(e)}"],
            "query_list": [question],  # Fallback to original question
            "rationale": "Fallback to original question due to error",
            "original_question": question
        }

async def web_search_node(state: WebSearchState) -> Dict[str, Any]:
    print("\n[DEBUG] Starting web_search_node execution...")
    print(f"[DEBUG] State received: {state}")
    import traceback
    """
    Phase 2: Execute individual web search using OpenAI's GPT model with web search capabilities
    """
    try:
        # Use defensive coding to extract state fields with defaults
        query = ""
        task_id = f"task-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        original_question = ""
        
        # Safely extract fields with proper error logging
        try:
            # For query, try multiple possible field names
            if "query" in state:
                query = state["query"]
            elif "current_query" in state:
                query = state["current_query"]
            elif "original_question" in state:
                query = state["original_question"]
            
            # For task_id, use existing or generate new one
            if "task_id" in state:
                task_id = state["task_id"]
                
            # Get original question
            original_question = state.get("original_question", "")
            if not original_question and query:
                original_question = query
            
            print(f"[DEBUG] Successfully extracted query: {query}")
            print(f"[DEBUG] Using task_id: {task_id}")
        except Exception as extract_error:
            print(f"[DEBUG] Error extracting fields from state: {extract_error}")
            
        # Ensure we have a valid query
        if not query and state.get("messages"):
            # Try to extract from messages if available
            try:
                first_message = state["messages"][0]
                if hasattr(first_message, 'content'):
                    query = first_message.content
                else:
                    query = str(first_message)
            except Exception as msg_error:
                print(f"[DEBUG] Error extracting query from messages: {msg_error}")
                
        # Final fallback for query
        if not query:
            query = "General research query"
        
        print(f"[DEBUG] Starting web search for query: {query}")
        
        # Use OpenAI's GPT model with web search capabilities
        client = get_openai_client()

        # Use configured web_searcher_model for web search capabilities
        model = config.web_searcher_model  # e.g. "gpt-4o-search-preview"
        
        # Search prompt for OpenAI
        search_prompt = f"""Search for information about: {query}
        
        Please provide:
        1. A comprehensive summary of findings
        2. Key facts and data points
        3. Multiple reliable sources
        4. Recent developments if applicable
        
        Focus on accuracy and cite specific sources where possible."""
        
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": search_prompt}]
        )
        
        search_content = response.choices[0].message.content
        
        # Extract URLs from the response (OpenAI search includes sources)
        urls = extract_urls_from_text(search_content)
        
        # Create search result using TypedDict fields
        search_result = SearchResult(
            id=f"search-{datetime.now().strftime('%Y%m%d%H%M%S')}-{task_id}",
            query=query,
            summary=search_content,
            sources=urls,
            task_id=task_id,
            relevance_score=0.9,
            timestamp=datetime.now().isoformat()
        )
        
        print(f"[DEBUG] Web search completed for query: {query}")
        print(f"[DEBUG] Found {len(urls)} source URLs")
        
        return {
            "search_results": [search_result],
            "sources_gathered": urls
        }
        
    except Exception as e:
        print(f"[ERROR] Web search failed for query '{query}': {str(e)}")
        traceback.print_exc()
        
        # Return error result instead of raising
        error_result = SearchResult(
            id=f"error-{datetime.now().strftime('%Y%m%d%H%M%S')}-{task_id}",
            query=query,
            summary=str(e),
            sources=[],
            task_id=task_id,
            relevance_score=0.0,
            timestamp=datetime.now().isoformat()
        )
        
        return {
            "search_results": [error_result],
            "sources_gathered": [],
            "errors": [f"Web search failed: {str(e)}"]
        }

async def aggregate_search_results(state: OverallState) -> Dict[str, Any]:
    """
    Phase 3: Aggregate and deduplicate search results from parallel searches
    """
    try:
        search_results = state.get("search_results", [])
        sources_gathered = state.get("sources_gathered", [])
        
        print(f"[DEBUG] Aggregating {len(search_results)} search results")
        
        # Flatten search results if they're nested
        flattened_results = []
        for result in search_results:
            if isinstance(result, dict):
                flattened_results.append(result)
            elif isinstance(result, list):
                flattened_results.extend(result)
        
        # Flatten sources
        all_sources = set()
        for source_list in sources_gathered:
            if isinstance(source_list, list):
                all_sources.update(source_list)
            elif isinstance(source_list, str):
                all_sources.add(source_list)
        
        total_queries_run = state.get("total_queries_run", 0) + len(flattened_results)
        
        print(f"[DEBUG] Aggregated {len(flattened_results)} results from {len(all_sources)} sources")
        
        return {
            "search_results": flattened_results,
            "sources_gathered": list(all_sources),
            "total_queries_run": total_queries_run,
            "current_phase": "reflection"
        }
        
    except Exception as e:
        print(f"[ERROR] Aggregation failed: {str(e)}")
        return {
            "errors": [f"Aggregation failed: {str(e)}"],
            "current_phase": "reflection"
        }

async def reflection_node(state: OverallState) -> Dict[str, Any]:
    """
    Phase 4: Analyze search results and determine if more research is needed
    """
    try:
        search_results = state.get("search_results", [])
        original_question = state.get("original_question", "")
        research_loop_count = state.get("research_loop_count", 0)
        
        print(f"[DEBUG] Reflecting on {len(search_results)} search results")
        
        # Format search results for analysis
        results_text = format_search_results_for_reflection(search_results)
        
        # Use configured reflection_model LLM
        llm = get_llm(config.reflection_model)
        
        # Count gathered sources to pass into the template
        source_count = len(state.get("sources_gathered", []))
        prompt = f"{REFLECTION_SYSTEM_PROMPT}\n\n{REFLECTION_USER_TEMPLATE.format(question=original_question, research_summary=results_text, source_count=source_count, loop_count=research_loop_count)}"
        
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        
        # Parse reflection response robustly
        try:
            raw = response.content
            # Extract JSON between braces if present, else wrap in braces
            if '{' in raw and '}' in raw:
                start = raw.find('{')
                end = raw.rfind('}')
                json_text = raw[start:end+1] if start < end else raw
            else:
                json_text = '{' + raw.strip() + '}'
            parsed = json.loads(json_text)
            # Parse fields, handling both singular/plural keys
            is_sufficient = parsed.get("is_sufficient", True)
            knowledge_gap = parsed.get("knowledge_gaps", parsed.get("knowledge_gap", ""))
            follow_up_queries = parsed.get("follow_up_queries", [])
            
        except (json.JSONDecodeError, AttributeError, TypeError) as e:
            print(f"[DEBUG] JSON parsing failed in reflection: {e}")
            # Conservative fallback - assume research is sufficient
            is_sufficient = True
            knowledge_gap = ""
            follow_up_queries = []
        
        # Determine if we should continue research
        should_continue = (
            not is_sufficient and 
            research_loop_count < config.max_research_loops and 
            len(follow_up_queries) > 0
        )
        
        print(f"[DEBUG] Reflection complete - sufficient: {is_sufficient}, will continue: {should_continue}")
        
        return {
            "is_sufficient": is_sufficient,
            "knowledge_gap": knowledge_gap,
            "follow_up_queries": follow_up_queries,
            "research_loop_count": research_loop_count + 1,
            "current_phase": "generating_answer" if is_sufficient else "search_web"
        }
        
    except Exception as e:
        print(f"[ERROR] Reflection failed: {str(e)}")
        # Default to sufficient research to avoid infinite loops
        return {
            "is_sufficient": True,
            "knowledge_gap": f"Reflection error: {str(e)}",
            "follow_up_queries": [],
            "research_loop_count": state.get("research_loop_count", 0) + 1,
            "current_phase": "generating_answer",
            "errors": [f"Reflection failed: {str(e)}"]
        }

async def answer_generation_node(state: OverallState) -> Dict[str, Any]:
    """
    Phase 5: Generate comprehensive final answer with citations
    """
    try:
        search_results = state.get("search_results", [])
        original_question = state.get("original_question", "")
        sources_gathered = state.get("sources_gathered", [])
        
        print(f"[DEBUG] Generating final answer from {len(search_results)} results")
        
        # Format search results for answer generation
        formatted_results = format_search_results_for_answer(search_results)
        sources_list = format_sources_list(sources_gathered)
        
        # Use configured answer_model LLM
        llm = get_llm(config.answer_model)
        
        # Create answer generation prompt
        prompt = f"{ANSWER_GENERATION_SYSTEM_PROMPT}\n\n{ANSWER_GENERATION_USER_TEMPLATE.format(question=original_question, research_findings=formatted_results, sources=sources_list)}"
        
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        final_answer = response.content
        
        # Extract citations from search results
        citations = []
        for result in search_results:
            if isinstance(result, dict):
                # Handle different result formats
                if "citations" in result and result["citations"]:
                    citations.extend(result["citations"])
                elif "url" in result and result["url"]:
                    citations.append(result["url"])
                elif "sources" in result and result["sources"]:
                    citations.extend(result["sources"])
        
        # Remove duplicates while preserving order
        unique_citations = []
        seen = set()
        for citation in citations:
            if citation and citation not in seen:
                unique_citations.append(citation)
                seen.add(citation)
        
        # Create research summary
        research_summary = {
            "total_queries": len(state.get("query_list", [])),
            "total_search_results": len(search_results),
            "total_sources": len(unique_citations),
            "research_loops": state.get("research_loop_count", 1),
            "completion_time": datetime.now().isoformat()
        }
        
        print(f"[DEBUG] Generated final answer with {len(unique_citations)} citations")
        
        return {
            "final_answer": final_answer,
            "citations": unique_citations,
            "research_summary": research_summary,
            "current_phase": "completed",
            "messages": [HumanMessage(content=original_question), response]
        }
        
    except Exception as e:
        print(f"[ERROR] Answer generation failed: {str(e)}")
        return {
            "final_answer": f"I apologize, but I encountered an error while generating the final answer: {str(e)}",
            "citations": [],
            "research_summary": {"error": str(e)},
            "current_phase": "error",
            "errors": [f"Answer generation failed: {str(e)}"]
        }