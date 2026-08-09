import { useState, useCallback, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────
// TYPES & DATA
// ─────────────────────────────────────────────────────────

const TYPE_CHART = {
  fire:     { grass: 2, ice: 2, bug: 2, water: 0.5, rock: 0.5, fire: 0.5, dragon: 0.5 },
  water:    { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  grass:    { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5 },
  electric: { water: 2, flying: 2, grass: 0.5, electric: 0.5, dragon: 0.5, ground: 0 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, flying: 0.5, poison: 0.5, bug: 0.5, psychic: 0.5, ghost: 0 },
  normal:   { rock: 0.5, ghost: 0 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5 },
  ground:   { fire: 2, electric: 2, poison: 2, rock: 2, grass: 0.5, bug: 0.5, flying: 0 },
  flying:   { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5 },
  ice:      { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5 },
  rock:     { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5 },
  bug:      { grass: 2, psychic: 2, poison: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, fire: 0.5 },
  ghost:    { psychic: 2, ghost: 2, normal: 0 },
  dragon:   { dragon: 2 },
};

const TC = {
  fire: { bg: "#F08030", fg: "#fff", glow: "rgba(240,128,48,0.6)", dark: "#c0601a" },
  water: { bg: "#6890F0", fg: "#fff", glow: "rgba(104,144,240,0.6)", dark: "#4870c0" },
  grass: { bg: "#78C850", fg: "#fff", glow: "rgba(120,200,80,0.6)", dark: "#58a830" },
  electric: { bg: "#F8D030", fg: "#333", glow: "rgba(248,208,48,0.6)", dark: "#d8b010" },
  psychic: { bg: "#F85888", fg: "#fff", glow: "rgba(248,88,136,0.6)", dark: "#d83868" },
  fighting: { bg: "#C03028", fg: "#fff", glow: "rgba(192,48,40,0.6)", dark: "#a01008" },
  normal: { bg: "#A8A878", fg: "#fff", glow: "rgba(168,168,120,0.5)", dark: "#888858" },
  poison: { bg: "#A040A0", fg: "#fff", glow: "rgba(160,64,160,0.6)", dark: "#802080" },
  ground: { bg: "#E0C068", fg: "#333", glow: "rgba(224,192,104,0.5)", dark: "#c0a048" },
  flying: { bg: "#A890F0", fg: "#fff", glow: "rgba(168,144,240,0.6)", dark: "#8870d0" },
  ice: { bg: "#98D8D8", fg: "#333", glow: "rgba(152,216,216,0.6)", dark: "#78b8b8" },
  rock: { bg: "#B8A038", fg: "#fff", glow: "rgba(184,160,56,0.5)", dark: "#988018" },
  bug: { bg: "#A8B820", fg: "#fff", glow: "rgba(168,184,32,0.5)", dark: "#889800" },
  ghost: { bg: "#705898", fg: "#fff", glow: "rgba(112,88,152,0.6)", dark: "#503878" },
  dragon: { bg: "#7038F8", fg: "#fff", glow: "rgba(112,56,248,0.6)", dark: "#5018d8" },
};

const TYPE_LABEL = {
  fire:"Fuego",water:"Agua",grass:"Planta",electric:"Eléctrico",psychic:"Psíquico",
  fighting:"Lucha",normal:"Normal",poison:"Veneno",ground:"Tierra",flying:"Volador",
  ice:"Hielo",rock:"Roca",bug:"Bicho",ghost:"Fantasma",dragon:"Dragón"
};

// Classic chess unicode pieces
const CHESS_ICONS = {
  king:   { white: "♔", black: "♚" },
  queen:  { white: "♕", black: "♛" },
  rook:   { white: "♖", black: "♜" },
  bishop: { white: "♗", black: "♝" },
  knight: { white: "♘", black: "♞" },
  pawn:   { white: "♙", black: "♟" },
};

const ROLE_LABEL = { king:"Rey", queen:"Reina", rook:"Torre", bishop:"Alfil", knight:"Caballo", pawn:"Peón" };

const POKEMON_DB = [
  { id:4,name:"Charmander",type:"fire",stage:0,hp:50,atk:30,evo:5 },
  { id:5,name:"Charmeleon",type:"fire",stage:1,hp:80,atk:40,evo:6 },
  { id:6,name:"Charizard",type:"fire",stage:2,hp:120,atk:50,evo:null },
  { id:37,name:"Vulpix",type:"fire",stage:0,hp:50,atk:28,evo:38 },
  { id:38,name:"Ninetales",type:"fire",stage:1,hp:85,atk:42,evo:null },
  { id:58,name:"Growlithe",type:"fire",stage:0,hp:55,atk:35,evo:59 },
  { id:59,name:"Arcanine",type:"fire",stage:2,hp:110,atk:48,evo:null },
  { id:77,name:"Ponyta",type:"fire",stage:0,hp:50,atk:32,evo:78 },
  { id:78,name:"Rapidash",type:"fire",stage:1,hp:80,atk:42,evo:null },
  { id:126,name:"Magmar",type:"fire",stage:1,hp:85,atk:45,evo:null },
  { id:136,name:"Flareon",type:"fire",stage:1,hp:80,atk:48,evo:null },
  { id:7,name:"Squirtle",type:"water",stage:0,hp:50,atk:28,evo:8 },
  { id:8,name:"Wartortle",type:"water",stage:1,hp:80,atk:38,evo:9 },
  { id:9,name:"Blastoise",type:"water",stage:2,hp:120,atk:48,evo:null },
  { id:54,name:"Psyduck",type:"water",stage:0,hp:50,atk:30,evo:55 },
  { id:55,name:"Golduck",type:"water",stage:1,hp:85,atk:42,evo:null },
  { id:60,name:"Poliwag",type:"water",stage:0,hp:45,atk:25,evo:61 },
  { id:61,name:"Poliwhirl",type:"water",stage:1,hp:75,atk:38,evo:62 },
  { id:62,name:"Poliwrath",type:"water",stage:2,hp:110,atk:45,evo:null },
  { id:116,name:"Horsea",type:"water",stage:0,hp:45,atk:28,evo:117 },
  { id:117,name:"Seadra",type:"water",stage:1,hp:80,atk:42,evo:null },
  { id:120,name:"Staryu",type:"water",stage:0,hp:45,atk:28,evo:121 },
  { id:121,name:"Starmie",type:"water",stage:1,hp:80,atk:42,evo:null },
  { id:134,name:"Vaporeon",type:"water",stage:1,hp:90,atk:40,evo:null },
  { id:131,name:"Lapras",type:"water",stage:3,hp:100,atk:40,evo:null },
  { id:1,name:"Bulbasaur",type:"grass",stage:0,hp:55,atk:30,evo:2 },
  { id:2,name:"Ivysaur",type:"grass",stage:1,hp:80,atk:40,evo:3 },
  { id:3,name:"Venusaur",type:"grass",stage:2,hp:120,atk:48,evo:null },
  { id:43,name:"Oddish",type:"grass",stage:0,hp:50,atk:28,evo:44 },
  { id:44,name:"Gloom",type:"grass",stage:1,hp:75,atk:38,evo:45 },
  { id:45,name:"Vileplume",type:"grass",stage:2,hp:110,atk:45,evo:null },
  { id:69,name:"Bellsprout",type:"grass",stage:0,hp:48,atk:32,evo:70 },
  { id:70,name:"Weepinbell",type:"grass",stage:1,hp:75,atk:40,evo:71 },
  { id:71,name:"Victreebel",type:"grass",stage:2,hp:110,atk:45,evo:null },
  { id:102,name:"Exeggcute",type:"grass",stage:0,hp:50,atk:28,evo:103 },
  { id:103,name:"Exeggutor",type:"grass",stage:1,hp:90,atk:45,evo:null },
  { id:114,name:"Tangela",type:"grass",stage:0,hp:55,atk:30,evo:null },
  { id:25,name:"Pikachu",type:"electric",stage:0,hp:45,atk:32,evo:26 },
  { id:26,name:"Raichu",type:"electric",stage:1,hp:80,atk:45,evo:null },
  { id:81,name:"Magnemite",type:"electric",stage:0,hp:45,atk:28,evo:82 },
  { id:82,name:"Magneton",type:"electric",stage:1,hp:80,atk:42,evo:null },
  { id:100,name:"Voltorb",type:"electric",stage:0,hp:45,atk:25,evo:101 },
  { id:101,name:"Electrode",type:"electric",stage:1,hp:75,atk:38,evo:null },
  { id:125,name:"Electabuzz",type:"electric",stage:1,hp:85,atk:45,evo:null },
  { id:135,name:"Jolteon",type:"electric",stage:1,hp:80,atk:45,evo:null },
  { id:63,name:"Abra",type:"psychic",stage:0,hp:40,atk:25,evo:64 },
  { id:64,name:"Kadabra",type:"psychic",stage:1,hp:75,atk:42,evo:65 },
  { id:65,name:"Alakazam",type:"psychic",stage:2,hp:105,atk:50,evo:null },
  { id:79,name:"Slowpoke",type:"psychic",stage:0,hp:55,atk:25,evo:80 },
  { id:80,name:"Slowbro",type:"psychic",stage:1,hp:90,atk:40,evo:null },
  { id:96,name:"Drowzee",type:"psychic",stage:0,hp:50,atk:28,evo:97 },
  { id:97,name:"Hypno",type:"psychic",stage:1,hp:85,atk:40,evo:null },
  { id:150,name:"Mewtwo",type:"psychic",stage:3,hp:100,atk:45,evo:null },
  { id:151,name:"Mew",type:"psychic",stage:3,hp:100,atk:40,evo:null },
  { id:66,name:"Machop",type:"fighting",stage:0,hp:55,atk:35,evo:67 },
  { id:67,name:"Machoke",type:"fighting",stage:1,hp:85,atk:42,evo:68 },
  { id:68,name:"Machamp",type:"fighting",stage:2,hp:115,atk:50,evo:null },
  { id:56,name:"Mankey",type:"fighting",stage:0,hp:50,atk:35,evo:57 },
  { id:57,name:"Primeape",type:"fighting",stage:1,hp:80,atk:45,evo:null },
  { id:106,name:"Hitmonlee",type:"fighting",stage:1,hp:80,atk:48,evo:null },
  { id:107,name:"Hitmonchan",type:"fighting",stage:1,hp:80,atk:45,evo:null },
  { id:16,name:"Pidgey",type:"flying",stage:0,hp:45,atk:25,evo:17 },
  { id:17,name:"Pidgeotto",type:"flying",stage:1,hp:75,atk:38,evo:18 },
  { id:18,name:"Pidgeot",type:"flying",stage:2,hp:105,atk:42,evo:null },
  { id:19,name:"Rattata",type:"normal",stage:0,hp:40,atk:28,evo:20 },
  { id:20,name:"Raticate",type:"normal",stage:1,hp:70,atk:38,evo:null },
  { id:52,name:"Meowth",type:"normal",stage:0,hp:45,atk:28,evo:53 },
  { id:53,name:"Persian",type:"normal",stage:1,hp:75,atk:40,evo:null },
  { id:143,name:"Snorlax",type:"normal",stage:3,hp:100,atk:38,evo:null },
  { id:23,name:"Ekans",type:"poison",stage:0,hp:45,atk:28,evo:24 },
  { id:24,name:"Arbok",type:"poison",stage:1,hp:80,atk:42,evo:null },
  { id:29,name:"Nidoran♀",type:"poison",stage:0,hp:50,atk:28,evo:30 },
  { id:30,name:"Nidorina",type:"poison",stage:1,hp:75,atk:38,evo:31 },
  { id:31,name:"Nidoqueen",type:"poison",stage:2,hp:110,atk:45,evo:null },
  { id:32,name:"Nidoran♂",type:"poison",stage:0,hp:48,atk:30,evo:33 },
  { id:33,name:"Nidorino",type:"poison",stage:1,hp:75,atk:40,evo:34 },
  { id:34,name:"Nidoking",type:"poison",stage:2,hp:112,atk:48,evo:null },
  { id:88,name:"Grimer",type:"poison",stage:0,hp:55,atk:30,evo:89 },
  { id:89,name:"Muk",type:"poison",stage:1,hp:90,atk:45,evo:null },
  { id:109,name:"Koffing",type:"poison",stage:0,hp:50,atk:28,evo:110 },
  { id:110,name:"Weezing",type:"poison",stage:1,hp:80,atk:40,evo:null },
  { id:27,name:"Sandshrew",type:"ground",stage:0,hp:50,atk:32,evo:28 },
  { id:28,name:"Sandslash",type:"ground",stage:1,hp:82,atk:42,evo:null },
  { id:50,name:"Diglett",type:"ground",stage:0,hp:40,atk:30,evo:51 },
  { id:51,name:"Dugtrio",type:"ground",stage:1,hp:70,atk:42,evo:null },
  { id:74,name:"Geodude",type:"ground",stage:0,hp:50,atk:30,evo:75 },
  { id:75,name:"Graveler",type:"ground",stage:1,hp:80,atk:40,evo:76 },
  { id:76,name:"Golem",type:"ground",stage:2,hp:110,atk:48,evo:null },
  { id:104,name:"Cubone",type:"ground",stage:0,hp:50,atk:30,evo:105 },
  { id:105,name:"Marowak",type:"ground",stage:1,hp:80,atk:42,evo:null },
  { id:111,name:"Rhyhorn",type:"ground",stage:0,hp:55,atk:35,evo:112 },
  { id:112,name:"Rhydon",type:"ground",stage:2,hp:115,atk:50,evo:null },
  { id:90,name:"Shellder",type:"ice",stage:0,hp:45,atk:28,evo:91 },
  { id:91,name:"Cloyster",type:"ice",stage:1,hp:80,atk:42,evo:null },
  { id:86,name:"Seel",type:"ice",stage:0,hp:50,atk:25,evo:87 },
  { id:87,name:"Dewgong",type:"ice",stage:1,hp:85,atk:40,evo:null },
  { id:124,name:"Jynx",type:"ice",stage:1,hp:80,atk:42,evo:null },
  { id:144,name:"Articuno",type:"ice",stage:3,hp:100,atk:42,evo:null },
  { id:138,name:"Omanyte",type:"rock",stage:0,hp:48,atk:28,evo:139 },
  { id:139,name:"Omastar",type:"rock",stage:1,hp:82,atk:42,evo:null },
  { id:140,name:"Kabuto",type:"rock",stage:0,hp:45,atk:30,evo:141 },
  { id:141,name:"Kabutops",type:"rock",stage:1,hp:80,atk:45,evo:null },
  { id:142,name:"Aerodactyl",type:"rock",stage:2,hp:105,atk:48,evo:null },
  { id:10,name:"Caterpie",type:"bug",stage:0,hp:40,atk:22,evo:11 },
  { id:11,name:"Metapod",type:"bug",stage:1,hp:60,atk:25,evo:12 },
  { id:12,name:"Butterfree",type:"bug",stage:2,hp:90,atk:38,evo:null },
  { id:13,name:"Weedle",type:"bug",stage:0,hp:40,atk:22,evo:14 },
  { id:14,name:"Kakuna",type:"bug",stage:1,hp:60,atk:25,evo:15 },
  { id:15,name:"Beedrill",type:"bug",stage:2,hp:90,atk:42,evo:null },
  { id:46,name:"Paras",type:"bug",stage:0,hp:48,atk:30,evo:47 },
  { id:47,name:"Parasect",type:"bug",stage:1,hp:78,atk:40,evo:null },
  { id:48,name:"Venonat",type:"bug",stage:0,hp:50,atk:28,evo:49 },
  { id:49,name:"Venomoth",type:"bug",stage:1,hp:78,atk:38,evo:null },
  { id:123,name:"Scyther",type:"bug",stage:1,hp:85,atk:48,evo:null },
  { id:127,name:"Pinsir",type:"bug",stage:1,hp:85,atk:48,evo:null },
  { id:92,name:"Gastly",type:"ghost",stage:0,hp:40,atk:28,evo:93 },
  { id:93,name:"Haunter",type:"ghost",stage:1,hp:72,atk:42,evo:94 },
  { id:94,name:"Gengar",type:"ghost",stage:2,hp:105,atk:50,evo:null },
  { id:147,name:"Dratini",type:"dragon",stage:0,hp:50,atk:30,evo:148 },
  { id:148,name:"Dragonair",type:"dragon",stage:1,hp:80,atk:42,evo:149 },
  { id:149,name:"Dragonite",type:"dragon",stage:3,hp:100,atk:45,evo:null },
  { id:41,name:"Zubat",type:"flying",stage:0,hp:45,atk:25,evo:42 },
  { id:42,name:"Golbat",type:"flying",stage:1,hp:78,atk:40,evo:null },
  { id:84,name:"Doduo",type:"flying",stage:0,hp:48,atk:32,evo:85 },
  { id:85,name:"Dodrio",type:"flying",stage:1,hp:78,atk:45,evo:null },
  { id:145,name:"Zapdos",type:"electric",stage:3,hp:100,atk:42,evo:null },
  { id:146,name:"Moltres",type:"fire",stage:3,hp:100,atk:42,evo:null },
  { id:130,name:"Gyarados",type:"water",stage:3,hp:100,atk:45,evo:null },
  { id:115,name:"Kangaskhan",type:"normal",stage:2,hp:110,atk:45,evo:null },
  { id:128,name:"Tauros",type:"normal",stage:1,hp:82,atk:42,evo:null },
  { id:133,name:"Eevee",type:"normal",stage:0,hp:50,atk:28,evo:null },
];

const gp = (id) => POKEMON_DB.find(p => p.id === id);
const getTypeMult = (at, dt) => TYPE_CHART[at]?.[dt] ?? 1;
const getEvoLine = (p) => { const l=[p]; let c=p; while(c.evo){const n=gp(c.evo);if(n){l.push(n);c=n;}else break;} return l; };

// ─────────────────────────────────────────────────────────
// BATTLE
// ─────────────────────────────────────────────────────────

const resolveBattle = (atk, def) => {
  const am = getTypeMult(atk.type, def.type);
  const dm = getTypeMult(def.type, atk.type);
  const ad = Math.round(atk.atk * am);
  const dd = Math.round(def.atk * dm);
  const log = [];
  let ah = atk.hp, dh = def.hp;

  log.push({ t:"info", msg:`${atk.name} vs ${def.name}` });
  if (am === 0) {
    log.push({ t:"immune", msg:`¡${def.name} es INMUNE! Ataque falla.` });
    return { winner:"defender", log, ah:atk.hp, dh:def.hp };
  }

  for (let r = 0; r < 10 && ah > 0 && dh > 0; r++) {
    dh -= ad;
    const ae = am > 1 ? " ¡Super efectivo!" : am < 1 ? " No muy efectivo..." : "";
    log.push({ t:"atk", who:atk.name, dmg:ad, hp:Math.max(0,dh), msg:`${atk.name} → ${ad} dmg${ae} (${def.name}: ${Math.max(0,dh)} HP)` });
    if (dh <= 0) { log.push({ t:"win", msg:`¡${atk.name} gana! Captura exitosa.` }); return { winner:"attacker", log, ah, dh:0 }; }
    ah -= dd;
    const de = dm > 1 ? " ¡Super efectivo!" : dm < 1 ? " No muy efectivo..." : "";
    log.push({ t:"def", who:def.name, dmg:dd, hp:Math.max(0,ah), msg:`${def.name} → ${dd} dmg${de} (${atk.name}: ${Math.max(0,ah)} HP)` });
    if (ah <= 0) { log.push({ t:"win", msg:`¡${def.name} resiste! Atacante cae.` }); return { winner:"defender", log, ah:0, dh }; }
  }
  log.push({ t:"win", msg:"Empate. Atacante se retira." });
  return { winner:"defender", log, ah, dh };
};

// ─────────────────────────────────────────────────────────
// CHESS LOGIC
// ─────────────────────────────────────────────────────────

const inB = (r,c) => r>=0 && r<8 && c>=0 && c<8;

const getMoves = (board, row, col, ep = null) => {
  const p = board[row][col]; if (!p) return [];
  const mv = [], {color, role} = p, dir = color==="white"?-1:1;
  const add = (r,c) => { if(!inB(r,c)) return false; const t=board[r][c]; if(t&&t.color===color) return false; if(t) { mv.push({row:r,col:c,type:"battle"}); return false; } mv.push({row:r,col:c,type:"move"}); return true; };
  
  if (role==="pawn") {
    if(inB(row+dir,col)&&!board[row+dir][col]){mv.push({row:row+dir,col,type:"move"});const sr=color==="white"?6:1;if(row===sr&&!board[row+2*dir][col])mv.push({row:row+2*dir,col,type:"move"});}
    [-1,1].forEach(dc=>{const nr=row+dir,nc=col+dc;if(inB(nr,nc)){if(board[nr][nc]&&board[nr][nc].color!==color)mv.push({row:nr,col:nc,type:"battle"});if(ep&&ep.row===nr&&ep.col===nc)mv.push({row:nr,col:nc,type:"en_passant"});}});
  } else if (role==="rook") {
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{for(let i=1;i<8;i++)if(!add(row+dr*i,col+dc*i))break;});
  } else if (role==="bishop") {
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>{for(let i=1;i<8;i++)if(!add(row+dr*i,col+dc*i))break;});
  } else if (role==="queen") {
    [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>{for(let i=1;i<8;i++)if(!add(row+dr*i,col+dc*i))break;});
  } else if (role==="knight") {
    [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr,dc])=>add(row+dr,col+dc));
  } else if (role==="king") {
    [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(row+dr,col+dc));
    if(!p.hasMoved){const kr=color==="white"?7:0;const rk=board[kr][7];if(rk&&rk.role==="rook"&&!rk.hasMoved&&!board[kr][5]&&!board[kr][6])mv.push({row:kr,col:6,type:"castle_k"});const rq=board[kr][0];if(rq&&rq.role==="rook"&&!rq.hasMoved&&!board[kr][1]&&!board[kr][2]&&!board[kr][3])mv.push({row:kr,col:2,type:"castle_q"});}
  }
  return mv;
};

const initBoard = (wd, bd) => {
  const b = Array(8).fill(null).map(()=>Array(8).fill(null));
  const place = (deck, color) => {
    const br = color==="white"?7:0, pr = color==="white"?6:1;
    const order = [["rook",0],["knight",0],["bishop",0],["queen",0],["king",0],["bishop",1],["knight",1],["rook",1]];
    order.forEach(([role,idx],c) => {
      const pk = deck[role]?.[idx] || deck[role]?.[0];
      if(pk) b[br][c] = { pokemon:{...pk}, hp:pk.hp, color, role, hasMoved:false };
    });
    deck.pawn?.forEach((pk,i) => {
      if(i<8 && pk) b[pr][i] = { pokemon:{...pk}, hp:pk.hp, color, role:"pawn", hasMoved:false, evoLine:getEvoLine(pk) };
    });
  };
  place(wd,"white"); place(bd,"black");
  return b;
};

// ─────────────────────────────────────────────────────────
// DECKS
// ─────────────────────────────────────────────────────────

const DECKS = [
  { name:"Inferno Squad", icon:"🔥", desc:"Fuego puro. Arrasa Planta/Hielo, vulnerable a Agua.",
    king:[gp(146)],queen:[gp(6)],rook:[gp(59),gp(59)],bishop:[gp(38),gp(126)],knight:[gp(78),gp(136)],
    pawn:[gp(4),gp(4),gp(37),gp(58),gp(77),gp(25),gp(27),gp(66)] },
  { name:"Tidal Force", icon:"💧", desc:"Agua dominante. Aplasta Fuego, débil a Eléctrico/Planta.",
    king:[gp(131)],queen:[gp(9)],rook:[gp(62),gp(62)],bishop:[gp(55),gp(134)],knight:[gp(117),gp(121)],
    pawn:[gp(7),gp(7),gp(54),gp(60),gp(116),gp(120),gp(74),gp(92)] },
  { name:"Forest Legion", icon:"🌿", desc:"Planta/Veneno. Domina Agua/Tierra, débil a Fuego/Hielo.",
    king:[gp(150)],queen:[gp(3)],rook:[gp(45),gp(34)],bishop:[gp(2),gp(103)],knight:[gp(70),gp(89)],
    pawn:[gp(1),gp(43),gp(69),gp(102),gp(29),gp(32),gp(88),gp(23)] },
  { name:"Storm Brigade", icon:"⚡", desc:"Eléctrico/Psíquico. Destruye Agua/Volador.",
    king:[gp(145)],queen:[gp(65)],rook:[gp(94),gp(94)],bishop:[gp(26),gp(135)],knight:[gp(125),gp(82)],
    pawn:[gp(25),gp(81),gp(100),gp(63),gp(96),gp(92),gp(41),gp(50)] },
  { name:"Dragon Masters", icon:"🐉", desc:"Dragón + mix legendario. Equilibrado y poderoso.",
    king:[gp(149)],queen:[gp(6)],rook:[gp(9),gp(31)],bishop:[gp(148),gp(97)],knight:[gp(57),gp(28)],
    pawn:[gp(147),gp(4),gp(7),gp(25),gp(66),gp(63),gp(74),gp(23)] },
  { name:"Brawler's Gym", icon:"💪", desc:"Lucha/Tierra. Machaca Normal/Roca, débil a Psíquico.",
    king:[gp(143)],queen:[gp(68)],rook:[gp(76),gp(112)],bishop:[gp(67),gp(105)],knight:[gp(57),gp(28)],
    pawn:[gp(66),gp(56),gp(74),gp(104),gp(111),gp(27),gp(50),gp(19)] },
];

// ─────────────────────────────────────────────────────────
// CHESS PIECE COMPONENT (the key visual redesign)
// ─────────────────────────────────────────────────────────

const ChessPiece = ({ cell, size = 48 }) => {
  if (!cell) return null;
  const { pokemon, role, color, hp } = cell;
  const tc = TC[pokemon.type];
  const icon = CHESS_ICONS[role][color];
  const hpPct = hp / pokemon.hp;
  const damaged = hpPct < 1;

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "relative",
      gap: 0,
    }}>
      {/* Glow under piece */}
      <div style={{
        position: "absolute", bottom: "15%", left: "20%", right: "20%", height: "30%",
        borderRadius: "50%",
        background: tc.glow,
        filter: "blur(6px)",
        opacity: 0.5,
      }} />
      
      {/* Chess icon */}
      <div style={{
        fontSize: size * 0.62,
        lineHeight: 1,
        color: tc.bg,
        textShadow: color === "white"
          ? `0 1px 3px rgba(0,0,0,0.5), 0 0 8px ${tc.glow}`
          : `0 1px 3px rgba(0,0,0,0.7), 0 0 8px ${tc.glow}`,
        filter: color === "black" ? "brightness(0.85)" : "none",
        position: "relative",
        zIndex: 1,
        WebkitTextStroke: color === "white" ? `0.5px ${tc.dark}` : "none",
      }}>
        {icon}
      </div>

      {/* Type strip + name */}
      <div style={{
        background: tc.bg,
        color: tc.fg,
        fontSize: Math.max(7, size * 0.14),
        fontWeight: 800,
        padding: "0px 3px",
        borderRadius: 2,
        lineHeight: 1.3,
        textAlign: "center",
        maxWidth: "92%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        position: "relative",
        zIndex: 1,
        letterSpacing: -0.3,
      }}>
        {pokemon.name}
      </div>

      {/* HP bar — only when damaged */}
      {damaged && (
        <div style={{
          position: "absolute", bottom: 1, left: "10%", right: "10%",
          height: 3, borderRadius: 2,
          background: "rgba(0,0,0,0.5)",
          zIndex: 2,
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${hpPct * 100}%`,
            background: hpPct > 0.5 ? "#4ade80" : hpPct > 0.25 ? "#fbbf24" : "#ef4444",
            transition: "width 0.4s",
          }} />
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// BATTLE OVERLAY
// ─────────────────────────────────────────────────────────

const BattleOverlay = ({ atk, def, onDone }) => {
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [shakeL, setShakeL] = useState(false);
  const [shakeR, setShakeR] = useState(false);

  useEffect(() => {
    const res = resolveBattle(atk.pokemon, def.pokemon);
    setResult(res);
    let s = 0;
    const iv = setInterval(() => {
      s++;
      if (s < res.log.length) {
        setStep(s);
        const e = res.log[s];
        if (e.t === "atk") { setShakeR(true); setTimeout(()=>setShakeR(false),250); }
        if (e.t === "def") { setShakeL(true); setTimeout(()=>setShakeL(false),250); }
      } else { clearInterval(iv); setTimeout(()=>onDone(res), 1200); }
    }, 700);
    return () => clearInterval(iv);
  }, []);

  if (!result) return null;
  const vis = result.log.slice(0, step + 1);
  const atc = TC[atk.pokemon.type];
  const dtc = TC[def.pokemon.type];
  const am = getTypeMult(atk.pokemon.type, def.pokemon.type);
  const dm = getTypeMult(def.pokemon.type, atk.pokemon.type);

  return (
    <div style={{ position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.9)",backdropFilter:"blur(12px)" }}>
      <div style={{ width:"min(92vw,520px)",background:"#111118",borderRadius:16,border:"1px solid rgba(255,255,255,0.1)",overflow:"hidden" }}>
        {/* Header */}
        <div style={{ background:"linear-gradient(90deg,#ef4444,#f59e0b)",padding:"8px 0",textAlign:"center",fontSize:13,fontWeight:900,letterSpacing:4,color:"#fff" }}>
          ⚔ BATALLA ⚔
        </div>

        {/* Combatants */}
        <div style={{ display:"flex",justifyContent:"space-around",alignItems:"center",padding:"20px 16px 12px" }}>
          <div style={{ textAlign:"center",animation:shakeL?"shk .25s":"none" }}>
            <div style={{ fontSize:52,filter:`drop-shadow(0 0 12px ${atc.glow})` }}>{CHESS_ICONS[atk.role]["white"]}</div>
            <div style={{ fontSize:15,fontWeight:800,color:atc.bg }}>{atk.pokemon.name}</div>
            <div style={{ display:"inline-block",background:atc.bg,color:atc.fg,fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:3,marginTop:2 }}>{TYPE_LABEL[atk.pokemon.type]}</div>
            <div style={{ fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:4 }}>HP {atk.pokemon.hp} · ATK {atk.pokemon.atk}</div>
            <div style={{ fontSize:10,marginTop:2,color:am>1?"#4ade80":am<1?"#f87171":"rgba(255,255,255,0.3)" }}>
              {am>1?"×2 Super efectivo →":am<1?"×0.5 No muy efectivo →":am===0?"×0 INMUNE →":"×1 Normal →"}
            </div>
          </div>
          <div style={{ fontSize:24,color:"#ef4444",fontWeight:900 }}>VS</div>
          <div style={{ textAlign:"center",animation:shakeR?"shk .25s":"none" }}>
            <div style={{ fontSize:52,filter:`drop-shadow(0 0 12px ${dtc.glow})` }}>{CHESS_ICONS[def.role]["black"]}</div>
            <div style={{ fontSize:15,fontWeight:800,color:dtc.bg }}>{def.pokemon.name}</div>
            <div style={{ display:"inline-block",background:dtc.bg,color:dtc.fg,fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:3,marginTop:2 }}>{TYPE_LABEL[def.pokemon.type]}</div>
            <div style={{ fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:4 }}>HP {def.pokemon.hp} · ATK {def.pokemon.atk}</div>
            <div style={{ fontSize:10,marginTop:2,color:dm>1?"#4ade80":dm<1?"#f87171":"rgba(255,255,255,0.3)" }}>
              {dm>1?"×2 Super efectivo ←":dm<1?"×0.5 No muy efectivo ←":dm===0?"×0 INMUNE ←":"×1 Normal ←"}
            </div>
          </div>
        </div>

        {/* Log */}
        <div style={{ margin:"0 16px 16px",background:"rgba(0,0,0,0.4)",borderRadius:8,padding:10,maxHeight:160,overflowY:"auto",fontSize:12,lineHeight:1.6 }}>
          {vis.map((e,i) => (
            <div key={i} style={{
              color: e.t==="win"?"#fbbf24":e.t==="immune"?"#60a5fa":e.t==="atk"?(am>1?"#4ade80":"rgba(255,255,255,0.6)"):"rgba(255,255,255,0.5)",
              fontWeight: e.t==="win"?700:400,
            }}>{e.msg}</div>
          ))}
        </div>
      </div>
      <style>{`@keyframes shk{0%,100%{transform:translateX(0)}25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}`}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// PROMOTION OVERLAY
// ─────────────────────────────────────────────────────────

const PromoOverlay = ({ piece, onPick }) => {
  const line = piece.evoLine || getEvoLine(piece.pokemon);
  const roles = ["queen","rook","bishop","knight"];
  return (
    <div style={{ position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.9)",backdropFilter:"blur(12px)" }}>
      <div style={{ width:"min(92vw,440px)",background:"#111118",borderRadius:16,border:"1px solid rgba(255,255,255,0.1)",overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(90deg,#a78bfa,#6366f1)",padding:"8px 0",textAlign:"center",fontSize:13,fontWeight:900,letterSpacing:4,color:"#fff" }}>
          ✦ EVOLUCIÓN ✦
        </div>
        <div style={{ padding:"16px",textAlign:"center" }}>
          <div style={{ fontSize:12,color:"rgba(255,255,255,0.5)",marginBottom:12 }}>
            ¡{piece.pokemon.name} alcanzó el final! Elige su evolución y nuevo rol:
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {roles.map(role => {
              const tgtStage = role==="queen"||role==="rook"?2:1;
              const evo = line.find(e=>e.stage===tgtStage) || line[line.length-1] || piece.pokemon;
              const etc = TC[evo.type];
              return (
                <button key={role} onClick={()=>onPick(evo,role)} style={{
                  background:"rgba(255,255,255,0.04)",border:`2px solid rgba(255,255,255,0.1)`,
                  borderRadius:10,padding:12,cursor:"pointer",transition:"all .2s",textAlign:"center",
                }} onMouseEnter={e=>e.currentTarget.style.borderColor=etc.bg} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"}>
                  <div style={{ fontSize:36,color:etc.bg,textShadow:`0 0 10px ${etc.glow}` }}>{CHESS_ICONS[role]["white"]}</div>
                  <div style={{ fontSize:13,fontWeight:700,color:"#fff" }}>{evo.name}</div>
                  <div style={{ display:"inline-block",background:etc.bg,color:etc.fg,fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,marginTop:2 }}>{TYPE_LABEL[evo.type]}</div>
                  <div style={{ fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:4 }}>
                    {ROLE_LABEL[role]} · HP {evo.hp} · ATK {evo.atk}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────

export default function PokéChess() {
  const [phase, setPhase] = useState("menu");
  const [wDeck, setWDeck] = useState(null);
  const [bDeck, setBDeck] = useState(null);
  const [selFor, setSelFor] = useState(null);
  const [board, setBoard] = useState(null);
  const [turn, setTurn] = useState("white");
  const [sel, setSel] = useState(null);
  const [moves, setMoves] = useState([]);
  const [battle, setBattle] = useState(null);
  const [promo, setPromo] = useState(null);
  const [log, setLog] = useState([]);
  const [ep, setEp] = useState(null);
  const [winner, setWinner] = useState(null);
  const [hover, setHover] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const logRef = useRef(null);

  const addLog = useCallback((msg) => setLog(p => [...p.slice(-40), { msg, turn }]), [turn]);

  const checkEnd = useCallback((b) => {
    const has = (c) => b.some(row => row.some(cell => cell?.color === c && cell?.role === "king"));
    if (!has("white")) { setWinner("black"); setPhase("gameOver"); }
    if (!has("black")) { setWinner("white"); setPhase("gameOver"); }
  }, []);

  useEffect(() => { logRef.current?.scrollTo(0, 99999); }, [log]);

  const click = useCallback((r, c) => {
    if (phase !== "game" || battle || promo) return;
    const cell = board[r][c];
    const mv = moves.find(m => m.row === r && m.col === c);

    if (mv && sel) {
      const [sr, sc] = sel;
      const attacker = board[sr][sc];
      
      if (mv.type === "battle") {
        setBattle({ atk: attacker, def: board[r][c], mv, from: [sr, sc] });
        return;
      }
      
      const nb = board.map(row => row.map(c => c ? { ...c } : null));

      if (mv.type === "en_passant") {
        const cr = turn === "white" ? r + 1 : r - 1;
        nb[r][c] = { ...attacker, hasMoved: true }; nb[sr][sc] = null; nb[cr][c] = null;
        addLog(`${attacker.pokemon.name} captura al paso!`);
        setBoard(nb); setTurn(t=>t==="white"?"black":"white"); setSel(null); setMoves([]); setEp(null); return;
      }
      if (mv.type === "castle_k" || mv.type === "castle_q") {
        const kr = turn === "white" ? 7 : 0;
        if (mv.type === "castle_k") {
          nb[kr][6] = { ...attacker, hasMoved: true }; nb[kr][5] = { ...nb[kr][7], hasMoved: true }; nb[kr][4] = null; nb[kr][7] = null;
        } else {
          nb[kr][2] = { ...attacker, hasMoved: true }; nb[kr][3] = { ...nb[kr][0], hasMoved: true }; nb[kr][4] = null; nb[kr][0] = null;
        }
        addLog(`Enroque ${mv.type === "castle_k" ? "corto" : "largo"}`);
        setBoard(nb); setTurn(t=>t==="white"?"black":"white"); setSel(null); setMoves([]); setEp(null); return;
      }
      
      // Normal move
      nb[r][c] = { ...attacker, hasMoved: true }; nb[sr][sc] = null;
      if (attacker.role === "pawn" && Math.abs(r - sr) === 2) setEp({ row: (r + sr) / 2, col: c }); else setEp(null);
      
      const promoRow = turn === "white" ? 0 : 7;
      if (attacker.role === "pawn" && r === promoRow) {
        setBoard(nb); setPromo({ row: r, col: c, piece: nb[r][c] }); setSel(null); setMoves([]); return;
      }
      addLog(`${attacker.pokemon.name} → ${String.fromCharCode(97+c)}${8-r}`);
      setBoard(nb); checkEnd(nb); setTurn(t=>t==="white"?"black":"white"); setSel(null); setMoves([]); return;
    }

    if (cell && cell.color === turn) {
      setSel([r, c]); setMoves(getMoves(board, r, c, ep)); return;
    }
    setSel(null); setMoves([]);
  }, [phase, board, sel, moves, turn, battle, promo, ep, addLog, checkEnd]);

  const onBattle = useCallback((res) => {
    const { atk, def, from, mv } = battle;
    const [sr, sc] = from;
    const nb = board.map(row => row.map(c => c ? { ...c } : null));
    if (res.winner === "attacker") {
      nb[mv.row][mv.col] = { ...atk, hasMoved: true, hp: res.ah }; nb[sr][sc] = null;
      addLog(`⚔ ${atk.pokemon.name} derrota a ${def.pokemon.name}`);
      const promoRow = turn === "white" ? 0 : 7;
      if (atk.role === "pawn" && mv.row === promoRow) {
        setBoard(nb); setBattle(null); setPromo({ row: mv.row, col: mv.col, piece: nb[mv.row][mv.col] }); setSel(null); setMoves([]); return;
      }
    } else {
      nb[sr][sc] = null;
      if (res.dh > 0) nb[mv.row][mv.col] = { ...def, hp: res.dh };
      addLog(`🛡 ${def.pokemon.name} resiste a ${atk.pokemon.name}`);
    }
    setBattle(null); setBoard(nb); checkEnd(nb); setTurn(t=>t==="white"?"black":"white"); setSel(null); setMoves([]); setEp(null);
  }, [battle, board, turn, addLog, checkEnd]);

  const onPromo = useCallback((pokemon, role) => {
    const { row, col, piece } = promo;
    const nb = board.map(r => r.map(c => c ? { ...c } : null));
    nb[row][col] = { ...piece, pokemon, hp: pokemon.hp, role };
    addLog(`✦ ${piece.pokemon.name} → ${pokemon.name} (${ROLE_LABEL[role]})`);
    setBoard(nb); setPromo(null); checkEnd(nb); setTurn(t=>t==="white"?"black":"white");
  }, [promo, board, addLog, checkEnd]);

  const startGame = () => {
    if (!wDeck || !bDeck) return;
    setBoard(initBoard(wDeck, bDeck)); setTurn("white"); setPhase("game"); setLog([]); setSel(null); setMoves([]); setEp(null); setWinner(null);
  };

  // Figure out the hovered cell info
  const hoverCell = hover ? board?.[hover[0]]?.[hover[1]] : null;
  const selCell = sel ? board?.[sel[0]]?.[sel[1]] : null;
  const infoCell = selCell || hoverCell;

  // ───────── MENU ─────────
  if (phase === "menu") {
    return (
      <div style={{ minHeight:"100vh",background:"#0a0b10",color:"#fff",fontFamily:"'Georgia','Times New Roman',serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24 }}>
        <div style={{ textAlign:"center",maxWidth:600 }}>
          <div style={{ fontSize:20,letterSpacing:8,color:"rgba(255,255,255,0.2)",fontWeight:400 }}>♔ ♛ ♜ ♝ ♞ ♟</div>
          <h1 style={{ fontSize:56,margin:"8px 0",fontWeight:400,letterSpacing:2,background:"linear-gradient(135deg,#fbbf24,#ef4444,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
            PokéChess
          </h1>
          <p style={{ color:"rgba(255,255,255,0.35)",fontSize:14,fontStyle:"italic",marginBottom:36,lineHeight:1.6 }}>
            Ajedrez clásico con batallas Pokémon por tipos.<br/>
            Cada captura es una batalla. Tu composición define tu destino.
          </p>

          <button onClick={() => { setSelFor("white"); setPhase("deckSelect"); }} style={{
            background:"transparent",border:"2px solid #fbbf24",color:"#fbbf24",
            padding:"14px 56px",fontSize:16,fontWeight:700,letterSpacing:3,cursor:"pointer",
            borderRadius:0,transition:"all .2s",fontFamily:"inherit",
          }}
          onMouseEnter={e=>{e.currentTarget.style.background="#fbbf24";e.currentTarget.style.color="#000";}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#fbbf24";}}
          >JUGAR</button>

          <div style={{ marginTop:28 }}>
            <button onClick={()=>setShowRules(!showRules)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:13,fontFamily:"inherit",textDecoration:"underline" }}>
              {showRules?"Ocultar reglas":"¿Cómo se juega?"}
            </button>
          </div>

          {showRules && (
            <div style={{ textAlign:"left",marginTop:20,padding:20,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",fontSize:13,lineHeight:1.8,color:"rgba(255,255,255,0.55)" }}>
              <p><strong style={{color:"#fbbf24"}}>Movimiento</strong> — Igual que ajedrez. Cada pieza se mueve según su rol.</p>
              <p><strong style={{color:"#ef4444"}}>Captura = Batalla</strong> — Al intentar capturar se inicia una batalla. El atacante golpea primero. Si el defensor sobrevive, contraataca. ¡Puedes perder tu pieza!</p>
              <p><strong style={{color:"#4ade80"}}>Super efectivo ×2</strong> — La tabla de tipos Gen 1 aplica. Fuego &gt; Planta &gt; Agua &gt; Fuego.</p>
              <p><strong style={{color:"#60a5fa"}}>Inmunidad ×0</strong> — Si el defensor es inmune, la captura falla automáticamente.</p>
              <p><strong style={{color:"#a78bfa"}}>Evolución</strong> — Un peón que llega al final evoluciona y cambia de rol (como coronar).</p>
              <p><strong style={{color:"#fff"}}>Victoria</strong> — Elimina al Rey enemigo en batalla.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ───────── DECK SELECT ─────────
  if (phase === "deckSelect") {
    const current = selFor === "white" ? wDeck : bDeck;
    return (
      <div style={{ minHeight:"100vh",background:"#0a0b10",color:"#fff",fontFamily:"'Georgia','Times New Roman',serif",padding:24 }}>
        <div style={{ maxWidth:760,margin:"0 auto" }}>
          <div style={{ textAlign:"center",marginBottom:24 }}>
            <div style={{ fontSize:11,letterSpacing:4,color:"rgba(255,255,255,0.25)" }}>SELECCIÓN DE DECK</div>
            <h2 style={{ margin:"4px 0 0",fontSize:22,fontWeight:400 }}>
              {selFor === "white" ? "♔ Jugador Blanco" : "♚ Jugador Negro"}
            </h2>
          </div>

          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10 }}>
            {DECKS.map((d, i) => {
              const isSel = current === d;
              const types = [...new Set([d.king[0],d.queen[0],...d.rook,...d.bishop,...d.knight,...d.pawn].filter(Boolean).map(p=>p.type))];
              return (
                <button key={i} onClick={() => selFor==="white"?setWDeck(d):setBDeck(d)} style={{
                  background:isSel?"rgba(251,191,36,0.08)":"rgba(255,255,255,0.02)",
                  border:isSel?"2px solid #fbbf24":"2px solid rgba(255,255,255,0.06)",
                  borderRadius:8,padding:14,cursor:"pointer",textAlign:"left",transition:"all .2s",fontFamily:"inherit",
                }}>
                  <div style={{ fontSize:17,fontWeight:700,color:"#fff",marginBottom:2 }}>
                    {d.icon} {d.name}
                  </div>
                  <div style={{ fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:10,lineHeight:1.4 }}>{d.desc}</div>

                  {/* Type composition bar */}
                  <div style={{ display:"flex",gap:3,flexWrap:"wrap",marginBottom:8 }}>
                    {types.map(t => (
                      <span key={t} style={{ display:"inline-block",background:TC[t].bg,color:TC[t].fg,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:2 }}>
                        {TYPE_LABEL[t]}
                      </span>
                    ))}
                  </div>

                  {/* Preview pieces */}
                  <div style={{ display:"flex",gap:2,alignItems:"center",fontSize:10,color:"rgba(255,255,255,0.3)" }}>
                    <span style={{ color:TC[d.king[0].type].bg,fontSize:18 }}>♔</span>
                    <span>{d.king[0].name}</span>
                    <span style={{ margin:"0 4px" }}>·</span>
                    <span style={{ color:TC[d.queen[0].type].bg,fontSize:18 }}>♕</span>
                    <span>{d.queen[0].name}</span>
                  </div>

                  {/* Pawn lineup */}
                  <div style={{ display:"flex",gap:1,marginTop:6 }}>
                    {d.pawn.filter(Boolean).map((p, j) => (
                      <div key={j} style={{ width:22,height:18,display:"flex",alignItems:"center",justifyContent:"center",background:TC[p.type].bg+"33",borderRadius:2 }}>
                        <span style={{ color:TC[p.type].bg,fontSize:12 }}>♙</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ textAlign:"center",marginTop:24,display:"flex",gap:10,justifyContent:"center" }}>
            {selFor === "white" && wDeck && (
              <button onClick={() => setSelFor("black")} style={{
                background:"none",border:"2px solid #6366f1",color:"#6366f1",padding:"10px 32px",
                fontSize:14,fontWeight:700,letterSpacing:2,cursor:"pointer",fontFamily:"inherit",
                transition:"all .2s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.background="#6366f1";e.currentTarget.style.color="#fff";}}
              onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="#6366f1";}}
              >SIGUIENTE →</button>
            )}
            {selFor === "black" && bDeck && (
              <button onClick={startGame} style={{
                background:"none",border:"2px solid #fbbf24",color:"#fbbf24",padding:"10px 32px",
                fontSize:14,fontWeight:700,letterSpacing:2,cursor:"pointer",fontFamily:"inherit",
                transition:"all .2s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.background="#fbbf24";e.currentTarget.style.color="#000";}}
              onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="#fbbf24";}}
              >⚔ INICIAR</button>
            )}
            <button onClick={() => {
              if (selFor === "black") setSelFor("white");
              else { setPhase("menu"); setWDeck(null); setBDeck(null); }
            }} style={{ background:"none",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.4)",padding:"10px 20px",fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>
              ← Atrás
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───────── GAME OVER ─────────
  if (phase === "gameOver") {
    return (
      <div style={{ minHeight:"100vh",background:"#0a0b10",color:"#fff",fontFamily:"'Georgia','Times New Roman',serif",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:64 }}>{winner==="white"?"♔":"♚"}</div>
          <h1 style={{ fontSize:36,fontWeight:400,margin:"12px 0",background:"linear-gradient(135deg,#fbbf24,#ef4444)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
            {winner === "white" ? "Blanco" : "Negro"} Gana
          </h1>
          <p style={{ color:"rgba(255,255,255,0.4)",fontStyle:"italic" }}>El Rey enemigo cayó en batalla.</p>
          <button onClick={() => { setPhase("menu"); setBoard(null); setWDeck(null); setBDeck(null); }} style={{
            background:"none",border:"2px solid #fbbf24",color:"#fbbf24",padding:"12px 40px",
            fontSize:14,fontWeight:700,letterSpacing:2,cursor:"pointer",fontFamily:"inherit",marginTop:20,
          }}>JUGAR DE NUEVO</button>
        </div>
      </div>
    );
  }

  // ───────── GAME BOARD ─────────
  if (!board) return null;

  // Board square colors
  const LIGHT = "#2a2a35";
  const DARK = "#1a1a22";

  return (
    <div style={{ minHeight:"100vh",background:"#0a0b10",color:"#fff",fontFamily:"'Georgia','Times New Roman',serif",display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 8px" }}>
      {battle && <BattleOverlay atk={battle.atk} def={battle.def} onDone={onBattle} />}
      {promo && <PromoOverlay piece={promo.piece} onPick={onPromo} />}

      {/* Top bar */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",width:"min(96vw,640px)",marginBottom:6 }}>
        <button onClick={() => { setPhase("menu"); setBoard(null); }} style={{
          background:"none",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.3)",
          padding:"4px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit",
        }}>← Menú</button>
        <div style={{
          display:"flex",alignItems:"center",gap:8,
          padding:"5px 16px",
          border:`2px solid ${turn==="white"?"rgba(255,255,255,0.4)":"rgba(100,100,200,0.4)"}`,
          fontSize:13,fontWeight:700,letterSpacing:1,
        }}>
          <span style={{ fontSize:18 }}>{turn==="white"?"♔":"♚"}</span>
          Turno: {turn==="white"?"Blanco":"Negro"}
        </div>
      </div>

      {/* Main layout: board + sidebar */}
      <div style={{ display:"flex",gap:10,alignItems:"flex-start",width:"min(96vw,640px)" }}>
        {/* Board */}
        <div style={{ flex:"0 0 auto" }}>
          {/* Column labels top */}
          <div style={{ display:"flex",marginLeft:16 }}>
            {"abcdefgh".split("").map(l => (
              <div key={l} style={{ width:"min(10.5vw,56px)",textAlign:"center",fontSize:10,color:"rgba(255,255,255,0.15)" }}>{l}</div>
            ))}
          </div>
          <div style={{ display:"flex" }}>
            {/* Row labels */}
            <div style={{ display:"flex",flexDirection:"column" }}>
              {[8,7,6,5,4,3,2,1].map(n => (
                <div key={n} style={{ width:16,height:"min(10.5vw,56px)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"rgba(255,255,255,0.15)" }}>{n}</div>
              ))}
            </div>
            {/* Grid */}
            <div style={{
              display:"grid",gridTemplateColumns:"repeat(8,min(10.5vw,56px))",gridTemplateRows:"repeat(8,min(10.5vw,56px))",
              border:"1px solid rgba(255,255,255,0.15)",
            }}>
              {board.map((row, r) => row.map((cell, c) => {
                const isLight = (r + c) % 2 === 0;
                const isSel = sel?.[0] === r && sel?.[1] === c;
                const mv = moves.find(m => m.row === r && m.col === c);
                const isBattle = mv?.type === "battle" || mv?.type === "en_passant";
                const isHov = hover?.[0] === r && hover?.[1] === c;

                let bg = isLight ? LIGHT : DARK;
                if (isSel) bg = "#4a3a10";
                else if (isBattle) bg = "#3a1515";
                else if (mv) bg = "#1a2a15";

                return (
                  <div key={`${r}${c}`}
                    onClick={() => click(r, c)}
                    onMouseEnter={() => setHover([r, c])}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      width:"min(10.5vw,56px)",height:"min(10.5vw,56px)",
                      background: bg,
                      cursor: (cell?.color === turn || mv) ? "pointer" : "default",
                      position: "relative",
                      transition: "background .12s",
                      borderRight: c < 7 ? "1px solid rgba(255,255,255,0.03)" : "none",
                      borderBottom: r < 7 ? "1px solid rgba(255,255,255,0.03)" : "none",
                    }}
                  >
                    {/* Move dot */}
                    {mv && !cell && (
                      <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <div style={{ width:10,height:10,borderRadius:"50%",background:"rgba(74,222,128,0.45)" }} />
                      </div>
                    )}
                    {/* Battle indicator */}
                    {isBattle && cell && (
                      <div style={{ position:"absolute",top:1,right:2,fontSize:9,zIndex:5 }}>⚔</div>
                    )}
                    {/* Piece */}
                    {cell && <ChessPiece cell={cell} size={56} />}
                  </div>
                );
              }))}
            </div>
          </div>
        </div>

        {/* Sidebar: info + log */}
        <div style={{ flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:8 }}>
          {/* Piece info panel */}
          <div style={{
            background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",
            padding:10,minHeight:90,fontSize:12,
          }}>
            {infoCell ? (() => {
              const p = infoCell.pokemon;
              const tc = TC[p.type];
              const hpPct = infoCell.hp / p.hp;
              return (
                <div>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                    <span style={{ fontSize:28,color:tc.bg,textShadow:`0 0 8px ${tc.glow}` }}>{CHESS_ICONS[infoCell.role][infoCell.color]}</span>
                    <div>
                      <div style={{ fontWeight:700,fontSize:15,color:"#fff" }}>{p.name}</div>
                      <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                        <span style={{ background:tc.bg,color:tc.fg,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:2 }}>{TYPE_LABEL[p.type]}</span>
                        <span style={{ color:"rgba(255,255,255,0.3)",fontSize:10 }}>{ROLE_LABEL[infoCell.role]} · {infoCell.color==="white"?"Blanco":"Negro"}</span>
                      </div>
                    </div>
                  </div>
                  {/* HP bar */}
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4 }}>
                    <span style={{ fontSize:10,color:"rgba(255,255,255,0.4)",width:20 }}>HP</span>
                    <div style={{ flex:1,height:6,background:"rgba(255,255,255,0.08)",borderRadius:3,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${hpPct*100}%`,background:hpPct>0.5?"#4ade80":hpPct>0.25?"#fbbf24":"#ef4444",borderRadius:3,transition:"width .3s" }}/>
                    </div>
                    <span style={{ fontSize:10,color:"rgba(255,255,255,0.5)",minWidth:36,textAlign:"right" }}>{infoCell.hp}/{p.hp}</span>
                  </div>
                  <div style={{ fontSize:10,color:"rgba(255,255,255,0.35)" }}>
                    ATK {p.atk} · Stage {p.stage}
                    {infoCell.role === "pawn" && infoCell.evoLine?.length > 1 && (
                      <span> · Evoluciona a: {infoCell.evoLine.slice(1).map(e => e.name).join(" → ")}</span>
                    )}
                  </div>
                  {/* Matchup preview when hovering battle target */}
                  {sel && hover && moves.find(m=>m.row===hover[0]&&m.col===hover[1]&&m.type==="battle") && (() => {
                    const defender = board[hover[0]][hover[1]];
                    if (!defender || defender === infoCell) return null;
                    const mult = getTypeMult(selCell.pokemon.type, defender.pokemon.type);
                    return (
                      <div style={{ marginTop:6,padding:"4px 6px",background:"rgba(255,255,255,0.04)",borderRadius:4,fontSize:10 }}>
                        <span style={{ color:mult>1?"#4ade80":mult<1?"#f87171":mult===0?"#60a5fa":"rgba(255,255,255,0.4)" }}>
                          vs {defender.pokemon.name}: {mult===0?"INMUNE ×0":mult>1?`Super efectivo ×${mult}`:mult<1?`No muy efectivo ×${mult}`:`Normal ×${mult}`}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              );
            })() : (
              <div style={{ color:"rgba(255,255,255,0.2)",fontStyle:"italic",paddingTop:12 }}>
                Selecciona o pasa el cursor sobre una pieza para ver su información.
              </div>
            )}
          </div>

          {/* Type legend (compact) */}
          <div style={{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",padding:"6px 8px" }}>
            <div style={{ fontSize:9,color:"rgba(255,255,255,0.2)",letterSpacing:1,marginBottom:4 }}>TIPOS EN JUEGO</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:2 }}>
              {Object.keys(TC).map(t => {
                const inPlay = board.some(row => row.some(cell => cell?.pokemon.type === t));
                if (!inPlay) return null;
                return <span key={t} style={{ background:TC[t].bg,color:TC[t].fg,fontSize:8,fontWeight:700,padding:"1px 4px",borderRadius:2,opacity:0.8 }}>{TYPE_LABEL[t]}</span>;
              })}
            </div>
          </div>

          {/* Game log */}
          <div ref={logRef} style={{
            background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.04)",
            padding:8,flex:1,minHeight:120,maxHeight:200,overflowY:"auto",
          }}>
            <div style={{ fontSize:9,color:"rgba(255,255,255,0.2)",letterSpacing:1,marginBottom:4 }}>REGISTRO</div>
            {log.length === 0 && <div style={{ fontSize:11,color:"rgba(255,255,255,0.15)",fontStyle:"italic" }}>Selecciona una pieza...</div>}
            {log.map((e, i) => (
              <div key={i} style={{ fontSize:11,color:"rgba(255,255,255,0.4)",padding:"2px 0",borderBottom:"1px solid rgba(255,255,255,0.02)" }}>
                <span style={{ color:e.turn==="white"?"rgba(255,255,255,0.5)":"rgba(130,130,200,0.5)",marginRight:4 }}>
                  {e.turn==="white"?"♔":"♚"}
                </span>{e.msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
