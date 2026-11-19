/* Magnus improvement centre: proposals only; never executes code. */
(() => {
  "use strict";
  const style = document.createElement("style");
  style.textContent = `
    #magnus-improve-launch{position:fixed;right:16px;bottom:16px;z-index:180;background:#102b36;color:#8be9ff;border:1px solid #35c7e8;padding:10px 14px;border-radius:24px;font:600 12px system-ui;box-shadow:0 4px 24px #0009}
    #magnus-improve-panel{display:none;position:fixed;inset:5% 4%;z-index:190;background:#07121bf5;color:#e9f7ff;border:1px solid #35c7e877;border-radius:16px;padding:18px;overflow:auto;font:14px system-ui;box-shadow:0 12px 50px #000c}
    #magnus-improve-panel.open{display:block}
    #magnus-improve-panel h2{font-size:19px;margin:0 0 8px;color:#8be9ff}
    #magnus-improve-panel p{color:#a9c5d0;line-height:1.45;margin:6px 0 12px}
    #magnus-improve-panel input,#magnus-improve-panel textarea,#magnus-improve-panel select{display:block;width:100%;margin:7px 0;padding:10px;background:#0c202c;color:#fff;border:1px solid #315365;border-radius:8px}
    #magnus-improve-panel textarea{min-height:75px}
    #magnus-improve-panel button{margin:5px 5px 5px 0;padding:8px 12px;border-radius:8px;border:1px solid #39788d;background:#103342;color:#e8faff}
    #magnus-improve-list article{border:1px solid #294653;border-radius:10px;padding:10px;margin:9px 0}
    #magnus-improve-list small{color:#9cb5c0}
  `;
  document.head.appendChild(style);
  const launch = document.createElement("button");
  launch.id = "magnus-improve-launch";
  launch.textContent = "✦ Improvement Centre";
  const panel = document.createElement("section");
  panel.id = "magnus-improve-panel";
  panel.innerHTML = `
    <button id="magnus-improve-close" style="float:right">Close</button>
    <h2>Self-Improvement Centre</h2>
    <p>Magnus can record ideas and proposed code changes here. Approval means “approved for review” only. It does not run code, edit files, merge, or deploy anything.</p>
    <form id="magnus-improve-form">
      <input name="title" maxlength="120" placeholder="Improvement title" required>
      <textarea name="description" maxlength="4000" placeholder="What should be improved?" required></textarea>
      <textarea name="proposed_changes" maxlength="12000" placeholder="Suggested changes (optional)"></textarea>
      <select name="risk"><option value="low">Low risk</option><option value="medium" selected>Medium risk</option><option value="high">High risk</option></select>
      <button type="submit">Save proposal</button>
    </form>
    <div id="magnus-improve-status" role="status"></div>
    <h3>Improvement proposals</h3>
    <div id="magnus-improve-list">Loading…</div>`;
  document.body.append(launch, panel);
  const status = panel.querySelector("#magnus-improve-status");
  const list = panel.querySelector("#magnus-improve-list");
  const api = "/api/magnus/improvements";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function load() {
    list.textContent = "Loading proposals…";
    try {
      const r = await fetch(api, {credentials:"same-origin"});
      if (!r.ok) throw new Error("Could not load proposals (HTTP " + r.status + ")");
      const data = await r.json();
      list.innerHTML = "";
      if (!data.proposals.length) { list.textContent = "No proposals yet."; return; }
      data.proposals.forEach(p => {
        const article = document.createElement("article");
        article.innerHTML = `<strong>${esc(p.title)}</strong><br><small>${esc(p.status)} · ${esc(p.risk)} risk</small><p>${esc(p.description)}</p><p>${esc(p.proposed_changes)}</p><small>${esc(p.created_at)}</small>`;
        if (p.status === "pending") {
          for (const decision of ["approve","reject"]) {
            const b = document.createElement("button");
            b.textContent = decision === "approve" ? "Approve for review" : "Reject";
            b.onclick = async () => {
              const note = window.prompt("Optional note for this decision:") || "";
              const result = await fetch(api + "/" + encodeURIComponent(p.id) + "/decision", {
                method:"POST", credentials:"same-origin",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({decision,note})
              });
              status.textContent = result.ok ? "Decision saved." : "Could not save decision.";
              await load();
            };
            article.appendChild(b);
          }
        }
        list.appendChild(article);
      });
    } catch (e) { list.textContent = e.message; }
  }
  launch.onclick = () => { panel.classList.add("open"); load(); };
  panel.querySelector("#magnus-improve-close").onclick = () => panel.classList.remove("open");
  panel.querySelector("#magnus-improve-form").onsubmit = async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    status.textContent = "Saving…";
    try {
      const r = await fetch(api, {method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if (!r.ok) throw new Error("Save failed (HTTP " + r.status + ")");
      event.currentTarget.reset();
      status.textContent = "Proposal saved for review.";
      await load();
    } catch (e) { status.textContent = e.message; }
  };
})();