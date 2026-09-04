(() => {
  "use strict";

  const DATA = window.GAME_DATA;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const screens = {
    search: $("#search-screen"),
    result: $("#result-screen"),
    settings: $("#settings-screen")
  };

  const input = $("#search-input");
  const form = $("#search-form");
  const message = $("#search-message");
  const keyboard = $("#kana-keyboard");
  const historyList = $("#history-list");
  const resultTitle = $("#result-title");
  const resultCount = $("#result-count");
  const viewport = $("#results-viewport");
  const strip = $("#results-strip");
  const transitionOverlay = $("#transition-overlay");
  const eventOverlay = $("#event-overlay");
  const eventText = $("#event-text");

  const storageKeys = {
    history: "dictionaryPrototype.searchHistory",
    flags: "dictionaryPrototype.readFlags",
    seenEvents: "dictionaryPrototype.seenEvents",
    settings: "dictionaryPrototype.settings"
  };

  const state = {
    screen: "search",
    previousScreen: "search",
    query: "",
    results: [],
    history: loadJSON(storageKeys.history, [
      "しん",
      "かぜ",
      "ゆめ",
      "きお",
      "みち",
      "あお"
    ]),
    flags: new Set(loadJSON(storageKeys.flags, [])),
    seenEvents: new Set(loadJSON(storageKeys.seenEvents, [])),
    settings: Object.assign(
      {
        sound: true,
        hint: true,
        skip: false
      },
      loadJSON(storageKeys.settings, {})
    ),
    activeEvent: null,
    activeEventIndex: 0,
    audioCtx: null
  };

  // 一般的な五十音表（5行×10列）
  // 存在しない音は空欄
  // 「ん」は表外の独立キー
  const gojuon = [
    ["わ", "ら", "や", "ま", "は", "な", "た", "さ", "か", "あ"],
    ["を", "り", "",   "み", "ひ", "に", "ち", "し", "き", "い"],
    ["",   "る", "ゆ", "む", "ふ", "ぬ", "つ", "す", "く", "う"],
    ["",   "れ", "",   "め", "へ", "ね", "て", "せ", "け", "え"],
    ["",   "ろ", "よ", "も", "ほ", "の", "と", "そ", "こ", "お"]
  ];

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      el.classList.toggle("is-active", key === name);
    });

    state.screen = name;
  }

  function openSettings() {
    state.previousScreen =
      state.screen === "settings"
        ? "search"
        : state.screen;

    syncSettingsUI();
    showScreen("settings");
  }

  function syncSettingsUI() {
    $("#setting-sound").checked = !!state.settings.sound;
    $("#setting-hint").checked = !!state.settings.hint;
    $("#setting-skip").checked = !!state.settings.skip;
  }

  function commitSettings() {
    state.settings.sound = $("#setting-sound").checked;
    state.settings.hint = $("#setting-hint").checked;
    state.settings.skip = $("#setting-skip").checked;

    saveJSON(storageKeys.settings, state.settings);

    if (state.screen === "result") {
      renderResults();
    }
  }

  function renderKeyboard() {
    keyboard.innerHTML = "";

    gojuon.flat().forEach(kana => {
      if (!kana) {
        const blank = document.createElement("div");
        blank.className = "kana-blank";
        blank.setAttribute("aria-hidden", "true");
        keyboard.appendChild(blank);
        return;
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "kana-key";
      btn.textContent = kana;
      btn.dataset.kana = kana;

      keyboard.appendChild(btn);
    });
  }

  function appendKana(kana) {
    const chars = Array.from(input.value);

    if (chars.length >= 4) {
      return;
    }

    input.value += kana;
    input.focus();
    clearMessage();
  }

  function backspaceInput() {
    const chars = Array.from(input.value);

    chars.pop();
    input.value = chars.join("");

    input.focus();
    clearMessage();
  }

  function clearInput() {
    input.value = "";
    input.focus();
    clearMessage();
  }

  function clearMessage() {
    message.textContent = "";
    message.classList.remove("no-data");
  }

  function setMessage(text, type = "error") {
    message.textContent = text;
    message.classList.toggle(
      "no-data",
      type === "no-data"
    );
  }

  function isKanaString(value) {
    return /^[ぁ-ゖー]+$/u.test(value);
  }

  const smallKanaMap = new Map(
    Object.entries({
      "ぁ": "あ",
      "ぃ": "い",
      "ぅ": "う",
      "ぇ": "え",
      "ぉ": "お",
      "ゃ": "や",
      "ゅ": "ゆ",
      "ょ": "よ",
      "っ": "つ",
      "ゎ": "わ",
      "ゕ": "か",
      "ゖ": "け"
    })
  );

  const vowelGroups = {
    "あ": "あ",
    "か": "あ",
    "さ": "あ",
    "た": "あ",
    "な": "あ",
    "は": "あ",
    "ま": "あ",
    "や": "あ",
    "ら": "あ",
    "わ": "あ",

    "い": "い",
    "き": "い",
    "し": "い",
    "ち": "い",
    "に": "い",
    "ひ": "い",
    "み": "い",
    "り": "い",
    "ゐ": "い",

    "う": "う",
    "く": "う",
    "す": "う",
    "つ": "う",
    "ぬ": "う",
    "ふ": "う",
    "む": "う",
    "ゆ": "う",
    "る": "う",
    "を": "お",

    "え": "え",
    "け": "え",
    "せ": "え",
    "て": "え",
    "ね": "え",
    "へ": "え",
    "め": "え",
    "れ": "え",
    "ゑ": "え",

    "お": "お",
    "こ": "お",
    "そ": "お",
    "と": "お",
    "の": "お",
    "ほ": "お",
    "も": "お",
    "よ": "お",
    "ろ": "お"
  };

  function normalizeKana(value) {
    const chars = Array.from(
      value
        .normalize("NFD")
        .replace(/[\u3099\u309A]/g, "")
        .normalize("NFC")
    ).map(ch => {
      return smallKanaMap.get(ch) || ch;
    });

    const out = [];

    for (const ch of chars) {
      if (ch === "ー") {
        if (!out.length) {
          return null;
        }

        const prev = out[out.length - 1];
        const vowel = vowelGroups[prev];

        if (!vowel) {
          return null;
        }

        out.push(vowel);
      } else {
        out.push(ch);
      }
    }

    return out.join("");
  }

  function validateAndNormalize(raw) {
    const chars = Array.from(raw.trim());

    if (chars.length !== 2) {
      return {
        ok: false,
        reason: "ERROR"
      };
    }

    if (!isKanaString(chars.join(""))) {
      return {
        ok: false,
        reason: "ERROR"
      };
    }

    const normalized = normalizeKana(
      chars.join("")
    );

    if (
      !normalized ||
      Array.from(normalized).length !== 2
    ) {
      return {
        ok: false,
        reason: "ERROR"
      };
    }

    return {
      ok: true,
      value: normalized
    };
  }

  function normalizedReading(item) {
    return (
      normalizeKana(item.reading) ||
      item.reading
    );
  }

  function findResults(query) {
    return DATA.Dictionary.filter(item => {
      return normalizedReading(item)
        .startsWith(query);
    });
  }

  function addHistory(query) {
    state.history = [
      query,
      ...state.history.filter(
        x => x !== query
      )
    ].slice(0, 12);

    saveJSON(
      storageKeys.history,
      state.history
    );

    renderHistory();
  }

  function renderHistory() {
    historyList.innerHTML = "";

    if (!state.history.length) {
      historyList.innerHTML =
        '<p class="history-empty">まだ検索履歴はありません</p>';
      return;
    }

    state.history
      .slice(0, 6)
      .forEach(query => {
        const btn =
          document.createElement("button");

        btn.type = "button";
        btn.className = "history-item";
        btn.dataset.query = query;

        btn.innerHTML = `
          <span>${escapeHTML(query)}</span>
          <span aria-hidden="true">›</span>
        `;

        historyList.appendChild(btn);
      });
  }

  function performSearch(
    raw,
    { fromHistory = false } = {}
  ) {
    clearMessage();

    let query;

    if (fromHistory) {
      query = raw;
    } else {
      const checked =
        validateAndNormalize(raw);

      if (!checked.ok) {
        setMessage("ERROR");
        playTone("error");
        return;
      }

      query = checked.value;
    }

    const results = findResults(query);

    if (!results.length) {
      setMessage(
        "NO DATA",
        "no-data"
      );

      playTone("error");
      return;
    }

    addHistory(query);

    input.value = query;

    state.query = query;
    state.results = results;

    goToResultsWithTransition();
  }

  function goToResultsWithTransition() {
    if (state.settings.skip) {
      renderResults();
      showScreen("result");

      requestAnimationFrame(
        positionResultsAtStart
      );

      return;
    }

    playTone("page");

    transitionOverlay.classList.add(
      "is-playing"
    );

    transitionOverlay.setAttribute(
      "aria-hidden",
      "false"
    );

    // 演出の裏側で検索結果画面へ切り替える
    setTimeout(() => {
      renderResults();
      showScreen("result");
      positionResultsAtStart();
    }, 560);

    setTimeout(() => {
      transitionOverlay.classList.remove(
        "is-playing"
      );

      transitionOverlay.setAttribute(
        "aria-hidden",
        "true"
      );
    }, 1800);
  }

  function parseDescription(text) {
    const parts = text
      .split(/(\[\[.*?\]\])/g)
      .filter(Boolean);

    return parts
      .map(part => {
        if (
          part.startsWith("[[") &&
          part.endsWith("]]")
        ) {
          const content =
            part.slice(2, -2);

          if (state.settings.hint) {
            return `
              <mark class="hint-mark">
                ${escapeHTML(content)}
              </mark>
            `;
          }

          return escapeHTML(content);
        }

        return escapeHTML(part);
      })
      .join("");
  }

  function renderResults() {
    resultTitle.textContent =
      `検索結果：${state.query}`;

    resultCount.textContent =
      `${state.results.length}件`;

    strip.innerHTML = "";

    // データ順を維持したまま列を作る。
    // 列だけ逆順に配置することで、
    // 右端の開始位置に
    // データシート上位の項目を表示する。
    const perColumn = 3;
    const columns = [];

    for (
      let i = 0;
      i < state.results.length;
      i += perColumn
    ) {
      columns.push(
        state.results.slice(
          i,
          i + perColumn
        )
      );
    }

    [...columns]
      .reverse()
      .forEach(items => {
        const col =
          document.createElement(
            "section"
          );

        col.className =
          "dictionary-column";

        items.forEach(item => {
          const entry =
            document.createElement(
              "article"
            );

          entry.className =
            "dictionary-entry";

          entry.dataset.id =
            item.id;

          const isRead =
            item.flagId &&
            state.flags.has(
              item.flagId
            );

          const bookmark =
            item.flagId
              ? `
                <button
                  class="bookmark-button ${
                    isRead
                      ? "is-read"
                      : ""
                  }"
                  type="button"
                  data-flag-id="${
                    escapeAttr(
                      item.flagId
                    )
                  }"
                  aria-label="${
                    isRead
                      ? "既読"
                      : "栞をつける"
                  }"
                  ${
                    isRead
                      ? "disabled"
                      : ""
                  }
                >
                  <svg
                    viewBox="0 0 24 28"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 2.5h14a1 1 0 0 1 1 1V25l-8-5-8 5V3.5a1 1 0 0 1 1-1Z"
                    />
                  </svg>
                </button>
              `
              : "";

          entry.innerHTML = `
            <h2 class="entry-title">
              ${escapeHTML(
                item.headword
              )}
              <span class="notation">
                【${escapeHTML(
                  item.notation
                )}】
              </span>
            </h2>

            <p class="entry-description">
              ${parseDescription(
                item.description
              )}
            </p>

            ${bookmark}
          `;

          col.appendChild(entry);
        });

        strip.appendChild(col);
      });
  }

  function positionResultsAtStart() {
    requestAnimationFrame(() => {
      // 辞書は右端から読み始める
      viewport.scrollLeft =
        viewport.scrollWidth -
        viewport.clientWidth;

      viewport.focus({
        preventScroll: true
      });
    });
  }

  // マウスホイール・トラックパッド操作
  //
  // 下方向へのスクロール
  // → 検索結果を左へ移動
  //
  // トラックパッドでは
  // deltaX / deltaY が同時に発生しやすいため、
  // 少し斜めの操作でも縦操作として扱う。
  function onWheelResults(e) {
    // ピンチズームは妨げない
    if (e.ctrlKey) {
      return;
    }

    const vertical =
      Math.abs(e.deltaY);

    const horizontal =
      Math.abs(e.deltaX);

    // ごく小さい入力は無視
    if (
      vertical < 0.5 &&
      horizontal < 0.5
    ) {
      return;
    }

    // トラックパッドでは
    // 完全な縦移動にならないため、
    // 縦成分が横成分の60%以上なら
    // 縦スクロールとして扱う。
    if (
      vertical >=
      horizontal * 0.6
    ) {
      e.preventDefault();

      let scale = 1;

      // deltaMode:
      // 0 = pixel
      // 1 = line
      // 2 = page
      if (e.deltaMode === 1) {
        scale = 16;
      } else if (
        e.deltaMode === 2
      ) {
        scale =
          viewport.clientHeight;
      }

      // トラックパッドの小さい移動量を
      // 少し増幅する
      let amount =
        e.deltaY *
        scale *
        2;

      // 一度に飛びすぎないよう制限
      amount = Math.max(
        -120,
        Math.min(
          120,
          amount
        )
      );

      // 下方向 → 左へ
      viewport.scrollLeft -=
        amount;
    }
  }

  function acquireFlag(
    flagId,
    button
  ) {
    if (
      !flagId ||
      state.flags.has(flagId)
    ) {
      return;
    }

    state.flags.add(flagId);

    saveJSON(
      storageKeys.flags,
      [...state.flags]
    );

    button.classList.add(
      "is-read"
    );

    button.disabled = true;

    button.setAttribute(
      "aria-label",
      "既読"
    );

    playTone("bookmark");
  }

  function goBackToSearch() {
    showScreen("search");
    input.focus();
    checkEventsOnSearch();
  }

  function checkEventsOnSearch() {
    // Event配列の上から順番に確認
    // 最初に条件を満たしたイベントのみ再生
    const event =
      DATA.Event.find(ev => {
        if (
          state.seenEvents.has(
            ev.eventId
          )
        ) {
          return false;
        }

        if (
          ev.conditionType ===
          "hasFlag"
        ) {
          return state.flags.has(
            ev.conditionDetail
          );
        }

        if (
          ev.conditionType ===
          "flagCount"
        ) {
          return (
            state.flags.size >=
            Number(
              ev.conditionDetail
            )
          );
        }

        return false;
      });

    if (!event) {
      return;
    }

    const scripts =
      DATA.EventScript
        .filter(
          s =>
            s.eventId ===
            event.eventId
        )
        .sort(
          (a, b) =>
            a.order - b.order
        );

    if (!scripts.length) {
      return;
    }

    state.activeEvent = {
      id: event.eventId,
      scripts
    };

    state.activeEventIndex = 0;

    showEventLine();
  }

  function showEventLine() {
    const active =
      state.activeEvent;

    if (!active) {
      return;
    }

    const line =
      active.scripts[
        state.activeEventIndex
      ];

    if (!line) {
      state.seenEvents.add(
        active.id
      );

      saveJSON(
        storageKeys.seenEvents,
        [...state.seenEvents]
      );

      state.activeEvent = null;

      eventOverlay.classList.remove(
        "is-active"
      );

      eventOverlay.setAttribute(
        "aria-hidden",
        "true"
      );

      return;
    }

    eventText.textContent =
      line.text;

    eventOverlay.classList.add(
      "is-active"
    );

    eventOverlay.setAttribute(
      "aria-hidden",
      "false"
    );
  }

  function advanceEvent() {
    if (!state.activeEvent) {
      return;
    }

    state.activeEventIndex += 1;

    showEventLine();
  }

  function playTone(type) {
    if (!state.settings.sound) {
      return;
    }

    try {
      if (!state.audioCtx) {
        state.audioCtx =
          new (
            window.AudioContext ||
            window.webkitAudioContext
          )();
      }

      const ctx =
        state.audioCtx;

      const now =
        ctx.currentTime;

      if (type === "page") {
        const osc =
          ctx.createOscillator();

        const gain =
          ctx.createGain();

        osc.type = "triangle";

        osc.frequency.setValueAtTime(
          240,
          now
        );

        osc.frequency
          .exponentialRampToValueAtTime(
            120,
            now + 0.18
          );

        gain.gain.setValueAtTime(
          0.0001,
          now
        );

        gain.gain
          .exponentialRampToValueAtTime(
            0.055,
            now + 0.02
          );

        gain.gain
          .exponentialRampToValueAtTime(
            0.0001,
            now + 0.22
          );

        osc
          .connect(gain)
          .connect(
            ctx.destination
          );

        osc.start(now);
        osc.stop(now + 0.24);

        return;
      }

      const osc =
        ctx.createOscillator();

      const gain =
        ctx.createGain();

      osc.type =
        type === "error"
          ? "sine"
          : "triangle";

      osc.frequency.value =
        type === "error"
          ? 180
          : 640;

      gain.gain.setValueAtTime(
        0.0001,
        now
      );

      gain.gain
        .exponentialRampToValueAtTime(
          type === "error"
            ? 0.035
            : 0.05,
          now + 0.01
        );

      gain.gain
        .exponentialRampToValueAtTime(
          0.0001,
          now + 0.13
        );

      osc
        .connect(gain)
        .connect(
          ctx.destination
        );

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // WebAudioが使えない環境では
      // 音だけ無視する
    }
  }

  function escapeHTML(value) {
    return String(value)
      .replace(
        /[&<>"']/g,
        ch => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[ch]
      );
  }

  function escapeAttr(value) {
    return escapeHTML(value);
  }

  function bindEvents() {
    form.addEventListener(
      "submit",
      e => {
        e.preventDefault();
        performSearch(
          input.value
        );
      }
    );

    keyboard.addEventListener(
      "click",
      e => {
        const key =
          e.target.closest(
            "[data-kana]"
          );

        if (key) {
          appendKana(
            key.dataset.kana
          );
        }
      }
    );

    $(".keyboard-utility")
      .addEventListener(
        "click",
        e => {
          const key =
            e.target.closest(
              "[data-kana]"
            );

          if (key) {
            appendKana(
              key.dataset.kana
            );
          }
        }
      );

    $("#backspace-key")
      .addEventListener(
        "click",
        backspaceInput
      );

    $("#clear-key")
      .addEventListener(
        "click",
        clearInput
      );

    input.addEventListener(
      "input",
      clearMessage
    );

    input.addEventListener(
      "keydown",
      e => {
        if (
          e.key === "Escape"
        ) {
          clearInput();
        }
      }
    );

    historyList.addEventListener(
      "click",
      e => {
        const btn =
          e.target.closest(
            "[data-query]"
          );

        if (btn) {
          performSearch(
            btn.dataset.query,
            {
              fromHistory: true
            }
          );
        }
      }
    );

    viewport.addEventListener(
      "wheel",
      onWheelResults,
      {
        passive: false
      }
    );

    strip.addEventListener(
      "click",
      e => {
        const btn =
          e.target.closest(
            ".bookmark-button"
          );

        if (!btn) {
          return;
        }

        acquireFlag(
          btn.dataset.flagId,
          btn
        );
      }
    );

    $("#back-to-search")
      .addEventListener(
        "click",
        goBackToSearch
      );

    $$("[data-open-settings]")
      .forEach(btn => {
        btn.addEventListener(
          "click",
          openSettings
        );
      });

    $("#settings-back")
      .addEventListener(
        "click",
        () => {
          showScreen(
            state.previousScreen ||
            "search"
          );

          if (
            state.previousScreen ===
            "result"
          ) {
            renderResults();
            positionResultsAtStart();
          }
        }
      );

    [
      "#setting-sound",
      "#setting-hint",
      "#setting-skip"
    ].forEach(sel => {
      $(sel).addEventListener(
        "change",
        commitSettings
      );
    });

    eventOverlay.addEventListener(
      "click",
      advanceEvent
    );

    document.addEventListener(
      "keydown",
      e => {
        if (
          eventOverlay.classList
            .contains(
              "is-active"
            ) &&
          (
            e.key === "Enter" ||
            e.key === " "
          )
        ) {
          e.preventDefault();
          advanceEvent();
        }
      }
    );
  }

  function init() {
    renderKeyboard();
    renderHistory();
    syncSettingsUI();
    bindEvents();

    showScreen("search");

    input.focus();
  }

  init();
})();
