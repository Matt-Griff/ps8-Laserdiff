// import { updatePP } from "../../js/controllers/user-update";

document.addEventListener('DOMContentLoaded', async () => {
    const all_champions = await fetch("https://ddragon.leagueoflegends.com/cdn/16.5.1/data/en_US/champion.json").then(res => res.json()).then(data => data.data);
    const all_champions_names = Object.keys(all_champions).map(key => all_champions[key].id);
    const champions_url = "https://ddragon.leagueoflegends.com/cdn/16.5.1/img/champion/";

    const list = document.getElementById("pp-list");

    for (const championName of all_champions_names) {
        const skinDiv = document.createElement("div");
        skinDiv.classList.add("skin-card");
        const skinImg = document.createElement("img");
        skinImg.src = `${champions_url}${championName}.png`;
        skinImg.alt = `${championName} skin`;
        skinImg.classList.add("skin-img");
        skinDiv.appendChild(skinImg);
        list.appendChild(skinDiv);
        skinDiv.addEventListener("click", () => {
            console.log(skinImg.src);
            // updatePP(skinImg.src);
        });
    }
});