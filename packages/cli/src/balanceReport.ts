import { classVsClassWinrate, classVsClassWinrateAsym } from '@pokechess/engine';
import type { PieceClass } from '@pokechess/data';

const CLASSES: PieceClass[] = ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'];

function fmt(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

function printHeader(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

// Winrates neutrales (tipo neutral, M=1.0)
printHeader('WINRATES NEUTRALES (atacante primero, M=1.0)');

const header = ['Atk \\ Def', ...CLASSES].map(s => s.padEnd(10)).join('');
console.log(header);
console.log('-'.repeat(70));

for (const atk of CLASSES) {
  const row = [atk.padEnd(10)];
  for (const def of CLASSES) {
    const wr = classVsClassWinrate(atk, def, 1.0);
    row.push(fmt(wr).padEnd(10));
  }
  console.log(row.join(''));
}

// Matchups clave con targets
printHeader('MATCHUPS CLAVE — TARGETS DE BALANCE');

const keyMatchups: { atk: PieceClass; def: PieceClass; targetLow: number; targetHigh: number }[] = [
  { atk: 'Pawn',  def: 'Pawn',  targetLow: 0.52, targetHigh: 0.55 },
  { atk: 'Knight', def: 'Pawn', targetLow: 0.78, targetHigh: 0.85 },
  { atk: 'Bishop', def: 'Pawn', targetLow: 0.78, targetHigh: 0.85 },
  { atk: 'Rook',  def: 'Knight', targetLow: 0.65, targetHigh: 0.75 },
  { atk: 'Rook',  def: 'Bishop', targetLow: 0.65, targetHigh: 0.75 },
  { atk: 'Queen', def: 'Rook',  targetLow: 0.65, targetHigh: 0.75 },
];

for (const m of keyMatchups) {
  const wr = classVsClassWinrate(m.atk, m.def, 1.0);
  const inRange = wr >= m.targetLow && wr <= m.targetHigh;
  const status = inRange ? 'OK' : 'FUERA DE RANGO';
  console.log(
    `${m.atk.padEnd(8)} vs ${m.def.padEnd(8)} = ${fmt(wr).padEnd(8)} ` +
    `target [${fmt(m.targetLow)}-${fmt(m.targetHigh)}] ${status}`
  );
}

// Winrate shifts con SE/RES
printHeader('WINRATE SHIFTS CON TIPO (Pawn vs Pawn)');

const scenarios: { label: string; mAtk: number; mDef: number }[] = [
  { label: 'Neutral  (1.0 vs 1.0)',     mAtk: 1.0,  mDef: 1.0 },
  { label: 'SE atk   (1.5 vs 1.0)',     mAtk: 1.5,  mDef: 1.0 },
  { label: 'RES atk  (0.75 vs 1.0)',    mAtk: 0.75, mDef: 1.0 },
  { label: 'SE ambos (1.5 vs 1.5)',     mAtk: 1.5,  mDef: 1.5 },
  { label: 'SE vs RES (1.5 vs 0.75)',   mAtk: 1.5,  mDef: 0.75 },
  { label: 'IMM atk  (0.0 vs 1.0)',     mAtk: 0.0,  mDef: 1.0 },
];

for (const s of scenarios) {
  const wr = classVsClassWinrateAsym('Pawn', 'Pawn', s.mAtk, s.mDef);
  console.log(`${s.label.padEnd(30)} Atk wins: ${fmt(wr)}`);
}

printHeader('WINRATE SHIFTS CON TIPO (Minor vs Pawn)');

for (const s of scenarios.slice(0, 3)) {
  const wr = classVsClassWinrateAsym('Knight', 'Pawn', s.mAtk, s.mDef);
  console.log(`${s.label.padEnd(30)} Atk wins: ${fmt(wr)}`);
}

console.log('\n--- Fin del reporte de balance ---\n');
