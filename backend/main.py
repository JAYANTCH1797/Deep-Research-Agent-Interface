import asyncio
import argparse
import json
import os
import sys
from typing import Optional
from dotenv import load_dotenv

# Add parent directory to path to ensure imports work correctly
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

# Initialize LangSmith for tracing and debugging
try:
    from langsmith_setup import langsmith_enabled
except ImportError:
    from backend.langsmith_setup import langsmith_enabled

# Use try-except to handle both import paths
try:
    # Direct imports (when running from backend dir)
    from workflow import run_research_agent
    from config import config
    from api import start_server
except ImportError:
    # Prefixed imports (when running from project root)
    from backend.workflow import run_research_agent
    from backend.config import config
    from backend.api import start_server

# Load environment variables
load_dotenv()

async def run_cli_research(question: str, verbose: bool = False):
    """Run research from command line interface"""
    
    print(f"🔍 Starting research for: {question}")
    print("=" * 60)
    
    # Progress callback for CLI
    async def cli_progress_callback(update):
        if verbose:
            print(f"[{update['phase'].upper()}] {update.get('progress_message', update.get('completion_message', ''))}")
        else:
            # Simple progress indicators
            if update['status'] == 'completed':
                print(f"✅ {update['phase'].replace('_', ' ').title()}")
            elif update.get('progress_message'):
                print(f"⏳ {update['progress_message']}")
    
    try:
        # Run the research
        result = await run_research_agent(question, cli_progress_callback)
        
        print("\n" + "=" * 60)
        
        if result["success"]:
            print("🎉 Research Complete!")
            print("\n📝 FINAL ANSWER:")
            print("-" * 40)
            print(result["final_answer"])
            
            if result["citations"]:
                print(f"\n📚 SOURCES ({len(result['citations'])}):")
                print("-" * 40)
                for i, citation in enumerate(result["citations"][:10], 1):
                    print(f"{i}. {citation}")
            
            summary = result.get("research_summary", {})
            if summary:
                print(f"\n📊 RESEARCH SUMMARY:")
                print("-" * 40)
                print(f"Total Queries: {summary.get('total_queries', 'N/A')}")
                print(f"Total Sources: {summary.get('total_sources', 'N/A')}")
                print(f"Research Loops: {summary.get('research_loops', 'N/A')}")
                print(f"Completion Time: {summary.get('completion_time', 'N/A')}")
        
        else:
            print("❌ Research Failed!")
            print(f"Error: {result.get('error', 'Unknown error')}")
            
            if result.get("errors"):
                print("\nDetailed Errors:")
                for error in result["errors"]:
                    print(f"  - {error}")
    
    except Exception as e:
        print(f"❌ Fatal Error: {str(e)}")
        return False
    
    return result["success"]

def validate_environment():
    """Validate required environment variables"""
    required_vars = [
        "GEMINI_API_KEY",
        # We no longer need these since we're using Gemini's native search
        # "GOOGLE_SEARCH_API_KEY", 
        # "GOOGLE_SEARCH_ENGINE_ID"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"  - {var}")
        print("\nPlease set these variables in your .env file or environment.")
        return False
    
    print("✅ All required environment variables are set.")
    return True

def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(description="Deep Research Agent - LangGraph Backend")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Research command
    research_parser = subparsers.add_parser("research", help="Run research on a question")
    research_parser.add_argument("question", help="The research question")
    research_parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    # Server command
    server_parser = subparsers.add_parser("server", help="Start API server")
    server_parser.add_argument("--host", default="0.0.0.0", help="Server host")
    server_parser.add_argument("--port", type=int, default=8000, help="Server port")
    server_parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    
    # Config command
    config_parser = subparsers.add_parser("config", help="Check configuration")
    
    # Test command
    test_parser = subparsers.add_parser("test", help="Run quick test")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Check configuration for all commands except config
    if args.command != "config":
        if not validate_environment():
            return
    
    if args.command == "research":
        # Run research
        success = asyncio.run(run_cli_research(args.question, args.verbose))
        exit(0 if success else 1)
    
    elif args.command == "server":
        # Start API server
        print(f"🚀 Starting Deep Research Agent API server...")
        print(f"   Host: {args.host}")
        print(f"   Port: {args.port}")
        print(f"   Reload: {args.reload}")
        print(f"   URL: http://{args.host}:{args.port}")
        
        start_server(args.host, args.port, args.reload)
    
    elif args.command == "config":
        # Check configuration
        print("🔧 Deep Research Agent Configuration")
        print("=" * 40)
        
        print(f"Configuration Valid: {config.validate()}")
        print(f"Gemini API Key: {'✅ Set' if config.google_api_key else '❌ Missing'}")
        print(f"Google Search API Key: {'✅ Set' if config.google_search_api_key else '❌ Missing'}")
        print(f"Google Search Engine ID: {'✅ Set' if config.google_search_engine_id else '❌ Missing'}")
        
        print(f"\nResearch Parameters:")
        print(f"  Initial Queries: {config.initial_queries_count}")
        print(f"  Max Research Loops: {config.max_research_loops}")
        print(f"  Max Sources per Query: {config.max_sources_per_query}")
        print(f"  Search Timeout: {config.search_timeout_seconds}s")
    
    elif args.command == "test":
        # Run quick test
        test_question = "What is the current population of Tokyo?"
        print(f"🧪 Running quick test with question: {test_question}")
        
        success = asyncio.run(run_cli_research(test_question, verbose=True))
        
        if success:
            print("\n✅ Test completed successfully!")
        else:
            print("\n❌ Test failed!")
            exit(1)

if __name__ == "__main__":
    main()