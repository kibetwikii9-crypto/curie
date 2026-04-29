// Automify Chat Widget
(function() {
    'use strict';

    // Configuration
    var widgetId = document.currentScript.getAttribute('data-widget-id');
    var apiUrl = document.currentScript.getAttribute('data-api-url') || 'https://www.automifyyai.com';

    if (!widgetId) {
        console.error('Automify Chat Widget: Missing data-widget-id attribute');
        return;
    }

    // Create widget container
    var widgetContainer = document.createElement('div');
    widgetContainer.id = 'automify-chat-widget';
    widgetContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: none;
        overflow: hidden;
    `;

    // Create toggle button
    var toggleButton = document.createElement('div');
    toggleButton.id = 'automify-chat-toggle';
    toggleButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 999998;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    `;

    toggleButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.05 1.05 4.42L2 22l5.58-1.05C9.95 21.64 11.46 22 13 22h7c1.1 0 2-.9 2-2V12c0-5.52-4.48-10-10-10z"/>
        </svg>
    `;

    // Widget header
    var widgetHeader = document.createElement('div');
    widgetHeader.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: space-between;
    `;

    widgetHeader.innerHTML = `
        <div style="display: flex; align-items: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style="margin-right: 8px;">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.05 1.05 4.42L2 22l5.58-1.05C9.95 21.64 11.46 22 13 22h7c1.1 0 2-.9 2-2V12c0-5.52-4.48-10-10-10z"/>
            </svg>
            Chat Support
        </div>
        <button id="automify-close-widget" style="background: none; border: none; color: white; cursor: pointer; padding: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
        </button>
    `;

    // Chat messages container
    var messagesContainer = document.createElement('div');
    messagesContainer.id = 'automify-messages';
    messagesContainer.style.cssText = `
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        background: #f8fafc;
    `;

    messagesContainer.innerHTML = `
        <div style="text-align: center; color: #64748b; margin-top: 20px;">
            <div style="font-size: 14px; margin-bottom: 8px;">👋 Welcome to Automify AI</div>
            <div style="font-size: 12px;">How can we help you today?</div>
        </div>
    `;

    // Input container
    var inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
        border-top: 1px solid #e2e8f0;
        padding: 16px;
        background: white;
        display: flex;
        gap: 8px;
    `;

    inputContainer.innerHTML = `
        <input
            type="text"
            id="automify-message-input"
            placeholder="Type your message..."
            style="
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                outline: none;
                font-size: 14px;
            "
        />
        <button
            id="automify-send-button"
            style="
                padding: 8px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            "
        >
            Send
        </button>
    `;

    // Assemble widget
    widgetContainer.appendChild(widgetHeader);
    widgetContainer.appendChild(messagesContainer);
    widgetContainer.appendChild(inputContainer);

    // Add to page
    document.body.appendChild(toggleButton);
    document.body.appendChild(widgetContainer);

    // Event handlers
    var isOpen = false;

    toggleButton.addEventListener('click', function() {
        isOpen = !isOpen;
        widgetContainer.style.display = isOpen ? 'flex' : 'none';
        widgetContainer.style.flexDirection = 'column';
        toggleButton.style.transform = isOpen ? 'scale(0.9)' : 'scale(1)';
    });

    document.getElementById('automify-close-widget').addEventListener('click', function() {
        isOpen = false;
        widgetContainer.style.display = 'none';
        toggleButton.style.transform = 'scale(1)';
    });

    // Send message functionality
    function sendMessage(message) {
        if (!message.trim()) return;

        // Add user message
        addMessage(message, 'user');

        // Clear input
        document.getElementById('automify-message-input').value = '';

        // Send to API (placeholder - implement actual API call)
        fetch(apiUrl + '/api/integrations/webchat/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                widget_id: widgetId,
                message: message,
                sender_id: 'visitor_' + Date.now()
            })
        })
        .then(response => response.json())
        .then(data => {
            // Handle response (placeholder)
            console.log('Message sent:', data);
        })
        .catch(error => {
            console.error('Error sending message:', error);
            addMessage('Sorry, there was an error sending your message. Please try again.', 'bot');
        });
    }

    function addMessage(text, sender) {
        var messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            margin-bottom: 12px;
            display: flex;
            ${sender === 'user' ? 'justify-content: flex-end;' : ''}
        `;

        var messageBubble = document.createElement('div');
        messageBubble.style.cssText = `
            max-width: 70%;
            padding: 8px 12px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.4;
            ${sender === 'user'
                ? 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;'
                : 'background: white; color: #374151; border: 1px solid #e5e7eb;'
            }
        `;

        messageBubble.textContent = text;
        messageDiv.appendChild(messageBubble);
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Send button click
    document.getElementById('automify-send-button').addEventListener('click', function() {
        var input = document.getElementById('automify-message-input');
        sendMessage(input.value);
    });

    // Enter key in input
    document.getElementById('automify-message-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage(this.value);
        }
    });

    console.log('Automify Chat Widget loaded for widget ID:', widgetId);

})();