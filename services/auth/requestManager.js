const { parseBody } = require("./bodyparser/bodyparser");
const { runQuery, getUser, registerUser } = require("./data/mongo");

const handleAuthRequest = async (request, response) => {
    const route = request.url.split("/").filter(elem => elem !== "..");

    if(route[3] === "login" && request.method === "POST") {
        try {
            const data = await parseBody(request);
            const { username, password } = data;
            
            const user = await getUser(username, password);

            if(!user) {
                response.statusCode = 401;
                response.end("Unauthorized");
                return;
            }

            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ message: `User ${username} logged in successfully.` }));

        } catch (error) {
            response.statusCode = 400;
            response.end("Invalid request");
        }
    } else if (route[3] === "register" && request.method === "POST") {
        try {
            const data = await parseBody(request);
            const { username, password } = data;

            const result = await registerUser(username, password);
            response.statusCode = 201;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ message: `User ${username} registered successfully.` }));
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