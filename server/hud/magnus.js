(() => {
  "use strict";

  const KEY = "mommy_little_helper_magnus_brain_v1";
  const defaults = {
    name: "MAGNUS",
    version: 1.0,
    voice: { enabled: true, pitch: 0.9, rate: 1.05 },
    rules: [
      "Be loyal, clever, direct, and helpful.",
      "Adapt tone to the user's mood."
    ],
    customCommands: {
      "hey magnus": "At your service. What are we building or solving today?",
      "who are you": "I am Magnus, the personal assistant inside Mommy's Little Helper.",
      "status": "All core systems nominal. MAGNUS configuration is loaded."
    }
  };

  let brain = load();
  let recognition = null;

  function load() {
    try {
      return merge(defaults, JSON.parse(localStorage.getItem(KEY) || "{}"));
    } catch (_) {
      return structuredClone(defaults);
    }
  }

  function merge(base, patch) {
    const out = structuredClone(base);
    if (!patch || typeof patch !== "object") return out;
    if (typeof patch.name === "string") out.name = patch.name;
    if (typeof patch.version === "number") out.version = patch.version;
    if (Array.isArray(patch.rules)) out.rules = patch.rules.filter(x => typeof x === "string");
    if (patch.customCommands && typeof patch.customCommands === "object") out.customCommands = patch.customCommands;
    if (patch.voice && typeof patch.voice === "object") out.voice = {...out.voice, ...patch.voice};
    return out;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(brain));
    updateStatus();
  }

  function bump() {
    brain.version = Number((Number(brain.version || 1) + 0.1).toFixed(1));
    save();
  }

  function speak(text) {
    if (!brain.voice.enabled || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = Number(brain.voice.pitch || 0.9);
    u.rate = Number(brain.voice.rate || 1.05);
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v => /Daniel|David|George|Male/i.test(v.name));
    if (preferred) u.voice = preferred;
    speechSynthesis.speak(u);
  }

  function localProcess(raw) {
    const text = raw.trim();
    const lower = text.toLowerCase();

    if (lower.startsWith("add command ") && text.includes("=")) {
      const body = text.slice(12);
      const [trigger, ...rest] = body.split("=");
      const key = trigger.trim().toLowerCase();
      const response = rest.join("=").trim();
      if (!key || !response) return "I need both a command trigger and a response.";
      brain.customCommands[key] = response;
      bump();
      return `Configuration upgraded to v${brain.version}. Saved command "${key}".`;
    }

    if (lower.startsWith("add rule ")) {
      const rule = text.slice(9).trim();
      if (!rule) return "I need a rule to save.";
      brain.rules.push(rule);
      bump();
      return `Self-evolution saved at v${brain.version}. Added rule: "${rule}"`;
    }

    if (lower.startsWith("remove rule ")) {
      const target = text.slice(12).trim().toLowerCase();
      const before = brain.rules.length;
      brain.rules = brain.rules.filter(r => r.toLowerCase() !== target);
      if (before === brain.rules.length) return "I couldn't find that rule.";
      bump();
      return `Rule removed. Configuration is now v${brain.version}.`;
    }

    if (lower.includes("upgrade your voice") || lower.includes("deeper voice")) {
      brain.voice.pitch = Math.max(0.6, Number((Number(brain.voice.pitch || 0.9) - 0.1).toFixed(2)));
      bump();
      return `Voice configuration upgraded. Pitch is now ${brain.voice.pitch}.`;
    }

    for (const [trigger, response] of Object.entries(brain.customCommands)) {
      if (trigger && lower.includes(String(trigger).toLowerCase())) return String(response);
    }

    if (lower === "magnus status" || lower === "status magnus") {
      return `All core systems nominal. MAGNUS v${brain.version} has ${brain.rules.length} rules and ${Object.keys(brain.customCommands).length} custom commands.`;
    }

    return null;
  }

  async function ask(text) {
    // Server-side MAGNUS rules/memory are authoritative. Browser localStorage
    // remains a fallback so the HUD still has useful behavior when offline.
    try {
      const control = await fetch("/api/magnus/process", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        credentials: "same-origin",
        body: JSON.stringify({input: text})
      });
      const controlData = await control.json();
      if (control.ok && controlData.handled && controlData.text) return controlData.text;
    } catch (_) {}

    const local = localProcess(text);
    if (local) return local;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        credentials: "same-origin",
        body: JSON.stringify({
          input: text,
          conversation: "magnus"
        })
      });
      const data = await response.json();
      if (response.ok && data.text) return data.text;
      if (data.error) return "MAGNUS could not reach the AI session: " + data.error;
    } catch (err) {
      return "MAGNUS is offline from the AI session. Local rules and memory are still available.";
    }
    return "I don't have a response for that yet.";
  }

  function updateStatus() {
    const version = document.getElementById("magnus-version");
    const ruleCount = document.getElementById("magnus-rule-count");
    if (version) version.textContent = "v" + brain.version;
    if (ruleCount) ruleCount.textContent = brain.rules.length + " rules";
    const editor = document.getElementById("magnus-config");
    if (editor) editor.value = JSON.stringify(brain, null, 2);
  }

  function addMessage(text, who) {
    const log = document.getElementById("magnus-log");
    if (!log) return;
    const item = document.createElement("div");
    item.className = "magnus-msg " + who;
    item.textContent = text;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  }

  function render() {
    if (document.getElementById("magnus-launcher")) return;

    const style = document.createElement("style");
    style.textContent = `
      #magnus-launcher{position:fixed;right:20px;bottom:20px;z-index:90;width:58px;height:58px;border-radius:50%;border:1px solid #38bdf8;background:radial-gradient(circle,#38bdf8 0,#0284c7 35%,#07111d 72%);box-shadow:0 0 22px #0284c766;color:#fff;font-size:23px;cursor:pointer}
      #magnus-panel{position:fixed;right:20px;bottom:90px;z-index:89;width:min(620px,calc(100vw - 32px));height:min(720px,calc(100vh - 120px));display:none;flex-direction:column;background:rgba(5,11,20,.97);border:1px solid #38bdf866;border-radius:18px;box-shadow:0 18px 70px #000b,0 0 30px #38bdf822;backdrop-filter:blur(18px);overflow:hidden;color:#e2e8f0;font-family:system-ui,sans-serif}
      #magnus-panel.open{display:flex}
      .magnus-head{padding:14px 16px;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center}
      .magnus-brand{display:flex;align-items:center;gap:10px}.magnus-orb{width:14px;height:14px;border-radius:50%;background:#38bdf8;box-shadow:0 0 16px #38bdf8}.magnus-brand strong{color:#38bdf8;letter-spacing:2px}.magnus-meta{font-size:11px;color:#64748b}
      .magnus-close{background:transparent;border:0;color:#94a3b8;font-size:20px;cursor:pointer}
      .magnus-tabs{display:flex;border-bottom:1px solid #1e293b;background:#09101b}.magnus-tab{flex:1;padding:10px;border:0;background:transparent;color:#64748b;cursor:pointer}.magnus-tab.active{color:#38bdf8;border-bottom:2px solid #38bdf8}
      .magnus-view{display:none;flex:1;min-height:0}.magnus-view.active{display:flex;flex-direction:column}
      #magnus-log{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:10px}.magnus-msg{max-width:85%;padding:10px 13px;border-radius:12px;line-height:1.4;font-size:14px}.magnus-msg.magnus{align-self:flex-start;background:#111c2b;border-left:3px solid #38bdf8}.magnus-msg.user{align-self:flex-end;background:#075985;color:#fff}
      .magnus-input{display:flex;gap:8px;padding:12px;border-top:1px solid #1e293b}.magnus-input input{flex:1;min-width:0;background:#0f172a;border:1px solid #334155;border-radius:9px;padding:10px;color:#fff;outline:none}.magnus-btn{background:#0f2435;border:1px solid #38bdf866;color:#dbeafe;border-radius:9px;padding:9px 12px;cursor:pointer}.magnus-btn.primary{background:#075985;border-color:#38bdf8}
      #magnus-config{width:100%;height:100%;resize:none;background:#05080f;color:#7dd3fc;border:0;outline:0;padding:15px;font:12px/1.5 monospace}
      .magnus-config-actions{padding:10px;border-top:1px solid #1e293b;display:flex;justify-content:space-between;gap:8px}.magnus-help{padding:12px 15px;border-bottom:1px solid #1e293b;font-size:12px;color:#94a3b8;line-height:1.5}
      @media(max-width:600px){#magnus-panel{right:8px;bottom:76px;width:calc(100vw - 16px);height:calc(100vh - 96px)}#magnus-launcher{right:14px;bottom:14px}}
    `;
    document.head.appendChild(style);

    document.body.insertAdjacentHTML("beforeend", `
      <button id="magnus-launcher" title="Open MAGNUS">✦</button>
      <section id="magnus-panel" aria-label="MAGNUS">
        <header class="magnus-head">
          <div class="magnus-brand"><span class="magnus-orb"></span><div><strong>MAGNUS</strong><div class="magnus-meta"><span id="magnus-version">v1.0</span> · <span id="magnus-rule-count">2 rules</span></div></div></div>
          <button class="magnus-close" id="magnus-close">×</button>
        </header>
        <nav class="magnus-tabs">
          <button class="magnus-tab active" data-view="chat">💬 Chat & Voice</button>
          <button class="magnus-tab" data-view="config">🧬 Self-Evolution</button>
        </nav>
        <div id="magnus-chat" class="magnus-view active">
          <div id="magnus-log"><div class="magnus-msg magnus">Systems online. I am Magnus. Type a message, speak to me, or use “add command” / “add rule” to change my saved configuration.</div></div>
          <div class="magnus-input">
            <input id="magnus-input" placeholder="Message MAGNUS..." autocomplete="off">
            <button class="magnus-btn" id="magnus-mic" title="Speak">🎙️</button>
            <button class="magnus-btn" id="magnus-voice" title="Toggle voice">🔊</button>
            <button class="magnus-btn primary" id="magnus-send">Send</button>
          </div>
        </div>
        <div id="magnus-config-view" class="magnus-view">
          <div class="magnus-help">Saved locally in this browser. Edit configuration, then apply. This changes MAGNUS rules/commands/configuration—not the application's source code.</div>
          <textarea id="magnus-config" spellcheck="false"></textarea>
          <div class="magnus-config-actions"><button class="magnus-btn" id="magnus-reset">Reset</button><button class="magnus-btn primary" id="magnus-apply">Apply Configuration</button></div>
        </div>
      </section>
    `);

    const panel = document.getElementById("magnus-panel");
    document.getElementById("magnus-launcher").onclick = () => panel.classList.toggle("open");
    document.getElementById("magnus-close").onclick = () => panel.classList.remove("open");

    document.querySelectorAll(".magnus-tab").forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll(".magnus-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".magnus-view").forEach(v => v.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(tab.dataset.view === "chat" ? "magnus-chat" : "magnus-config-view").classList.add("active");
        updateStatus();
      };
    });

    async function send() {
      const input = document.getElementById("magnus-input");
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      addMessage(text, "user");
      const reply = await ask(text);
      addMessage(reply, "magnus");
      speak(reply);
    }

    document.getElementById("magnus-send").onclick = send;
    document.getElementById("magnus-input").addEventListener("keydown", e => {
      if (e.key === "Enter") send();
    });

    document.getElementById("magnus-voice").onclick = () => {
      brain.voice.enabled = !brain.voice.enabled;
      save();
      document.getElementById("magnus-voice").textContent = brain.voice.enabled ? "🔊" : "🔇";
    };

    document.getElementById("magnus-mic").onclick = () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        addMessage("Browser speech recognition is not available here. Use the existing Mommy's Little Helper voice/STT pipeline instead.", "magnus");
        return;
      }
      if (recognition) { recognition.stop(); return; }
      recognition = new SR();
      recognition.lang = (window.I18n && window.I18n.lang) || "en-US";
      recognition.interimResults = false;
      recognition.onstart = () => addMessage("Listening…", "magnus");
      recognition.onresult = e => {
        document.getElementById("magnus-input").value = e.results[0][0].transcript;
        send();
      };
      recognition.onerror = e => addMessage("Microphone error: " + e.error, "magnus");
      recognition.onend = () => { recognition = null; };
      recognition.start();
    };

    document.getElementById("magnus-apply").onclick = async () => {
      try {
        const parsed = JSON.parse(document.getElementById("magnus-config").value);
        brain = merge(defaults, parsed);
        save();
        try {
          const r = await fetch("/api/magnus/config", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            credentials: "same-origin",
            body: JSON.stringify(parsed)
          });
          if (!r.ok) throw new Error((await r.text()).slice(0, 200));
          brain = merge(defaults, await r.json());
          save();
          addMessage("MAGNUS server configuration applied and saved.", "magnus");
        } catch (_) {
          addMessage("Saved locally. Server memory was unavailable, so the browser copy remains active.", "magnus");
        }
      } catch (e) {
        addMessage("Configuration was not applied: invalid JSON.", "magnus");
      }
    };

    document.getElementById("magnus-reset").onclick = () => {
      brain = structuredClone(defaults);
      save();
      addMessage("MAGNUS configuration reset to defaults.", "magnus");
    };

    updateStatus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  window.Magnus = {
    getBrain: () => structuredClone(brain),
    speak,
    ask
  };
})();
