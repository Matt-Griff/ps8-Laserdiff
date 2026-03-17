// import { getMyJWT } from ('./user-controller');
// import { CONFIG } from "../config";

// const updatePP = (url) => {
//     const jwt = getMyJWT();
//     fetch(`${CONFIG.API_URL}/users/update_pp`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${jwt}`
//         },
//         body: JSON.stringify({ pp_url: url })
//     }).then(response => {
//         if (response.ok) {
//             alert('Profile picture updated successfully!');
//         } else {
//             alert('Failed to update profile picture.');
//         }
//     })
//     .catch(error => {
//         console.error('Error updating profile picture:', error);
//         alert('An error occurred while updating profile picture.');
//     });
// }

// export { updatePP };

