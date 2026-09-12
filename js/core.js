(function(root) {
  "use strict";
  const KANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわん";
  const small = Object.fromEntries([..."ぁぃぅぇぉっゃゅょゎゕゖ"].map((c, i) => [c, [..."あいうえおつやゆよわかけ"][
  i]]));
  const vowels = ["あかさたなはまやらわ", "いきしちにひみり", "うくすつぬふむゆる", "えけせてねへめれ", "おこそとのほもよろを"];

  function normalizeKana(value) {
    const source = String(value).normalize("NFKC").replace(/[ァ-ヶ]/g, c => String.fromCharCode(c
      .charCodeAt(0) - 0x60)).normalize("NFD").replace(/[\u3099\u309a]/g, "");
    let out = "";
    for (let c of source) {
      c = small[c] || c;
      if (c === "ー") {
        const row = vowels.findIndex(v => v.includes(out.at(-1) || "!"));
        if (row < 0) return null;
        c = "あいうえお" [row];
      }
      if (!/^[ぁ-ゖ]$/.test(c) || (!KANA.includes(c) && c !== "を")) return null;
      out += c;
    }
    return out;
  }

  function searchKey(value) {
    const n = normalizeKana(value);
    return n && [...n].length === 2 && [...n].every(c => KANA.includes(c)) ? n : null;
  }

  function search(dictionary, query) {
    const key = searchKey(query);
    return key ? dictionary.filter(d => (normalizeKana(d.heading) || "").startsWith(key)) : [];
  }

  function eligibleEvent(events, flags, played) {
    return events.find(e => !played.has(e.id) && (e.type === "flag" ? flags.has(e.detail) : e
      .type === "flag_count" && flags.size >= Number(e.detail))) || null;
  }

  function keywordList(value) {
    return [...new Set((Array.isArray(value) ? value : String(value || "").split(/\r?\n/)).map(
      x => x.trim()).filter(Boolean))];
  }

  function hintParts(value, keywords) {
    const words = keywordList(keywords).sort((a, b) => b.length - a.length);
    const parts = [];
    let plain = "";
    for (let i = 0; i < value.length;) {
      const word = words.find(w => value.startsWith(w, i));
      if (word) {
        if (plain) parts.push({
          text: plain,
          hint: false
        });
        plain = "";
        parts.push({
          text: word,
          hint: true
        });
        i += word.length;
      } else plain += value[i++];
    }
    if (plain) parts.push({
      text: plain,
      hint: false
    });
    return parts;
  }

  function prepareDictionary(rows) {
    const order = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
    const ranked = rows.map((d, index) => {
      const key = normalizeKana(d.heading);
      if (!key || !searchKey(key.slice(0, 2))) throw Error(
        `Dictionary ${index+2}行目: 見出しを検索可能な文字で入力してください。`);
      return {
        d,
        index,
        key
      };
    });
    ranked.sort((a, b) => {
      for (let i = 0; i < Math.min(a.key.length, b.key.length); i++) {
        const diff = order.indexOf(a.key[i]) - order.indexOf(b.key[i]);
        if (diff) return diff;
      }
      return a.key.length - b.key.length || a.index - b.index;
    });
    return ranked.map(({
      d,
      key
    }, i) => ({
      ...d,
      id: key.slice(0, 2) + "-" + String(i + 1).padStart(3, "0"),
      keywords: keywordList(d.keywords)
    }));
  }

  function validateData(data) {
    const errors = [];
    if (!data || !["dictionary", "events", "scripts"].every(k => Array.isArray(data[k]))) return [
      "dictionary / events / scripts が必要です。"
    ];
    const unique = (items, label) => {
      const ids = new Set();
      for (const row of items) {
        if (!row.id || ids.has(row.id)) errors.push(
          `${label}: IDが空欄か重複しています (${row.id || "空欄"})`);
        ids.add(row.id);
      }
    };
    unique(data.dictionary, "Dictionary");
    unique(data.events, "Event");
    if (!data.dictionary.length) errors.push("Dictionary: 1件以上の項目が必要です。");
    for (const d of data.dictionary) {
      if (typeof d.heading !== "string" || !searchKey((normalizeKana(d.heading) || "").slice(0,
          2))) errors.push(`Dictionary ${d.id}: 見出しの先頭2文字は検索可能な文字にしてください。`);
      if (typeof d.description !== "string" || !d.description.trim()) errors.push(
        `Dictionary ${d.id}: 説明が空欄です。`);
      if (!Array.isArray(d.keywords) || d.keywords.some(k => typeof k !== "string" || !k || !
          String(d.description || "").includes(k))) errors.push(
        `Dictionary ${d.id}: キーワードは説明内にある文字列を指定してください。`);
      if (typeof d.flag !== "string" || typeof d.notation !== "string") errors.push(
        `Dictionary ${d.id}: 表記・既読フラグIDは文字列にしてください。`);
    }
    const flags = new Set(data.dictionary.map(d => d.flag).filter(Boolean));
    const eventIds = new Set(data.events.map(e => e.id));
    for (const e of data.events) {
      if (e.type === "flag" ? !flags.has(e.detail) : e.type === "flag_count" ? !/^\d+$/.test(
          String(e.detail)) : true) errors.push(`Event ${e.id}: 条件タイプまたは詳細条件が不正です。`);
      if (!data.scripts.some(s => s.eventId === e.id)) errors.push(`Event ${e.id}: スクリプトがありません。`);
    }
    const orders = new Set();
    for (const s of data.scripts) {
      const key = JSON.stringify([s.eventId, s.order]);
      if (!eventIds.has(s.eventId)) errors.push(`EventScript: 存在しないイベントID (${s.eventId})`);
      if (!Number.isInteger(s.order) || s.order < 1 || orders.has(key)) errors.push(
        `EventScript ${s.eventId}: 順番が不正または重複しています。`);
      if (typeof s.text !== "string" || !s.text.trim()) errors.push(
        `EventScript ${s.eventId}: テキストが空欄です。`);
      orders.add(key);
    }
    return errors;
  }
  const HEADERS = {
    Dictionary: ["見出し", "表記", "説明", "キーワード", "既読フラグID"],
    Event: ["イベントID", "条件タイプ", "詳細条件"],
    EventScript: ["イベントID", "順番", "テキスト"]
  };

  function fromRows(sheets) {
    const records = {};
    for (const [name, headers] of Object.entries(HEADERS)) {
      const rows = sheets[name] || [],
        header = (rows[0] || []).map(h => String(h).trim());
      for (const h of headers)
        if (!header.includes(h)) throw Error(`${name}: 「${h}」列がありません。`);
      const named = header.filter(Boolean);
      if (new Set(named).size !== named.length) throw Error(`${name}: 列名が重複しています。`);
      records[name] = rows.slice(1).filter(row => row.some(v => String(v).trim())).map(row =>
        Object.fromEntries(header.map((h, j) => [h, String(row[j] ?? "")])));
    }
    const data = {
      dictionary: prepareDictionary(records.Dictionary.map(r => ({
        heading: r["見出し"].trim(),
        notation: r["表記"].trim(),
        description: r["説明"],
        keywords: keywordList(r["キーワード"]),
        flag: r["既読フラグID"].trim()
      }))),
      events: records.Event.map(r => ({
        id: r["イベントID"].trim(),
        type: ({
          "Flag": "flag",
          "Flag-Count": "flag_count"
        })[r["条件タイプ"].trim()] || r["条件タイプ"].trim(),
        detail: r["詳細条件"].trim()
      })),
      scripts: records.EventScript.map(r => ({
        eventId: r["イベントID"].trim(),
        order: Number(r["順番"]),
        text: r["テキスト"]
      }))
    };
    const errors = validateData(data);
    if (errors.length) throw Error(errors.join("\n"));
    return data;
  }

  function dialAngle(index) {
    return -index * 8;
  }

  function nearestAngle(current, target) {
    return current + (((target - current) % 360 + 540) % 360 - 180);
  }
  const api = {
    KANA,
    normalizeKana,
    searchKey,
    search,
    eligibleEvent,
    hintParts,
    keywordList,
    prepareDictionary,
    fromRows,
    validateData,
    dialAngle,
    nearestAngle
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DictionaryCore = api;
})(typeof window !== "undefined" ? window : globalThis);
