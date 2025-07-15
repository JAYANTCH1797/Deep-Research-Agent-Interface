#!/usr/bin/env python3
"""
StateGraph Visualization for Deep Research Agent

This script provides multiple visualization methods for the LangGraph workflow:
1. Mermaid diagram (PNG and source code)
2. ASCII representation
3. Interactive HTML visualization
4. Graph structure analysis

Based on official LangGraph documentation patterns.
"""

import os
import sys
from pathlib import Path

# Add backend to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

try:
    from workflow import improved_workflow
    from workflow import research_workflow  # Original workflow for comparison
    print("✅ Successfully imported both workflow implementations")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the backend directory")
    sys.exit(1)

def visualize_improved_workflow():
    """Visualize the improved LangGraph workflow using native capabilities"""
    
    print("\n" + "="*60)
    print("🔍 DEEP RESEARCH AGENT - WORKFLOW VISUALIZATION")
    print("="*60)
    
    # Get the compiled graph
    graph = improved_workflow.app
    graph_structure = graph.get_graph()
    
    print(f"\n📊 Graph Statistics:")
    print(f"   • Nodes: {len(graph_structure.nodes)}")
    print(f"   • Edges: {len(graph_structure.edges)}")
    
    # 1. ASCII Visualization
    print("\n" + "-"*50)
    print("📋 ASCII GRAPH REPRESENTATION")
    print("-"*50)
    try:
        ascii_graph = graph_structure.draw_ascii()
        print(ascii_graph)
    except Exception as e:
        print(f"❌ ASCII visualization failed: {e}")
    
    # 2. Mermaid Source Code
    print("\n" + "-"*50)
    print("🎨 MERMAID DIAGRAM SOURCE")
    print("-"*50)
    try:
        mermaid_code = graph_structure.draw_mermaid()
        print(mermaid_code)
        print(f"\n💡 Copy the above code to https://mermaid.live to view the diagram")
    except Exception as e:
        print(f"❌ Mermaid source generation failed: {e}")
    
    # 3. Save Mermaid PNG (if possible)
    print("\n" + "-"*50)
    print("🖼️  MERMAID PNG GENERATION")
    print("-"*50)
    try:
        png_data = graph_structure.draw_mermaid_png()
        
        # Save to file
        output_dir = Path("visualizations")
        output_dir.mkdir(exist_ok=True)
        
        png_file = output_dir / "research_workflow.png"
        with open(png_file, "wb") as f:
            f.write(png_data)
        
        print(f"✅ PNG saved to: {png_file.absolute()}")
        
        # Also try to display if in Jupyter
        try:
            from IPython.display import Image, display
            display(Image(png_data))
            print("✅ Displayed in Jupyter notebook")
        except ImportError:
            print("💡 To view in Jupyter: from IPython.display import Image; Image('research_workflow.png')")
            
    except Exception as e:
        print(f"❌ PNG generation failed: {e}")
        print("💡 Install graphviz and pygraphviz: pip install pygraphviz")
    
    # 4. Node and Edge Analysis
    print("\n" + "-"*50)
    print("🔍 DETAILED GRAPH ANALYSIS")
    print("-"*50)
    
    print("\n📍 NODES:")
    for node_id in graph_structure.nodes:
        node_data = graph_structure.nodes[node_id]
        print(f"   • {node_id}")
        if hasattr(node_data, 'name'):
            print(f"     Name: {node_data.name}")
    
    print("\n🔗 EDGES:")
    for edge in graph_structure.edges:
        source = edge.source
        target = edge.target
        print(f"   • {source} → {target}")
    
    # 5. State Schema Analysis
    print("\n" + "-"*50)
    print("📋 STATE SCHEMA ANALYSIS")
    print("-"*50)
    
    # Import state for analysis
    try:
        from state import OverallState
        print("\n🏗️  State Structure (OverallState):")
        
        # Get type annotations if available
        if hasattr(OverallState, '__annotations__'):
            for field, field_type in OverallState.__annotations__.items():
                print(f"   • {field}: {field_type}")
        else:
            print("   State structure defined as TypedDict")
            
    except Exception as e:
        print(f"❌ State analysis failed: {e}")

def create_interactive_html():
    """Create an interactive HTML visualization"""
    
    print("\n" + "-"*50)
    print("🌐 INTERACTIVE HTML VISUALIZATION")
    print("-"*50)
    
    try:
        # Create HTML with embedded Mermaid
        graph = improved_workflow.app
        mermaid_code = graph.get_graph().draw_mermaid()
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Deep Research Agent - Workflow Visualization</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
        }}
        .mermaid {{
            text-align: center;
            margin: 20px 0;
        }}
        .info {{
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }}
        .code {{
            background: #f1f1f1;
            padding: 10px;
            border-radius: 3px;
            font-family: monospace;
            overflow-x: auto;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Deep Research Agent</h1>
            <h2>LangGraph Workflow Visualization</h2>
            <p>Interactive visualization of the research workflow StateGraph</p>
        </div>
        
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
{mermaid_code}
        </div>
        
        <div class="info">
            <h3>🛠️ Technical Details</h3>
            <p><strong>Graph Type:</strong> LangGraph StateGraph</p>
            <p><strong>State Management:</strong> TypedDict with proper annotations</p>
            <p><strong>Parallel Execution:</strong> Web searches run concurrently using Send</p>
            <p><strong>Streaming:</strong> Native LangGraph streaming capabilities</p>
        </div>
        
        <div class="info">
            <h3>📝 Mermaid Source Code</h3>
            <div class="code">
{mermaid_code.replace('<', '&lt;').replace('>', '&gt;')}
            </div>
        </div>
    </div>
    
    <script>
        mermaid.initialize({{ 
            startOnLoad: true,
            theme: 'default',
            flowchart: {{
                curve: 'linear',
                htmlLabels: true
            }}
        }});
    </script>
</body>
</html>
"""
        
        # Save HTML file
        output_dir = Path("visualizations")
        output_dir.mkdir(exist_ok=True)
        
        html_file = output_dir / "research_workflow.html"
        with open(html_file, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        print(f"✅ Interactive HTML saved to: {html_file.absolute()}")
        print(f"💡 Open in browser: file://{html_file.absolute()}")
        
    except Exception as e:
        print(f"❌ HTML generation failed: {e}")

def compare_workflows():
    """Compare original vs improved workflow structures"""
    
    print("\n" + "-"*50)
    print("⚖️  WORKFLOW COMPARISON")
    print("-"*50)
    
    try:
        # Original workflow
        original_graph = research_workflow.app.get_graph()
        improved_graph = improved_workflow.app.get_graph()
        
        print(f"\n📊 Comparison:")
        print(f"   Original  - Nodes: {len(original_graph.nodes)}, Edges: {len(original_graph.edges)}")
        print(f"   Improved  - Nodes: {len(improved_graph.nodes)}, Edges: {len(improved_graph.edges)}")
        
        print(f"\n🔍 Node Differences:")
        original_nodes = set(original_graph.nodes.keys())
        improved_nodes = set(improved_graph.nodes.keys())
        
        if original_nodes == improved_nodes:
            print("   ✅ Same nodes in both workflows")
        else:
            only_original = original_nodes - improved_nodes
            only_improved = improved_nodes - original_nodes
            
            if only_original:
                print(f"   • Only in original: {only_original}")
            if only_improved:
                print(f"   • Only in improved: {only_improved}")
        
    except Exception as e:
        print(f"❌ Comparison failed: {e}")

def main():
    """Main visualization function"""
    
    print("🚀 Starting Deep Research Agent Workflow Visualization...")
    
    # Create output directory
    output_dir = Path("visualizations")
    output_dir.mkdir(exist_ok=True)
    print(f"📁 Output directory: {output_dir.absolute()}")
    
    # Run visualizations
    visualize_improved_workflow()
    create_interactive_html()
    compare_workflows()
    
    print("\n" + "="*60)
    print("✅ VISUALIZATION COMPLETE!")
    print("="*60)
    print(f"📁 Check the 'visualizations' folder for output files:")
    print(f"   • research_workflow.png (if graphviz available)")
    print(f"   • research_workflow.html (interactive)")
    print(f"\n💡 Tips:")
    print(f"   • Install graphviz for PNG generation: pip install pygraphviz")
    print(f"   • Use https://mermaid.live for online Mermaid editing")
    print(f"   • Open the HTML file in your browser for interactive view")

if __name__ == "__main__":
    main() 