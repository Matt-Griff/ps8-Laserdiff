const parseBody = async (request) => {
    if(request.method === "POST" || request.method === "PUT") {
        return new Promise((resolve, reject) => {
            let body = "";
            request.on("data", chunk => {
                body += chunk.toString();
            });
            request.on("end", () => {
                try {
                    const data = JSON.parse(body);
                    resolve(data);
                }
                catch (error) {
                    reject(new Error("Invalid JSON"));
                }
            });
        });
    } else {
        return Promise.resolve(null);
    }
}

module.exports =  { parseBody };