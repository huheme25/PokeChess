import type { GamePiece, BoardState, PieceClass } from '@pokechess/data';

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  isCapture: boolean;
  isEnPassant?: boolean;
  isCastle?: boolean;
  promotion?: PieceClass;
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getPieceAt(board: BoardState, r: number, c: number): GamePiece | null {
  if (!inBounds(r, c)) return null;
  return board[r][c];
}

function isEnemy(piece: GamePiece, other: GamePiece | null): boolean {
  return other !== null && other.owner !== piece.owner;
}

function isEmpty(board: BoardState, r: number, c: number): boolean {
  return inBounds(r, c) && board[r][c] === null;
}

/** Genera movimientos pseudo-legales para una pieza (sin verificar jaques) */
export function getPseudoLegalMoves(
  board: BoardState,
  piece: GamePiece,
  pos: Position,
): Move[] {
  const moves: Move[] = [];

  switch (piece.pieceClass) {
    case 'Pawn':
      generatePawnMoves(board, piece, pos, moves);
      break;
    case 'Knight':
      generateKnightMoves(board, piece, pos, moves);
      break;
    case 'Bishop':
      generateSlidingMoves(board, piece, pos, moves, [[-1,-1],[-1,1],[1,-1],[1,1]]);
      break;
    case 'Rook':
      generateSlidingMoves(board, piece, pos, moves, [[-1,0],[1,0],[0,-1],[0,1]]);
      break;
    case 'Queen':
      generateSlidingMoves(board, piece, pos, moves, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
      break;
    case 'King':
      generateKingMoves(board, piece, pos, moves);
      break;
  }

  return moves;
}

function generatePawnMoves(
  board: BoardState,
  piece: GamePiece,
  pos: Position,
  moves: Move[],
): void {
  const dir = piece.owner === 'white' ? -1 : 1;
  const startRow = piece.owner === 'white' ? 6 : 1;
  const promoRow = piece.owner === 'white' ? 0 : 7;

  // Avance simple
  const fwd = pos.row + dir;
  if (inBounds(fwd, pos.col) && isEmpty(board, fwd, pos.col)) {
    if (fwd === promoRow) {
      // Promoción — en este juego el peón mantiene su Pokémon pero cambia clase
      for (const promo of ['Queen', 'Rook', 'Knight', 'Bishop'] as PieceClass[]) {
        moves.push({ from: pos, to: { row: fwd, col: pos.col }, isCapture: false, promotion: promo });
      }
    } else {
      moves.push({ from: pos, to: { row: fwd, col: pos.col }, isCapture: false });
    }

    // Avance doble desde inicio
    const fwd2 = pos.row + 2 * dir;
    if (pos.row === startRow && isEmpty(board, fwd2, pos.col)) {
      moves.push({ from: pos, to: { row: fwd2, col: pos.col }, isCapture: false });
    }
  }

  // Capturas diagonales
  for (const dc of [-1, 1]) {
    const nr = fwd;
    const nc = pos.col + dc;
    if (inBounds(nr, nc)) {
      const target = getPieceAt(board, nr, nc);
      if (isEnemy(piece, target)) {
        if (nr === promoRow) {
          for (const promo of ['Queen', 'Rook', 'Knight', 'Bishop'] as PieceClass[]) {
            moves.push({ from: pos, to: { row: nr, col: nc }, isCapture: true, promotion: promo });
          }
        } else {
          moves.push({ from: pos, to: { row: nr, col: nc }, isCapture: true });
        }
      }
    }
  }
}

function generateKnightMoves(
  board: BoardState,
  piece: GamePiece,
  pos: Position,
  moves: Move[],
): void {
  const offsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of offsets) {
    const nr = pos.row + dr;
    const nc = pos.col + dc;
    if (!inBounds(nr, nc)) continue;
    const target = getPieceAt(board, nr, nc);
    if (target === null) {
      moves.push({ from: pos, to: { row: nr, col: nc }, isCapture: false });
    } else if (isEnemy(piece, target)) {
      moves.push({ from: pos, to: { row: nr, col: nc }, isCapture: true });
    }
  }
}

function generateSlidingMoves(
  board: BoardState,
  piece: GamePiece,
  pos: Position,
  moves: Move[],
  directions: number[][],
): void {
  for (const [dr, dc] of directions) {
    let r = pos.row + dr;
    let c = pos.col + dc;
    while (inBounds(r, c)) {
      const target = getPieceAt(board, r, c);
      if (target === null) {
        moves.push({ from: pos, to: { row: r, col: c }, isCapture: false });
      } else {
        if (isEnemy(piece, target)) {
          moves.push({ from: pos, to: { row: r, col: c }, isCapture: true });
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
}

function generateKingMoves(
  board: BoardState,
  piece: GamePiece,
  pos: Position,
  moves: Move[],
): void {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = pos.row + dr;
      const nc = pos.col + dc;
      if (!inBounds(nr, nc)) continue;
      const target = getPieceAt(board, nr, nc);
      if (target === null) {
        moves.push({ from: pos, to: { row: nr, col: nc }, isCapture: false });
      } else if (isEnemy(piece, target)) {
        moves.push({ from: pos, to: { row: nr, col: nc }, isCapture: true });
      }
    }
  }
}

/** Encuentra el rey de un jugador */
export function findKing(board: BoardState, owner: 'white' | 'black'): Position | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.owner === owner && p.pieceClass === 'King') {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

/** Verifica si una casilla es atacada por el oponente (ignora combate) */
export function isSquareAttacked(
  board: BoardState,
  pos: Position,
  byPlayer: 'white' | 'black',
): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.owner === byPlayer) {
        const moves = getPseudoLegalMoves(board, p, { row: r, col: c });
        if (moves.some(m => m.to.row === pos.row && m.to.col === pos.col && m.isCapture)) {
          return true;
        }
      }
    }
  }
  return false;
}

/** Verifica si el jugador está en jaque */
export function isInCheck(board: BoardState, player: 'white' | 'black'): boolean {
  const kingPos = findKing(board, player);
  if (!kingPos) return false;
  const opponent = player === 'white' ? 'black' : 'white';
  return isSquareAttacked(board, kingPos, opponent);
}

/** Aplica un movimiento al tablero (no resuelve combate, solo mueve) */
export function applyMove(board: BoardState, move: Move): BoardState {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[move.from.row][move.from.col];
  if (!piece) return newBoard;

  const movedPiece = { ...piece, position: { row: move.to.row, col: move.to.col } };

  // Promoción: cambia clase de pieza
  if (move.promotion) {
    movedPiece.pieceClass = move.promotion;
  }

  newBoard[move.from.row][move.from.col] = null;
  newBoard[move.to.row][move.to.col] = movedPiece;

  return newBoard;
}

/**
 * Genera movimientos LEGALES (filtrando los que dejan al rey propio en jaque).
 * NOTA: En PokéChess, una "captura" inicia combate y el atacante puede perder.
 * Pero para legalidad de movimiento, se considera como en ajedrez estándar.
 */
export function getLegalMoves(
  board: BoardState,
  piece: GamePiece,
  pos: Position,
): Move[] {
  const pseudoMoves = getPseudoLegalMoves(board, piece, pos);

  return pseudoMoves.filter(move => {
    // Simular movimiento (asumiendo captura exitosa)
    const newBoard = applyMove(board, move);
    // Verificar que nuestro rey no quede en jaque
    return !isInCheck(newBoard, piece.owner);
  });
}

/** Verifica jaque mate */
export function isCheckmate(board: BoardState, player: 'white' | 'black'): boolean {
  if (!isInCheck(board, player)) return false;

  // Si no hay movimientos legales, es mate
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.owner === player) {
        const moves = getLegalMoves(board, p, { row: r, col: c });
        if (moves.length > 0) return false;
      }
    }
  }
  return true;
}

/** Verifica ahogado (stalemate) */
export function isStalemate(board: BoardState, player: 'white' | 'black'): boolean {
  if (isInCheck(board, player)) return false;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.owner === player) {
        const moves = getLegalMoves(board, p, { row: r, col: c });
        if (moves.length > 0) return false;
      }
    }
  }
  return true;
}

/** Crea tablero vacío 8x8 */
export function createEmptyBoard(): BoardState {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}
