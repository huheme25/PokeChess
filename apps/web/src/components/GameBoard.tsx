import { useMemo } from 'react';
import { useGameStore } from '../store';
import { CombatModal } from './CombatModal';
import { getPokemonById } from '@pokechess/data';
import { isInCheck } from '@pokechess/engine';

const COL_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ROW_LABELS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const PIECE_ICONS: Record<string, string> = {
  Pawn: 'P',
  Knight: 'N',
  Bishop: 'B',
  Rook: 'R',
  Queen: 'Q',
  King: 'K',
};

const STAGE_MARKERS = ['', '\u2605', '\u2605\u2605'];

export function GameBoard() {
  const gameState = useGameStore(s => s.gameState);
  const selectedSquare = useGameStore(s => s.selectedSquare);
  const legalMoves = useGameStore(s => s.legalMoves);
  const selectSquare = useGameStore(s => s.selectSquare);
  const showCombatModal = useGameStore(s => s.showCombatModal);

  // Set de movimientos legales para highlight rapido
  const legalMoveSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of legalMoves) {
      set.add(`${m.to.row},${m.to.col}`);
    }
    return set;
  }, [legalMoves]);

  // Buscar si el movimiento legal a esa posicion es captura
  const isCaptureTo = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const m of legalMoves) {
      map.set(`${m.to.row},${m.to.col}`, m.isCapture);
    }
    return map;
  }, [legalMoves]);

  if (!gameState) {
    return (
      <div className="game-board-empty">
        <h2>No Game Active</h2>
        <p>Go to Team Builder to create teams and start a game.</p>
      </div>
    );
  }

  const inCheckWhite = isInCheck(gameState.board, 'white');
  const inCheckBlack = isInCheck(gameState.board, 'black');

  return (
    <div className="game-board-container">
      <div className="game-info-bar">
        <div className="turn-info">
          <span className="turn-number">Turn {gameState.turnNumber}</span>
          <span className={`current-player player-${gameState.currentPlayer}`}>
            {gameState.currentPlayer === 'white' ? 'White' : 'Black'} to move
          </span>
        </div>
        <div className="status-flags">
          {inCheckWhite && gameState.phase === 'playing' && (
            <span className="check-badge white-check">White in CHECK</span>
          )}
          {inCheckBlack && gameState.phase === 'playing' && (
            <span className="check-badge black-check">Black in CHECK</span>
          )}
          {gameState.phase === 'checkmate' && (
            <span className="result-badge checkmate">
              CHECKMATE! {gameState.winner === 'white' ? 'White' : 'Black'} wins!
            </span>
          )}
          {gameState.phase === 'stalemate' && (
            <span className="result-badge stalemate">STALEMATE! Draw.</span>
          )}
        </div>
      </div>

      <div className="board-wrapper">
        <div className="board-col-labels">
          <div className="corner-spacer" />
          {COL_LABELS.map(c => (
            <div key={c} className="col-label">{c}</div>
          ))}
        </div>

        <div className="board-with-rows">
          {gameState.board.map((row, r) => (
            <div key={r} className="board-row">
              <div className="row-label">{ROW_LABELS[r]}</div>
              {row.map((piece, c) => {
                const isLight = (r + c) % 2 === 0;
                const isSelected = selectedSquare?.row === r && selectedSquare?.col === c;
                const isLegal = legalMoveSet.has(`${r},${c}`);
                const isCapture = isCaptureTo.get(`${r},${c}`) ?? false;

                let cellClass = `board-cell ${isLight ? 'cell-light' : 'cell-dark'}`;
                if (isSelected) cellClass += ' cell-selected';
                if (isLegal && !isCapture) cellClass += ' cell-legal-move';
                if (isLegal && isCapture) cellClass += ' cell-legal-capture';

                return (
                  <div
                    key={c}
                    className={cellClass}
                    onClick={() => selectSquare({ row: r, col: c })}
                  >
                    {piece && (
                      <PieceDisplay piece={piece} />
                    )}
                    {isLegal && !piece && (
                      <div className="move-dot" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {showCombatModal && gameState.phase === 'combat' && gameState.pendingCombat && (
        <CombatModal />
      )}
      {showCombatModal && gameState.phase !== 'combat' && gameState.lastCombatResult && (
        <CombatModal />
      )}
    </div>
  );
}

function PieceDisplay({ piece }: { piece: NonNullable<ReturnType<typeof useGameStore.getState>['gameState']>['board'][0][0] }) {
  if (!piece) return null;

  const pokemon = getPokemonById(piece.pokemonId);
  if (!pokemon) return null;

  const hpPercent = (piece.currentHp / piece.maxHp) * 100;
  const hpColor = hpPercent > 60 ? 'hp-green' : hpPercent > 30 ? 'hp-yellow' : 'hp-red';

  const nameAbbrev = pokemon.name.length > 6
    ? pokemon.name.slice(0, 5) + '.'
    : pokemon.name;

  return (
    <div className={`piece piece-${piece.owner}`}>
      <div className="piece-class-icon">{PIECE_ICONS[piece.pieceClass]}</div>
      <div className="piece-name" title={pokemon.name}>{nameAbbrev}</div>
      <div className={`piece-hp-bar ${hpColor}`}>
        <div className="hp-fill" style={{ width: `${hpPercent}%` }} />
      </div>
      {piece.stage > 0 && (
        <div className="piece-stage">{STAGE_MARKERS[piece.stage]}</div>
      )}
    </div>
  );
}
