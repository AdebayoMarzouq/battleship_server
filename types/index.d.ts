import { Player } from "../src/game/player"
import { WebSocket } from "ws"

// type Room = {
// 	users: { userId: string, name: string, game: Player | null, client: WebSocket }[];
// 	roomData: {
// 		status: "waiting" | "in_progress" | "ended";
// 	}
// }

type AIRoom = {
	users: [{ userId: string, name: string, game: Player | null, client: WebSocket }, { computerId: string, game: Player | null }]
	roomData: {
		status: "waiting" | "in_progress" | "ended";
	}
}

type Default = {
	type: "CONNECTED" |
	"CONNECTED_AND_WAITING" |
	"USERNAME" |
	"START_GAME" |
	"FIRESHOT" |
	"OPPONENT_QUIT";
}

type Message<T> = Default & {
	data: T;
}

type StartGame = {
	roomId: string;
}

type FireShot = {
	userId: string;
	roomId: string;
	coordinates: {
		rowIndex: number;
		columnIndex: number;
	};
}

type SetupShips = {
	userId: string;
	roomId: string;
	coordinates: {
		axis: 'x' | 'y';
		row: number;
		col: number;
	};
	ship: {
		name: "carrier" |
		"battleship" |
		"destroyer" |
		"submarine" |
		"patrol boat";
		length: 2 | 3 | 4 | 5
	}
}

type UserPref = {
	userId: string;
	roomId: string | null;
	playerName: string
	opponentType: "human" | "computer"
}