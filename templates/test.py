import os
from groq import Groq

# Set GROQ_API_KEY in your environment before running this script.
api_key = os.environ.get('GROQ_API_KEY')
if not api_key:
    raise RuntimeError("Please set the GROQ_API_KEY environment variable.")

client = Groq(api_key=api_key)

chat_completion = client.chat.completions.create(
    messages=[
        {
            "role": "user",
            "content": "Hello from HealthHaven sample script.",
        }
    ],
    model="mixtral-8x7b-32768",
)

print(chat_completion.choices[0].message.content)