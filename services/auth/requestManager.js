const { parseBody } = require("./bodyparser/bodyparser");
const { registerUser, loginUser } = require("./data/mongo");

const handleAuthRequest = async (request, response) => {
    const route = request.url.split("/").filter(elem => elem !== "..");

    if(route[3] === "login" && request.method === "POST") {
        try {
            const data = await parseBody(request);
            const { username, password } = data;
            
            const {user, accessToken} = await loginUser(username, password);
            
            if(!user) {
                response.statusCode = 401;
                response.end("Unauthorized");
                return;
            }

            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ 
                message: `User ${username} logged in successfully.`,
                accessToken: accessToken
            }),);

        } catch (error) {
            response.statusCode = 400;
            response.end("Invalid request");
        }
    } else if (route[3] === "register" && request.method === "POST") {
        try {
            const data = await parseBody(request);
            const { username, password } = data;

            const {user, accessToken} = await registerUser(username, password);

            if(!user) {
                response.statusCode = 400;
                response.end("Registration failed");
                return;
            }

            response.statusCode = 201;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ 
                message: `User ${username} registered successfully.`,
                accessToken: accessToken
            }));
        } catch (error) {
            response.statusCode = 400;
            response.end(`Registration failed: ${error.message}`);
        }
    } else {
        response.statusCode = 404;
        response.end("Not Found");
    }


}

module.exports = { handleAuthRequest };