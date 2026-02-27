import asyncio
import json
import re
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from backend.state import OverallState, SearchResult, WebSearchState
from backend.search_utils import extract_urls_from_text
from backend.prompts import (
    QUERY_GENERATION_SYSTEM_PROMPT, QUERY_GENERATION_USER_TEMPLATE,
    REFLECTION_SYSTEM_PROMPT, REFLECTION_USER_TEMPLATE,
    ANSWER_GENERATION_SYSTEM_PROMPT, ANSWER_GENERATION_USER_TEMPLATE,
    format_search_results_for_reflection, format_search_results_for_answer, format_sources_list
)
from backend.config import config


def _content_to_str(content) -> str:
    """Safely convert Gemini response content (str or list of parts) to a plain string.
    
    Gemini may return content as:
    - str: plain text
    - list of str: join them
    - list of dicts: {'type': 'text', 'text': '...'} format
    - list of objects with .text attribute
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict):
                # Gemini content part: {'type': 'text', 'text': '...'} 
                parts.append(part.get('text', str(part)))
            elif hasattr(part, 'text'):
                parts.append(part.text)
            else:
                parts.append(str(part))
        return '\n'.join(filter(None, parts))
    return str(content)


def get_llm(model_name: str = None) -> ChatGoogleGenerativeAI:
    """Get configured Google Gemini language model"""
    model = model_name or config.query_generator_model
    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=config.google_ai_api_key,
        temperature=0.2,
    )


async def generate_queries_node(state: OverallState) -> Dict[str, Any]:
    """
    Phase 1: Generate targeted search queries from user question
    """
    try:
        question = state.get("original_question", "")
        if not question and state.get("messages"):
            question = state["messages"][0].content if hasattr(state["messages"][0], "content") else str(state["messages"][0])

        print(f"[DEBUG] Generating queries for: {question}")

        llm = get_llm(config.query_generator_model)
        prompt = f"{QUERY_GENERATION_SYSTEM_PROMPT}\n\n{QUERY_GENERATION_USER_TEMPLATE.format(question=question)}"

        response = await llm.ainvoke([HumanMessage(content=prompt)])

        # Parse response
        try:
            content = _content_to_str(response.content)
            # Strip markdown code fences if present
            if '```' in content:
                content = re.sub(r'```(?:json)?\s*', '', content).strip()
            # Extract JSON object from response text
            if '{' in content and '}' in content:
                start = content.find('{')
                end = content.rfind('}')
                if start < end:
                    content = content[start:end + 1]

            parsed = json.loads(content)
            queries = parsed.get("queries", [])

            # Fallback: look for any list of strings
            if not queries:
                for key, value in parsed.items():
                    if isinstance(value, list) and all(isinstance(q, str) for q in value):
                        queries = value
                        break

            if not queries:
                queries = [f"{question} research", f"{question} analysis", f"{question} overview"]

            rationale = parsed.get("rationale", parsed.get("thought", parsed.get("reasoning", "Generated research queries")))
        except (json.JSONDecodeError, AttributeError, TypeError) as e:
            print(f"[DEBUG] JSON parsing failed in query generation: {e}")
            queries = [f"{question} research", f"{question} analysis", f"{question} overview"]
            rationale = "Generated basic research queries"

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
        question = state.get("original_question", "research topic")
        return {
            "errors": [f"Query generation failed: {str(e)}"],
            "query_list": [question],
            "rationale": "Fallback to original question due to error",
            "original_question": question
        }



async def web_search_node(state: WebSearchState) -> Dict[str, Any]:
    """
    Phase 2: Execute web search using Gemini's built-in knowledge + grounding
    Note: Gemini can leverage Google Search grounding when enabled, but the base
    model is also highly capable of synthesising recent knowledge.
    """
    import traceback
    print("\n[DEBUG] Starting web_search_node execution...")

    query = ""
    task_id = f"task-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    original_question = ""

    try:
        query = state.get("query") or state.get("current_query") or state.get("original_question", "")
        task_id = state.get("task_id", task_id)
        original_question = state.get("original_question", query)

        if not query:
            messages = state.get("messages", [])
            if messages:
                first = messages[0]
                query = first.content if hasattr(first, "content") else str(first)

        if not query:
            query = "General research query"

        print(f"[DEBUG] Starting web search for query: {query}")

        # Use Gemini to synthesise search results
        llm = get_llm(config.web_searcher_model)

        search_prompt = f"""You are a research assistant with access to comprehensive knowledge up to your training cutoff. 
Search for and synthesise information about: {query}

Please provide:
1. A comprehensive summary of key findings (2-3 paragraphs)
2. Specific facts, statistics, and data points
3. Different perspectives or approaches where relevant
4. Recent developments or trends if applicable
5. Reliable source URLs you are referencing (cite specific websites, papers, or articles)

Be thorough, accurate, and cite specific sources where possible."""

        response = await llm.ainvoke([HumanMessage(content=search_prompt)])
        search_content = _content_to_str(response.content)

        # Extract any URLs mentioned in the response
        urls = extract_urls_from_text(search_content)

        search_result = SearchResult(
            id=f"search-{datetime.now().strftime('%Y%m%d%H%M%S')}-{task_id}",
            query=query,
            summary=search_content,
            sources=urls,
            task_id=task_id,
            relevance_score=0.9,
            timestamp=datetime.now().isoformat()
        )

        print(f"[DEBUG] Web search completed for query: {query}, found {len(urls)} source URLs")

        return {
            "search_results": [search_result],
            "sources_gathered": urls
        }

    except Exception as e:
        print(f"[ERROR] Web search failed for query '{query}': {str(e)}")
        traceback.print_exc()

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

        # Flatten nested results
        flattened_results = []
        for result in search_results:
            if isinstance(result, dict):
                flattened_results.append(result)
            elif isinstance(result, list):
                flattened_results.extend(result)

        # Deduplicate sources
        all_sources: set = set()
        for source_entry in sources_gathered:
            if isinstance(source_entry, list):
                all_sources.update(source_entry)
            elif isinstance(source_entry, str):
                all_sources.add(source_entry)

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
    Phase 4: Analyse search results and determine if more research is needed
    """
    try:
        search_results = state.get("search_results", [])
        original_question = state.get("original_question", "")
        research_loop_count = state.get("research_loop_count", 0)

        print(f"[DEBUG] Reflecting on {len(search_results)} search results")

        results_text = format_search_results_for_reflection(search_results)
        source_count = len(state.get("sources_gathered", []))

        llm = get_llm(config.reflection_model)
        prompt = f"{REFLECTION_SYSTEM_PROMPT}\n\n{REFLECTION_USER_TEMPLATE.format(question=original_question, research_summary=results_text, source_count=source_count, loop_count=research_loop_count)}"

        response = await llm.ainvoke([HumanMessage(content=prompt)])

        try:
            raw = _content_to_str(response.content)
            # Strip markdown code fences
            if '```' in raw:
                raw = re.sub(r'```(?:json)?\s*', '', raw).strip()
            # Extract JSON
            if '{' in raw and '}' in raw:
                start = raw.find('{')
                end = raw.rfind('}')
                json_text = raw[start:end + 1] if start < end else raw
            else:
                # Wrap bare key:value content
                json_text = '{' + raw.strip() + '}'
            parsed = json.loads(json_text)

            is_sufficient = parsed.get("is_sufficient", True)
            knowledge_gap = parsed.get("knowledge_gaps", parsed.get("knowledge_gap", ""))
            follow_up_queries = parsed.get("follow_up_queries", [])

        except (json.JSONDecodeError, AttributeError, TypeError) as e:
            print(f"[DEBUG] JSON parsing failed in reflection: {e}")
            is_sufficient = True
            knowledge_gap = ""
            follow_up_queries = []

        should_continue = (
            not is_sufficient
            and research_loop_count < config.max_research_loops
            and len(follow_up_queries) > 0
        )

        print(f"[DEBUG] Reflection complete — sufficient: {is_sufficient}, will continue: {should_continue}")

        return {
            "is_sufficient": is_sufficient,
            "knowledge_gap": knowledge_gap,
            "follow_up_queries": follow_up_queries,
            "research_loop_count": research_loop_count + 1,
            "current_phase": "generating_answer" if is_sufficient else "search_web"
        }

    except Exception as e:
        print(f"[ERROR] Reflection failed: {str(e)}")
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

        formatted_results = format_search_results_for_answer(search_results)
        sources_list = format_sources_list(sources_gathered)

        llm = get_llm(config.answer_model)
        prompt = f"{ANSWER_GENERATION_SYSTEM_PROMPT}\n\n{ANSWER_GENERATION_USER_TEMPLATE.format(question=original_question, research_findings=formatted_results, sources=sources_list)}"

        response = await llm.ainvoke([HumanMessage(content=prompt)])
        final_answer = _content_to_str(response.content)

        # Collect unique citations from all search results
        citations = []
        seen: set = set()
        for result in search_results:
            if isinstance(result, dict):
                for url in result.get("citations", []) + result.get("sources", []):
                    if url and url not in seen:
                        citations.append(url)
                        seen.add(url)

        research_summary = {
            "total_queries": len(state.get("query_list", [])),
            "total_search_results": len(search_results),
            "total_sources": len(citations),
            "research_loops": state.get("research_loop_count", 1),
            "completion_time": datetime.now().isoformat()
        }

        print(f"[DEBUG] Generated final answer with {len(citations)} citations")

        return {
            "final_answer": final_answer,
            "citations": citations,
            "research_summary": research_summary,
            "current_phase": "completed",
            "messages": [HumanMessage(content=original_question), response]
        }

    except Exception as e:
        print(f"[ERROR] Answer generation failed: {str(e)}")
        return {
            "final_answer": f"I apologise, but I encountered an error while generating the final answer: {str(e)}",
            "citations": [],
            "research_summary": {"error": str(e)},
            "current_phase": "error",
            "errors": [f"Answer generation failed: {str(e)}"]
        }