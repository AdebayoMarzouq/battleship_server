import { CellData } from "../../types/game";
import { Board } from "./board";
import { Ship } from "./ship";

export class Player {
	private ships: Ship[];
	public board: Board;
	public sunkShips: { name: string, length: number, isSunk: boolean }[];

	constructor() {
		this.board = new Board();
		this.ships = []
		this.sunkShips = []
	}

	public setupShips(ship: Ship, row: number, column: number, axis: 'x' | 'y') {
		if (this.ships.length >= 5) return false;
		const placed = this.board.placeShip(ship, row, column, axis)
		if (placed) this.ships.push(ship);
		return placed;
	}

	public recieveShot(row: number, col: number): { report: 0 | 1 | 2 | 3; details: { ship: string } | null } {
		let hitData: { report: 0 | 1 | 2 | 3; details: { ship: string } | null } = {
			report: 0,
			details: null
		}
		const validHit = this.board.receiveAttack(row, col);
		// Checks if the attack is a valid hit or a miss
		if (!validHit) return hitData;
		// Checks the board if cell hasShip
		const { hasShip } = this.board.getBoard()[row][col];
		if (hasShip) {
			// Get ship with cellShipName from user ships
			const hitShip = this.ships.find(ship => ship.name === hasShip.name);
			if (!hitShip) throw new Error("Cannot find ship");
			// Registers hit on the ship class
			hitShip.isHit(row, col)
			// Set status to ship hit
			hitData.report = 1
			// Checks if ship is sunk
			if (hitShip.isSunk) {
				// Set all ships position isSunk to true
				for (let { row, col } of hitShip.positions) {
					this.board.setIsSunk(row, col);
				}
				this.sunkShips.push({ name: hitShip.name, length: hitShip.length, isSunk: true });
				hitData = {
					report: 2, details: {
						ship: hitShip.name
					}
				}
			};
			// Checks if all ships are sunk
			if (this.ships.every(ship => ship.isSunk)) {
				this.board.allowed = false;
				this.sunkShips.push({ name: hitShip.name, length: hitShip.length, isSunk: true });
				hitData = {
					report: 3, details: {
						ship: hitShip.name
					}
				}
			}
		} else {
			// Miss if valid hit but not ship
			hitData = {
				report: 0, details: null
			}
		}
		return hitData;
	}

	public reset(): void {
		this.board.resetBoard()
		this.ships.length = 0
		this.sunkShips.length = 0
	}

	public data_to_self(): { ships: { name: string, length: number }[], board: CellData[][] } {
		return ({
			ships: this.ships.map(ship => { return { name: ship.name, length: ship.length } }),
			board: this.board.getBoard()
		})
	}

	public data_to_opponent(): { ships: { name: string, length: number }[], board: CellData[][] } {
		return ({
			ships: this.sunkShips,
			board: this.board.getMaskedBoard()
		})
	}
}