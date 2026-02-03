const getAuthServiceUrl = () => {
    const hostName = window.location.hostname;

    if(hostName !== 'localhost' && hostName !== '127.0.0.1') {
        return `${window.location.protocol}//${hostName}:8000`;
    }

    return 'http://localhost:8000';
}

export const CONFIG = {
    AUTH_SERVICE_URL: getAuthServiceUrl()
};