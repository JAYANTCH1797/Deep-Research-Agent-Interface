import os
import asyncio
from config import config
from nodes import get_llm, get_openai_client

async def test_openai():
    """Test OpenAI integration"""
    print("\n✅ Configured OpenAI with API key:", config.openai_api_key[:5] + "..." + config.openai_api_key[-5:])
    
    print("\n🔍 Testing basic text generation...")
    try:
        llm = get_llm()
        response = await llm.ainvoke(["Hello, world!"])
        print("✅ Basic generation succeeded")
        print("Response text:", response.content[:100] + "...")
    except Exception as e:
        print("❌ Basic generation failed:", str(e))
        raise
        
    print("\n🔍 Testing generation with web search...")
    try:
        client = get_openai_client()
        response = await client.chat.completions.create(
            model=config.web_searcher_model,
            messages=[{
                "role": "user",
                "content": "What is the current population of Tokyo? Please search the web for accurate information."
            }]
        )
        print("✅ Search generation succeeded")
        print("Response text:", response.choices[0].message.content[:100] + "...")
    except Exception as e:
        print("❌ Search generation failed:", str(e))
        raise
        
    print("\n✅ All tests passed!")

if __name__ == "__main__":
    asyncio.run(test_openai()) 