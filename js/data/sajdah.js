// ============================================================
// SAJDAH — 15 positions of Sajdah Tilawah in the Qur'an
// Each entry: { surah, ayah }
// Source: scholarly consensus, all major madhabs agree on 14;
// Hanafi adds 15:70. We include all 15 for completeness.
// ============================================================
const SAJDAH_POSITIONS = [
  { surah: 7,   ayah: 206 },
  { surah: 13,  ayah: 15  },
  { surah: 16,  ayah: 50  },
  { surah: 17,  ayah: 109 },
  { surah: 19,  ayah: 58  },
  { surah: 22,  ayah: 18  },
  { surah: 22,  ayah: 77  },
  { surah: 25,  ayah: 60  },
  { surah: 27,  ayah: 26  },
  { surah: 32,  ayah: 15  },
  { surah: 38,  ayah: 24  },
  { surah: 41,  ayah: 38  },
  { surah: 53,  ayah: 62  },
  { surah: 84,  ayah: 21  },
  { surah: 96,  ayah: 19  },
];

// Fast lookup: "surah:ayah" → true
const SAJDAH_SET = new Set(SAJDAH_POSITIONS.map(s => s.surah + ':' + s.ayah));

function isSajdah(surahNum, ayahNum) {
  return SAJDAH_SET.has(surahNum + ':' + ayahNum);
}
