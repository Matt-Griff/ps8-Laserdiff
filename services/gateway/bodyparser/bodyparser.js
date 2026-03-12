const parseBody = (request) => {
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
                    const contentType = request.headers["content-type"] || "";
                    if (contentType.includes("application/json")) {
                        resolve(JSON.parse(body));
                    } else {
                        reject(new Error(`Unsupported Content-Type: ${contentType}`));
                    }
                } catch (error) {
                    reject(new Error("Invalid JSON"));
                }
            });
        });
    }
    return Promise.resolve(null);
}

module.exports = { parseBody };