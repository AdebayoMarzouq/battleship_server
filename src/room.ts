import { WebSocket } from "ws";
import { Computer } from "./game/computer";
import { Player } from "./game/player";
import { Ship } from "./game/ship";
import { Events } from "./shared/events";

type PlayerData = {
	playerId: string
	playerName: string
	ready: boolean
	_ws: WebSocket | null
	inst: Player | Computer
}

export type NewPlayer = { userId: string, name: string, _ws: WebSocket | null }

type PlaceShip = { ship: Ship, row: number, column: number, axis: 'x' | 'y' }

export class Room {
	public roomId: string
	private players: {
		[key: string]: PlayerData
	}
	public isFull: boolean
	public roomData: {
		turn: string;
		status: 'started' | 'ended';
		winner: string | null;
	} | null

	constructor(roomId: string) {
		this.roomId = roomId
		this.players = {}
		this.isFull = false
		this.roomData = null
	}

	public getUserOpponent(userId: string) {
		if (!userId) {
			return;
		}
		const [id1, id2] = Object.keys(this.players);
		const opponent = userId === id1 ? this.players[id2] : this.players[id1];
		return opponent;
	}

	public startGame(userId: string) {
		const [id1, id2] = Object.keys(this.players);
		const player = userId === id1 ? this.players[id1] : this.players[id2];
		player.ready = true;
		const opponent = userId === id1 ? this.players[id2] : this.players[id1];
		if (!this.isFull || !opponent.ready) return false;
		this.roomData = {
			turn: userId,
			status: 'started',
			winner: null
		}
		if (opponent.inst instanceof Computer) {
			if (player._ws) {
				this.send(player._ws, Events.START_GAME, {
					room: { ...this.roomData, roomId: this.roomId, isFull: this.isFull },
					opponent: { ...opponent.inst.data_to_opponent(), userName: opponent.playerName, userId: opponent.playerId }
				})
			}
		} else if (opponent.ready && player._ws && opponent._ws) {
			this.send(player._ws, Events.START_GAME, {
				room: { ...this.roomData, roomId: this.roomId, isFull: this.isFull },
				opponent: { ...opponent.inst.data_to_opponent(), userName: opponent.playerName, userId: opponent.playerId }
			})
			this.send(opponent._ws, Events.START_GAME, {
				room: { ...this.roomData, roomId: this.roomId, isFull: this.isFull },
				opponent: { ...player.inst.data_to_opponent(), userName: player.playerName, userId: player.playerId }
			})
		}
	}

	public addPlayer(data: NewPlayer): boolean {
		if (Object.keys(this.players).length >= 2) {
			return false
		}
		const { userId, name, _ws } = data;
		this.players[userId] = {
			playerId: userId,
			playerName: name,
			ready: false,
			_ws,
			inst: new Player()
		}
		if (Object.keys(this.players).length >= 2) {
			this.isFull = true;
		}
		return true
	}

	public addComputer(data: NewPlayer): boolean {
		if (Object.keys(this.players).length >= 2) {
			return false
		}
		const { userId, name, _ws } = data;
		this.players[userId] = {
			playerId: userId,
			playerName: name,
			ready: true,
			_ws,
			inst: new Computer()
		}
		if (Object.keys(this.players).length >= 2) {
			this.isFull = true;
		}
		return true
	}

	public setupBoard(userId: string, { ship, row, column, axis }: PlaceShip) {
		const player = this.players[userId];
		if (!player) {
			return;
		}
		const valid = this.players[userId].inst.setupShips(ship, row, column, axis)
		return {
			valid, ships: valid ? player.inst.data_to_self().ships : null, board: valid ? player.inst.data_to_self().board : null
		}
	}

	public send_to_user(userId: string) {
		const player = this.players[userId]
		if (player) {
			return {
				room: { ...this.roomData, roomId: this.roomId, isFull: this.isFull },
				user: { ...player.inst.data_to_self(), userName: player.playerName, userId: player.playerId }
			}
		}
	}

	public send_to_opponent(userId: string) {
		const player = this.players[userId];
		if (player) {
			return {
				room: { ...this.roomData, roomId: this.roomId, isFull: this.isFull },
				opponent: { ...player.inst.data_to_opponent(), userName: player.playerName, userId: player.playerId }
			}
		}
	}

	public async broadcastShot(userId: string, coordinates: { row: number, col: number }) {
		if (!this.roomData || this.roomData.status === 'ended') return;
		if (this.roomData.turn !== userId) return;
		const { row, col } = coordinates;
		const [id1, id2] = Object.keys(this.players);
		const attacker = userId === id1 ? this.players[id1] : this.players[id2];
		const reciever = userId === id1 ? this.players[id2] : this.players[id1];
		const hitData = reciever.inst.recieveShot(row, col);
		this.roomData.turn = reciever.playerId

		if (hitData.report === 3) {
			this.roomData.winner = userId;
			this.roomData.status = 'ended';
		}

		const data = {
			hitData,
			room: this.roomData
		}

		if (reciever.inst instanceof Computer) {
			if (attacker._ws) {
				this.send(attacker._ws, Events.FIRE_SHOT, {
					...data,
					opponent: { ...reciever.inst.data_to_opponent() },
				})
			}
			this.computerPlays(attacker, reciever);
		} else {
			if (reciever.ready && reciever._ws) {
				this.send(reciever._ws, Events.RECEIVED_SHOT, {
					...data,
					user: { ...reciever.inst.data_to_self() },
				})
			}
			if (attacker.ready && attacker._ws) {
				this.send(attacker._ws, Events.FIRE_SHOT, {
					...data,
					opponent: { ...reciever.inst.data_to_opponent() },
				})
			}
		}
	}

	private async computerPlays(attacker: PlayerData, reciever: PlayerData) {
		setTimeout(() => {
			if (!this.roomData) return;
			if (reciever.inst instanceof Computer && this.roomData.turn === reciever.playerId) {
				const cell = reciever.inst.getNextMove(attacker.inst.board.getBoard())
				this.broadcastShot(reciever.playerId, cell)
			}
		}, 4000);
	}

	private send(ws: WebSocket, type: string, data?: { [key: string]: unknown }) {
		if (ws.readyState === WebSocket.OPEN) {
			const message = { type, data };
			console.log(message)
			ws.send(JSON.stringify(message));
		} else {
			console.warn('WebSocket connection not open');
		}
	};
}