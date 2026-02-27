import { useState, useMemo } from 'react';
import type { PokemonType, PieceClass } from '@pokechess/data';
import {
  classifyAllPokemon,
  classVsClassWinrate,
  TYPE_ORDER,
} from '@pokechess/engine';

const ALL_TYPES: PokemonType[] = [...TYPE_ORDER];
const ALL_CLASSES: PieceClass[] = ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'];

type SortKey = 'id' | 'name' | 'type1' | 'hp' | 'atk' | 'def' | 'spd' | 'special' | 'os' | 'ds' | 'pr' | 'pool' | 'sm';

export function BalanceDebug() {
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterType, setFilterType] = useState<PokemonType | ''>('');
  const [filterPool, setFilterPool] = useState<PieceClass | ''>('');

  const allClassified = useMemo(() => classifyAllPokemon(), []);

  // Class vs class winrate matrix
  const winrateMatrix = useMemo(() => {
    const matrix: number[][] = [];
    for (const atk of ALL_CLASSES) {
      const row: number[] = [];
      for (const def of ALL_CLASSES) {
        row.push(classVsClassWinrate(atk, def));
      }
      matrix.push(row);
    }
    return matrix;
  }, []);

  // Filtrado
  const filtered = useMemo(() => {
    let data = [...allClassified];
    if (filterType) {
      data = data.filter(c => c.pokemon.types.includes(filterType));
    }
    if (filterPool) {
      if (filterPool === 'Knight') {
        data = data.filter(c => c.knightLegal);
      } else if (filterPool === 'Bishop') {
        data = data.filter(c => c.bishopLegal);
      } else {
        data = data.filter(c => c.pool.includes(filterPool));
      }
    }
    return data;
  }, [allClassified, filterType, filterPool]);

  // Ordenar
  const sorted = useMemo(() => {
    const data = [...filtered];
    const dir = sortAsc ? 1 : -1;

    data.sort((a, b) => {
      switch (sortKey) {
        case 'id': return (a.pokemon.id - b.pokemon.id) * dir;
        case 'name': return a.pokemon.name.localeCompare(b.pokemon.name) * dir;
        case 'type1': return (a.pokemon.types[0] || '').localeCompare(b.pokemon.types[0] || '') * dir;
        case 'hp': return (a.pokemon.baseStats.hp - b.pokemon.baseStats.hp) * dir;
        case 'atk': return (a.pokemon.baseStats.atk - b.pokemon.baseStats.atk) * dir;
        case 'def': return (a.pokemon.baseStats.def - b.pokemon.baseStats.def) * dir;
        case 'spd': return (a.pokemon.baseStats.spd - b.pokemon.baseStats.spd) * dir;
        case 'special': return (a.pokemon.baseStats.special - b.pokemon.baseStats.special) * dir;
        case 'os': return (a.os - b.os) * dir;
        case 'ds': return (a.ds - b.ds) * dir;
        case 'pr': return (a.pr - b.pr) * dir;
        case 'pool': return a.pool.join(',').localeCompare(b.pool.join(',')) * dir;
        case 'sm': return (a.speciesMod - b.speciesMod) * dir;
        default: return 0;
      }
    });

    return data;
  }, [filtered, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortAsc ? ' \u25B2' : ' \u25BC';
  };

  return (
    <div className="balance-debug">
      <h2>Class vs Class Winrate Matrix</h2>
      <p className="subtitle">Attacker (row) vs Defender (col), neutral type multiplier</p>

      <table className="winrate-matrix">
        <thead>
          <tr>
            <th>Atk \ Def</th>
            {ALL_CLASSES.map(c => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {ALL_CLASSES.map((atkClass, ri) => (
            <tr key={atkClass}>
              <td className="matrix-row-label">{atkClass}</td>
              {winrateMatrix[ri].map((wr, ci) => {
                const pct = (wr * 100).toFixed(1);
                const bg = wr > 0.55 ? 'wr-high' : wr < 0.45 ? 'wr-low' : 'wr-neutral';
                return (
                  <td key={ci} className={`matrix-cell ${bg}`}>
                    {pct}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <h2>All 151 Pokemon</h2>

      <div className="balance-filters">
        <label>
          Filter by Type:
          <select value={filterType} onChange={e => setFilterType(e.target.value as PokemonType | '')}>
            <option value="">All</option>
            {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>
          Filter by Pool:
          <select value={filterPool} onChange={e => setFilterPool(e.target.value as PieceClass | '')}>
            <option value="">All</option>
            {ALL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <span className="result-count">{sorted.length} Pokemon</span>
      </div>

      <div className="balance-table-container">
        <table className="balance-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('id')}>ID{sortIndicator('id')}</th>
              <th className="sortable" onClick={() => handleSort('name')}>Name{sortIndicator('name')}</th>
              <th className="sortable" onClick={() => handleSort('type1')}>Types{sortIndicator('type1')}</th>
              <th className="sortable" onClick={() => handleSort('hp')}>HP{sortIndicator('hp')}</th>
              <th className="sortable" onClick={() => handleSort('atk')}>Atk{sortIndicator('atk')}</th>
              <th className="sortable" onClick={() => handleSort('def')}>Def{sortIndicator('def')}</th>
              <th className="sortable" onClick={() => handleSort('spd')}>Spd{sortIndicator('spd')}</th>
              <th className="sortable" onClick={() => handleSort('special')}>Spc{sortIndicator('special')}</th>
              <th className="sortable" onClick={() => handleSort('os')}>OS{sortIndicator('os')}</th>
              <th className="sortable" onClick={() => handleSort('ds')}>DS{sortIndicator('ds')}</th>
              <th className="sortable" onClick={() => handleSort('pr')}>PR{sortIndicator('pr')}</th>
              <th className="sortable" onClick={() => handleSort('pool')}>Pool{sortIndicator('pool')}</th>
              <th className="sortable" onClick={() => handleSort('sm')}>SM{sortIndicator('sm')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => (
              <tr key={c.pokemon.id}>
                <td>{c.pokemon.id}</td>
                <td className="pokemon-name-cell">{c.pokemon.name}</td>
                <td className="pokemon-types">
                  {c.pokemon.types.map(t => (
                    <span key={t} className={`type-badge type-${t.toLowerCase()}`}>{t}</span>
                  ))}
                </td>
                <td>{c.pokemon.baseStats.hp}</td>
                <td>{c.pokemon.baseStats.atk}</td>
                <td>{c.pokemon.baseStats.def}</td>
                <td>{c.pokemon.baseStats.spd}</td>
                <td>{c.pokemon.baseStats.special}</td>
                <td>{c.os.toFixed(1)}</td>
                <td>{c.ds.toFixed(1)}</td>
                <td className="pr-cell">{c.pr.toFixed(1)}</td>
                <td className="pool-cell">{c.pool.join('/')}</td>
                <td className={c.speciesMod === 1 ? 'sm-plus' : c.speciesMod === -1 ? 'sm-minus' : ''}>
                  {c.speciesMod > 0 ? '+1' : c.speciesMod < 0 ? '-1' : '0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
