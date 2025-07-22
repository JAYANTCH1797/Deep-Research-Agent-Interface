# Technical Design Document

## Overview
This document describes the technical architecture of the Deep Research Agent Interface, reverse engineered from the backend implementation and integration guide. It covers the LangGraph-based backend, native event streaming, API endpoints, streaming utilities, and frontend integration via Server-Sent Events (SSE).

---

## System Architecture

```
+-------------+        SSE/HTTP/WebSocket        +-------------------+
|   Frontend  | <-----------------------------> |     Backend       |
| (React/TS)  |                                | (FastAPI + LangGraph)
+-------------+                                +-------------------+
```

---

## 1. LangGraph-Based Backend

### Workflow & Node Structure
- **Frameworks:** Python, FastAPI, LangGraph
- **Workflow:** Implemented as a directed graph using LangGraph's `StateGraph`.
    - **Nodes:**
        - `generate_queries`
        - `web_search` (parallelized for multiple queries)
        - `aggregate_results`
        - `reflection`
        - `answer_generation`
    - **Edges:**
        - Conditional and parallel routing (e.g., multiple web searches in parallel, loop for additional research if needed)
    - **State:** Managed via TypedDicts (e.g., `OverallState`), passed and updated between nodes.

### Event Streaming
- **Native Streaming:** Uses LangGraph's `astream_events()` for granular, node-level event streaming.
- **Event Types:**
    - `on_chain_start` → `node_start`
    - `on_chain_end` → `node_complete`
    - `on_chain_stream` → `node_stream`
    - `on_chat_model_stream` → `llm_token`
    - `complete`, `error`
- **Node-Specific Payloads:** Each node emits structured output (see below for examples).

### Streaming Utilities
- **StreamingWriter:** Utility class for sending timeline updates (progress, completion, error) to a callback, used for internal streaming and testing.
- **Helper Functions:**
    - `stream_progress`, `stream_completion`, `stream_error` for emitting updates per phase.

---

## 2. API Endpoints

- `GET /` and `/health`: Health and status checks.
- `POST /research/stream`: Main endpoint for research event streaming (SSE). Accepts `{ question, stream_mode }`.
- `WS /research/ws`: WebSocket endpoint for real-time research streaming.
- Additional endpoints for thread-based research and configuration.

---

## 3. Event Streaming: Native LangGraph → SSE

- **Backend:**
    - Calls `ImprovedResearchWorkflow.stream_research_events(question)`
    - Iterates over `astream_events()` from LangGraph, mapping native events to frontend-friendly types.
    - Streams events as SSE frames with `id`, `event`, and `data` fields.
- **Event Ordering:** Events are emitted in the order nodes execute in the workflow.
- **Error Handling:** Backend emits `error` events on exceptions; frontend can fall back to demo mode.

### Example SSE Event Payloads
- **node_start:**
  ```json
  {
    "type": "node_start",
    "nodeId": "generate_queries",
    "nodeType": "generate_queries",
    "input": { "message": "Starting generate_queries", ... },
    "timestamp": 1751654135.171881
  }
  ```
- **node_complete:**
  ```json
  {
    "type": "node_complete",
    "nodeId": "generate_queries",
    "output": { ... },
    "status": "success",
    "duration": 4857,
    "timestamp": 1751654140.0288131
  }
  ```
- **complete:**
  ```json
  {
    "type": "complete",
    "final_result": {
      "final_answer": "...",
      "citations": [ ... ],
      "research_summary": { ... }
    },
    "timestamp": 1751654180.123
  }
  ```

---

## 4. Frontend Integration

- **Framework:** React, TypeScript, Vite
- **SSE Connection:** Uses EventSource API to connect to `/research/stream`.
- **Event Handling:**
    - Handles `node_start`, `node_complete`, `node_stream`, `llm_token`, `complete`, and `error` events.
    - Updates research timeline/activity feed in real time.
    - Maps node IDs to UI step IDs for timeline updates.
    - Renders results, citations, and progress.
- **Error Handling:** Detects connection loss, falls back to demo mode, and provides user feedback.
- **Debugging:** Advanced users can inspect raw event payloads.

### Node-Specific Output Payloads
- See `backend/frontend-sse-integration.txt` for detailed payloads for each node.

---

## 5. Node-to-Frontend Mapping

- **Node ID to Step ID:**
  ```js
  const mapping = {
    'generate_queries': 'generating-queries',
    'web_search': 'search-web',
    'aggregate_results': 'aggregate-results',
    'reflection': 'reflecting',
    'answer_generation': 'generating-answer'
  };
  ```
- **Event Handlers:**
    - `handleNodeStart`, `handleNodeComplete`, etc., update timeline steps and messages.
    - Content and summary generation functions for each node type.

---

## 6. Error Handling & Reconnection

- **Backend:** Emits `error` events on exceptions; includes error messages and timestamps.
- **Frontend:** Handles `error` events, displays user-friendly messages, and attempts reconnection or fallback.
- **SSE:** Includes `id:` headers for reconnection support.

---

## 7. Key Technical Challenges & Solutions

- **Real-Time Streaming:** Achieved by combining LangGraph’s native event stream with FastAPI’s SSE endpoint.
- **Granular Progress Updates:** Node-level events allow the frontend to visualize each research phase.
- **Frontend Synchronization:** Event-driven UI updates ensure the timeline and results are always in sync with backend progress.
- **Error Handling:** Both backend and frontend include robust error detection and fallback logic.
- **Parallelism:** Web search node executes multiple queries in parallel using LangGraph’s Send mechanism.

---

## 8. Technology Stack

- **Backend:** Python, FastAPI, LangGraph, OpenAI API
- **Frontend:** React, TypeScript, Vite, shadcn/ui
- **Streaming:** Native LangGraph event stream → SSE (primary), WebSocket (optional)
- **Deployment:** Docker, Railway, Render, Vercel

---

## 9. References

- See `backend/frontend-sse-integration.txt` for detailed event mapping and payloads.
- See `backend/api.py`, `backend/workflow.py`, and `backend/streaming.py` for implementation details. 