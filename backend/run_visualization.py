#!/usr/bin/env python3
"""
Quick visualization runner for the Deep Research Agent StateGraph

Run this script to generate visualizations of your LangGraph workflow.
"""

import os
import sys

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    print("🔍 Deep Research Agent - StateGraph Visualization")
    print("=" * 50)
    
    try:
        # Import and run the visualization
        from visualize_research_workflow import main as viz_main
        viz_main()
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("\n🔧 Quick Setup:")
        print("1. Make sure you're in the backend directory")
        print("2. Install dependencies: pip install langgraph langchain-google-genai")
        print("3. For PNG generation: pip install pygraphviz")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\n💡 Try running the visualization manually:")
        print("python visualize_research_workflow.py")

if __name__ == "__main__":
    main() 