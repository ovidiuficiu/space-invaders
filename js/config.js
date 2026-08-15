// ---------- Static configuration & data (no logic, no DOM, no dependencies) ----------

// Canvas / game dimensions
export const W = 640;
export const H = 720;

// localStorage keys
export const STORAGE_KEYS = {
    high: 'siHigh',
    muted: 'siMuted',
    musicVol: 'siMusicVol'
};

// ---------- Difficulty & superpower menu data ----------
export const DIFFICULTIES = [
    { name: 'EASY', speed: 0.55, shootBase: 650, shootMin: 300, color: '#39ff8c', desc: 'slow invaders, rare shots' },
    { name: 'NORMAL', speed: 0.9, shootBase: 380, shootMin: 120, color: '#ffd54f', desc: 'classic arcade pace' },
    { name: 'HARD', speed: 1.3, shootBase: 150, shootMin: 35, color: '#ff8a3d', desc: 'fast, trigger-happy aliens' },
    { name: 'INSANE', speed: 1.6, shootBase: 60, shootMin: 12, color: '#ff5f8f', desc: 'bullet hell' }
];

export const SUPERPOWERS = [
    { id: 'rapid', name: 'BLAZING', color: '#ff8a3d', desc: 'double fire rate' },
    { id: 'triple', name: 'TRIPLE', color: '#39ff8c', desc: 'always fire 3-way' },
    { id: 'bounce', name: 'BOUNCE', color: '#7de2ff', desc: 'shots bounce off walls' },
    { id: 'pierce', name: 'PIERCE', color: '#c792ea', desc: 'shots pierce invaders' },
    { id: 'shield', name: 'SHIELD', color: '#ffd54f', desc: 'start with 2 hit-shields' }
];

// Temporary powerups dropped by the special ship
export const POWERUP_TYPES = [
    { id: 'triple', label: 'T', color: '#39ff8c', name: 'TRIPLE' },
    { id: 'split', label: 'S', color: '#7de2ff', name: 'SPLIT' },
    { id: 'bounce', label: 'B', color: '#ffd54f', name: 'BOUNCE' },
    { id: 'pierce', label: 'P', color: '#c792ea', name: 'PIERCE' },
    { id: 'rapid', label: 'R', color: '#ff8a3d', name: 'RAPID' },
    { id: 'life', label: '1', color: '#ff6b6b', name: '1UP' }
];
export const POWERUP_DURATION = 900; // frames (~15s)

// ---------- Player ----------
export const PLAYER = {
    w: 44,
    h: 28,
    speed: 5.5,
    cooldownMax: 22
};

// ---------- Invaders ----------
export const INVADER_W = 36;
export const INVADER_H = 26;
export const COLS = 9;
export const ROWS = 5;

// ---------- Projectiles ----------
export const SHOT_SPEED = 7;

// ---------- UFO ----------
export const UFO = {
    w: 42,
    h: 20
};

// ---------- Classic 5x8 alien sprites ----------
export const SPRITES = {
    squid: [
        '..##..',
        '.####.',
        '######',
        '.#..#.',
        '##..##',
        '######',
        '.#..#.',
        '..#...'
    ],
    crab: [
        '...#...',
        '..#.#..',
        '..###..',
        '#####.#',
        '#######',
        '.#.###.',
        '..#.#..',
        '...#...'
    ],
    octo: [
        '..##...',
        '.##.##.',
        '#######',
        '#######',
        '#.###.#',
        '#.....#',
        '.#...#.',
        '..#.#..'
    ],
    // Alternate animation frames
    squid2: [
        '..##..',
        '.####.',
        '######',
        '..##..',
        '..##..',
        '.####.',
        '..##..',
        '..#...'
    ],
    crab2: [
        '...#...',
        '..#.#..',
        '..###..',
        '.#####.',
        '#######',
        '##.###.',
        '..#.#..',
        '...#...'
    ],
    octo2: [
        '..##...',
        '.##.##.',
        '#######',
        '#######',
        '#.###.#',
        '.##.##.',
        '.#...#.',
        '..#.#..'
    ]
};
