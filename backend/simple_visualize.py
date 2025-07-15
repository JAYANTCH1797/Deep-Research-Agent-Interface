#!/usr/bin/env python3
"""
Simple StateGraph Visualization for Deep Research Agent

This script creates visualizations of the research workflow graph.
"""

import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def create_manual_visualization():
    """Create visualization based on the workflow structure we know"""
    
    print("🔍 DEEP RESEARCH AGENT - WORKFLOW VISUALIZATION")
    print("=" * 60)
    
    # Manual graph structure based on your workflow
    nodes = {
        "generate_queries": "📝 Generate targeted search queries",
        "web_search": "🔍 Execute parallel web searches", 
        "aggregate_results": "📊 Combine search results",
        "reflection": "🤔 Analyze completeness & decide next steps",
        "answer_generation": "📋 Synthesize final answer with citations"
    }
    
    edges = [
        ("__start__", "generate_queries"),
        ("generate_queries", "web_search"),
        ("web_search", "aggregate_results"), 
        ("aggregate_results", "reflection"),
        ("reflection", "answer_generation"),
        ("reflection", "generate_queries"),  # Loop back for more research
        ("answer_generation", "__end__")
    ]
    
    print(f"\n📊 Graph Statistics:")
    print(f"   • Nodes: {len(nodes)}")
    print(f"   • Edges: {len(edges)}")
    
    print(f"\n📍 NODES:")
    for node_id, description in nodes.items():
        print(f"   • {node_id}: {description}")
    
    print(f"\n🔗 EDGES:")
    for source, target in edges:
        print(f"   • {source} → {target}")
    
    # ASCII Representation
    print(f"\n📋 ASCII GRAPH REPRESENTATION:")
    print("-" * 50)
    ascii_graph = """
    ┌─────────────┐
    │   START     │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │generate_    │
    │queries      │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │web_search   │
    │(parallel)   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │aggregate_   │
    │results      │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │reflection   │◄─────┐
    └──────┬──────┘      │
           │             │
           ▼             │
    ┌─────────────┐      │
    │sufficient?  │      │
    └──────┬──────┘      │
           │             │
     ┌─────▼─────┐       │
     │    YES    │       │ NO
     │           │       │
     ▼           │       │
┌─────────────┐  │       │
│answer_      │  │       │
│generation   │  │       │
└──────┬──────┘  │       │
       │         │       │
       ▼         │       │
┌─────────────┐  │       │
│    END      │  └───────┘
└─────────────┘
    """
    print(ascii_graph)
    
    # Mermaid Diagram
    print(f"\n🎨 MERMAID DIAGRAM SOURCE:")
    print("-" * 50)
    mermaid_code = """
%%{init: {'flowchart': {'curve': 'linear'}}}%%
graph TD;
    START([__start__]):::first
    GQ[generate_queries<br/>📝 Generate Search Queries]
    WS[web_search<br/>🔍 Web Search<br/>Parallel Execution]
    AR[aggregate_results<br/>📊 Aggregate Results]
    RF[reflection<br/>🤔 Reflect on Results]
    AG[answer_generation<br/>📋 Generate Answer]
    END([__end__]):::last

    START --> GQ
    GQ --> WS
    WS --> AR
    AR --> RF
    RF -->|sufficient| AG
    RF -->|need more| GQ
    AG --> END

    classDef default fill:#f2f0ff,line-height:1.2
    classDef first fill-opacity:0
    classDef last fill:#bfb6fc
"""
    print(mermaid_code.strip())
    print(f"\n💡 Copy the above code to https://mermaid.live to view the diagram")
    
    # State Schema
    print(f"\n📋 STATE SCHEMA ANALYSIS:")
    print("-" * 50)
    state_fields = [
        "messages: List[BaseMessage] - LangChain message history",
        "original_question: str - User's research question", 
        "query_list: List[str] - Generated search queries",
        "search_results: List[SearchResult] - Parallel search outputs",
        "sources_gathered: List[str] - Discovered URLs",
        "is_sufficient: bool - Research completeness decision",
        "follow_up_queries: List[str] - Additional queries if needed",
        "research_loop_count: int - Current iteration number",
        "final_answer: str - Synthesized response",
        "citations: List[str] - Source references",
        "research_summary: Dict[str, Any] - Metadata and statistics",
        "current_phase: str - Current processing phase",
        "errors: List[str] - Any errors encountered"
    ]
    
    print(f"\n🏗️  OverallState Structure:")
    for field in state_fields:
        print(f"   • {field}")
    
    # Save Mermaid to file
    try:
        output_dir = Path("visualizations")
        output_dir.mkdir(exist_ok=True)
        
        mermaid_file = output_dir / "research_workflow.mmd"
        with open(mermaid_file, "w") as f:
            f.write(mermaid_code.strip())
        
        print(f"\n✅ Mermaid diagram saved to: {mermaid_file.absolute()}")
        
        # Create simple HTML
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Deep Research Agent - Workflow Visualization</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }}
        .mermaid {{ text-align: center; margin: 20px 0; }}
        .info {{ background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Deep Research Agent - StateGraph Visualization</h1>
        
        <div class="info">
            <h3>📊 Workflow Overview</h3>
            <p>This diagram shows the complete flow of the Deep Research Agent:</p>
            <ul>
                <li><strong>Query Generation:</strong> Breaks down user questions into targeted search queries</li>
                <li><strong>Web Search:</strong> Executes parallel searches using Gemini's native capabilities</li>
                <li><strong>Reflection:</strong> Analyzes completeness and determines if more research is needed</li>
                <li><strong>Answer Generation:</strong> Synthesizes comprehensive answers with citations</li>
            </ul>
        </div>
        
        <div class="mermaid">
{mermaid_code.strip()}
        </div>
        
        <div class="info">
            <h3>🛠️ Technical Details</h3>
            <p><strong>Graph Type:</strong> LangGraph StateGraph</p>
            <p><strong>State Management:</strong> TypedDict with proper annotations</p>
            <p><strong>Parallel Execution:</strong> Web searches run concurrently using Send</p>
            <p><strong>Conditional Looping:</strong> Reflection can loop back for more research</p>
        </div>
    </div>
    
    <script>
        mermaid.initialize({{ startOnLoad: true, theme: 'default' }});
    </script>
</body>
</html>
"""
        
        html_file = output_dir / "research_workflow.html"
        with open(html_file, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        print(f"✅ Interactive HTML saved to: {html_file.absolute()}")
        print(f"💡 Open in browser: file://{html_file.absolute()}")
        
    except Exception as e:
        print(f"❌ File save failed: {e}")

def main():
    """Main function"""
    create_manual_visualization()
    
    print(f"\n" + "=" * 60)
    print("✅ VISUALIZATION COMPLETE!")
    print("=" * 60)
    print(f"📁 Check the 'visualizations' folder for output files")
    print(f"💡 Tips:")
    print(f"   • Use https://mermaid.live for online Mermaid editing")
    print(f"   • Open the HTML file in your browser for interactive view")

if __name__ == "__main__":
    main() 