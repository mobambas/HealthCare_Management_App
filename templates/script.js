document.getElementById('sendButton').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

let messageHistory = '';
let latestReply = '';

async function sendMessage() {
    const userInput = document.getElementById('userInput').value.trim();
    if (userInput === '') return;

    addMessageToChatbox(userInput, 'user-message');
    document.getElementById('userInput').value = '';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer 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`,  // Directly use the API key here
        },
        body: JSON.stringify({
            messages: [
                {
                    "role": "user",
                    "content": userInput
                }
            ],
            model: "llama3-8b-8192",  // Specify the model to use
        }),
    });

    const data = await response.json();
    const botReply = data.choices[0].message.content;
    messageHistory += `\nUser: ${userInput}\nBot: ${botReply}`;
    latestReply = botReply;

    addMessageToChatbox(botReply, 'bot-message');
}

function addMessageToChatbox(message, type) {
    const chatbox = document.getElementById('chatbox');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.innerHTML = `
        <img src="${type === 'bot-message' ? 'bot-icon.png' : 'user-icon.png'}" class="bot-icon" alt="${type === 'bot-message' ? 'Bot' : 'User'}">
        <p>${message}</p>
    `;
    chatbox.appendChild(messageElement);
    chatbox.scrollTop = chatbox.scrollHeight;
}