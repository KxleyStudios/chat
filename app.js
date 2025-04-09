// Initialize Firebase with your project details
const firebaseConfig = {
    apiKey: "YzQxOWE3MjItZDc1ZC00Njg0LWE3YTAtYTZkYzNkNTU4YmRm",
    authDomain: "chat-4b3ca.firebaseapp.com",
    databaseURL: "https://chat-4b3ca-default-rtdb.firebaseio.com",
    projectId: "chat-4b3ca",
    storageBucket: "chat-4b3ca.appspot.com",
    messagingSenderId: "9078529490",
    appId: "1:9078529490:web:5964fd62304997059e3c0b"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM Elements
const messagesContainer = document.getElementById('messages');
const usernameInput = document.getElementById('username');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const usersList = document.getElementById('users-list');
const statusIndicator = document.getElementById('status-indicator');
const connectionStatus = document.getElementById('connection-status');

// Global variables
let username = localStorage.getItem('worldchat-username') || '';
let userId = localStorage.getItem('worldchat-userid') || generateUserId();
const messagesRef = database.ref('messages');
const usersRef = database.ref('users');
const MAX_MESSAGES = 100;

// Initialize app
function init() {
    // Set username from localStorage if available
    if (username) {
        usernameInput.value = username;
    }
    
    // Save userId to localStorage
    localStorage.setItem('worldchat-userid', userId);
    
    // Listen for connection state changes
    const connectedRef = database.ref('.info/connected');
    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            statusIndicator.classList.add('connected');
            connectionStatus.textContent = 'Connected';
            
            // Register user as online
            if (username) {
                setUserOnline(true);
            }
            
            // Remove user when disconnected
            usersRef.child(userId).onDisconnect().remove();
        } else {
            statusIndicator.classList.remove('connected');
            connectionStatus.textContent = 'Disconnected';
        }
    });
    
    // Listen for new messages
    messagesRef.limitToLast(MAX_MESSAGES).on('child_added', (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
        
        // Auto-scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
    
    // Listen for user changes
    usersRef.on('value', (snapshot) => {
        renderUsersList(snapshot.val());
    });
    
    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    usernameInput.addEventListener('change', () => {
        const newUsername = usernameInput.value.trim();
        if (newUsername) {
            username = newUsername;
            localStorage.setItem('worldchat-username', username);
            
            // Update user info
            if (statusIndicator.classList.contains('connected')) {
                setUserOnline(true);
            }
        }
    });
}

// Generate a unique user ID
function generateUserId() {
    return 'user-' + Math.random().toString(36).substr(2, 9);
}

// Set user as online in the database
function setUserOnline(isOnline) {
    if (!username) return;
    
    usersRef.child(userId).set({
        username: username,
        online: isOnline,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
}

// Send a new message
function sendMessage() {
    const messageText = messageInput.value.trim();
    username = usernameInput.value.trim();
    
    if (!messageText || !username) {
        if (!username) {
            alert('Please enter your name first');
            usernameInput.focus();
        }
        return;
    }
    
    // Save username
    localStorage.setItem('worldchat-username', username);
    
    // Make sure user is registered
    setUserOnline(true);
    
    // Create message object
    const message = {
        userId: userId,
        username: username,
        text: messageText,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Push to database
    messagesRef.push(message);
    
    // Clear input
    messageInput.value = '';
    messageInput.focus();
}

// Display a message in the UI
function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    // Check if this message is from the current user
    const isCurrentUser = message.userId === userId;
    if (isCurrentUser) {
        messageElement.classList.add('sent');
    } else {
        messageElement.classList.add('received');
    }
    
    // Create message content
    const date = new Date(message.timestamp);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-user">${message.username}</span>
            <span class="message-time">${timeString}</span>
        </div>
        <div class="message-content">${escapeHTML(message.text)}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
}

// Render the list of online users
function renderUsersList(users) {
    if (!users) {
        usersList.innerHTML = '<li>No users online</li>';
        return;
    }
    
    usersList.innerHTML = '';
    Object.values(users).forEach(user => {
        const listItem = document.createElement('li');
        listItem.textContent = user.username;
        usersList.appendChild(listItem);
    });
}

// Escape HTML to prevent XSS
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Clean up old messages (run occasionally)
function cleanupOldMessages() {
    messagesRef.once('value', (snapshot) => {
        const messages = snapshot.val();
        if (!messages) return;
        
        const messageIds = Object.keys(messages);
        if (messageIds.length <= MAX_MESSAGES) return;
        
        // Sort messages by timestamp
        const sortedIds = messageIds.sort((a, b) => {
            return messages[a].timestamp - messages[b].timestamp;
        });
        
        // Delete oldest messages
        const idsToDelete = sortedIds.slice(0, messageIds.length - MAX_MESSAGES);
        idsToDelete.forEach(id => {
            messagesRef.child(id).remove();
        });
    });
}

// Run cleanup every 5 minutes
setInterval(cleanupOldMessages, 5 * 60 * 1000);

// Start the app
window.onload = init;
