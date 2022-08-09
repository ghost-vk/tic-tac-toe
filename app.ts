import express, { Express, Request, Response } from 'express';
import WebSocket from 'ws';

const app: Express = express();
const wss = new WebSocket.Server({ port: 8081 })

function onConnect(ws: WebSocket) {
  console.log('New user');

  ws.send('Hello');
  
  ws.on('message', (message) => {
    console.log(`Got message: ${message}`);
    ws.send(`Hello, you sent -> ${message}`);
  })

  ws.on('close', () => {
    console.log('User disconnected');
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
