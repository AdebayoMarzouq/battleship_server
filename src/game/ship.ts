export class Ship {
	public name: string;
	public length: number;
	public isSunk: boolean;
	public positions: { row: number; col: number }[];
	private hitCells: { row: number; col: number }[];

	constructor(name: string, length: number) {
		this.name = name;
		this.length = length;
		this.positions = [];
		this.hitCells = []
		this.isSunk = false
	}

	public setPositions(positions: { row: number; col: number }[]): void {
		if (positions.length !== this.length) {
			throw new Error(`Invalid number of positions. Expected ${this.length}, got ${positions.length}.`);
		}
		this.positions = positions;
	}

	public isHit(row: number, col: number): void {
		this.hitCells.push({ row, col });
		this.isSunk = this.positions.length > 0 && this.positions.length === this.hitCells.length;
	}
}