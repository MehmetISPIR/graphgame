/* Paylaşılan i18n modülü — TR / EN / HI
   Kullanım: import { t, LANG, applyI18n, createLangSwitcher } from './i18n.js';
*/

export const I18N = {
  tr: {
    /* Lobi */
    lobby_join_heading: "Odaya Katıl",
    lobby_username_label: "Kullanıcı adınız",
    lobby_username_ph: "ör. user1",
    lobby_room_label: "Oda adı (yeni veya var olan)",
    lobby_room_ph: "ör. TestRoom",
    lobby_join_btn: "Odaya Katıl",
    lobby_rooms_heading: "Mevcut Odalar",
    lobby_click_hint: "Bir odaya tıklayarak katılabilirsiniz.",
    lobby_alert_missing: "Lütfen kullanıcı adı ve oda adı girin.",
    lobby_prompt_username: "Kullanıcı adınız",

    /* Oda durumu */
    status_playing: "Oynanıyor",
    status_waiting: "Bekliyor",
    status_full: "Dolu",
    status_ready: "Hazır",
    status_players_count: "{0} oyuncu",

    /* Oyun (game.html) */
    game_title: "Matematik Oyunu",
    game_status_heading: "Oyun Durumu",
    game_status_starting: "Oyun başlatılıyor...",
    game_status_playing: "Oyun devam ediyor...",
    game_status_round_end: "Tur bitti. Kelime: {0}",
    game_status_over: "Oyun bitti!",
    game_room_label: "Oda:",
    game_time_label: "Süre:",
    game_players_heading: "Oyuncular",
    game_drawing_controls: "Çizim Kontrolü",
    game_color_label: "Renk:",
    game_send_btn: "Gönder",
    game_clear_btn: "Temizle",
    game_guess_heading: "Tahmin Et",
    game_guess_ph: "Kelime tahmini",
    game_guess_btn: "Tahmin Et",
    game_scores_heading: "Skorlar",
    game_role_drawing: "Çiziyor",
    game_alert_missing: "Lütfen geçerli bir kullanıcı adı ve oda adı ile giriş yapınız.",
    game_painter_label: "Çizen: {0}",
    game_word_to_draw: "Çizmen gereken kelime: {0}",
    game_over_alert: "Oyun bitti! Tüm oyuncular çizdi.",
    game_correct_alert: "Doğru! Kelime: {0}",
    game_wrong_alert: "Yanlış tahmin!",
    game_invalid_expr: "Geçersiz ifade",
    error_room_full: "Oda dolu",
    error_invalid_join: "Geçersiz giriş bilgisi",

    /* Puzzle */
    puzzle_level: "Seviye",
    puzzle_similarity: "Benzerlik",
    puzzle_hint_count: "İpucu",
    puzzle_total: "Toplam",
    puzzle_target: "Hedef Şekil",
    puzzle_your_drawing: "Senin Çizimin",
    puzzle_pieces_heading: "Yapboz Parçaları",
    puzzle_all_used: "Tüm parçalar kullanıldı",
    puzzle_formula_area: "Formül Oluşturma Alanı",
    puzzle_click_blocks: "Parçalara tıklayarak formül oluştur",
    puzzle_btn_clear: "Temizle",
    puzzle_btn_hint: "İpucu",
    puzzle_btn_shuffle: "Karıştır",
    puzzle_btn_check: "Kontrol Et",
    puzzle_btn_next: "Sonraki",
    puzzle_this_round: "Bu Tur",
    puzzle_hint_label: "İpucu",
    puzzle_invalid_formula: "Geçerli bir eşitsizlik formülü oluştur",
    puzzle_great: "Harika! +{0} puan ({1}% benzerlik)",
    puzzle_getting_close: "Yaklaşıyorsun! {0}% benzerlik",
    puzzle_keep_going: "{0}% benzerlik — devam et",
    puzzle_no_hints: "İpucu hakkın bitti",
    puzzle_needs_ineq: "eşitsizlik operatörü ekle: < veya >",
    puzzle_invalid_result: "Geçersiz sonuç",
  },

  en: {
    lobby_join_heading: "Join a Room",
    lobby_username_label: "Your username",
    lobby_username_ph: "e.g. user1",
    lobby_room_label: "Room name (new or existing)",
    lobby_room_ph: "e.g. TestRoom",
    lobby_join_btn: "Join Room",
    lobby_rooms_heading: "Available Rooms",
    lobby_click_hint: "Click a room to join it.",
    lobby_alert_missing: "Please enter a username and a room name.",
    lobby_prompt_username: "Your username",

    status_playing: "Playing",
    status_waiting: "Waiting",
    status_full: "Full",
    status_ready: "Ready",
    status_players_count: "{0} players",

    game_title: "Math Game",
    game_status_heading: "Game Status",
    game_status_starting: "Starting game...",
    game_status_playing: "Game in progress...",
    game_status_round_end: "Round over. Word: {0}",
    game_status_over: "Game over!",
    game_room_label: "Room:",
    game_time_label: "Time:",
    game_players_heading: "Players",
    game_drawing_controls: "Drawing Controls",
    game_color_label: "Color:",
    game_send_btn: "Send",
    game_clear_btn: "Clear",
    game_guess_heading: "Guess",
    game_guess_ph: "Guess the word",
    game_guess_btn: "Guess",
    game_scores_heading: "Scores",
    game_role_drawing: "Drawing",
    game_alert_missing: "Please log in with a valid username and room name.",
    game_painter_label: "Drawing: {0}",
    game_word_to_draw: "Word to draw: {0}",
    game_over_alert: "Game over! All players have drawn.",
    game_correct_alert: "Correct! Word: {0}",
    game_wrong_alert: "Wrong guess!",
    game_invalid_expr: "Invalid expression",
    error_room_full: "Room is full",
    error_invalid_join: "Invalid join information",

    puzzle_level: "Level",
    puzzle_similarity: "Similarity",
    puzzle_hint_count: "Hint",
    puzzle_total: "Total",
    puzzle_target: "Target Shape",
    puzzle_your_drawing: "Your Drawing",
    puzzle_pieces_heading: "Puzzle Pieces",
    puzzle_all_used: "All pieces used",
    puzzle_formula_area: "Formula Builder",
    puzzle_click_blocks: "Click pieces to build the formula",
    puzzle_btn_clear: "Clear",
    puzzle_btn_hint: "Hint",
    puzzle_btn_shuffle: "Shuffle",
    puzzle_btn_check: "Check",
    puzzle_btn_next: "Next",
    puzzle_this_round: "This Round",
    puzzle_hint_label: "Hint",
    puzzle_invalid_formula: "Build a valid inequality formula",
    puzzle_great: "Great! +{0} points ({1}% similarity)",
    puzzle_getting_close: "Getting closer! {0}% similarity",
    puzzle_keep_going: "{0}% similarity — keep going",
    puzzle_no_hints: "No hints left",
    puzzle_needs_ineq: "add inequality operator: < or >",
    puzzle_invalid_result: "Invalid result",
  },

  hi: {
    lobby_join_heading: "कमरे में शामिल हों",
    lobby_username_label: "आपका उपयोगकर्ता नाम",
    lobby_username_ph: "उदा. user1",
    lobby_room_label: "कमरे का नाम (नया या मौजूदा)",
    lobby_room_ph: "उदा. TestRoom",
    lobby_join_btn: "शामिल हों",
    lobby_rooms_heading: "उपलब्ध कमरे",
    lobby_click_hint: "शामिल होने के लिए किसी कमरे पर क्लिक करें।",
    lobby_alert_missing: "कृपया उपयोगकर्ता नाम और कमरे का नाम दर्ज करें।",
    lobby_prompt_username: "आपका उपयोगकर्ता नाम",

    status_playing: "चल रहा है",
    status_waiting: "प्रतीक्षा में",
    status_full: "भरा हुआ",
    status_ready: "तैयार",
    status_players_count: "{0} खिलाड़ी",

    game_title: "गणित खेल",
    game_status_heading: "खेल की स्थिति",
    game_status_starting: "खेल शुरू हो रहा है...",
    game_status_playing: "खेल जारी है...",
    game_status_round_end: "राउंड समाप्त। शब्द: {0}",
    game_status_over: "खेल समाप्त!",
    game_room_label: "कमरा:",
    game_time_label: "समय:",
    game_players_heading: "खिलाड़ी",
    game_drawing_controls: "ड्राइंग नियंत्रण",
    game_color_label: "रंग:",
    game_send_btn: "भेजें",
    game_clear_btn: "साफ़ करें",
    game_guess_heading: "अनुमान लगाएं",
    game_guess_ph: "शब्द का अनुमान",
    game_guess_btn: "अनुमान",
    game_scores_heading: "स्कोर",
    game_role_drawing: "चित्र बना रहा है",
    game_alert_missing: "कृपया वैध उपयोगकर्ता नाम और कमरे के नाम से लॉग इन करें।",
    game_painter_label: "चित्रकार: {0}",
    game_word_to_draw: "आपको चित्रित करना है: {0}",
    game_over_alert: "खेल समाप्त! सभी खिलाड़ियों ने चित्र बनाया।",
    game_correct_alert: "सही! शब्द: {0}",
    game_wrong_alert: "गलत अनुमान!",
    game_invalid_expr: "अमान्य अभिव्यक्ति",
    error_room_full: "कमरा भरा हुआ है",
    error_invalid_join: "अमान्य प्रवेश जानकारी",

    puzzle_level: "स्तर",
    puzzle_similarity: "समानता",
    puzzle_hint_count: "संकेत",
    puzzle_total: "कुल",
    puzzle_target: "लक्ष्य आकार",
    puzzle_your_drawing: "आपका चित्र",
    puzzle_pieces_heading: "पहेली के टुकड़े",
    puzzle_all_used: "सभी टुकड़े उपयोग किए गए",
    puzzle_formula_area: "सूत्र क्षेत्र",
    puzzle_click_blocks: "सूत्र बनाने के लिए टुकड़ों पर क्लिक करें",
    puzzle_btn_clear: "साफ़ करें",
    puzzle_btn_hint: "संकेत",
    puzzle_btn_shuffle: "मिलाएं",
    puzzle_btn_check: "जांचें",
    puzzle_btn_next: "अगला",
    puzzle_this_round: "यह राउंड",
    puzzle_hint_label: "संकेत",
    puzzle_invalid_formula: "एक वैध असमानता सूत्र बनाएं",
    puzzle_great: "बहुत बढ़िया! +{0} अंक ({1}% समानता)",
    puzzle_getting_close: "आप करीब हैं! {0}% समानता",
    puzzle_keep_going: "{0}% समानता — जारी रखें",
    puzzle_no_hints: "कोई संकेत नहीं बचा",
    puzzle_needs_ineq: "असमानता ऑपरेटर जोड़ें: < या >",
    puzzle_invalid_result: "अमान्य परिणाम",
  },
};

const SUPPORTED = ['tr', 'en', 'hi'];

function detectLang() {
  const urlLang = new URLSearchParams(location.search).get('lang');
  if (urlLang && SUPPORTED.includes(urlLang)) return urlLang;
  const stored = localStorage.getItem('descx_lang');
  if (stored && SUPPORTED.includes(stored)) return stored;
  return 'tr';
}

export const LANG = detectLang();
localStorage.setItem('descx_lang', LANG);
document.documentElement.lang = LANG;

export function t(key, ...args) {
  let s = (I18N[LANG] && I18N[LANG][key]) || I18N.tr[key] || key;
  args.forEach((a, i) => { s = s.replace('{' + i + '}', a); });
  return s;
}

/* Tüm [data-i18n] elemanlarını mevcut dile göre doldurur.
   data-i18n      → textContent
   data-i18n-ph   → placeholder
   data-i18n-html → innerHTML (dikkatli kullan) */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
}

/* Dil değiştirme butonlarını oluşturur. onSwitch verilirse callback çağrılır,
   aksi halde URL parametresi güncellenip sayfa yeniden yüklenir. */
export function createLangSwitcher(onSwitch) {
  const wrap = document.createElement('div');
  wrap.className = 'lang-switcher';
  SUPPORTED.forEach(lang => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = lang.toUpperCase();
    btn.className = 'lang-btn' + (lang === LANG ? ' active' : '');
    btn.addEventListener('click', () => {
      if (lang === LANG) return;
      localStorage.setItem('descx_lang', lang);
      if (typeof onSwitch === 'function') {
        onSwitch(lang);
      } else {
        const url = new URL(location.href);
        url.searchParams.set('lang', lang);
        location.href = url.toString();
      }
    });
    wrap.appendChild(btn);
  });
  return wrap;
}

/* Çok oyunculuda sunucu kelimeyi {tr, en, hi} objesi olarak gönderir.
   Bu fonksiyon mevcut dile göre tek dize döndürür, ayrıca düz dize
   geldiğinde (eski sunucu) geriye uyumlu davranır. */
export function wordToString(word) {
  if (!word) return '';
  if (typeof word === 'string') return word;
  return word[LANG] || word.tr || word.en || Object.values(word)[0] || '';
}

/* Kullanıcının tahminini kelime objesiyle karşılaştırır — tüm diller kabul. */
export function wordMatchesGuess(word, guess) {
  if (!word || !guess) return false;
  const g = String(guess).toLowerCase().trim();
  if (typeof word === 'string') return word.toLowerCase().trim() === g;
  return Object.values(word).some(w => typeof w === 'string' && w.toLowerCase().trim() === g);
}
