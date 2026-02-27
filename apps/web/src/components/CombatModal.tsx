import { useState } from 'react';
import { useGameStore } from '../store';
import { getPokemonById } from '@pokechess/data';
import type { CombatResult } from '@pokechess/data';

export function CombatModal() {
  const gameState = useGameStore(s => s.gameState);
  const lastCombatResult = useGameStore(s => s.lastCombatResult);
  const resolveCombat = useGameStore(s => s.resolveCombat);
  const closeCombatModal = useGameStore(s => s.closeCombatModal);

  const [resolved, setResolved] = useState(false);
  const [result, setResult] = useState<CombatResult | null>(lastCombatResult);

  if (!gameState) return null;

  const pending = gameState.pendingCombat;

  // Si ya hay resultado (post-resolucion), mostrar log
  if (resolved && result) {
    return <CombatResultView result={result} onClose={closeCombatModal} />;
  }
  if (lastCombatResult && !pending) {
    return <CombatResultView result={lastCombatResult} onClose={closeCombatModal} />;
  }

  if (!pending) return null;

  const atkPokemon = getPokemonById(pending.attacker.pokemonId);
  const defPokemon = getPokemonById(pending.defender.pokemonId);

  if (!atkPokemon || !defPokemon) return null;

  const handleFight = () => {
    resolveCombat();
    const newState = useGameStore.getState();
    setResult(newState.gameState?.lastCombatResult ?? null);
    setResolved(true);
  };

  return (
    <div className="modal-overlay">
      <div className="combat-modal">
        <h2 className="combat-title">Combat!</h2>

        <div className="combatants">
          <div className="combatant attacker-side">
            <div className="combatant-label">Attacker</div>
            <div className={`combatant-owner player-${pending.attacker.owner}`}>
              {pending.attacker.owner}
            </div>
            <div className="combatant-name">{atkPokemon.name}</div>
            <div className="combatant-types">
              {atkPokemon.types.map(t => (
                <span key={t} className={`type-badge type-${t.toLowerCase()}`}>{t}</span>
              ))}
            </div>
            <div className="combatant-class">{pending.attacker.pieceClass}</div>
            <div className="combatant-stats">
              <div>HP: {pending.attacker.currentHp}/{pending.attacker.maxHp}</div>
              <div>ATK: {pending.attacker.attack}</div>
              <div>DEF: {pending.attacker.defense}</div>
              <div>Die: d{pending.attacker.die}</div>
            </div>
          </div>

          <div className="combat-vs">VS</div>

          <div className="combatant defender-side">
            <div className="combatant-label">Defender</div>
            <div className={`combatant-owner player-${pending.defender.owner}`}>
              {pending.defender.owner}
            </div>
            <div className="combatant-name">{defPokemon.name}</div>
            <div className="combatant-types">
              {defPokemon.types.map(t => (
                <span key={t} className={`type-badge type-${t.toLowerCase()}`}>{t}</span>
              ))}
            </div>
            <div className="combatant-class">{pending.defender.pieceClass}</div>
            <div className="combatant-stats">
              <div>HP: {pending.defender.currentHp}/{pending.defender.maxHp}</div>
              <div>ATK: {pending.defender.attack}</div>
              <div>DEF: {pending.defender.defense}</div>
              <div>Die: d{pending.defender.die}</div>
            </div>
          </div>
        </div>

        <button className="btn-fight" onClick={handleFight}>
          Fight!
        </button>
      </div>
    </div>
  );
}

function CombatResultView({ result, onClose }: { result: CombatResult; onClose: () => void }) {
  return (
    <div className="modal-overlay">
      <div className="combat-modal combat-result-modal">
        <h2 className="combat-title">
          {result.winner === 'attacker' ? 'Attacker Wins!' : 'Defender Wins!'}
        </h2>

        <div className="combat-log">
          <table className="log-table">
            <thead>
              <tr>
                <th>Turn</th>
                <th>Attacker</th>
                <th>Roll</th>
                <th>Damage</th>
                <th>Target HP</th>
              </tr>
            </thead>
            <tbody>
              {result.log.map((entry, i) => (
                <tr key={i} className={entry.damage > 0 ? 'hit-row' : 'miss-row'}>
                  <td>{entry.turn}</td>
                  <td>{entry.attacker}</td>
                  <td>{entry.roll}</td>
                  <td>{entry.damage}</td>
                  <td>{entry.targetHpAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="combat-summary">
          <div>Attacker HP remaining: {result.attackerHpRemaining}</div>
          <div>Defender HP remaining: {result.defenderHpRemaining}</div>
        </div>

        <button className="btn-continue" onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  );
}
