"""Standalone test — does Nano respond at all?"""

import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

ENV = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV)

API_KEY = os.getenv("NEBIUS_API_KEY")
BASE_URL = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1/")
MODEL = os.getenv("NEMOTRON_MODEL", "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B")

print("API key present:", bool(API_KEY))
print("Base URL:", BASE_URL)
print("Model:", MODEL)
print("-" * 60)

client = OpenAI(base_url=BASE_URL, api_key=API_KEY)

resp = client.chat.completions.create(
    model=MODEL,
    messages=[
        {"role": "system", "content": "Return JSON only. No prose."},
        {"role": "user", "content": 'Return exactly {"text": "hello"}'},
    ],
    temperature=0.2,
    max_tokens=100,
)

choice = resp.choices[0]
print("finish_reason:", choice.finish_reason)
print("content:", repr(choice.message.content))
print("usage:", resp.usage)