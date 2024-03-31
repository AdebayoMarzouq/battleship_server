export type CellData = {
	isHit: boolean
	hasShip: {
		idx: number
		isSunk: boolean
		name: string
		length: number
		axis: 'x' | 'y'
	} | null
};
export type CellPosition = { row: number, col: number };