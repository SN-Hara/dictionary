/* 画面操作 */
(() => {
  "use strict";
  const C = window.DictionaryCore,
    config = window.GAME_CONFIG,
    data = window.GAME_DATA;
  const $ = id => document.getElementById(id),
    stage = $("stage");
  const errors = C.validateData(data);
  if (errors.length) {
    const p = document.createElement("p");
    p.className = "fatal";
    p.textContent = "データを読み込めません。\n" + errors.join("\n");
    stage.append(p);
    $("search-form").inert = true;
    return;
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const animate = async (el, frames, ms) => {
    if (!el.animate) {
      Object.assign(el.style, frames.at(-1));
      return;
    }
    try {
      await el.animate(frames, {
        duration: ms,
        easing: "ease",
        fill: "none"
      }).finished;
    } catch {}
  };
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(config.saveKey)) || {};
  } catch {}
  const knownFlags = new Set(data.dictionary.map(d => d.flag).filter(Boolean));
  const state = {
    screen: "search",
    busy: false,
    flags: new Set(Array.isArray(saved.flags) ? saved.flags.filter(f => knownFlags.has(f)) :
    []),
    played: new Set(Array.isArray(saved.played) ? saved.played : []),
    history: Array.isArray(saved.history) ? saved.history.filter(x => C.searchKey(x) && C
      .search(data.dictionary, x).length) : [],
    hint: saved.hint === true,
    volume: typeof saved.volume === "number" && Number.isFinite(saved.volume) ? Math.max(0, Math
      .min(1, saved.volume)) : .5,
    dial: C.searchKey(saved.dial) || config.initialDial,
    query: ""
  };

  function save() {
    try {
      localStorage.setItem(config.saveKey, JSON.stringify({
        flags: [...state.flags],
        played: [...state.played],
        history: state.history,
        hint: state.hint,
        volume: state.volume,
        dial: dials.map(d => C.KANA[d.index]).join("")
      }));
    } catch {
      $("notice").textContent = "このブラウザでは進行状況を保存できません。";
    }
  }
  let bgm, soundStarted = false;

  function beginSound() {
    if (!soundStarted) {
      soundStarted = true;
      if (config.assets.bgm) {
        bgm = new Audio(config.assets.bgm);
        bgm.loop = true;
        bgm.volume = state.volume;
      }
    }
    if (bgm && bgm.paused) bgm.play().catch(() => {});
  }

  function sound(kind) {
    beginSound();
    if (!state.volume) return;
    const path = config.assets[kind + "Sound"];
    if (!path) return;
    const audio = new Audio(path);
    audio.volume = state.volume;
    audio.play().catch(() => {});
  }
  document.addEventListener("pointerdown", beginSound, {
    once: true
  });
  document.addEventListener("keydown", beginSound, {
    once: true
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelHold();
      bgm?.pause();
    } else if (soundStarted) beginSound();
  });
  // Regular（400）・Bold（700）を登録。
  if (window.FontFace) {
    for (const [path, weight] of [
        [config.assets.fontRegular, "400"],
        [config.assets.fontBold, "700"]
      ]) {
      if (!path) continue;
      const font = new FontFace("GameFont", `url(${JSON.stringify(path)})`, {
        weight,
        style: "normal"
      });
      font.load().then(loaded => document.fonts.add(loaded)).catch(() => {
        $("notice").textContent = "フォントを読み込めません。設定したファイルのパスを確認してください。";
      });
    }
  }

  function size() {
    stage.style.setProperty("--scale", Math.min(innerWidth / 1920, innerHeight / 1080));
    positionDisc(state.screen === "results");
  }

  function point(r, deg) {
    const a = deg * Math.PI / 180;
    return [720 + r * Math.cos(a), 720 + r * Math.sin(a)];
  }

  function sector(ro, ri, center) {
    const a = point(ro, center - 4),
      b = point(ro, center + 4),
      c = point(ri, center + 4),
      d = point(ri, center - 4);
    return `M${a} A${ro},${ro} 0 0 1 ${b} L${c} A${ri},${ri} 0 0 0 ${d}Z`;
  }

  function svg(markup) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 1440">${markup}</svg>`;
  }

  function appendSvg(parent, markup) {
    const holder = document.createElement("div");
    holder.innerHTML = markup;
    const element = holder.firstElementChild;
    parent.append(element);
    return element;
  }
  const dials = [{
    id: "outer-dial",
    ro: 660,
    ri: 600
  }, {
    id: "inner-dial",
    ro: 540,
    ri: 480
  }].map((d, i) => {
    d.el = $(d.id);
    d.index = C.KANA.indexOf(state.dial[i]);
    if (d.index < 0) d.index = 0;
    d.angle = C.dialAngle(d.index);
    d.version = 0;
    d.pending = Promise.resolve();
    appendSvg(d.el, svg(Array.from({
        length: 45
      }, (_, n) =>
      `<path d="${sector(d.ro,d.ri,180+n*8)}" fill="#402b00" stroke="#ffaa00" stroke-width="1"/>`
      ).join("")));
    d.light = document.createElement("div");
    d.light.className = "dial-light";
    d.light.style.position = "absolute";
    d.light.style.inset = "0";
    d.el.append(d.light);
    appendSvg(d.light, svg(`<path d="${sector(d.ro,d.ri,180)}" fill="#ffaa00"/>`));
    d.light.style.transform = `rotate(${d.index*8}deg)`;
    d.el.style.transform = `rotate(${d.angle}deg)`;
    return d;
  });
  appendSvg($("markers"), svg(
    `<circle cx="720" cy="720" r="719" fill="none" stroke="#ffaa00" stroke-width="3"/>` + [
      570, 690
    ].map(r => Array.from({
        length: 9
      }, (_, n) =>
      `<path d="M${point(r-15,180+40*n)}L${point(r+15,180+40*n)}" stroke="#ffaa00" stroke-width="6"/>`
      ).join("")).join("")));
  async function turnDial(d, char) {
    const index = C.KANA.indexOf(char);
    if (index < 0 || d.index === index) return d.pending;
    const version = ++d.version;
    d.index = index;
    // 回転中の角度を固定した後、発光位置を切り替える。
    const transform = getComputedStyle(d.el).transform;
    if (transform !== "none") {
      try {
        const m = new DOMMatrixReadOnly(transform);
        d.angle = Math.atan2(m.b, m.a) * 180 / Math.PI;
      } catch {}
    }
    d.el.style.transition = "none";
    d.el.style.transform = `rotate(${d.angle}deg)`;
    d.light.classList.add("off");
    d.pending = (async () => {
      await wait(100);
      if (version !== d.version) return;
      d.light.style.transform = `rotate(${index*8}deg)`;
      d.light.classList.remove("off");
      await wait(130);
      if (version !== d.version) return;
      d.angle = C.nearestAngle(d.angle, C.dialAngle(index));
      d.el.style.transition =
        `transform ${config.dialRotateMs}ms cubic-bezier(.25,.7,.15,1)`;
      d.el.style.transform = `rotate(${d.angle}deg)`;
      await wait(config.dialRotateMs);
      if (version === d.version) save();
    })();
    return d.pending;
  }
  let composing = false,
    compositionEnded = 0;

  function inputChanged() {
    $("search-status").textContent = "";
    if (composing) return;
    const n = C.normalizeKana($("query").value);
    if (n === null) return;
    let changed = false;
    [...n].slice(0, 2).forEach((c, i) => {
      if (C.KANA.includes(c) && dials[i].index !== C.KANA.indexOf(c)) {
        turnDial(dials[i], c);
        changed = true;
      }
    });
    if (changed) sound("input");
  }
  $("query").addEventListener("compositionstart", () => {
    composing = true;
  });
  $("query").addEventListener("compositionend", () => {
    composing = false;
    compositionEnded = performance.now();
    inputChanged();
  });
  $("query").addEventListener("input", inputChanged);
  $("query").addEventListener("keydown", e => {
    if (e.key === "Enter" && (e.isComposing || composing || e.keyCode === 229 || performance
        .now() - compositionEnded < 80)) e.preventDefault();
  });

  function canTypeSearch() {
    return state.screen === "search" && !state.busy && !activeEvent && !$("settings").open;
  }

  function focusSearch() {
    if (canTypeSearch()) $("query").focus({
      preventScroll: true
    });
  }
  document.addEventListener("pointerdown", e => {
    if (canTypeSearch() && !e.target.closest(
      "#settings-open,input,textarea,select,a,dialog")) {
      e.preventDefault();
      focusSearch();
    }
  });
  document.addEventListener("keydown", e => {
    if (!canTypeSearch() || e.ctrlKey || e.metaKey || e.altKey || e.target.closest(
        "input,textarea,select,[contenteditable=true]")) return;
    if (e.key === "Process" || e.keyCode === 229) {
      focusSearch();
      return;
    }
    if (e.key.length === 1 && !e.isComposing) {
      e.preventDefault();
      focusSearch();
      const input = $("query");
      input.setRangeText(e.key, input.selectionStart, input.selectionEnd, "end");
      inputChanged();
    }
  }, true);
  window.addEventListener("focus", focusSearch);
  $("query").addEventListener("blur", () => queueMicrotask(() => {
    if (document.activeElement === document.body) focusSearch();
  }));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) focusSearch();
  });
  $("settings").addEventListener("close", focusSearch);

  function renderHistory() {
    const h = $("history");
    h.replaceChildren();
    for (const key of state.history) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = key;
      b.onclick = () => search(key);
      h.append(b);
    }
  }

  function positionDisc(results) {
    const mobile = innerWidth <= 800;
    const offset = mobile ? -(innerWidth + 520) : -1920;
    $("disc").style.transform = `translateX(${results?offset:0}px)`;
    $("disc-rotation").style.transform = `rotate(${results?180:0}deg)`;
    $("disc").style.transitionDuration = $("disc-rotation").style.transitionDuration = config
      .transitionMs + "ms";
  }

  function brandPosition(results) {
    $("brand").style.left = innerWidth <= 800 ? "20px" : results ? "510px" : "30px";
  }
  async function transition(results) {
    const from = $(results ? "search-screen" : "results-screen"),
      to = $(results ? "results-screen" : "search-screen");
    from.inert = true;
    $("settings-open").disabled = true;
    $("brand").style.opacity = "0";
    $("settings-open").style.opacity = "0";
    await Promise.all([
      animate(from, [
        { opacity: 1 },
        { opacity: 0 }
      ], 180),
      animate($("brand"), [
        { opacity: 1 },
        { opacity: 0 }
      ], 160),
      animate($("settings-open"), [
        { opacity: 1 },
        { opacity: 0 }
      ], 180)
    ]);
    from.hidden = true;
    positionDisc(results);
    await wait(config.transitionMs * .72);
    stage.classList.toggle("results-view", results);
    brandPosition(results);
    to.hidden = false;
    $("brand").style.opacity = "1";
    $("settings-open").style.opacity = "1";
    await Promise.all([
      animate(to, [
        { opacity: 0 },
        { opacity: 1 }
      ], config.transitionMs * .28),
      animate($("brand"), [
        { opacity: 0 },
        { opacity: 1 }
      ], config.transitionMs * .28),
      animate($("settings-open"), [
        { opacity: 0 },
        { opacity: 1 }
      ], config.transitionMs * .28)
    ]);
    to.inert = false;
    $("settings-open").disabled = false;
    state.screen = results ? "results" : "search";
    state.busy = false;
    if (results) {
      $("entries").focus({
        preventScroll: true
      });
      updateScroll();
    } else {
      checkEvent();
      focusSearch();
    }
  }
  async function search(value) {
    if (state.busy || activeEvent || state.screen !== "search" || composing) return;
    const key = C.searchKey(value);
    if (!key) {
      $("search-status").textContent = "ERROR";
      return;
    }
    const rows = C.search(data.dictionary, key);
    if (!rows.length) {
      $("search-status").textContent = "NO DATA";
      return;
    }
    state.busy = true;
    $("search-form").inert = true;
    $("history").inert = true;
    state.query = key;
    $("query").value = key;
    $("search-status").textContent = "";
    sound("search");
    await Promise.all(dials.map((d, i) => turnDial(d, key[i])));
    state.history = [key, ...state.history.filter(x => x !== key)];
    save();
    renderHistory();
    renderResults(rows);
    await transition(true);
  }
  $("search-form").addEventListener("submit", e => {
    e.preventDefault();
    search($("query").value);
  });
  $("back").onclick = async () => {
    if (state.busy) return;
    cancelHold();
    state.busy = true;
    sound("back");
    $("query").value = "";
    $("search-status").textContent = "";
    $("search-form").inert = false;
    $("history").inert = false;
    await transition(false);
    save();
  };

  function makeDescription(d) {
    const p = document.createElement("p");
    p.className = "description";
    for (const part of C.hintParts(d.description, d.keywords)) {
      const span = document.createElement(part.hint ? "mark" : "span");
      span.textContent = part.text;
      p.append(span);
    }
    return p;
  }

  function renderResults(rows) {
    cancelHold();
    const entries = $("entries");
    entries.replaceChildren();
    for (const d of rows) {
      const article = document.createElement("article");
      article.className = "entry";
      article.dataset.id = d.id;
      const locked = Boolean(d.flag && !state.flags.has(d.flag));
      const h = document.createElement("h2");
      h.textContent = d.heading + (d.notation ? `【${d.notation}】` : "");
      if ([...h.textContent].length > 15) h.classList.add("long-heading");
      article.append(h);
      if (locked) {
        const cover = document.createElement("div");
        cover.className = "repair-cover";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "repair-button";
        button.innerHTML = "記憶<br>修復";
        cover.append(button);
        article.append(cover);
        bindHold(button, () => completeRepair(d));
      } else article.append(makeDescription(d));
      entries.append(article);
    }
    entries.scrollLeft = 0;
    $("result-scroll").value = 1000;
    requestAnimationFrame(updateScroll);
  }
  let hold = null;

  function cancelHold() {
    if (!hold) return;
    cancelAnimationFrame(hold.raf);
    hold.button.style.setProperty("--progress", 0);
    hold.button.classList.remove("holding");
    hold = null;
  }

  function bindHold(button, complete) {
    function start() {
      if (state.busy || hold || state.screen !== "results") return;
      hold = {
        button,
        start: performance.now(),
        raf: 0
      };
      button.classList.add("holding");

      function step(now) {
        if (!hold || hold.button !== button) return;
        const p = Math.min((now - hold.start) / config.repairHoldMs, 1);
        button.style.setProperty("--progress", p);
        if (p >= 1) {
          cancelHold();
          complete();
        } else hold.raf = requestAnimationFrame(step);
      }
      hold.raf = requestAnimationFrame(step);
    }
    button.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      e.preventDefault();
      button.focus({
        preventScroll: true
      });
      button.setPointerCapture(e.pointerId);
      start();
    });
    button.addEventListener("pointermove", e => {
      if (!hold || hold.button !== button) return;
      const r = button.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r
        .bottom) cancelHold();
    });
    ["pointerup", "pointercancel", "lostpointercapture", "blur"].forEach(name => button
      .addEventListener(name, cancelHold));
    button.addEventListener("contextmenu", e => e.preventDefault());
    button.addEventListener("keydown", e => {
      if ([" ", "Enter"].includes(e.key)) {
        e.preventDefault();
        if (!e.repeat) start();
      }
    });
    button.addEventListener("keyup", e => {
      if ([" ", "Enter"].includes(e.key)) {
        e.preventDefault();
        cancelHold();
      }
    });
  }
  window.addEventListener("blur", cancelHold);
  async function completeRepair(d) {
    if (state.flags.has(d.flag)) return;
    sound("repair");
    state.flags.add(d.flag);
    save();
    const animations = [];
    for (const el of $("entries").children) {
      const row = data.dictionary.find(x => x.id === el.dataset.id);
      const cover = el.querySelector(".repair-cover");
      if (row?.flag !== d.flag || !cover) continue;
      cover.querySelector("button").disabled = true;
      const description = makeDescription(row);
      el.append(description);
      animations.push(Promise.all([
        animate(description, [{
          filter: "blur(12px)",
          opacity: 0
        }, {
          filter: "blur(0px)",
          opacity: 1
        }], config.repairRevealMs),
        animate(cover, [{
          opacity: 1
        }, {
          opacity: 0
        }], config.repairRevealMs)
      ]).then(() => cover.remove()));
    }
    $("entries").focus({
      preventScroll: true
    });
    await Promise.all(animations);
  }
  const entries = $("entries"),
    scroll = $("result-scroll");

  function updateScroll() {
    const max = entries.scrollWidth - entries.clientWidth;
    // RTLのscrollLeftは右端が0、左方向が負。
    const distanceFromRight = Math.min(max, Math.max(0, -entries.scrollLeft));
    const canScroll = max > 1;
    entries.style.setProperty("--left-edge-opacity",
      canScroll && distanceFromRight < max - 1 ? "0.2" : "1");
    entries.style.setProperty("--right-edge-opacity",
      canScroll && distanceFromRight > 1 ? "0.2" : "1");
    scroll.disabled = max <= 0;
    scroll.value = max > 0 ? Math.round((1 - Math.abs(entries.scrollLeft) / max) * 1000) : 1000;
    scroll.style.setProperty("--thumb-width",
      `${Math.max(55,entries.clientWidth**2/Math.max(entries.scrollWidth,1))}px`);
  }
  entries.addEventListener("scroll", updateScroll);
  entries.addEventListener("wheel", e => {
    const unit = e.deltaMode === 1 ? 30 : e.deltaMode === 2 ? entries.clientWidth : 1;
    const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit;
    const description = e.target.closest(".description");
    if (description && description.scrollWidth > description.clientWidth) {
      const before = description.scrollLeft;
      description.scrollLeft -= delta;
      if (before !== description.scrollLeft) {
        e.preventDefault();
        return;
      }
    }
    if (entries.scrollWidth <= entries.clientWidth) return;
    e.preventDefault();
    cancelHold();
    entries.scrollLeft -= delta;
  }, {
    passive: false
  });
  entries.addEventListener("keydown", e => {
    if (e.target !== entries) return;
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      entries.scrollLeft += e.key === "ArrowLeft" ? -300 : 300;
    }
  });
  scroll.addEventListener("input", () => {
    cancelHold();
    entries.scrollLeft = -(1 - Number(scroll.value) / 1000) * (entries.scrollWidth - entries
      .clientWidth);
  });
  let activeEvent = null,
    scriptIndex = 0,
    scripts = [],
    eventClickReadyAt = 0;

  function checkEvent() {
    activeEvent = C.eligibleEvent(data.events, state.flags, state.played);
    if (!activeEvent) return;
    scriptIndex = 0;
    scripts = data.scripts.filter(s => s.eventId === activeEvent.id).sort((a, b) => a.order - b
      .order);
    $("search-form").inert = true;
    $("history").inert = true;
    showScript();
  }

  function showScript() {
    const s = scripts[scriptIndex];
    const el = $("event-text");
    eventClickReadyAt = performance.now() + config.eventClickDelayMs;
    el.hidden = false;
    el.textContent = s.text;
    el.focus({
      preventScroll: true
    });
  }

  function advanceEvent() {
    scriptIndex++;
    if (scriptIndex < scripts.length) {
      showScript();
      return;
    }
    state.played.add(activeEvent.id);
    activeEvent = null;
    save();
    $("event-text").hidden = true;
    $("search-form").inert = false;
    $("history").inert = false;
    focusSearch();
  }
  document.addEventListener("click", e => {
    if (
      !activeEvent ||
      performance.now() < eventClickReadyAt ||
      $("settings").open ||
      e.target.closest("#settings-open,#settings")
    ) {
      return;
    }

    advanceEvent();
  });

  function applySettings() {
    stage.classList.toggle("hints-on", state.hint);
    $("hint").checked = state.hint;
    $("volume").value = Math.round(state.volume * 100);
    $("volume-value").textContent = `${Math.round(state.volume*100)}%`;
    if (bgm) bgm.volume = state.volume;
  }
  $("settings-open").onclick = () => {
    cancelHold();
    applySettings();
    $("settings").showModal();
  };
  $("settings-close").onclick = () => $("settings").close();
  $("volume").addEventListener("input", () => {
    state.volume = Number($("volume").value) / 100;
    applySettings();
    save();
  });
  $("volume").addEventListener("change", () => sound("input"));
  $("hint").addEventListener("change", () => {
    state.hint = $("hint").checked;
    applySettings();
    save();
  });
  window.addEventListener("resize", () => {
    size();
    brandPosition(state.screen === "results");
    updateScroll();
  });
  size();
  applySettings();
  renderHistory();
  checkEvent();
  focusSearch();
})();
