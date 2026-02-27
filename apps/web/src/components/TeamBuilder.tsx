import { useState, useMemo, useCallback } from 'react';
import { useGameStore } from '../store';
import type { PokemonType, PieceClass, TeamSlot, TeamConfig } from '@pokechess/data';
import { getPokemonById } from '@pokechess/data';
import {
  getPokemonForPool,
  getClassification,
  validateTeam,
  calculateTeamMatchupScore,
  autoBuildTeam,
  TYPE_ORDER,
} from '@pokechess/engine';

const ALL_TYPES: PokemonType[] = [...TYPE_ORDER];

const TEAM_COMPOSITION: { pieceClass: PieceClass; count: number }[] = [
  { pieceClass: 'Pawn', count: 8 },
  { pieceClass: 'Knight', count: 2 },
  { pieceClass: 'Bishop', count: 2 },
  { pieceClass: 'Rook', count: 2 },
  { pieceClass: 'Queen', count: 1 },
  { pieceClass: 'King', count: 1 },
];

// Generar los 16 slots con su indice
interface SlotDef {
  index: number;
  pieceClass: PieceClass;
  label: string;
}

function buildSlotDefs(): SlotDef[] {
  const defs: SlotDef[] = [];
  let idx = 0;
  for (const { pieceClass, count } of TEAM_COMPOSITION) {
    for (let i = 0; i < count; i++) {
      defs.push({
        index: idx++,
        pieceClass,
        label: count > 1 ? `${pieceClass} ${i + 1}` : pieceClass,
      });
    }
  }
  return defs;
}

const SLOT_DEFS = buildSlotDefs();

export function TeamBuilder() {
  const teamWhite = useGameStore(s => s.teamWhite);
  const teamBlack = useGameStore(s => s.teamBlack);
  const activeTeam = useGameStore(s => s.activeTeam);
  const setActiveTeam = useGameStore(s => s.setActiveTeam);
  const updateTeam = useGameStore(s => s.updateTeam);
  const startGame = useGameStore(s => s.startGame);

  const [opponentType, setOpponentType] = useState<PokemonType>('Water');
  const [startErrors, setStartErrors] = useState<string[]>([]);

  const team = activeTeam === 'white' ? teamWhite : teamBlack;

  // Mapa slotIndex -> pokemonId para acceso rapido
  const slotMap = useMemo(() => {
    const map = new Map<string, number>(); // key = "pieceClass:idx"
    const classCounts: Record<string, number> = {};
    for (const slot of team.slots) {
      const cls = slot.pieceClass;
      classCounts[cls] = (classCounts[cls] || 0);
      map.set(`${cls}:${classCounts[cls]}`, slot.pokemonId);
      classCounts[cls]++;
    }
    return map;
  }, [team.slots]);

  const getSlotPokemonId = useCallback((pieceClass: PieceClass, subIndex: number): number | null => {
    const key = `${pieceClass}:${subIndex}`;
    return slotMap.get(key) ?? null;
  }, [slotMap]);

  // Pokemon legales por pool, con cache
  const poolOptions = useMemo(() => {
    const map = new Map<PieceClass, { id: number; name: string; pr: number; sm: number; pool: string }[]>();
    for (const cls of ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'] as PieceClass[]) {
      const pokemons = getPokemonForPool(cls);
      map.set(cls, pokemons.map(c => ({
        id: c.pokemon.id,
        name: c.pokemon.name,
        pr: c.pr,
        sm: c.speciesMod,
        pool: c.pool.join('/'),
      })));
    }
    return map;
  }, []);

  const handleTypeChange = (field: 'primaryType' | 'secondaryType', value: PokemonType) => {
    const updated: TeamConfig = { ...team, [field]: value };
    updateTeam(activeTeam, updated);
  };

  const handleSlotChange = (slotDef: SlotDef, subIndex: number, pokemonId: number | null) => {
    // Reconstruir slots desde cero basado en la tabla
    const newSlots: TeamSlot[] = [];
    const classCounts: Record<string, number> = {};

    for (const def of SLOT_DEFS) {
      const cls = def.pieceClass;
      const si = classCounts[cls] || 0;
      classCounts[cls] = si + 1;

      if (def.pieceClass === slotDef.pieceClass && si === subIndex) {
        // Este es el slot que estamos cambiando
        if (pokemonId !== null) {
          newSlots.push({ pokemonId, pieceClass: def.pieceClass });
        }
      } else {
        const existing = getSlotPokemonId(def.pieceClass, si);
        if (existing !== null) {
          newSlots.push({ pokemonId: existing, pieceClass: def.pieceClass });
        }
      }
    }

    updateTeam(activeTeam, { ...team, slots: newSlots });
  };

  // Validacion en tiempo real
  const validationErrors = useMemo(() => {
    if (team.slots.length === 0) return [];
    return validateTeam(team, opponentType);
  }, [team, opponentType]);

  // Team Matchup Score
  const matchupScore = useMemo(() => {
    if (team.slots.length === 0) return 0;
    return calculateTeamMatchupScore(team, opponentType);
  }, [team, opponentType]);

  const handleStartGame = () => {
    const errors = startGame();
    setStartErrors(errors);
  };

  // Calcular subIndex para cada slot definition
  let subIndexTracker: Record<string, number> = {};

  return (
    <div className="team-builder">
      <div className="builder-header">
        <div className="team-tabs">
          <button
            className={`team-tab ${activeTeam === 'white' ? 'active white-tab' : ''}`}
            onClick={() => setActiveTeam('white')}
          >
            White Team
          </button>
          <button
            className={`team-tab ${activeTeam === 'black' ? 'active black-tab' : ''}`}
            onClick={() => setActiveTeam('black')}
          >
            Black Team
          </button>
        </div>

        <div className="type-selectors">
          <label>
            Primary Type:
            <select
              value={team.primaryType}
              onChange={e => handleTypeChange('primaryType', e.target.value as PokemonType)}
            >
              {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            Secondary Type:
            <select
              value={team.secondaryType}
              onChange={e => handleTypeChange('secondaryType', e.target.value as PokemonType)}
            >
              {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            Opponent Primary:
            <select
              value={opponentType}
              onChange={e => setOpponentType(e.target.value as PokemonType)}
            >
              {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>

        <div className="builder-actions-header">
          <button
            className="btn-auto-build"
            onClick={() => {
              const result = autoBuildTeam(team.primaryType, team.secondaryType);
              if (result.team) {
                updateTeam(activeTeam, result.team);
                setStartErrors([]);
              }
              if (result.errors.length > 0) {
                setStartErrors(result.errors);
              }
            }}
          >
            Auto Build
          </button>
          <span className={`matchup-score ${matchupScore > 8 ? 'over-limit' : ''}`}>
            Matchup Score: {matchupScore} / 8
          </span>
        </div>
      </div>

      <div className="slots-table-container">
        <table className="slots-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Class</th>
              <th>Pokemon</th>
              <th>Types</th>
              <th>PR</th>
              <th>Pool</th>
              <th>SM</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              subIndexTracker = {};
              return SLOT_DEFS.map((def) => {
                const cls = def.pieceClass;
                const subIdx = subIndexTracker[cls] || 0;
                subIndexTracker[cls] = subIdx + 1;

                const currentId = getSlotPokemonId(cls, subIdx);
                const currentPokemon = currentId ? getPokemonById(currentId) : null;
                const currentClassification = currentId ? getClassification(currentId) : null;
                const options = poolOptions.get(cls) || [];

                return (
                  <tr key={def.index} className={`slot-row class-${cls.toLowerCase()}`}>
                    <td>{def.index + 1}</td>
                    <td className="piece-class">{def.label}</td>
                    <td>
                      <select
                        className="pokemon-select"
                        value={currentId ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          handleSlotChange(def, subIdx, val ? Number(val) : null);
                        }}
                      >
                        <option value="">-- Select --</option>
                        {options.map(opt => (
                          <option key={opt.id} value={opt.id}>
                            #{opt.id} {opt.name} (PR:{opt.pr})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="pokemon-types">
                      {currentPokemon
                        ? currentPokemon.types.map(t => (
                            <span key={t} className={`type-badge type-${t.toLowerCase()}`}>{t}</span>
                          ))
                        : '-'}
                    </td>
                    <td>{currentClassification ? currentClassification.pr.toFixed(1) : '-'}</td>
                    <td>{currentClassification ? currentClassification.pool.join('/') : '-'}</td>
                    <td className={currentClassification?.speciesMod === 1 ? 'sm-plus' : currentClassification?.speciesMod === -1 ? 'sm-minus' : ''}>
                      {currentClassification ? (currentClassification.speciesMod > 0 ? '+1' : currentClassification.speciesMod < 0 ? '-1' : '0') : '-'}
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {validationErrors.length > 0 && (
        <div className="validation-errors">
          <h3>Validation Errors</h3>
          <ul>
            {validationErrors.map((err, i) => (
              <li key={i} className="error-item">{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {startErrors.length > 0 && (
        <div className="validation-errors start-errors">
          <h3>Cannot Start Game</h3>
          <ul>
            {startErrors.map((err, i) => (
              <li key={i} className="error-item">{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="builder-actions">
        <button className="btn-start-game" onClick={handleStartGame}>
          Start Game
        </button>
      </div>
    </div>
  );
}
