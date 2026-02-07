const DEFAULT_MESSAGES = {
  yes: [
    "You just made my day.",
    "Best answer ever.",
    "Okay, cue the happy dance!",
  ],
  no: [
    "Oops! too slow.",
    "🥺 u sure?",
    "you almost got it!",
    "There IS another option you know.",
    "That button is way too shy."
  ],
};

const DEFAULT_PLAYFUL_ITEMS = [
  { type: "image", src: "assets/Heated Rivalry GIF.gif", alt: "Dancing men" },
  { type: "image", src: "assets/Hello GIF by Spotify.gif", alt: "Dancing men" },
  {
    type: "image",
    src: "assets/Min Yoongi Singing GIF.gif",
    alt: "Dancing men",
  },
  { type: "video", src: "assets/935b2fe7-1327-4ce9-bbd7-7621eff89865.mov" },
  { type: "video", src: "assets/d57900a2-4d2b-4309-bb49-64376d8ff3ea.mov" },
];

const DODGE_PADDING = 12;
const DODGE_AVOID = 10;
const AVOID_PADDING = 16;
const NO_CLICK_SHIELD_MS = 500;

function createValentineController(
  root,
  { messages, playfulItems = DEFAULT_PLAYFUL_ITEMS } = {}
) {
  const response = root.querySelector("[data-role='response']");
  const buttons = root.querySelectorAll("[data-action]");
  const fxLayer = root.querySelector(".fx-layer");
  const actions = root.querySelector(".actions");
  const card = root.querySelector(".card");
  const copy = { ...DEFAULT_MESSAGES, ...messages };
  let activePlayful = null;
  let hoverCooldown = false;
  let lastNoTriggerAt = 0;
  let lastNoMessage = null;
  let prevNoMessage = null;
  let lastPlayfulIndex = null;
  let prevPlayfulIndex = null;

  if (!response || buttons.length === 0 || !fxLayer || !actions || !card) {
    return null;
  }

  function handleAction(event) {
    const action = event.currentTarget.dataset.action;
    if (action === "yes" && Date.now() - lastNoTriggerAt < NO_CLICK_SHIELD_MS) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    response.textContent = pickMessage(copy[action]) ?? "";
    response.dataset.state = action;
    if (action === "yes") {
      spawnConfetti(fxLayer);
    }
    if (action === "no") {
      triggerPlayful(event.currentTarget, { force: true });
      response.textContent = pickMessage(copy.no) ?? "";
    }
  }

  function handleHover(event) {
    triggerPlayful(event.currentTarget);
  }

  buttons.forEach((button) => {
    button.addEventListener("click", handleAction);
    if (button.dataset.action === "no") {
      button.addEventListener("mouseenter", handleHover);
      button.addEventListener("pointerenter", handleHover);
      button.addEventListener("mouseover", handleHover);
      button.addEventListener("touchstart", handleHover, { passive: true });
      button.addEventListener("pointerdown", handleHover);
      button.addEventListener("click", swallowNoClick);
      button.addEventListener("focus", handleHover);
    }
  });

  return {
    setMessage(action, text) {
      copy[action] = text;
    },
    setPlayfulItems(items) {
      playfulItems = Array.isArray(items) ? items : playfulItems;
    },
    destroy() {
      buttons.forEach((button) => {
        button.removeEventListener("click", handleAction);
        button.removeEventListener("mouseenter", handleHover);
        button.removeEventListener("pointerenter", handleHover);
        button.removeEventListener("mouseover", handleHover);
        button.removeEventListener("touchstart", handleHover);
        button.removeEventListener("pointerdown", handleHover);
        button.removeEventListener("click", swallowNoClick);
        button.removeEventListener("focus", handleHover);
      });
      if (activePlayful) {
        activePlayful.remove();
        activePlayful = null;
      }
    },
  };

  function triggerPlayful(targetButton, { force = false } = {}) {
    if (!playfulItems || playfulItems.length === 0) return;
    if (!force && hoverCooldown) return;
    hoverCooldown = true;
    lastNoTriggerAt = Date.now();
    response.textContent = pickMessage(copy.no) ?? "";
    const choiceIndex = pickIndex(playfulItems.length, lastPlayfulIndex, prevPlayfulIndex);
    prevPlayfulIndex = lastPlayfulIndex;
    lastPlayfulIndex = choiceIndex;
    const choice = playfulItems[choiceIndex];
    activePlayful = spawnPlayfulItem(
      choice,
      targetButton,
      fxLayer,
      activePlayful
    );
    const yesButton = root.querySelector("[data-action='yes']");
    dodgeButton(targetButton, card, yesButton);
    targetButton.classList.remove("wiggle");
    // restart animation
    void targetButton.offsetWidth;
    targetButton.classList.add("wiggle");
    window.setTimeout(() => {
      hoverCooldown = false;
    }, 700);
  }

  function swallowNoClick(event) {
    if (event.currentTarget.dataset.action !== "no") return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    lastNoTriggerAt = Date.now();
    triggerPlayful(event.currentTarget, { force: true });
  }

  function pickMessage(value) {
    if (!value) return "";
    if (Array.isArray(value)) {
      const next = value[pickIndex(value.length, lastNoMessage, prevNoMessage)];
      prevNoMessage = lastNoMessage;
      lastNoMessage = value.indexOf(next);
      return next;
    }
    return value;
  }

  function pickIndex(length, lastIndex, prevIndex) {
    if (length <= 1) return 0;
    if (length === 2) {
      return lastIndex === 0 ? 1 : 0;
    }
    let next = Math.floor(Math.random() * length);
    let guard = 0;
    while ((next === lastIndex || next === prevIndex) && guard < 10) {
      next = Math.floor(Math.random() * length);
      guard += 1;
    }
    return next;
  }
}

const root = document.querySelector("[data-component='valentine']");
if (root) {
  createValentineController(root);
}

window.Valentine = { createValentineController };

function spawnPlayfulItem(item, anchor, layer) {
  if (layer.querySelector(".playful-item")) {
    layer.querySelector(".playful-item").remove();
  }
  const rect = anchor.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  const node = document.createElement("div");
  node.className = "playful-item";
  const randomOffsetX = (Math.random() - 0.5) * 120;
  node.style.left = `${rect.left - layerRect.left + rect.width / 2 + randomOffsetX}px`;
  node.style.top = `${rect.top - layerRect.top - 10}px`;

  if (item.type === "image" && item.src) {
    const img = document.createElement("img");
    img.src = encodeURI(item.src);
    img.alt = item.alt || "Playful animation";
    node.appendChild(img);
  } else if (item.type === "video" && item.src) {
    const video = document.createElement("video");
    video.src = encodeURI(item.src);
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    node.appendChild(video);
  } else {
    node.classList.add("playful-item--text");
    node.textContent = item.label || "Playful moment";
  }

  layer.appendChild(node);
  window.setTimeout(() => {
    node.remove();
  }, 12000);
  return node;
}

function spawnConfetti(layer) {
  const colors = ["#ff4d6d", "#ff9ecd", "#ff6fa1", "#ff7c63", "#f7b4c8"];
  const amount = 160;

  for (let i = 0; i < amount; i += 1) {
    const piece = document.createElement("span");
    const isHeart = i % 3 === 0;
    piece.className = `confetti${isHeart ? " heart" : ""}`;
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 360}px`);
    piece.style.setProperty("--spin", `${Math.random() * 360}deg`);
    layer.appendChild(piece);
    window.setTimeout(() => piece.remove(), 2600);
  }
}

function dodgeButton(button, container, avoidButton) {
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const rawScale = getComputedStyle(button).getPropertyValue("--no-scale");
  const scale = Number.parseFloat(rawScale) || 1;
  const buttonWidth = button.offsetWidth * scale;
  const buttonHeight = button.offsetHeight * scale;
  const minLeft = DODGE_PADDING;
  const minTop = DODGE_PADDING;
  const maxLeft = Math.max(
    minLeft,
    containerWidth - buttonWidth - DODGE_PADDING
  );
  const maxTop = Math.max(
    minTop,
    containerHeight - buttonHeight - DODGE_PADDING
  );
  const avoidRect = avoidButton
    ? {
        left: avoidButton.offsetLeft - AVOID_PADDING,
        top: avoidButton.offsetTop - AVOID_PADDING,
        right:
          avoidButton.offsetLeft +
          avoidButton.offsetWidth +
          AVOID_PADDING,
        bottom:
          avoidButton.offsetTop +
          avoidButton.offsetHeight +
          AVOID_PADDING,
      }
    : null;

  let nextLeft = minLeft;
  let nextTop = minTop;
  const attempts = 12;
  for (let i = 0; i < attempts; i += 1) {
    const candidateLeft =
      maxLeft <= minLeft
        ? minLeft
        : minLeft + Math.random() * (maxLeft - minLeft);
    const candidateTop =
      maxTop <= minTop ? minTop : minTop + Math.random() * (maxTop - minTop);
    if (!avoidRect) {
      nextLeft = candidateLeft;
      nextTop = candidateTop;
      break;
    }
    const candidateRect = {
      left: candidateLeft,
      top: candidateTop,
      right: candidateLeft + buttonWidth,
      bottom: candidateTop + buttonHeight,
    };
    const overlap =
      candidateRect.left < avoidRect.right &&
      candidateRect.right > avoidRect.left &&
      candidateRect.top < avoidRect.bottom &&
      candidateRect.bottom > avoidRect.top;
    if (!overlap) {
      nextLeft = candidateLeft;
      nextTop = candidateTop;
      break;
    }
    // fallback to last candidate if all overlap
    nextLeft = candidateLeft;
    nextTop = candidateTop;
  }

  // Keep it moving by avoiding tiny jumps.
  const currentLeft = button.offsetLeft;
  const currentTop = button.offsetTop;
  if (Math.abs(nextLeft - currentLeft) < DODGE_AVOID) {
    nextLeft = Math.min(maxLeft, nextLeft + DODGE_AVOID * 2);
  }
  if (Math.abs(nextTop - currentTop) < DODGE_AVOID) {
    nextTop = Math.min(maxTop, nextTop + DODGE_AVOID * 2);
  }

  const clampedLeft = Math.min(Math.max(nextLeft, minLeft), maxLeft);
  const clampedTop = Math.min(Math.max(nextTop, minTop), maxTop);

  button.style.position = "absolute";
  button.style.left = `${clampedLeft}px`;
  button.style.top = `${clampedTop}px`;
  button.style.zIndex = "5";
  button.style.setProperty("--dodge-x", "0px");
  button.style.setProperty("--dodge-y", "0px");
  if (button.dataset.action === "no") {
    const scale = 0.45 + Math.random() * 0.55;
    button.style.setProperty("--no-scale", scale.toFixed(2));
  }
}
