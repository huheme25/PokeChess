import type { GamePiece, BoardState, PieceClass, TeamSlot, CombatResult } from '@pokechess/data';
import { getPokemonById } from '@pokechess/data';
import { createEmptyBoard, getLegalMoves, isInCheck, isCheckmate, isStalemate, applyMove, type Move } from './chess.js';
import { getStatsWithEvolution, resolveCombat, type CombatantInfo, BASE_STATS } from './combat.js';
import { getClassification } from './classifier.js';

export type GamePhase = 'playing' | 'combat' | 'checkmate' | 'stalemate';

export interface GameState {
  board: BoardState;
  currentPlayer: 'white' | 'black';
  phase: GamePhase;
  moveHistory: Move[];
  turnNumber: number;
  pendingCombat: {
    attacker: GamePiece;
    defender: GamePiece;
    move: Move;
  } | null;
  lastCombatResult: CombatResult | null;
  winner: 'white' | 'black' | null;
}

const PIECE_ORDER: PieceClass[] = ['Rook', 'Knight', 'Bishop', 'Queen', 'King', 'Bishop', 'Knight', 'Rook'];

let pieceIdCounter = 0;
function nextPieceId(): string {
  return `piece_${++pieceIdCounter}`;
}

/** Crea pieza de juego a partir de slot de equipo */
export function createGamePiece(
  slot: TeamSlot,
  owner: 'white' | 'black',
  position: { row: number; col: number },
): GamePiece {
  const pokemon = getPokemonById(slot.pokemonId);
  if (!pokemon) throw new Error(`Pokemon ${slot.pokemonId} no encontrado`);

  const classification = getClassification(slot.pokemonId);
  const speciesMod = classification?.speciesMod ?? 0;
  const speciesModTarget = classification?.speciesModTarget ?? 'defense';
  const isMewtwoKing = pokemon.id === 150 && slot.pieceClass === 'King';

  const stats = getStatsWithEvolution(slot.pieceClass, 0, speciesMod, speciesModTarget, isMewtwoKing);

  return {
    id: nextPieceId(),
    pokemonId: slot.pokemonId,
    pieceClass: slot.pieceClass,
    owner,
    currentHp: stats.hp,
    maxHp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    die: stats.die,
    stage: 0,
    combatsWon: 0,
    speciesMod,
    position,
  };
}

/** Coloca piezas en el tablero según team slots */
export function setupBoard(
  whiteSlots: TeamSlot[],
  blackSlots: TeamSlot[],
): BoardState {
  pieceIdCounter = 0;
  const board = createEmptyBoard();

  // Separar piezas por clase
  const getSlotsByClass = (slots: TeamSlot[], cls: PieceClass) =>
    slots.filter(s => s.pieceClass === cls);

  // White: fila 7 (back), fila 6 (peones)
  const whitePawns = getSlotsByClass(whiteSlots, 'Pawn');
  const whiteBack: TeamSlot[] = [];

  // Orden de la fila trasera
  for (const cls of PIECE_ORDER) {
    const available = getSlotsByClass(whiteSlots, cls);
    if (available.length > 0) {
      whiteBack.push(available.shift()!);
    }
  }

  // Colocar fila trasera blanca (fila 7)
  whiteBack.forEach((slot, col) => {
    board[7][col] = createGamePiece(slot, 'white', { row: 7, col });
  });

  // Colocar peones blancos (fila 6)
  whitePawns.forEach((slot, col) => {
    if (col < 8) {
      board[6][col] = createGamePiece(slot, 'white', { row: 6, col });
    }
  });

  // Black: fila 0 (back), fila 1 (peones)
  const blackPawns = getSlotsByClass(blackSlots, 'Pawn');
  const blackBack: TeamSlot[] = [];

  for (const cls of PIECE_ORDER) {
    const available = getSlotsByClass(blackSlots, cls);
    if (available.length > 0) {
      blackBack.push(available.shift()!);
    }
  }

  blackBack.forEach((slot, col) => {
    board[0][col] = createGamePiece(slot, 'black', { row: 0, col });
  });

  blackPawns.forEach((slot, col) => {
    if (col < 8) {
      board[1][col] = createGamePiece(slot, 'black', { row: 1, col });
    }
  });

  return board;
}

/** Crea estado de juego inicial */
export function createGame(
  whiteSlots: TeamSlot[],
  blackSlots: TeamSlot[],
): GameState {
  return {
    board: setupBoard(whiteSlots, blackSlots),
    currentPlayer: 'white',
    phase: 'playing',
    moveHistory: [],
    turnNumber: 1,
    pendingCombat: null,
    lastCombatResult: null,
    winner: null,
  };
}

/** Intenta realizar un movimiento */
export function makeMove(state: GameState, move: Move): GameState {
  const piece = state.board[move.from.row][move.from.col];
  if (!piece || piece.owner !== state.currentPlayer) {
    throw new Error('Movimiento inválido: pieza no válida');
  }

  const legalMoves = getLegalMoves(state.board, piece, move.from);
  const isLegal = legalMoves.some(
    m => m.to.row === move.to.row && m.to.col === move.to.col &&
         m.promotion === move.promotion
  );

  if (!isLegal) {
    throw new Error('Movimiento ilegal');
  }

  if (move.isCapture) {
    const defender = state.board[move.to.row][move.to.col];
    if (!defender) throw new Error('No hay pieza para capturar');

    // Iniciar combate
    return {
      ...state,
      phase: 'combat',
      pendingCombat: {
        attacker: { ...piece },
        defender: { ...defender },
        move,
      },
    };
  }

  // Movimiento sin captura
  const newBoard = applyMove(state.board, move);
  return advanceTurn(state, newBoard, move);
}

/** Resuelve combate pendiente */
export function resolvePendingCombat(state: GameState): GameState {
  if (!state.pendingCombat) throw new Error('No hay combate pendiente');

  const { attacker, defender, move } = state.pendingCombat;
  const atkPokemon = getPokemonById(attacker.pokemonId)!;
  const defPokemon = getPokemonById(defender.pokemonId)!;

  const atkInfo: CombatantInfo = {
    name: atkPokemon.name,
    types: atkPokemon.types.slice() as any,
    hp: attacker.currentHp,
    attack: attacker.attack,
    defense: attacker.defense,
    die: attacker.die,
  };

  const defInfo: CombatantInfo = {
    name: defPokemon.name,
    types: defPokemon.types.slice() as any,
    hp: defender.currentHp,
    attack: defender.attack,
    defense: defender.defense,
    die: defender.die,
  };

  const result = resolveCombat(atkInfo, defInfo);

  let newBoard = state.board.map(row => [...row]);

  if (result.winner === 'attacker') {
    // Atacante gana: se mueve a la posición, defensor eliminado
    const updatedAttacker = { ...attacker };
    updatedAttacker.currentHp = result.attackerHpRemaining;
    updatedAttacker.combatsWon += 1;
    updatedAttacker.position = { row: move.to.row, col: move.to.col };

    // Evolución de peón
    if (updatedAttacker.pieceClass === 'Pawn') {
      const canEvolve = updatedAttacker.combatsWon <= 2 && updatedAttacker.stage < 2;
      if (canEvolve && updatedAttacker.combatsWon > updatedAttacker.stage) {
        updatedAttacker.stage += 1;
        // Recalcular stats
        const classification = getClassification(updatedAttacker.pokemonId);
        const sm = classification?.speciesMod ?? 0;
        const smTarget = classification?.speciesModTarget ?? 'defense';
        const isMK = false; // Pawn nunca es King — Mewtwo King no evoluciona
        const newStats = getStatsWithEvolution('Pawn', updatedAttacker.stage, sm, smTarget, isMK);
        updatedAttacker.maxHp = newStats.hp;
        updatedAttacker.currentHp = newStats.hp; // curar a HP completo
        updatedAttacker.attack = newStats.attack;
        updatedAttacker.defense = newStats.defense;
        updatedAttacker.die = newStats.die;
      }
    }

    newBoard[move.from.row][move.from.col] = null;
    newBoard[move.to.row][move.to.col] = updatedAttacker;
  } else {
    // Defensor gana: atacante eliminado, defensor se queda
    const updatedDefender = { ...defender };
    updatedDefender.currentHp = result.defenderHpRemaining;
    updatedDefender.combatsWon += 1;

    // Evolución de peón defensor
    if (updatedDefender.pieceClass === 'Pawn') {
      const canEvolve = updatedDefender.combatsWon <= 2 && updatedDefender.stage < 2;
      if (canEvolve && updatedDefender.combatsWon > updatedDefender.stage) {
        updatedDefender.stage += 1;
        const classification = getClassification(updatedDefender.pokemonId);
        const sm = classification?.speciesMod ?? 0;
        const smTarget = classification?.speciesModTarget ?? 'defense';
        const newStats = getStatsWithEvolution('Pawn', updatedDefender.stage, sm, smTarget, false);
        updatedDefender.maxHp = newStats.hp;
        updatedDefender.currentHp = newStats.hp;
        updatedDefender.attack = newStats.attack;
        updatedDefender.defense = newStats.defense;
        updatedDefender.die = newStats.die;
      }
    }

    newBoard[move.from.row][move.from.col] = null;
    newBoard[move.to.row][move.to.col] = updatedDefender;
  }

  const newState = advanceTurn(
    { ...state, lastCombatResult: result, pendingCombat: null },
    newBoard,
    move,
  );
  return newState;
}

function advanceTurn(state: GameState, newBoard: BoardState, move: Move): GameState {
  const nextPlayer = state.currentPlayer === 'white' ? 'black' : 'white';

  let phase: GamePhase = 'playing';
  let winner: 'white' | 'black' | null = null;

  if (isCheckmate(newBoard, nextPlayer)) {
    phase = 'checkmate';
    winner = state.currentPlayer;
  } else if (isStalemate(newBoard, nextPlayer)) {
    phase = 'stalemate';
  }

  // Verificar si el rey fue eliminado (puede pasar por combate)
  const whiteKingExists = newBoard.some(row => row.some(p => p?.owner === 'white' && p?.pieceClass === 'King'));
  const blackKingExists = newBoard.some(row => row.some(p => p?.owner === 'black' && p?.pieceClass === 'King'));

  if (!whiteKingExists) {
    phase = 'checkmate';
    winner = 'black';
  } else if (!blackKingExists) {
    phase = 'checkmate';
    winner = 'white';
  }

  return {
    ...state,
    board: newBoard,
    currentPlayer: nextPlayer,
    phase,
    moveHistory: [...state.moveHistory, move],
    turnNumber: state.turnNumber + (state.currentPlayer === 'black' ? 1 : 0),
    pendingCombat: null,
    winner,
  };
}
