import { v4 as uuidv4 } from "uuid"
import { RawData, WebSocket, Server as WebSocketServer } from "ws";
import express from "express";
import * as http from 'http';
import bodyParser from "body-parser";
import { FireShot, Message, SetupShips, UserPref } from "../types";
import { Room } from "./room";
import { Ship } from "./game/ship";
import { Events } from "./shared/events";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT ?? 3030;
const wss = new WebSocketServer({ server });

app.use(bodyParser.json())

interface Client {
	data: {
		name: string | null;
		userId: string;
		current_room: string | null
	}
	cs: WebSocket
}

let clients: Client[] = []
const rooms: Record<string, Room> = {};

const findAvailableRoom = (): string => {
	for (const id in rooms) {
		if (!rooms[id].isFull) {
			return id;
		}
	}
	const roomId = uuidv4();
	rooms[roomId] = new Room(roomId);
	return roomId;
}

const saveUserPreference = (data: UserPref) => {
	const { userId, playerName, opponentType } = data;

	const client = clients.find(client => client.data.userId === userId);
	if (!client) {
		// TODO throw error here
		return
	}
	if (opponentType === "computer") {
		const roomId = uuidv4()
		rooms[roomId] = new Room(roomId);
		const room = rooms[roomId]
		const _player = {
			userId,
			name: playerName,
			_ws: client.cs,
		}
		client.data = {
			...client.data,
			name: playerName,
			current_room: roomId
		}
		const _computer = {
			userId: uuidv4(),
			name: "Computer",
			_ws: null,
		}
		room.addPlayer(_player);
		room.addComputer(_computer);
		return room.send_to_user(userId);
	} else {
		const roomId = findAvailableRoom();
		const room = rooms[roomId]
		const _player = {
			userId,
			name: playerName,
			_ws: client.cs,
		}
		client.data = {
			...client.data,
			name: playerName,
			current_room: roomId
		}
		room.addPlayer(_player);
		return room.send_to_user(userId);
	}
}

const setupShips = (data: SetupShips) => {
	const { userId, roomId, ship: { name, length }, coordinates: { axis, row, col } } = data
	const room = rooms[roomId]
	if (!room) {
		// TODO Send message to user or reassign room
		return;
	}
	return room.setupBoard(userId, { ship: new Ship(name, length), row, column: col, axis })
}

const fireShot = ({ userId, roomId, coordinates }: FireShot) => {
	const room = rooms[roomId];
	room.broadcastShot(userId, { row: coordinates.rowIndex, col: coordinates.columnIndex })
}

const startGame = ({ userId, roomId }: { userId: string, roomId: string }) => {
	const room = rooms[roomId]
	if (room) {
		return room.startGame(userId);
	}
}

const reset = (userId: string, roomId: string) => {
	if (!userId || !roomId) return false;
	delete rooms[roomId];
	return true;
}

const sendMessage = (ws: WebSocket, type: string, userId: string, roomId: string | null, data?: { [key: string]: unknown }) => {
	if (ws.readyState === WebSocket.OPEN) {
		const message = { type, data: { userId, roomId, ...data } };
		ws.send(JSON.stringify(message));
	} else {
		console.warn('WebSocket connection not open');
	}
};

const handleclose = (userId: string) => {
	console.log(`====================Start========================`);
	console.log("Handle close triggered");
	console.log("\n", clients.length, "\n")
	console.log("\n", rooms, "\n")
	let user_room_id = clients.find(user => user.data.userId === userId)?.data.current_room;
	clients = clients.filter(user => user.data.userId === userId);
	if (!user_room_id) {
		return
	}
	const opponent_client = clients.find(user => user.data.userId === userId);
	if (opponent_client) {
		sendMessage(opponent_client.cs, Events.OPPONENT_QUIT, opponent_client.data.userId, null);
	}
	const did_del = delete rooms[user_room_id];
	console.log(clients)
	console.log(rooms)
	console.log(`A client ${userId} closed ${did_del}`);
	console.log(`====================End===========================`);
}

const handleMessage = (_ws: WebSocket, message: RawData) => {
	const received = JSON.parse(message.toString()) as Message<unknown>;

	if ((received.type as Events) === Events.FIRE_SHOT) {
		fireShot((received.data as FireShot));
	};
}

wss.on('connection', async (ws: WebSocket) => {
	const userId = uuidv4()

	clients.push({ data: { name: null, userId, current_room: null }, cs: ws })
	sendMessage(ws, Events.CONNECTED, userId, null)

	ws.on('message', async (message) => {
		console.log(rooms);
		handleMessage(ws, message);
	});

	ws.on('close', async () => {
		handleclose(userId);
	});

	ws.on('error', async () => {
		handleclose(userId);
	});

	console.log("No of clients => ", clients.length);
})

app.post('/', (req, res) => {
	const dt = req.body;
	const ret = saveUserPreference(dt.data as UserPref)
	if (ret) {
		res.status(200).json(ret)
	} else {
		res.status(400).json({ error: true })
	}
})

app.post('/place_ships', (req, res) => {
	const dt = req.body;
	const ret = setupShips(dt.data as SetupShips)
	if (ret) {
		res.status(200).json(ret)
	} else {
		res.status(400).json({ error: true })
	}
})

app.post('/start_game', (req, res) => {
	const dt = req.body;
	const ret = startGame(dt.data);
	if (ret === false) {
		res.status(400).json({ error: true, message: "Waiting for opponent" })
	} else {
		res.status(200)
	}
})

app.post('/reset_user_data', (req, res) => {
	const dt: { data: { userId: string, roomId: string } } = req.body;
	console.log(dt);
	const ret = reset(dt.data.userId, dt.data.roomId);
	if (ret) {
		res.status(200).json({ error: false, message: ""});
	} else {
		res.status(400).json({ error: true, message: ""});
	}
})

server.listen(PORT, () => {
	console.log(`server now listening on port: ${PORT}`)
})