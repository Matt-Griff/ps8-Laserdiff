const { getUser, updateUser, getUserStatus, updateUserStatus } = require("../mongo/mongo.js");


const handleUpdateUserInfo = async (request, response) => {

}

const handleGetUserInfo = async (request, response) => {
    
    if(request.url.includes("status")) {
        const username = request.url.split("/")[3];
        const status = await getUserStatus(username);
        if(status) {
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                message: "User status retrieved successfully",
                status
             }));
        }
        else {
            response.statusCode = 404;
            response.end("User status not found");
        }
    }
}

module.exports = {
    handleUpdateUserInfo,
    handleGetUserInfo
};