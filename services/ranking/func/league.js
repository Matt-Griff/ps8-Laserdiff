const leaguesToThresholds = Object.freeze({
    0: "LR",
    400: "Iron",
    800: "Bronze",
    1000: "Silver",
    1200: "Gold",
    1400: "Platinum",
    1600: "Emerald",
    1800: "Diamond",
    2000: "Master",
    2200: "Grandmaster",
    2400: "Challenger"
});

const computeNewLeague = (elo) => {
    let league = "LR";
    return Object.entries(leaguesToThresholds).reduce((acc, [threshold, leagueName]) => {
        if(elo >= threshold) {
            acc = leagueName;
        }
        return acc;
    }, league);
}

export { computeNewLeague };