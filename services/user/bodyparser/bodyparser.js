const parseBody = async (request) => {
    if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH" || request.method === "DELETE") {
        return new Promise((resolve, reject) => {
            let body = "";
            request.on("data", chunk => {
                body += chunk.toString();
            });
            request.on("end", () => {
                if (!body) {
                    resolve(null);
                    return;
                }
                try {
                    const data = JSON.parse(body);
                    resolve(data);
                } catch (error) {
                    reject(new Error("Invalid JSON"));
                }
            });
        });
    }
    return Promise.resolve(null);
}

module.exports = { parseBody };