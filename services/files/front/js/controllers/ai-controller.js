const greetUser = () => {
    if (sessionStorage.getItem('ingame_muted') !== 'true') {
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('ingame-chat-message', {
                detail: { author: 'AI', text: 'Hello !', isMe: false }
            }));
        }, 1000);
    }
}

const sayGoodGame = () => {
    if (sessionStorage.getItem('ingame_muted') !== 'true') {
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('ingame-chat-message', {
                detail: { author: 'AI', text: 'Good game !', isMe: false }
            }));
        }, 500);
    }
}

export {greetUser, sayGoodGame}