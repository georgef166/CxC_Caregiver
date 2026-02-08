from google.genai import types
from google import genai
import os
from dotenv import load_dotenv

load_dotenv()


def use_extended_tools(content=""):
    system_prompt = """You are designed to be a helper agent to the main agent who called you,
                         you being called means that he wished to execute a built_in tool based on
                         the content you have been prompted with"""
    # Add tools
    grounding_tool = types.Tool(
        google_search=types.GoogleSearch()
    )
    maps_tool = types.Tool(
        google_maps=types.GoogleMaps()
    )
    url_context_tool = types.Tool(
        url_context=types.UrlContext()
    )

    tools = [grounding_tool, url_context_tool, maps_tool]
    config = types.GenerateContentConfig(
        tools=tools,
        system_instruction=system_prompt,
    )
    api_key = os.environ["HELPER_API_KEY"]
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=content,
        config=config
    )

    return response


if __name__ == "__main__":
    use_extended_tools()
