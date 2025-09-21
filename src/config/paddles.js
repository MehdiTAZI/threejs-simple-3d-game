export const paddleProfiles = {
  titan: {
    name: 'Crimson Titan',
    description: 'Wide reach, heavy handling',
    colors: { primary: 0xea3b5b, emissive: 0x9f1239, glow: 0xfca5a5, light: 0xff7b9d },
    scale: 1.55,
    smooth: 0.12,
    speedCap: 1.35,
    ability: { name: 'Inferno strike', type: 'fireball', cooldown: 16000, duration: 4000, radius: 2.6 },
  },
  aero: {
    name: 'Azure Aero',
    description: 'Ultra fast, slim profile',
    colors: { primary: 0x38bdf8, emissive: 0x1d4ed8, glow: 0x93c5fd, light: 0x60a5fa },
    scale: 0.9,
    smooth: 0.28,
    speedCap: 2.7,
    ability: { name: 'Ice barrier', type: 'iceWall', cooldown: 12000, duration: 5000 },
  },
  mystic: {
    name: 'Violet Mystic',
    description: 'Balanced, time control',
    colors: { primary: 0x8b5cf6, emissive: 0x5b21b6, glow: 0xc4b5fd, light: 0xa855f7 },
    scale: 1.1,
    smooth: 0.2,
    speedCap: 2.05,
    ability: { name: 'Time slow', type: 'slow', cooldown: 13000, duration: 5000, factor: 0.45 },
  },
};
