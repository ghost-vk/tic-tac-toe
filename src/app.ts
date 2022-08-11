import express, { Express, Request, Response } from 'express';
import WebSocket from 'ws';

import { Game, GameDto } from './game';
import { Player } from './player';

const app: Express = express();
const wss = new WebSocket.Server({ port: 8081 })

function onConnect(ws: WebSocket) {
  const player = Player.create(); 

  const newPlayerResponse = JSON.stringify({ player });
  ws.send(newPlayerResponse);
  
  ws.on('message', (message) => {
    const messageResponse = JSON.stringify({ player, message });
    ws.send(messageResponse);
  })

  ws.on('close', () => {
    Player.deletePlayer(player.id);
  })

  ws.send('Immediately answer');
}

app.get('/', (req: Request, res: Response) => {
  res.send('Works');
});

wss.on('connection', onConnect);

app.listen(8080, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:8080`);
});

setTimeout(() => {
  const p1 = Player.create().toDto();
  const p2 = Player.create().toDto();
  const gameDto = new GameDto(p1, p2, 3);
  const game = new Game<3>(gameDto);
  game.logBoard();
}, 1000)


