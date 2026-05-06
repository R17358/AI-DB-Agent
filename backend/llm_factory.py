from config import settings
from langchain.schema import BaseMessage


def get_llm():
    provider = settings.LLM_PROVIDER.lower()
    model = settings.LLM_MODEL
    api_key = settings.LLM_API_KEY

    if provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            temperature=0.2,
            convert_system_message_to_human=True,
        )
    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model, openai_api_key=api_key, temperature=0.2)
    elif provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=model, anthropic_api_key=api_key, temperature=0.2)
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}. Use: google, openai, anthropic")
