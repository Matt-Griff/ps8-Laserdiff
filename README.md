# PS8

## Team LaserDiff
- [Louis Duban](https://github.com/Louis-DBN)
- [Matthieu Griffonnet](https://github.com/Matt-Griff/)
- [Thomas Portelette](https://github.com/ThomasPorteletteGit/)

## Requirements

Node.js, Docker

## Install & Run with Docker

- Clone the repository
- Create two folder named `data` and `dump` in the root of the project (Those folders are used as volumes for the database, not creating them will cause the database not to start)

- Create a `.env` file in the following folders:
    - `services/auth`
    - `services/gateway`

- The content of the `.env` file should be:
```
JWT_ACCESS_TOKEN_KEY=laser-diff-saveus-sweden-ahou-prince-buse
JWT_REFRESH_TOKEN_KEY=laser-diff-c-y-k-c-b-refresh
```

- Change directory to the `services` folder

- Run `docker compose up --build -d` to start every service and a mongodb image. This will also install all the dependencies of each service (according to the Dockerfiles)

Since the database is first running "mongorestore", you'll have to wait a bit before the database is ready (approx. 30 seconds) (That's why the first signup can be long after starting the containers). You can check the logs of the database with `docker compose logs mongo_database` to see when it's ready.

And then, everything is ready! The website is available at `http://localhost:8000` and you can start using it. You can also check the logs of each service with `docker compose logs <service_name>` to see if everything is working correctly.


## Troubleshooting

If the database process exits with an error, it is either because the `data` and `dump` folders are not created, or because of the scripts from the `scripts/` folder that are not in LF format but in CRLF format. To fix the second issue, you can run `dos2unix scripts/*` on any Linux distribution to convert all the scripts to LF format, or the way you want.

---
## Features

- User :
    - Login / Register with JWT authentication (access and refresh tokens)
    - Update profile picture on the profile page
    - Elo rating system and league system, every user is in a league according to their elo rating going from LR a 0 to Challenger at 2400. The elo rating is updated after each game, and the user can see their current league and elo rating on their profile page, on the leaderboard and on the home page in the up right corner.
    - Profile page where the user can see their profile picture, elo rating, league, and a list of their last games with the result of each game (win/loss/draw) and the elo rating change after each game.
    - Leaderboard page where the user can see the top players with their profile picture, elo rating, league, and a link to their profile page.
    - A friend system where the user can send friend requests, accept or refuse them, and see their friends list. The user can also duel their friends by clicking on the "Duel" button on their profile page, which will create a private game room and send a notification to the friend to join the game.
    
- Game :
    - Every game is played following the standard rules of Khet, the rules are explained in the "Learn" section of the burger menu on the left of every page.
    - Local 1v1 game
    - Local Player vs AI game, the AI algorithm is based on a simple minimax algorithm, which is timed to not take more than 250 ms to make a move.
    - Online 1v1 game, the player can enter a game room and wait for an opponent to join, or ask a friend to duel which will create a private room and send a notification to the connected friend, allowing him to join. The matchmaking isn't based on the elo rating for now, but it could be implemented in the future.
    - If a player disconnects during a game, they have 30 seconds to reconnect and continue the game.
    - A timer of 10 minutes for each player, if a player runs out of time, they lose the game.

- Chat :
    - Global chat available on every page, where every connected user can send messages and see the messages of other users in real time.
    - Private chat available in the game room, where only the players of the game can send messages and see the messages of the other player in real time. The messages here consists of emotes and pre-defined messages like "Hello", "Good game" etc... that the player can choose from a list.
    - Friend chat available on the profile page of each friend, where only the user and the friend can send messages and see the messages in real time.
    - Friend chat messages are stored in the database.

    - On global chat, some stop words are filtered and replaced by "****" to avoid toxicity in the chat.

---

## Architecture

In the `services/` folder you will find all the projects that makes our website. Each subfolder is a node.js project
that contains:
- A `package.json` (and potentially some `node_modules`)
- An `index.js` file which is an HTTP server able to received requests
- Some logic used for the service to work correctly

---

The services are:
- `auth` (HTTP): responsible for the authentication of the users, it handles the login and register requests, and generates the JWT tokens (access and refresh tokens) for the authenticated users. It also has a route to refresh the access token using the refresh token.
- `chat` (WebSocket): responsible for the real-time chat functionality, it uses socket.io to allow users to send and receive messages in real time. It also has some logic to filter the messages and replace some ban words by "****" to avoid toxicity in the global chat.
- `files` (HTTP): the file service reponsible for storing every static files of the website (html, css, js, images, etc...) and serving them when requested.
- `friends` (HTTP): responsible for the friend system, it handles the friend requests, acceptances, refusals, and the friends list of each user.
- `game` (WebSocket): responsible for the game logic, it handles the game rooms, the game state, and the game rules. Basically, every game mode (local, vs AI, online) is handled by this service. It also has some logic to handle the disconnections during a game and the game timer.
- `gateway` (HTTP/WebSocket): responsible for routing the requests to the appropriate service, it uses axios to forward the requests to the correct service based on the URL path. It also serves the static files of the frontend (the website) (using the files service) and handles the WebSocket connections for the real-time functionalities (chat and game state updates).
It keeps internal services secure and makes handling authentication (JWTs) much easier since it all happens in one place.
- `ranking` (HTTP): responsible for the elo rating system, the league system and game history system, it handles the elo rating updates after each game, and provides the current elo rating and league of each user when requested. It also has a route to get the leaderboard of the top players. At the end of each game, the game service sends a request to the ranking service to update the elo rating of the players and to save the game result in their game history. Separated from game service to avoid lag for active players.
- `users` (HTTP): responsible for the user data, it handles the user profiles, and provides the user data when requested (profile picture, username, etc...).

## Communication between services
### HTTP

The majority of communication between services is done through HTTP requests, each service has its own routes to handle the requests related to its functionality, and the gateway service is responsible for forwarding the requests to the correct service based on the URL path.
For example, when a user wants to login, the frontend sends a POST request to the gateway service at the `/auth/login` route, and then the gateway service forwards this request to the auth service at the same route. The auth service then processes the request, generates the JWT tokens if the credentials are correct, and sends the response back to the gateway service, which then forwards it back to the frontend.

### WebSocket

Real-time functionalities (chat and game state updates) use WebSocket instead of HTTP, because these features require the server to push updates to clients without them explicitly asking — HTTP would require polling, which adds latency and unnecessary load. The client opens a single WebSocket connection to the gateway when the page loads. The gateway then maintains its own persistent connections to the `chat` and `game` services, and forwards incoming messages to the correct service based on their type. 
This keeps the gateway as the single entry point for all communication, which simplifies token validation and avoids exposing internal services directly to the client.

For example, when a user sends a chat message, the gateway service receives the message through the WebSocket connection, and then forwards it to the chat service to be broadcasted to the other users. Similarly, when there is a game state update (like a player making a move), the gateway service receives the update through the WebSocket connection, and then forwards it to the game service to update the game state and notify the other player.

### Both HTTP and WebSocket
Some services (like the gateway) use both HTTP and WebSocket to handle different types of requests. For example, the gateway service uses HTTP to serve the static files of the frontend and to handle the authentication requests, while it uses WebSocket to handle the real-time chat messages and game state updates. The gateway service is mainly responsible for routing the requests to the appropriate service, and it uses both HTTP and WebSocket to do so based on the type of request.

---

To create a new service:
- Create a new folder inside `services/`
- Run `npm init -y` inside the created folder
- Create an `index.js` containing an HTTP server (and listening to a new port)
- Add any logic you want

---

To call a service:

2 external packages are allowed to transfer a request:
- `http-proxy` allows you to easily transfer a request "as-is" to another HTTP Server (you have an example in the gateway service)
- `axios` to perform specific REST requests.

---

*Note: For a detailed breakdown of the Front-End architecture and components, please see the [Files Service README](./services/files/README.md).*

