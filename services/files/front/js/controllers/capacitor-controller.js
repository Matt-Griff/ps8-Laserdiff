import { Capacitor, registerPlugin } from "https://cdn.jsdelivr.net/npm/@capacitor/core@8.3.1/dist/index.min.js";

const ScreenOrientation = registerPlugin("ScreenOrientation");
const Haptics = registerPlugin("Haptics");

(async () => {
    if (Capacitor.getPlatform() === "web") return;

    try {
        await ScreenOrientation.lock({ orientation: "portrait" });
    } catch (error) {
        console.warn("Failed to lock screen orientation:", error);
    }
})();

let vibrationActive = false;
let vibrationTimer = null;

function vibrate(duration = 100) {
    if (Capacitor.getPlatform() === "web") {
        return;
    } else {
        Haptics.vibrate({ duration: duration });
    }
}

function startVibration(duration = 100, interval = 120) {
    if (Capacitor.getPlatform() === "web" || vibrationActive) {
        return;
    }

    vibrationActive = true;
    vibrate(duration);
    vibrationTimer = setInterval(() => {
        if (!vibrationActive) {
            return;
        }

        vibrate(duration);
    }, interval);
}

function stopVibration() {
    vibrationActive = false;
    if (vibrationTimer) {
        clearInterval(vibrationTimer);
        vibrationTimer = null;
    }
}

export { vibrate, startVibration, stopVibration };     