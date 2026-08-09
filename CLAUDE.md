# PokeChess

Ajedrez táctico con Pokémon Gen 1. Monorepo pnpm, TypeScript estricto.

## Estructura

```
packages/data/     → Tipos TS + pokemon.json (151 Pokémon, stats RBY exactos)
packages/engine/   → Combat, balance DP, chess, classifier, teamBuilder
packages/cli/      → Balance report y tuner
apps/web/          → React 19 + Vite 6 + Zustand 5
```

## Comandos

```bash
pnpm dev              # Vite dev server (:5173)
pnpm build            # Build todos los paquetes
pnpm test             # Vitest (56 tests)
pnpm balance:report   # Matriz de winrates por clase
pnpm balance:tune     # Buscar stats óptimos
```

## Balance (no cambiar sin correr el tuner)

Stats por clase — resultado del auto-tuner, no arbitrarios:

| Clase  | HP | Die | ATK | DEF |
|--------|----|-----|-----|-----|
| Pawn   | 33 | d6  | 1   | 3   |
| Minor  | 41 | d6  | 1   | 3   |
| Rook   | 46 | d6  | 1   | 3   |
| Queen  | 51 | d6  | 1   | 3   |
| King   | 36 | d6  | 1   | 3   |

- Balance se logra con HP diferenciado, no con ATK/DEF/die distintos
- Pawn evoluciona: +4 HP/stage + die upgrade (d6→d8→d10)
- King intencionalmente vulnerable (HP 36, menor que Rook)
- Species Mod: top/bottom 15% del pool recibe ±1 DEF. Mewtwo King: -1 adicional

## Targets de winrate

- Pawn vs Pawn: 52-55% (ventaja atacante)
- Minor vs Pawn: 78-85%
- Rook vs Minor: 65-75%
- Queen vs Rook: 65-75%
- Type SE/RES shift: ×1.5 / ×0.75

## Combat

- Atacante va primero (initiative)
- Daño = floor(max(0, roll + ATK - DEF) × typeMultiplier)
- Defender Guard: +1 DEF temporal en primer golpe
- Ganador: heal completo. Pawn ganador puede evolucionar

## Tipos y equipos

- 15 tipos Gen 1 (sin Dark/Steel/Fairy)
- Equipo: 16 piezas (8P, 2N, 2B, 2R, 1Q, 1K)
- Restricción: ≥10 tipo primario, ≥6 secundario
- AutoBuild: greedy constrained-first + swap pass. 30/44 combos viables
- Tipos limitados como primario: Ground(8), Electric(6), Fire(7) — necesitan ≥10 familias

## Classifier (pools por percentil PR)

```
OS = 0.35×atk + 0.35×special + 0.30×spd
DS = 0.45×hp + 0.35×def + 0.20×special
PR = 0.55×OS + 0.45×DS
```

- Pawn: 0-45th | Minor: 45-75th | Rook: 75-92nd | Queen: 92-99th | King: 70-97th
- Knight: Speed top 40% del pool Minor. Bishop: Special top 40%

## No implementado

- Castling, en passant
- UI no verificada end-to-end manualmente
