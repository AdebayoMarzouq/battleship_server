import { Ship } from "./ship";
import { Player } from "./player";
import { shipData } from "../shared/game_data";
import { CellPosition, CellData } from "../../types/game";

export class Computer extends Player {
	private targetedCells: Set<string>;
	private possibleHits: CellPosition[];
	public allHits: number;

	constructor() {
		super();
		this.placeShips();
		this.targetedCells = new Set();
		this.possibleHits = [];
		this.allHits = 0;
	}

	private placeShips() {
		const ships: Ship[] = shipData.map(
			({ name, length }) => new Ship(name, length)
		);

		ships.forEach(ship => {
			let invalidPlacement = true;
			while (invalidPlacement) {
				const axis = Math.random() < 0.5 ? 'x' : 'y';
				const row = Math.floor(Math.random() * 10)
				const col = Math.floor(Math.random() * 10)
				invalidPlacement = !this.setupShips(ship, row, col, axis);
			}
		})
	}

	static shuffleArray(array: unknown[]) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	public getNextMove(board: CellData[][]): CellPosition {
		let nextMove = this.possibleHits.shift();
		// There are still previous moves in array
		if (nextMove) {
			this.allHits++;
			this.targetedCells.add(`${nextMove.row},${nextMove.col}`);
			return nextMove;
		}
		nextMove = this.getRandomUntargetedCell();
		// Check if the random cell is a miss, save and return its value
		if (!board[nextMove.row][nextMove.col].hasShip) {
			this.allHits++;
			this.targetedCells.add(`${nextMove.row},${nextMove.col}`);
			return nextMove;
		}

		// If the random cell is a ship, add it to possibleHits
		this.possibleHits.push(nextMove);
		const currentShipName = board[nextMove.row][nextMove.col].hasShip?.name;

		// Define neighboring directions (North, South, West, East)
		const directions = [
			{ row: -1, col: 0 }, // North
			{ row: 1, col: 0 },  // South
			{ row: 0, col: -1 }, // West
			{ row: 0, col: 1 }   // East
		];
		Computer.shuffleArray(directions);

		// Iterate through neighbouring cells
		for (const dir of directions) {
			let newRow = nextMove.row + dir.row;
			let newCol = nextMove.col + dir.col;

			while (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10) {
				if (board[newRow][newCol].hasShip && board[newRow][newCol].hasShip?.name === currentShipName) {
					// Adding neighbouring cell that is part of ship
					this.possibleHits.push({ row: newRow, col: newCol });
					// We use this data to generate the rest of the ship
					newRow += dir.row;
					newCol += dir.col;
				} else if (!board[newRow][newCol].hasShip) {
					// Adding misses to possible hits too
					this.possibleHits.push({ row: newRow, col: newCol });
					break;
				} else break;
			}
		}

		nextMove = this.possibleHits.shift();
		if (!nextMove) throw new Error("nextMove returned undefined");
		this.targetedCells.add(`${nextMove.row},${nextMove.col}`);
		this.allHits++;
		return nextMove;
	}

	private getRandomUntargetedCell(): CellPosition {
		let row: number, col: number;
		do {
			row = Math.floor(Math.random() * 10);
			col = Math.floor(Math.random() * 10);
		} while (this.targetedCells.has(`${row},${col}`));
		return { row, col };
	}
}