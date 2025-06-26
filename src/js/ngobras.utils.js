// Utility function to safely get DOM elements
export function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.debug(`Element with id '${id}' not found - this is expected on non-chat pages`);
        return null;
    }
    return element;
}

// Scroll to bottom
export function scrollToBottom() {
    const messagesContainer = getElement('chat-messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}