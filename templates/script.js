const sendButton = document.getElementById('sendButton');
const userInputEl = document.getElementById('userInput');
const statusEl = document.getElementById('chatStatus');
const groqKeyInput = document.getElementById('groqKey');
const saveGroqKeyButton = document.getElementById('saveGroqKey');

let groqApiKey = (window.HealthHavenApp && window.HealthHavenApp.getApiKey('groq')) || '';

function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `status-message ${isError ? 'error' : 'success'}`;
}

if (groqApiKey) {
    setStatus('API key loaded from browser storage.');
}

if (saveGroqKeyButton) {
    saveGroqKeyButton.addEventListener('click', () => {
        const key = groqKeyInput.value.trim();
        if (!key) {
            setStatus('Please enter your Groq API key.', true);
            return;
        }
        groqApiKey = key;
        if (window.HealthHavenApp) {
            window.HealthHavenApp.setApiKey('groq', key);
        }
        groqKeyInput.value = '';
        setStatus('API key saved locally. You can start chatting now.');
    });
}

if (sendButton) {
    sendButton.addEventListener('click', sendMessage);
}

if (userInputEl) {
    userInputEl.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
}

async function sendMessage() {
    const userInput = userInputEl ? userInputEl.value.trim() : '';
    if (!userInput) return;

    if (!groqApiKey) {
        setStatus('Add your Groq API key to talk to the bot.', true);
        return;
    }

    addMessageToChatbox(userInput, 'user-message');
    userInputEl.value = '';
    setStatus('Bot is thinking...');

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqApiKey}`,
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'system',
                        content: 'You are a supportive healthcare assistant. Provide helpful, non-diagnostic guidance and remind users to consult professionals for emergencies.',
                    },
                    {
                        role: 'user',
                        content: userInput,
                    }
                ],
                model: 'llama3-8b-8192',
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Groq API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const botReply = data.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not retrieve a response. Please try again.';
        addMessageToChatbox(botReply, 'bot-message');
        setStatus('');
    } catch (error) {
        console.error('Chatbot error:', error);
        addMessageToChatbox('There was an issue reaching the chatbot. Please check your API key and try again.', 'bot-message');
        setStatus('Unable to reach chatbot. Verify your API key or try later.', true);
    }
}

function addMessageToChatbox(message, type) {
    const chatbox = document.getElementById('chatbox');
    if (!chatbox) return;
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.innerHTML = `
        <img src="${type === 'bot-message' ? 'bot-icon.png' : 'user-icon.png'}" class="bot-icon" alt="${type === 'bot-message' ? 'Bot' : 'User'}">
        <p>${message}</p>
    `;
    chatbox.appendChild(messageElement);
    chatbox.scrollTop = chatbox.scrollHeight;
}