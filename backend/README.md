# Deep Research Agent Backend

LangGraph-powered research agent with streaming capabilities and comprehensive web research.

## Features

- **Multi-phase Research**: Query generation, web search, reflection, and answer synthesis
- **Parallel Processing**: Concurrent web searches for faster research
- **Research Loops**: Iterative research based on completeness analysis
- **Streaming Updates**: Real-time progress updates via WebSocket/SSE
- **Comprehensive Citations**: Proper source attribution and validation

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure API Keys

Copy the environment template and add your API keys:

```bash
cp .env.example .env
# Edit .env with your actual API keys
```

Required API keys:
- **GEMINI_API_KEY**: Google AI API key for Gemini models
- **GOOGLE_SEARCH_API_KEY**: Google Search API key
- **GOOGLE_SEARCH_ENGINE_ID**: Custom Search Engine ID

### 3. Test Configuration

```bash
python -m backend.main config
```

### 4. Run a Quick Test

```bash
python -m backend.main test
```

### 5. Start the API Server

```bash
python -m backend.main server
```

The API will be available at `http://localhost:8000`

## Usage Examples

### Command Line Research

```bash
# Basic research
python -m backend.main research "What are the environmental impacts of electric vehicles?"

# Verbose output
python -m backend.main research "How does quantum computing work?" --verbose
```

### API Usage

```python
import asyncio
from backend.workflow import run_research_agent

async def example():
    result = await run_research_agent("What is machine learning?")
    print(result["final_answer"])

asyncio.run(example())
```

### Streaming Research

```python
import asyncio
from backend.workflow import run_research_agent

async def streaming_example():
    async def progress_callback(update):
        print(f"[{update['phase']}] {update.get('progress_message', '')}")
    
    result = await run_research_agent(
        "Explain blockchain technology", 
        progress_callback
    )
    
    return result

asyncio.run(streaming_example())
```

## API Endpoints

### REST API

- `GET /` - Health check
- `GET /health` - Detailed health check
- `POST /research` - Run research without streaming
- `POST /research/stream` - Run research with Server-Sent Events

### WebSocket

- `WS /research/ws` - Real-time research with WebSocket streaming

### Example API Request

```bash
curl -X POST "http://localhost:8000/research" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is artificial intelligence?"}'
```

## Configuration

### Environment Variables

```bash
# Required
GEMINI_API_KEY=your_api_key
GOOGLE_SEARCH_API_KEY=your_search_key  
GOOGLE_SEARCH_ENGINE_ID=your_engine_id

# Optional
INITIAL_QUERIES_COUNT=3
MAX_RESEARCH_LOOPS=2
MAX_SOURCES_PER_QUERY=10
```

### Research Parameters

You can customize the research behavior by modifying `backend/config.py`:

```python
@dataclass
class ResearchAgentConfig:
    initial_queries_count: int = 3      # Number of initial search queries
    max_research_loops: int = 2         # Maximum research iterations
    max_sources_per_query: int = 10     # Sources per search query
    search_timeout_seconds: int = 30    # Search timeout
    min_sources_for_sufficiency: int = 5 # Minimum sources for completion
```

## Architecture

### Research Phases

1. **Query Generation**: Breaks down user question into targeted search queries
2. **Web Search**: Executes parallel searches and analyzes results  
3. **Reflection**: Evaluates research completeness and identifies gaps
4. **Answer Generation**: Synthesizes comprehensive answer with citations

### LangGraph Workflow

```python
# Graph structure
START → generate_queries → [parallel web_search] → aggregate_results 
      → reflection → {more_research OR answer_generation} → END
```

### State Management

The workflow uses a comprehensive state schema that tracks:
- Original question and generated queries
- Search results and sources (with automatic aggregation)
- Research loop progress and completion status
- Timeline updates and streaming progress
- Final answer and citations

## Development

### Running Tests

```bash
pytest backend/tests/
```

### Code Formatting

```bash
black backend/
flake8 backend/
```

### Adding New Features

1. **New Node**: Add to `backend/nodes.py` and register in `backend/workflow.py`
2. **New Prompts**: Add to `backend/prompts.py`
3. **New API Endpoint**: Add to `backend/api.py`

## Troubleshooting

### Common Issues

**"Missing API Keys"**
- Ensure all required environment variables are set in `.env`
- Check that API keys are valid and have proper permissions

**"Search Results Empty"**  
- Verify Google Search API quota and limits
- Check Custom Search Engine configuration

**"Streaming Not Working"**
- Ensure WebSocket connections are properly handled
- Check firewall/proxy settings for WebSocket traffic

### Debug Mode

Run with verbose logging:

```bash
python -m backend.main research "your question" --verbose
```

## Performance Notes

- **Parallel Processing**: Web searches run concurrently for speed
- **Caching**: Consider implementing caching for repeated queries
- **Rate Limits**: Respect API rate limits for Google services
- **Timeouts**: Configure appropriate timeouts for web requests

## License

MIT License - see LICENSE file for details.
```