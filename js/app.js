const DATA_URL = "./data/dictionary.json";
const HISTORY_KEY = "dictionarySearchHistory";
const MAX_HISTORY = 10;

// 五十音表。濁音・半濁音・拗音・促音・長音は置かない。
const KANA_KEYS = [
  "あ","い","う","え","お",
  "か","き","く","け","こ",
  "さ","し","す","せ","そ",
  "た","ち","つ","て","と",
  "な","に","ぬ","ね","の",
  "は","ひ","ふ","へ","ほ",
  "ま","み","む","め","も",
  "や","ゆ","よ",
  "ら","り","る","れ","ろ",
  "わ","を","ん"
];

const searchScreen = document.querySelector("#search-screen");
const resultScreen = document.querySelector("#result-screen");
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search-input");
const searchMessage = document.querySelector("#search-message");
const keyboard = document.querySelector("#kana-keyboard");
const backspaceButton = document.querySelector("#backspace-button");
const clearButton = document.querySelector("#clear-button");
const historyList = document.querySelector("#history-list");
const backButton = document.querySelector("#back-button");
const resultQuery = document.querySelector("#result-query");
const resultContent = document.querySelector("#result-content");
const resultScroll = document.querySelector("#result-scroll");
const pageTurn = document.querySelector("#page-turn");

let dictionary = [];

init();

async function init() {
  buildKeyboard();
  bindEvents();
  renderHistory();

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    dictionary = await response.json();
  } catch (error) {
    console.error(error);
    setMessage("辞書データを読み込めませんでした。READMEの起動方法を確認してください。", true);
  }
}

function bindEvents() {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch(searchInput.value, true);
  });

  backspaceButton.addEventListener("click", () => {
    searchInput.value = Array.from(searchInput.value).slice(0, -1).join("");
    searchInput.focus();
  });

  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    setMessage("");
    searchInput.focus();
  });

  backButton.addEventListener("click", showSearchScreen);

  // 仕様：マウスホイールを下に回すと左にスクロール。
  resultScroll.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    resultScroll.scrollLeft -= event.deltaY;
  }, { passive: false });
}

function buildKeyboard() {
  const fragment = document.createDocumentFragment();

  KANA_KEYS.forEach((kana) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "kana-key";
    button.textContent = kana;
    button.addEventListener("click", () => appendKana(kana));
    fragment.appendChild(button);
  });

  keyboard.appendChild(fragment);
}

function appendKana(kana) {
  const chars = Array.from(searchInput.value);
  if (chars.length >= 2) return;

  searchInput.value = chars.join("") + kana;
  searchInput.focus();
  setMessage("");
}

function runSearch(rawQuery, saveHistory) {
  setMessage("");

  const validation = validateQuery(rawQuery);
  if (!validation.ok) {
    setMessage("ERROR", true);
    return;
  }

  const normalizedQuery = normalizeKana(rawQuery);

  const matches = dictionary.filter((entry) => {
    const normalizedKana = normalizeKana(entry.kana ?? "");
    return Array.from(normalizedKana).slice(0, 2).join("") === normalizedQuery;
  });

  if (matches.length === 0) {
    setMessage("NO DATA", true);
    return;
  }

  if (saveHistory) {
    saveSearchHistory(rawQuery);
    renderHistory();
  }

  playPageTurn(() => showResults(rawQuery, matches));
}

function validateQuery(rawQuery) {
  const chars = Array.from(rawQuery);

  // 仕様：入力文字数は2文字。
  if (chars.length !== 2) return { ok: false };

  // ひらがな、濁音・半濁音を含むひらがな、小書きかな、長音記号を許可。
  // カタカナは現段階では対象外。
  const kanaPattern = /^[ぁ-ゖー]{2}$/u;
  if (!kanaPattern.test(rawQuery)) return { ok: false };

  return { ok: true };
}

function normalizeKana(text) {
  if (!text) return "";

  // 濁音・半濁音を分解し、濁点・半濁点を除去。
  let value = text.normalize("NFD").replace(/[\u3099\u309A]/g, "");

  // 小書きかなを通常サイズへ。
  const smallKanaMap = {
    "ぁ":"あ", "ぃ":"い", "ぅ":"う", "ぇ":"え", "ぉ":"お",
    "ゃ":"や", "ゅ":"ゆ", "ょ":"よ", "っ":"つ", "ゎ":"わ",
    "ゕ":"か", "ゖ":"け"
  };

  value = Array.from(value).map((char) => smallKanaMap[char] ?? char).join("");

  // 長音は直前のかなに応じて母音へ置換。
  // 例：かー→かあ
  const chars = Array.from(value);
  const result = [];

  for (const char of chars) {
    if (char === "ー") {
      const prev = result[result.length - 1] ?? "";
      result.push(getVowel(prev));
    } else {
      result.push(char);
    }
  }

  return result.join("").normalize("NFC");
}

function getVowel(kana) {
  const groups = {
    "あ": "あいうえおかがさざただなはばぱまやらわ",
    "い": "いきぎしじちぢにひびぴみりゐ",
    "う": "うくぐすずつづぬふぶぷむゆる",
    "え": "えけげせぜてでねへべぺめれゑ",
    "お": "おこごそぞとどのほぼぽもよろを"
  };

  for (const [vowel, group] of Object.entries(groups)) {
    if (group.includes(kana)) return vowel;
  }

  // 判定できない場合は、長音記号をそのまま残す。
  return "ー";
}

function showResults(query, matches) {
  searchScreen.classList.remove("is-active");
  resultScreen.classList.add("is-active");
  resultQuery.textContent = `検索：「${query}」`;
  resultContent.replaceChildren();

  matches.forEach((entry) => {
    const article = document.createElement("article");
    article.className = "dictionary-entry";

    const heading = document.createElement("h2");
    heading.className = "dictionary-heading";
    heading.textContent = entry.word
      ? `${entry.kana}【${entry.word}】`
      : entry.kana;

    const description = document.createElement("p");
    description.className = "dictionary-description";
    description.textContent = entry.description ?? "";

    article.append(heading, description);
    resultContent.appendChild(article);
  });

  resultScroll.scrollLeft = 0;
  resultScroll.focus();
}

function showSearchScreen() {
  resultScreen.classList.remove("is-active");
  searchScreen.classList.add("is-active");
  searchInput.focus();
}

function playPageTurn(onComplete) {
  pageTurn.classList.remove("is-playing");
  // アニメーションを再スタートさせるため reflow。
  void pageTurn.offsetWidth;
  pageTurn.classList.add("is-playing");

  window.setTimeout(() => {
    pageTurn.classList.remove("is-playing");
    onComplete();
  }, 460);
}

function setMessage(message, isError = false) {
  searchMessage.textContent = message;
  searchMessage.classList.toggle("is-error", isError);
}

function loadSearchHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(query) {
  const history = loadSearchHistory().filter((item) => item !== query);
  history.unshift(query);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function renderHistory() {
  const history = loadSearchHistory();
  historyList.replaceChildren();

  if (history.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-history";
    empty.textContent = "まだ検索履歴はありません。";
    historyList.appendChild(empty);
    return;
  }

  history.forEach((query) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-button";
    button.textContent = query;
    button.addEventListener("click", () => {
      searchInput.value = query;
      runSearch(query, false);
    });
    historyList.appendChild(button);
  });
}
