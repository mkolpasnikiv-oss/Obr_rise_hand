import OBR from "https://esm.sh/@owlbear-rodeo/sdk@3.1.0";

const POPOVER_ID = "com.openai.hand-raise/room-overlay";

OBR.onReady(async () => {
  try {
    await OBR.popover.open({
      id: POPOVER_ID,
      url: "https://mkolpasnikiv-oss.github.io/Obr_rise_hand/overlay.html",
      width: 310,
      height: 180,
      anchorOrigin: { horizontal: "RIGHT", vertical: "BOTTOM" },
      transformOrigin: { horizontal: "RIGHT", vertical: "BOTTOM" },
      disableClickAway: true,
      hidePaper: true,
      marginThreshold: 0
    });
  } catch (error) {
    console.error("Hand Raise: не удалось открыть общий индикатор заявок", error);
  }
});
