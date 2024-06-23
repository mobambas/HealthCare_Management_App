import os
from groq import Groq

os.environ['GROQ_API_KEY'] = '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'
client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

chat_completion = client.chat.completions.create(
    messages=[
        {
            "role": "user",
            "content": "I have man boob",
        }
    ],
    model="mixtral-8x7b-32768",
)

print(chat_completion.choices[0].message.content)