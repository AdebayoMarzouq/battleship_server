import { Ship } from "./ship";
import { CellData } from "../../types/game"

export class Board {
	private boardSize = 10;
	private board: CellData[][];
	public allowed: boolean;

	constructor(board?: CellData[][]) {
		this.board = board ?? this.generateEmptyBoard()
		this.allowed = true
	}

	private generateEmptyBoard(): CellData[][] {
		const board: CellData[][] = [];
		for (let i = 0; i < this.boardSize; i++) {
			const row = Array.from({ length: this.boardSize }, () => ({
				isHit: false,
				hasShip: null,
			}));
			board.push(row);
		}
		return board;
	}

	public resetBoard(): void {
		this.board = this.generateEmptyBoard();
		this.allowed = true;
	}

	private isNotCollision(ship: Ship, row: number, col: number, axis: 'x' | 'y'): boolean {
		const endRow = axis === 'x' ? row : row + ship.length - 1;
		const endCol = axis === 'y' ? col : col + ship.length - 1;
		if (endRow >= this.boardSize || endCol >= this.boardSize) {
			return false; // Ship goes out of bounds
		}
		// TODO Handle situation for edges when placing ships
		// const isPossible = true;
		if (axis === 'x') {
			const xrow = row;
			let xcol = col;
			for (let i = 0; i < ship.length; i++, xcol++) {
				if (this.board[xrow][xcol].hasShip) {
					return false
				};
			}
		} else {
			const xcol = col;
			let xrow = row;
			for (let i = 0; i < ship.length; i++, xrow++) {
				if (this.board[xrow][xcol].hasShip) return false;
			}
		}

		return true;
	}

	public placeShip(ship: Ship, row: number, col: number, axis: 'x' | 'y' = 'x'): boolean {
		if (!this.isNotCollision(ship, row, col, axis)) return false;
		const shipLocations: { row: number; col: number }[] = [];
		for (let i = 0; i < ship.length; i++) {
			const currentRow = axis === 'x' ? row : row + i;
			const currentCol = axis === 'y' ? col : col + i;
			const position = { row: currentRow, col: currentCol };
			shipLocations.push(position);
			this.board[currentRow][currentCol].hasShip = {
				idx: i,
				isSunk: false,
				name: ship.name,
				length: ship.length,
				axis
			};
		}
		ship.setPositions(shipLocations);
		return true;
	}

	public setIsSunk(row: number, col: number) {
		let currentCell = this.board[row][col];
		if (currentCell.hasShip) {
			currentCell.hasShip.isSunk = true;
		}
	}

	public receiveAttack(row: number, col: number): boolean {
		if (!this.allowed) return false;
		if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
			throw new Error('Attack position out of bounds');
		}
		if (this.board[row][col].isHit) {
			return false;
		}
		this.board[row][col].isHit = true;
		return true;
	}

	public getBoard(): CellData[][] {
		return this.board;
	}

	public getMaskedBoard(): CellData[][] {
		const maskedBoard: CellData[][] = [];
		for (let i = 0; i < this.boardSize; i++) {
			const row: CellData[] = [];
			for (let j = 0; j < this.boardSize; j++) {
				const { isHit, hasShip } = this.board[i][j];
				row.push({
					isHit,
					hasShip: isHit ? hasShip : null
				});
			}
			maskedBoard.push(row);
		}
		return maskedBoard;
	}
}