import OBR from "https://esm.sh/@owlbear-rodeo/sdk@3.1.0";

const CHANNEL = "com.openai.hand-raise/v1";
const requests = new Map();
const $ = (id) => document.getElementById(id);

function safeText(value) {
  return String(value ?? "Игрок").slice(0, 80);
}

function render() {
  const items = [...requests.values()].sort((a, b) => a.sentAt - b.sentAt);
  $("count").textContent = String(items.length);
  $("requests").innerHTML = items.map((item) => `
    <div class="request-row">
      <span class="hand">✋</span>
      <span class="name"></span>
      <span class="time"></span>
    </div>
  `).join("");

  [...$("requests").children].forEach((row, index) => {
    const item = items[index];
    row.querySelector(".name").textContent = item.playerName;
    row.querySelector(".time").textContent = new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit", minute: "2-digit"
    }).format(new Date(item.sentAt));
  });

  $("widget").classList.toggle("hidden", items.length === 0);
}

OBR.onReady(() => {
  OBR.broadcast.onMessage(CHANNEL, (event) => {
    const message = event?.data;
    if (!message || message.protocol !== 1 || typeof message.playerId !== "string") return;

    if (message.type === "raised") {
      requests.set(message.playerId, {
        playerId: message.playerId,
        playerName: safeText(message.playerName),
        sentAt: Number(message.sentAt) || Date.now()
      });
      render();
    } else if (message.type === "lowered" || message.type === "resolved") {
      requests.delete(message.playerId);
      render();
    }
  });
});
