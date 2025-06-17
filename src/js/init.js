// Initialize chat buttons
document.addEventListener('DOMContentLoaded', () => {
    const chatButtons = document.querySelectorAll('[data-action="start-chat"]');
    
    chatButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof window.startChat === 'function') {
                window.startChat();
            } else {
                console.error('startChat function not available');
                window.location.href = 'ngobras.html';
            }
        });
    });
});
