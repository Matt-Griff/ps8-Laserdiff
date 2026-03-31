import { CONFIG } from "../../js/config.js";
import { getMyUsername, getMyJWT } from "../../js/controllers/user-controller.js";
import { updatePP } from "../../js/controllers/user-update.js";
import { sendFriendRequest, getFriendsList, revokeFriendship, getFriendRequestsSent } from "../../js/friends/friend-command.js";


const CHAMPION_VERSION = "16.5.1";

const applyProfileBackground = (pp) => {
    const container = document.getElementsByClassName('profile-container')[0];
    if (!container) {
        return;
    }

    if (pp && pp.includes('ddragon.leagueoflegends.com')) {
        const champion = pp.split('/').pop().replace('.png', '');
        const backgroundUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion}_0.jpg`;
        container.style.backgroundImage = `url(${backgroundUrl})`;
    } else {
        container.style.backgroundImage = '';
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const modal = document.getElementById('editModal');
    const closeBtn = document.querySelector('.close-modal');
    const iconList = document.getElementById('modal-icon-list');
    const profilePicture = document.getElementById('profile-picture');

    let iconsLoaded = false;

    const setActiveIcon = (selectedUrl) => {
        if (!iconList) {
            return;
        }
        iconList.querySelectorAll('.modal-icon-card').forEach((button) => {
            if (button.dataset.ppUrl === selectedUrl) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    };

    const loadIconsIntoModal = async () => {
        if (!iconList || iconsLoaded) {
            return;
        }

        try {
            const data = await fetch(`https://ddragon.leagueoflegends.com/cdn/${CHAMPION_VERSION}/data/en_US/champion.json`)
                .then((res) => res.json());
            const champions = Object.values(data.data).map((champion) => champion.id);
            const baseUrl = `https://ddragon.leagueoflegends.com/cdn/${CHAMPION_VERSION}/img/champion/`;

            champions.forEach((championName) => {
                const iconUrl = `${baseUrl}${championName}.png`;
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'modal-icon-card';
                button.dataset.ppUrl = iconUrl;
                button.innerHTML = `<img src="${iconUrl}" alt="${championName} icon">`;

                button.addEventListener('click', async () => {
                    setActiveIcon(iconUrl);
                    if (profilePicture) {
                        profilePicture.src = iconUrl;
                    }
                    applyProfileBackground(iconUrl);

                    try {
                        await updatePP(getMyUsername(), iconUrl);
                        closeModal();
                    } catch (error) {
                        console.error(`Error updating profile picture: ${error.message}`);
                        alert('An error occurred while updating profile picture. Please try again.');
                    }
                });

                iconList.appendChild(button);
            });

            iconsLoaded = true;
        } catch (error) {
            console.error(`Error loading champion icons: ${error.message}`);
        }
    };

    const closeModal = () => {
        if (modal) {
            modal.style.display = 'none';
        }
    };

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            closeModal();
        });

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeModal();
            }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('user')) {
        // Handle the case where the user is viewing another user's profile
        const params = new URLSearchParams(window.location.search);
        const username = decodeURIComponent(params.get('user'));
        const userData = await fetch(`${CONFIG.GATEWAY_URL}/api/public/user/${username}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch user data');
                return res.json();
            })
            .catch(error => {
                console.error(`Error fetching user data: ${error.message}`);
                return null;
            });

        if (userData) {
            updateProfile(userData);
        }

        // Case not my profile
        if (getMyUsername() !== username) {
            const editPicture = document.querySelector('#edit-profile-picture');
            if (editPicture) {
                editPicture.hidden = true;
            }
            const buttonContainer = document.querySelector('.button-container');
            if (buttonContainer) {
                buttonContainer.hidden = false;
                editButton(buttonContainer, username, userData);
            }
            // Case my profile
        } else {
            const editPicture = document.querySelector('#edit-profile-picture');
            if (editPicture) {
                editPicture.hidden = false;
                editPicture.addEventListener('click', async () => {
                    if (modal) {
                        setActiveIcon(profilePicture ? profilePicture.src : "");
                        await loadIconsIntoModal();
                        modal.style.display = 'flex';
                    }
                });
            }
            const buttonContainer = document.querySelector('.button-container');
            if (buttonContainer) {
                buttonContainer.hidden = true;
            }

        }
    } else {
        console.warn("No username found in URL parameters.");
    }

    const setElo = (username) => {
        const eloElement = document.querySelector('.elo-indicator');
        if (eloElement) {
            fetch(`${CONFIG.GATEWAY_URL}/api/user/${username}/elo`, {
                headers: { 'Authorization': `Bearer ${getMyJWT()}` }
            })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch user elo');
                return res.json();
            })
            .then(data => {
                eloElement.textContent = data.elo;
            });
        }
    }

    setElo(urlParams.get('user'));
});

function updateProfile(userData) {
    const name = document.getElementsByClassName('username')[0];
    const status = userData?.status || 'offline';
    name.textContent = userData.username;
    name.id = userData.userId;
    document.getElementById('profile-picture').src = userData.pp;
    document.querySelector('.status-indicator').className = `status-indicator ${status}`;
    applyProfileBackground(userData.pp);
}

async function editButton(container, username, userData) {
    const friend = container.querySelector('#friend-button');
    if (!friend) {
        return;
    }

    try {
        const friendsResponse = await getFriendsList();
        const friends = Array.isArray(friendsResponse?.friends) ? friendsResponse.friends : [];
        const isFriend = friends.some((friendUser) => friendUser.username === username);

        if (isFriend) {
            friend.textContent = 'Revoke friendship';
            friend.disabled = false;
            friend.onclick = async () => {
                try {
                    await revokeFriendship(username);
                    friend.textContent = 'Ask to be friend';
                } catch (error) {
                    console.error('Error revoking friendship:', error);
                }
            };

            if (userData?.status === "online" || userData?.status === "in-game") {
                const duelButton = container.querySelector('#send-duel');
                if (duelButton) {
                    duelButton.disabled = false;
                }
            }

            return;
        }

        const sentRequestsResponse = await getFriendRequestsSent();
        const sentRequests = Array.isArray(sentRequestsResponse)
            ? sentRequestsResponse
            : Array.isArray(sentRequestsResponse?.sentRequests)
                ? sentRequestsResponse.sentRequests
                : [];
        const isRequestSent = sentRequests.some((request) => request.username === username);

        if (isRequestSent) {
            friend.textContent = 'Friend request sent';
        } else {
            friend.textContent = 'Ask to be friend';
            friend.onclick = async () => {
                try {
                    await sendFriendRequest(username);
                    friend.textContent = 'Friend request sent';
                    friend.disabled = true;
                } catch (error) {
                    console.error('Error sending friend request:', error);
                }
            };
            friend.disabled = false;
        }
    } catch (error) {
        console.error('Error initializing friend button:', error);
    }
}