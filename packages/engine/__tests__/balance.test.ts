import { describe, it, expect } from 'vitest';
import { calculateWinProbability, classVsClassWinrate, classVsClassWinrateAsym } from '../src/balance.js';

describe('Balance Engine (DP exacto)', () => {
  it('Caso trivial: 1 HP cada uno, atacante gana 100% si hace >0 daño', () => {
    // d6, A=2, D=0, M=1.0 vs d6, A=2, D=0, M=1.0
    // HP 1 cada uno. Atacante tira primero.
    // Con guard, D efectivo del defensor = 0+1=1
    // Roll 1: dmg = floor(max(0, 1+2-1)*1.0) = 2 -> mata
    // Todos los rolls matan porque min roll=1+2-1=2 > 0
    const prob = calculateWinProbability({
      hpA: 1, dieA: 6, attackA: 2, defenseA: 0,
      hpB: 1, dieB: 6, attackB: 2, defenseB: 0,
      typeMultiplierAtoB: 1.0,
      typeMultiplierBtoA: 1.0,
    });
    expect(prob).toBeCloseTo(1.0, 5);
  });

  it('Inmunidad total del defensor: atacante pierde siempre (si defensor puede dañar)', () => {
    const prob = calculateWinProbability({
      hpA: 10, dieA: 6, attackA: 0, defenseA: 0,
      hpB: 10, dieB: 6, attackB: 3, defenseB: 0,
      typeMultiplierAtoB: 0.0, // inmune
      typeMultiplierBtoA: 1.0,
    });
    expect(prob).toBe(0);
  });

  it('Pawn vs Pawn neutral: atacante tiene ventaja moderada (0.50-0.57)', () => {
    const wr = classVsClassWinrate('Pawn', 'Pawn', 1.0);
    expect(wr).toBeGreaterThan(0.50);
    expect(wr).toBeLessThan(0.57);
  });

  it('Minor vs Pawn neutral: minor domina (0.75-0.90)', () => {
    const wr = classVsClassWinrate('Knight', 'Pawn', 1.0);
    expect(wr).toBeGreaterThan(0.75);
    expect(wr).toBeLessThan(0.90);
  });

  it('Queen vs Rook neutral: queen tiene ventaja clara (0.60-0.80)', () => {
    const wr = classVsClassWinrate('Queen', 'Rook', 1.0);
    expect(wr).toBeGreaterThan(0.60);
    expect(wr).toBeLessThan(0.80);
  });

  it('SE shift aumenta winrate del atacante', () => {
    const neutral = classVsClassWinrateAsym('Pawn', 'Pawn', 1.0, 1.0);
    const seAttack = classVsClassWinrateAsym('Pawn', 'Pawn', 1.5, 1.0);
    expect(seAttack).toBeGreaterThan(neutral);
  });

  it('RES shift disminuye winrate del atacante', () => {
    const neutral = classVsClassWinrateAsym('Pawn', 'Pawn', 1.0, 1.0);
    const resAttack = classVsClassWinrateAsym('Pawn', 'Pawn', 0.75, 1.0);
    expect(resAttack).toBeLessThan(neutral);
  });

  it('Probabilidad siempre entre 0 y 1', () => {
    const classes = ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'] as const;
    for (const atk of classes) {
      for (const def of classes) {
        const wr = classVsClassWinrate(atk, def, 1.0);
        expect(wr).toBeGreaterThanOrEqual(0);
        expect(wr).toBeLessThanOrEqual(1);
      }
    }
  });

  it('Simetría: Knight y Bishop (mismos stats) dan el mismo winrate como atacante', () => {
    // Knight y Bishop tienen stats idénticos (HP 41, d6, A 1, D 3)
    // Ambos como atacante primero contra el otro deberían tener el mismo winrate
    const wrAB = classVsClassWinrate('Knight', 'Bishop', 1.0);
    const wrBA = classVsClassWinrate('Bishop', 'Knight', 1.0);
    expect(wrAB).toBeCloseTo(wrBA, 5);
    // Ambos > 0.5 por ventaja de atacar primero
    expect(wrAB).toBeGreaterThan(0.5);
  });
});
