import { Capacitor } from "https://cdn.jsdelivr.net/npm/@capacitor/core@8.3.1/dist/index.min.js";

const getGatewayURL = () => {

    if (Capacitor.getPlatform() !== "web") {
        return "https://laserdiff.ps8.pns.academy";
    }

    const hostName = window.location.hostname;

    if (hostName === 'localhost' || hostName === '127.0.0.1') {
        return 'http://localhost:8000';
    }

    return window.location.origin;
}


export const CONFIG = {
    GATEWAY_URL: getGatewayURL(),
    TURN_TIME: "10:00"
};