# Tic Tac Toe - backend

Node.js backend application that implements the logic of the game of tic-tac-toe 
with the connection of players via websockets. Inside shows an example of 
working with event emitters. The application contains two important components: 
the connection between the players and the core of the game.

## Connection between players

A new player is created on websocket connection: 
1 websocket connection = 1 player.

After websocket connecting, the client (player) can invite another player 
knowing his ID. Players can be retrieved with query: `GET /players`.

If the invited player agrees, then a game session is created.
Several games are possible within one game session.

Main points:

- [x] Websocket connection between 2 players
- [ ] Do not end the session between players until the exit button is pressed

## Game core

Main points:

- [x] Scalable game board (3x3, 4x4, 5x5, etc.)
- [x] 15 seconds per one step or counted as loss
- [x] Win counter
- [ ] Final victory condition if one player wins 3 times in series or 10 wins in total

## Installation

1. Clone repository to your local machine
2. Install packages: `npm install`
3. (Optional) clone [frontend repository](https://github.com/ghost-vk/tic-tac-toe-front)
4. (Optional - In frontend repository) build: `npm run build`
5. Run application: `npm run dev`

If installed frontend application the directory containing this application 
must be at the same level as ([the frontend application](https://github.com/ghost-vk/tic-tac-toe-front)):

```
/your-folder
  /tic-tac-toe
    ..
  /tic-tac-toe-front
    ..
```

## Requirements

[Node.js](https://nodejs.org/en/) (v16.14.2+)

