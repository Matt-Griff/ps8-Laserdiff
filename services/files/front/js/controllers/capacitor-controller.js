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

async function xImpacts(number = 1, options = "medium") {
    if (Capacitor.getPlatform() === "web") return;

    const impactOptions = {
        light: "light",
        medium: "medium",
        heavy: "heavy"
    };

    const validOptions = Object.keys(impactOptions);
    const selectedOption = validOptions.includes(options) ? options : "medium";

    for (let i = 0; i < number; i++) {
        await Haptics.impact({ style: impactOptions[selectedOption] });
        if (i < number - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
}

export { xImpacts };     