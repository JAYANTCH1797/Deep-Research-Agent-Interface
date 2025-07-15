"""
Utility functions for handling search results and citations from Gemini API.
"""
import re
from typing import Dict, List, Any, Optional
from datetime import datetime

def resolve_urls(grounding_chunks: List[Dict[str, Any]], task_id: str) -> List[Dict[str, Any]]:
    """
    Convert long URLs from grounding chunks to shorter versions for token efficiency.
    
    Args:
        grounding_chunks: List of grounding chunks from Gemini API response
        task_id: Task identifier for the current search
        
    Returns:
        List of dictionaries with original and shortened URLs
    """
    resolved_urls = []
    
    if not grounding_chunks:
        return resolved_urls
        
    # Process each grounding chunk
    for i, chunk in enumerate(grounding_chunks):
        if not chunk.get('web_search'):
            continue
            
        # Extract URL from the chunk
        url = chunk.get('web_search', {}).get('url', '')
        if not url:
            continue
            
        # Create a short identifier for the URL
        short_url = f"[{task_id}-{i+1}]"
        
        # Add to resolved URLs list
        resolved_urls.append({
            "orig_url": url,
            "short_url": short_url,
            "title": chunk.get('web_search', {}).get('title', 'Unknown Source'),
            "snippet": chunk.get('web_search', {}).get('snippet', ''),
            "value": url,
            "id": f"{task_id}-{i+1}",
            "timestamp": datetime.now().isoformat()
        })
        
    return resolved_urls

def extract_urls_from_text(text):
    """Extract URLs from text response when grounding metadata isn't available"""
    # Basic URL regex pattern
    url_pattern = r'https?://[\w\d\-\.]+\.[a-zA-Z]{2,}(?:/[\w\d\-\._~:/?#[\]@!$&\'()*+,;=]*)'
    
    # Find all URLs in the text
    import re
    urls = re.findall(url_pattern, text)
    
    # Return unique URLs
    return list(set(urls))

def get_citations(response: Any, resolved_urls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract citation information from response and resolved URLs.
    
    Args:
        response: Response object from Gemini API
        resolved_urls: List of resolved URL dictionaries
        
    Returns:
        List of citation dictionaries
    """
    if not resolved_urls:
        return []
        
    citations = []
    
    # Create citation objects
    for url_data in resolved_urls:
        citation = {
            "citation": url_data["id"],
            "short_url": url_data["short_url"],
            "url": url_data["orig_url"],
            "title": url_data["title"],
            "text_segments": [],
            "segments": [url_data]
        }
        citations.append(citation)
        
    return citations

def insert_citation_markers(text: str, citations: List[Dict[str, Any]]) -> str:
    """
    Insert citation markers into the generated text.
    
    Args:
        text: Original text from the model
        citations: List of citation dictionaries
        
    Returns:
        Text with citation markers inserted
    """
    modified_text = text
    
    # For each citation, ensure its marker is in the text
    for citation in citations:
        short_url = citation["short_url"]
        
        # Skip if the marker is already present
        if short_url in modified_text:
            continue
            
        # If not present, add it at the end of a relevant paragraph
        relevant_snippets = [seg.get("snippet", "") for seg in citation.get("segments", [])]
        for snippet in relevant_snippets:
            if snippet and len(snippet) > 20:
                # Find a paragraph that contains part of the snippet
                snippet_words = set(re.findall(r'\b\w+\b', snippet.lower()))
                paragraphs = modified_text.split('\n\n')
                
                for i, para in enumerate(paragraphs):
                    para_words = set(re.findall(r'\b\w+\b', para.lower()))
                    # Check for word overlap
                    if len(para_words & snippet_words) > 3 and not short_url in para:
                        # Add citation to the end of this paragraph
                        paragraphs[i] = para + f" {short_url}"
                        modified_text = '\n\n'.join(paragraphs)
                        break
    
    return modified_text

def format_citations_for_display(citations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Format citations for display in the final answer.
    
    Args:
        citations: List of citation dictionaries
        
    Returns:
        List of formatted citation dictionaries for display
    """
    formatted_citations = []
    
    for citation in citations:
        formatted_citation = {
            "title": citation.get("title", "Unknown Source"),
            "url": citation.get("url", "")
        }
        formatted_citations.append(formatted_citation)
        
    return formatted_citations
