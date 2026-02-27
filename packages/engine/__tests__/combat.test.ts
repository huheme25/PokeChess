import { describe, it, expect } from 'vitest';
import { calculateDamage, getStatsWithEvolution, BASE_STATS } from '../src/combat.js';

describe('Combat', () => {
  describe('Damage Formula', () => {
    it('Calcula daño básico: roll + A - D * M', () => {
      // roll=4, A=0, D=1, M=1.0, no guard
      const dmg = calculateDamage(4, 0, 1, 1.0, false);
      // floor(max(0, 4 + 0 - 1) * 1.0) = floor(3) = 3
      expect(dmg).toBe(3);
    });

    it('Daño mínimo es 0', () => {
      // roll=1, A=0, D=5, M=1.0
      const dmg = calculateDamage(1, 0, 5, 1.0, false);
      expect(dmg).toBe(0);
    });

    it('Aplica multiplicador SE (1.5)', () => {
      // roll=6, A=1, D=1, M=1.5
      const dmg = calculateDamage(6, 1, 1, 1.5, false);
      // floor(max(0, 6+1-1) * 1.5) = floor(6*1.5) = floor(9) = 9
      expect(dmg).toBe(9);
    });

    it('Inmunidad da 0 daño', () => {
      const dmg = calculateDamage(6, 3, 0, 0, false);
      expect(dmg).toBe(0);
    });

    it('Aplica resistencia (0.75)', () => {
      // roll=4, A=2, D=1, M=0.75
      const dmg = calculateDamage(4, 2, 1, 0.75, false);
      // floor(max(0, 4+2-1) * 0.75) = floor(5*0.75) = floor(3.75) = 3
      expect(dmg).toBe(3);
    });
  });

  describe('Defender Guard', () => {
    it('Primer golpe al defensor tiene +1 D', () => {
      // roll=4, A=0, D=1, M=1.0, guard activo
      const dmgGuard = calculateDamage(4, 0, 1, 1.0, true);
      // floor(max(0, 4+0-2) * 1.0) = 2
      expect(dmgGuard).toBe(2);

      // Sin guard
      const dmgNoGuard = calculateDamage(4, 0, 1, 1.0, false);
      // floor(max(0, 4+0-1) * 1.0) = 3
      expect(dmgNoGuard).toBe(3);

      expect(dmgGuard).toBeLessThan(dmgNoGuard);
    });

    it('Guard puede reducir daño a 0', () => {
      // roll=1, A=0, D=1, guard activo: effective D = 2
      const dmg = calculateDamage(1, 0, 1, 1.0, true);
      // floor(max(0, 1+0-2) * 1.0) = 0
      expect(dmg).toBe(0);
    });
  });

  describe('Stats con Evolución', () => {
    it('Peón Stage 0 tiene stats base', () => {
      const stats = getStatsWithEvolution('Pawn', 0, 0, 'defense', false);
      expect(stats).toEqual(BASE_STATS.Pawn);
    });

    it('Peón Stage 1 tiene +4 HP y dado sube', () => {
      const stats = getStatsWithEvolution('Pawn', 1, 0, 'defense', false);
      expect(stats.hp).toBe(37);     // 33 + 4
      expect(stats.attack).toBe(1);  // sin cambio
      expect(stats.defense).toBe(3); // sin cambio
      expect(stats.die).toBe(8);     // d6 -> d8
    });

    it('Peón Stage 2 acumula ambas evoluciones', () => {
      const stats = getStatsWithEvolution('Pawn', 2, 0, 'defense', false);
      expect(stats.hp).toBe(41);     // 33 + 4 + 4
      expect(stats.attack).toBe(1);  // sin cambio
      expect(stats.defense).toBe(3); // sin cambio
      expect(stats.die).toBe(10);    // d6 -> d8 -> d10
    });

    it('Non-Pawn no evoluciona', () => {
      const stats = getStatsWithEvolution('Knight', 2, 0, 'defense', false);
      expect(stats).toEqual(BASE_STATS.Knight);
    });

    it('Species Mod se aplica', () => {
      // SM = -1 en defensa
      const stats = getStatsWithEvolution('Pawn', 0, -1, 'defense', false);
      expect(stats.defense).toBe(2); // 3 + (-1) = 2

      // SM = +1 en defensa
      const stats2 = getStatsWithEvolution('Pawn', 0, 1, 'defense', false);
      expect(stats2.defense).toBe(4); // 3 + 1
    });

    it('Mewtwo King tiene -1 D permanente', () => {
      const stats = getStatsWithEvolution('King', 0, 0, 'defense', true);
      expect(stats.defense).toBe(2); // 3 - 1
    });
  });
});
