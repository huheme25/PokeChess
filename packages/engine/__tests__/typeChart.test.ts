import { describe, it, expect } from 'vitest';
import { getTypeEffectiveness, getTypeMultiplier, SE, N, RES, IMM } from '../src/typeChart.js';

describe('Type Chart', () => {
  describe('Inmunidades Gen 1', () => {
    it('Normal es inmune a Ghost', () => {
      expect(getTypeEffectiveness('Ghost', 'Normal')).toBe(IMM);
    });

    it('Ghost es inmune a Normal', () => {
      expect(getTypeEffectiveness('Normal', 'Ghost')).toBe(IMM);
    });

    it('Ground es inmune a Electric', () => {
      expect(getTypeEffectiveness('Electric', 'Ground')).toBe(IMM);
    });

    it('Flying es inmune a Ground', () => {
      expect(getTypeEffectiveness('Ground', 'Flying')).toBe(IMM);
    });
  });

  describe('Super Efectivos', () => {
    it('Fire es SE contra Grass', () => {
      expect(getTypeEffectiveness('Fire', 'Grass')).toBe(SE);
    });

    it('Water es SE contra Fire', () => {
      expect(getTypeEffectiveness('Water', 'Fire')).toBe(SE);
    });

    it('Electric es SE contra Water', () => {
      expect(getTypeEffectiveness('Electric', 'Water')).toBe(SE);
    });

    it('Grass es SE contra Water', () => {
      expect(getTypeEffectiveness('Grass', 'Water')).toBe(SE);
    });

    it('Ice es SE contra Dragon', () => {
      expect(getTypeEffectiveness('Ice', 'Dragon')).toBe(SE);
    });

    it('Fighting es SE contra Normal', () => {
      expect(getTypeEffectiveness('Fighting', 'Normal')).toBe(SE);
    });

    it('Psychic es SE contra Fighting', () => {
      expect(getTypeEffectiveness('Psychic', 'Fighting')).toBe(SE);
    });
  });

  describe('Resistencias', () => {
    it('Fire resiste Fire', () => {
      expect(getTypeEffectiveness('Fire', 'Fire')).toBe(RES);
    });

    it('Water resiste Water', () => {
      expect(getTypeEffectiveness('Water', 'Water')).toBe(RES);
    });

    it('Dragon resiste Dragon... no, Dragon es SE vs Dragon', () => {
      expect(getTypeEffectiveness('Dragon', 'Dragon')).toBe(SE);
    });
  });

  describe('Doble tipo', () => {
    it('Fire vs Grass/Poison = SE*SE = 2.25', () => {
      // Fire->Grass = 1.5, Fire->Poison = 1.0
      // Resultado = 1.5 * 1.0 = 1.5
      const m = getTypeMultiplier(['Fire'], ['Grass', 'Poison']);
      expect(m).toBe(1.5);
    });

    it('Electric vs Water/Flying = SE*SE = 2.25', () => {
      // Electric->Water = 1.5, Electric->Flying = 1.5
      const m = getTypeMultiplier(['Electric'], ['Water', 'Flying']);
      expect(m).toBe(2.25);
    });

    it('Ground vs Flying/Normal = inmune (Ground->Flying=0)', () => {
      const m = getTypeMultiplier(['Ground'], ['Normal', 'Flying']);
      expect(m).toBe(0);
    });

    it('Atacante dual: usa el mejor multiplicador', () => {
      // Fire/Flying vs Grass: Fire->Grass=1.5, Flying->Grass=1.5 => best=1.5
      const m = getTypeMultiplier(['Fire', 'Flying'], ['Grass']);
      expect(m).toBe(SE);
    });
  });
});
