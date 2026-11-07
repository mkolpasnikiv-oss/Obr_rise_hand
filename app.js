import OBR from "https://esm.sh/@owlbear-rodeo/sdk@3.1.0";

const CHANNEL = "com.openai.hand-raise/v1";
const $ = (id) => document.getElementById(id);
const state = { role: null, playerId: null, playerName: "Игрок", raised: false, pending: false, requests: new Map(), unsubscribe: null };

function show(id) { $(id).classList.remove("hidden"); }
function hide(id) { $(id).classList.add("hidden"); }
function setConnection(online) { $("connection").classList.toggle("online", online); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function timeLabel(timestamp) {
  try { return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp)); }
  catch { return "только что"; }
}

async function send(type) {
  await OBR.broadcast.sendMessage(CHANNEL, {
    protocol: 1,
    type,
    playerId: state.playerId,
    playerName: state.playerName,
    sentAt: Date.now()
  });
}

function updatePlayerView() {
  const button = $("hand-button");
  button.disabled = state.pending;
  button.classList.toggle("active", state.raised);
  button.textContent = state.pending ? "Отправка…" : state.raised ? "✋ Опустить руку" : "✋ Поднять руку";
  $("hand-icon").textContent = state.raised ? "🙋" : "✋";
  $("player-title").textContent = state.raised ? "Вы подняли руку" : "Вы пока не подняли руку";
  $("player-description").textContent = state.raised
    ? "Мастер получил вашу заявку. Пожалуйста, подождите ответа."
    : "Если у вас вопрос или нужна помощь мастера, нажмите кнопку ниже.";
  $("player-status").textContent = state.raised ? "Заявка отправлена мастеру." : "Вы не отправляли заявку.";
}

function renderRequests() {
  const requests = [...state.requests.values()].sort((a, b) => a.sentAt - b.sentAt);
  $("request-count").textContent = String(requests.length);
  $("empty-state").classList.toggle("hidden", requests.length > 0);
  $("clear-all").classList.toggle("hidden", requests.length === 0);
  $("request-list").innerHTML = requests.map((request) => `
    <article class="request-card">
      <div class="request-avatar">✋</div>
      <div class="request-info">
        <div class="request-name">${escapeHtml(request.playerName || "Игрок")}</div>
        <div class="request-time">Поднял руку · ${timeLabel(request.sentAt)}</div>
      </div>
      <button class="close-button" type="button" data-close="${escapeHtml(request.playerId)}">Готово</button>
    </article>
  `).join("");
  $("request-list").querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => closeRequest(button.dataset.close));
  });
}

async function closeRequest(playerId) {
  state.requests.delete(playerId);
  renderRequests();
  await OBR.broadcast.sendMessage(CHANNEL, { protocol: 1, type: "resolved", playerId, sentAt: Date.now() });
}

async function init() {
  try {
    if (!OBR.isAvailable) throw new Error("Это расширение нужно открыть из интерфейса комнаты Owlbear Rodeo.");
    await new Promise((resolve) => OBR.onReady(resolve));
    state.role = await OBR.player.getRole();
    state.playerId = await OBR.player.getId();
    state.playerName = (await OBR.player.getName()) || "Игрок";
    setConnection(true);
    hide("loading");

    state.unsubscribe = OBR.broadcast.onMessage(CHANNEL, (event) => {
      const message = event?.data;
      if (!message || message.protocol !== 1 || typeof message.type !== "string") return;
      if (message.type === "raised" && state.role === "GM" && typeof message.playerId === "string") {
        state.requests.set(message.playerId, {
          playerId: message.playerId,
          playerName: String(message.playerName || "Игрок").slice(0, 80),
          sentAt: Number(message.sentAt) || Date.now()
        });
        renderRequests();
      }
      if (message.type === "lowered" && state.role === "GM" && typeof message.playerId === "string") {
        state.requests.delete(message.playerId);
        renderRequests();
      }
      if (message.type === "resolved" && message.playerId === state.playerId && state.role === "PLAYER") {
        state.raised = false;
        updatePlayerView();
      }
    });

    if (state.role === "GM") {
      $("role-label").textContent = "Режим мастера";
      show("gm-view");
      renderRequests();
    } else {
      $("role-label").textContent = `Игрок: ${state.playerName}`;
      show("player-view");
      updatePlayerView();
      $("hand-button").addEventListener("click", async () => {
        if (state.pending) return;
        state.pending = true;
        updatePlayerView();
        try {
          if (state.raised) {
            await send("lowered");
            state.raised = false;
          } else {
            await send("raised");
            state.raised = true;
          }
        } catch (error) {
          $("player-status").textContent = "Не удалось отправить заявку. Попробуйте ещё раз.";
          console.error(error);
        } finally {
          state.pending = false;
          updatePlayerView();
        }
      });
    }
    $("clear-all").addEventListener("click", async () => {
      const ids = [...state.requests.keys()];
      state.requests.clear();
      renderRequests();
      for (const playerId of ids) {
        await OBR.broadcast.sendMessage(CHANNEL, { protocol: 1, type: "resolved", playerId, sentAt: Date.now() });
      }
    });
  } catch (error) {
    console.error(error);
    hide("loading");
    show("error-view");
    $("error-message").textContent = error?.message || "Проверьте подключение к Owlbear Rodeo и обновите расширение.";
    setConnection(false);
  }
}

window.addEventListener("beforeunload", () => state.unsubscribe?.());
init();
