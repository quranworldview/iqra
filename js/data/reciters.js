// ============================================================
// RECITERS — Iqra Qur'an Reader
// Folder names verified directly from everyayah.com/recitations_ayat.html
// ============================================================
const RECITERS = [
  {
    id:     'afasy',
    folder: 'Alafasy_128kbps',
    name:   ['Mishary Rashid Al-Afasy', 'مشاری راشد العفاسی', 'मिशारी राशिद अल-अफ़सी'],
  },
  {
    id:     'sudais',
    folder: 'Abdurrahmaan_As-Sudais_192kbps',
    name:   ['Abdul Rahman Al-Sudais', 'عبدالرحمٰن السدیس', 'अब्दुर-रहमान अस-सुदैस'],
  },
  {
    id:     'shuraim',
    folder: 'Saood_ash-Shuraym_128kbps',
    name:   ['Saud Al-Shuraim', 'سعود الشریم', 'साऊद अश-शुरैम'],
  },
  {
    id:     'ghamdi',
    folder: 'Ghamadi_40kbps',
    name:   ['Saad Al-Ghamdi', 'سعد الغامدی', 'साद अल-ग़ामदी'],
  },
  {
    id:     'husary',
    folder: 'Husary_128kbps',
    name:   ['Mahmoud Khalil Al-Hussary', 'محمود خلیل الحصری', 'महमूद ख़लील अल-हुसरी'],
  },
];

function getReciter(id) {
  return RECITERS.find(r => r.id === id) || RECITERS[0];
}
