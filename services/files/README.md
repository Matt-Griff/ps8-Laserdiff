# Front part of the PS8 project

This folder should contain all the static files that could be returned by the file server to clients.

By default, the HTTP server used in `services/files/logic.js` will start checking for files inside this repo.
This means that when a client targets `projectName.ps8.academy/folder1/file1.png`*, 
the HTTP server will try to find `file1.png` inside `front/folder1`.

# Frontend architecture
The frontend follows a **multi-page architecture**.

- Main entry point: `front/index.html` redirects to `front/pages/home/home.html`.
- Each page lives in `front/pages/<page-name>/` with one HTML entry file and associated JS/CSS.

# Pages
Current pages and responsibilities:

- `home`: main hub to choose game modes (local, AI, online), plus side widgets for profile and friends.
- `game`: dedicated play screen (board, timers, reserve/cooldown/killed pieces, history, in-game chat, result panel).
- `profile`: user profile display (status, rank, game history) and profile editing actions.
- `contact`: social management page (search users, send requests, accept/reject requests, friends list).
- `leaderboard`: ranked player listing and league threshold visualization.
- `auth/login`: login form.
- `auth/signup`: account creation form.

Pages not created as separate screens:

- No dedicated "learn rules" page: rules are displayed via the `explanation-popup` component triggered from the burger menu.
- Duel notifications are handled globally through `notification-duel` instead of a dedicated notifications page.

# Components
The `front/components/` folder contains reusable UI blocks used across multiple contexts.

Main shared/navigation components:

- `burger-menu`: global navigation and session-dependent actions (login/profile/logout visibility).
- `disconnect-button`: logout action, injected inside `burger-menu`.
- `explanation-popup`: reusable learn/rules popup opened from `burger-menu`.
- `notification-duel`: reusable duel notification element shown on multiple pages (`home`, `contact`, `profile`, `leaderboard`).

Home and social components:

- `friends-list`: quick social panel on the home page.
- `profile-icon`: compact current-user widget on the home page.
- `laser-chat` (`chat` component): chat container reused on `home` and `game`.

Game domain components:

- `my-board`: game board rendering and interaction.
- `player-icon`: player identity/status display.
- `game-timer`: timer display.
- `piece-slot`: reserve/cooldown/killed counters.
- `end-result`: end-of-game display.
- `game-history`: game history panel (used in game layout).

Ranking/profile components:

- `leaderboard-player-card`: one player row/card on leaderboard.
- `game-card`: reusable match summary card used in profile recent history.

Loading/feedback:

- `global-throbber`: loading indicator used during login/signup submissions.

# Elements that could be components but are still page-specific
Some UI blocks are currently implemented directly in page scripts/markup and could be extracted later:

- Friend request/user list rows in `contact` (currently built with repeated `createElement` code).
- League threshold rows in `leaderboard` (currently generated in-page).
- Profile edit modal content (icon grid and controls) in `profile`.
- Game action buttons group (rotate/swap controls) in `game`.


*Note: At the start of the project, you don't have a `ps8.academy` URL, so you will have to use localhost.