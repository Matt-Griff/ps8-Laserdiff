import { parseBody } from "../bodyparser/bodyparser.js";

const handleAuthRequest = async (request, response, filePath) => {
   
    if(filePath[3] === "login" && request.method === "POST") {
        try {
            const data = await parseBody(request);
            const { username, password } = data;
            
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ message: `User ${username} logged in successfully.` }));
        
        } catch (error) {
            response.statusCode = 400;
            response.end("Invalid request");
        }
    }

    else if (filePath[3] === "signup" && request.method === "POST") {
        try {
            const data = parseBody(request);
            const {username, password} = data;

        } catch (error) {
            response.statusCode = 400;
            response.end("Invalid request");
        }
    }
}

export { handleAuthRequest };