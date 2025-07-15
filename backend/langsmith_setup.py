"""
LangSmith Integration for Deep Research Agent
This module initializes LangSmith tracing when imported.
"""

import os
from dotenv import load_dotenv

def setup_langsmith():
    """
    Initialize LangSmith tracing based on environment variables.
    This function checks for the existence of LangSmith API keys and sets up tracing accordingly.
    """
    # Load environment variables (in case they haven't been loaded yet)
    load_dotenv()
    
    # Check if LangSmith API key is configured
    langsmith_api_key = os.getenv("LANGSMITH_API_KEY") or os.getenv("LANGCHAIN_API_KEY")
    if not langsmith_api_key:
        print("⚠️ LangSmith API key not found. Tracing will be disabled.")
        return False
        
    # Check if tracing is explicitly enabled
    tracing_enabled = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true"
    if not tracing_enabled:
        print("⚠️ LangSmith tracing is not enabled. Set LANGCHAIN_TRACING_V2=true to enable.")
        return False
    
    # Set project name if not already set
    project_name = os.getenv("LANGCHAIN_PROJECT")
    if not project_name:
        os.environ["LANGCHAIN_PROJECT"] = "deep-research-agent"
        print("📊 LangSmith project name set to 'deep-research-agent'")
    else:
        print(f"📊 LangSmith project name: {project_name}")
    
    print("✅ LangSmith tracing is enabled")
    print(f"🔗 View traces at: https://smith.langchain.com/projects/{os.getenv('LANGCHAIN_PROJECT')}")
    
    return True

# Automatically setup LangSmith when this module is imported
langsmith_enabled = setup_langsmith()
