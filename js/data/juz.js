// ============================================================
// JUZ — 30 Juz of the Qur'an
// Each entry: { num, nameAr, nameEn, surah, ayah }
// surah + ayah = where this Juz begins
// ============================================================
const JUZ = [
  { num:1,  nameAr:'الم',        nameEn:'Alif Lam Meem',       surah:1,  ayah:1   },
  { num:2,  nameAr:'سَيَقُولُ',   nameEn:'Sayaqool',            surah:2,  ayah:142 },
  { num:3,  nameAr:'تِلْكَ',      nameEn:'Tilka',               surah:2,  ayah:253 },
  { num:4,  nameAr:'لَنْ تَنَالُوا',nameEn:'Lan Tana Loo',      surah:3,  ayah:92  },
  { num:5,  nameAr:'وَالْمُحْصَنَاتُ',nameEn:'Wal Mohsanat',    surah:4,  ayah:24  },
  { num:6,  nameAr:'لَا يُحِبُّ',  nameEn:'La Yuhibbu',         surah:4,  ayah:148 },
  { num:7,  nameAr:'وَإِذَا سَمِعُوا',nameEn:'Wa Iza Samiu',    surah:5,  ayah:82  },
  { num:8,  nameAr:'وَلَوْ أَنَّنَا',nameEn:'Wa Lau Annana',    surah:6,  ayah:111 },
  { num:9,  nameAr:'قَالَ الْمَلَأُ',nameEn:'Qalal Malao',      surah:7,  ayah:88  },
  { num:10, nameAr:'وَاعْلَمُوا',  nameEn:'Wa Alamu',           surah:8,  ayah:41  },
  { num:11, nameAr:'يَعْتَذِرُونَ',nameEn:'Yatazeroon',         surah:9,  ayah:93  },
  { num:12, nameAr:'وَمَا مِنْ دَابَّةٍ',nameEn:'Wa Mamin Dabbah',surah:11, ayah:6  },
  { num:13, nameAr:'وَمَا أُبَرِّئُ',nameEn:'Wa Ma Ubrioo',     surah:12, ayah:53  },
  { num:14, nameAr:'رُبَمَا',      nameEn:'Rubama',              surah:15, ayah:1   },
  { num:15, nameAr:'سُبْحَانَ',    nameEn:'Subhanallazi',        surah:17, ayah:1   },
  { num:16, nameAr:'قَالَ أَلَمْ',  nameEn:'Qal Alam',           surah:18, ayah:75  },
  { num:17, nameAr:'اقْتَرَبَ',    nameEn:'Aqtaraba',            surah:21, ayah:1   },
  { num:18, nameAr:'قَدْ أَفْلَحَ',nameEn:'Qaad Aflaha',         surah:23, ayah:1   },
  { num:19, nameAr:'وَقَالَ',      nameEn:'Wa Qalallazina',      surah:25, ayah:20  },
  { num:20, nameAr:'أَمَّنْ خَلَقَ',nameEn:'Amman Khalaqa',      surah:27, ayah:60  },
  { num:21, nameAr:'اتْلُ مَا',    nameEn:'Utlu Ma',             surah:29, ayah:45  },
  { num:22, nameAr:'وَمَنْ يَقْنُتْ',nameEn:'Waman Yaqnut',      surah:33, ayah:31  },
  { num:23, nameAr:'وَمَا لِي',    nameEn:'Wa Mali',             surah:36, ayah:27  },
  { num:24, nameAr:'فَمَنْ أَظْلَمُ',nameEn:'Faman Azlamu',      surah:39, ayah:32  },
  { num:25, nameAr:'إِلَيْهِ يُرَدُّ',nameEn:'Elahe Yuruddu',    surah:41, ayah:47  },
  { num:26, nameAr:'حم',           nameEn:'Ha Meem',             surah:46, ayah:1   },
  { num:27, nameAr:'قَالَ فَمَا خَطْبُكُمْ',nameEn:'Qala Fama Khatbukum',surah:51,ayah:31},
  { num:28, nameAr:'قَدْ سَمِعَ',  nameEn:'Qaad Samia',          surah:58, ayah:1   },
  { num:29, nameAr:'تَبَارَكَ',    nameEn:'Tabarakallazi',       surah:67, ayah:1   },
  { num:30, nameAr:'عَمَّ',        nameEn:'Amma',                surah:78, ayah:1   },
];

// Returns the Juz number for a given surah + ayah
function getJuzNumber(surahNum, ayahNum) {
  let juzNum = 1;
  for (let i = 0; i < JUZ.length; i++) {
    const j = JUZ[i];
    if (surahNum > j.surah || (surahNum === j.surah && ayahNum >= j.ayah)) {
      juzNum = j.num;
    } else {
      break;
    }
  }
  return juzNum;
}

// Returns all surahs that start in a given Juz (for Juz grid tile info)
function getSurahsInJuz(juzNum) {
  const start = JUZ[juzNum - 1];
  const end   = JUZ[juzNum] || { surah: 115, ayah: 1 };
  return SURAHS.filter(s => {
    if (s.num < start.surah) return false;
    if (s.num >= end.surah)  return false;
    return true;
  });
}
