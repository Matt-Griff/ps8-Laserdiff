const getGatewayURL = () => {
    const hostName = window.location.hostname;

    if(hostName !== 'localhost' && hostName !== '127.0.0.1') {
        return `${window.location.protocol}//${hostName}:80`.replace('https', 'http');
    }

    return 'http://localhost:8000';
}

export const CONFIG = {
    GATEWAY_URL: getGatewayURL()
};