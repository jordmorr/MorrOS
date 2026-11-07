const bootScreen = document.getElementById("boot-screen");
const desktop = document.getElementById("desktop");
const clockEl = document.getElementById("top-clock");
const profileVideo = document.getElementById("profile-video");
const morrOSMenuButton = document.getElementById("morros-menu-button");
const morrOSMenu = document.getElementById("morros-menu");
const timeTravelTrigger = document.getElementById("time-travel-trigger");
const timeTravelOverlay = document.getElementById("time-travel-overlay");
const timeTravelVideo = document.getElementById("time-travel-video");
const timeTravelFlash = document.getElementById("time-travel-flash");

let profileReplayTimeout = null;
let hasStartedProfileVideo = false;
const PROFILE_REPLAY_DELAY = 15000;
const GEO_PAGE_URL = "geo.html";
const TIME_TRAVEL_FALLBACK_MS = 15000;
const TIME_TRAVEL_FLASH_SWAP_MS = 84;
const shouldSkipBoot = new URLSearchParams(window.location.search).get(
  "skipBoot"
) === "1";

let isTimeTraveling = false;
let isFinishingTimeTravel = false;
let timeTravelFallbackTimeout = null;
let timeTravelCompletionTimeout = null;
let geoPagePreloadPromise = null;

function showDesktop() {
  if (bootScreen) bootScreen.classList.add("hidden");
  if (desktop) desktop.classList.remove("hidden");
  startProfileVideoWhenReady();
}

// First-visit assembly animation; the normal desktop is also the fallback.
function startBootSequence() {
  if (shouldSkipBoot) {
    showDesktop();
    return;
  }
  if (window.MorrOSBoot) {
    window.MorrOSBoot.start({ onComplete: showDesktop });
  } else {
    document.documentElement.classList.remove("boot-pending");
    showDesktop();
  }
}

// Profile video behavior
function playProfileVideoFromStart() {
  if (!profileVideo || document.documentElement.classList.contains("boot-building")) return;
  if (profileReplayTimeout) {
    clearTimeout(profileReplayTimeout);
    profileReplayTimeout = null;
  }
  profileVideo.currentTime = 0;
  profileVideo.play().catch(() => {
    // Autoplay might fail on some browsers; silently ignore.
  });
}

function queueProfileReplay() {
  if (!profileVideo) return;
  if (profileReplayTimeout) {
    clearTimeout(profileReplayTimeout);
  }
  profileReplayTimeout = setTimeout(() => {
    playProfileVideoFromStart();
  }, PROFILE_REPLAY_DELAY);
}

if (profileVideo) {
  profileVideo.addEventListener("ended", () => {
    profileVideo.pause();
    profileVideo.currentTime = 0;
    queueProfileReplay();
  });
}

function startProfileVideoWhenReady() {
  if (!profileVideo || hasStartedProfileVideo) return;
  hasStartedProfileVideo = true;
  const beginPlayback = () => {
    playProfileVideoFromStart();
    queueProfileReplay();
  };

  if (profileVideo.readyState >= 2) {
    beginPlayback();
  } else {
    profileVideo.addEventListener("loadeddata", beginPlayback, { once: true });
  }
}

// Top bar navigation – REQUIRED BEHAVIOR (unchanged)
document.querySelectorAll(".top-item[data-window]").forEach((item) => {
  item.addEventListener("click", () => {
    const winId = item.getAttribute("data-window");
    if (!winId) return;
    
    const win = document.getElementById(winId);
    if (!win) return;

    const windowsArea = document.querySelector(".windows-area");
    if (!windowsArea) return;

    const wasHidden = win.classList.contains("hidden");

    if (wasHidden) {
      // Open as the FIRST subwindow (top of the stack)
      windowsArea.insertBefore(win, windowsArea.firstChild);
      win.classList.remove("hidden");
    }
    // If already open → leave it exactly where it is (no reordering)

    // Smooth scroll to the window
    setTimeout(() => {
      win.scrollIntoView({ 
        behavior: "smooth", 
        block: "start" 
      });
    }, 80);
  });
});

function setMorrOSMenuOpen(isOpen) {
  if (!morrOSMenuButton || !morrOSMenu) return;
  morrOSMenu.classList.toggle("hidden", !isOpen);
  morrOSMenuButton.setAttribute("aria-expanded", String(isOpen));
}

function resetTimeTravelState() {
  if (timeTravelCompletionTimeout) {
    clearTimeout(timeTravelCompletionTimeout);
    timeTravelCompletionTimeout = null;
  }
  if (timeTravelFallbackTimeout) {
    clearTimeout(timeTravelFallbackTimeout);
    timeTravelFallbackTimeout = null;
  }

  isTimeTraveling = false;
  isFinishingTimeTravel = false;
  setMorrOSMenuOpen(false);

  if (desktop) {
    desktop.classList.remove("time-travel-active");
    desktop.classList.remove("hidden");
  }

  if (bootScreen) {
    bootScreen.classList.add("hidden");
  }

  if (timeTravelOverlay) {
    timeTravelOverlay.classList.add("hidden");
    timeTravelOverlay.setAttribute("aria-hidden", "true");
  }

  if (timeTravelFlash) {
    timeTravelFlash.classList.remove("active");
    timeTravelFlash.classList.add("hidden");
  }

  if (timeTravelVideo) {
    timeTravelVideo.pause();
    timeTravelVideo.currentTime = 0;
  }
}

function preloadGeoPage() {
  if (geoPagePreloadPromise) return geoPagePreloadPromise;

  const prefetchLink = document.createElement("link");
  prefetchLink.rel = "prefetch";
  prefetchLink.href = GEO_PAGE_URL;
  prefetchLink.as = "document";
  document.head.appendChild(prefetchLink);

  geoPagePreloadPromise = fetch(GEO_PAGE_URL, {
    credentials: "same-origin",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to preload ${GEO_PAGE_URL}`);
      }
      return response.text();
    })
    .catch(() => null);

  return geoPagePreloadPromise;
}

function finishTimeTravel() {
  if (isFinishingTimeTravel) return;
  isFinishingTimeTravel = true;
  if (timeTravelCompletionTimeout) {
    clearTimeout(timeTravelCompletionTimeout);
    timeTravelCompletionTimeout = null;
  }
  if (timeTravelFallbackTimeout) {
    clearTimeout(timeTravelFallbackTimeout);
    timeTravelFallbackTimeout = null;
  }
  window.location.href = GEO_PAGE_URL;
}

function triggerTimeTravelFlash() {
  if (isFinishingTimeTravel) return;
  if (!timeTravelFlash) {
    finishTimeTravel();
    return;
  }

  timeTravelFlash.classList.remove("hidden", "active");
  void timeTravelFlash.offsetWidth;
  timeTravelFlash.classList.add("active");

  timeTravelCompletionTimeout = setTimeout(() => {
    finishTimeTravel();
  }, TIME_TRAVEL_FLASH_SWAP_MS);
}

function startTimeTravelSequence() {
  if (
    isTimeTraveling ||
    !timeTravelOverlay ||
    !timeTravelVideo ||
    !desktop
  ) {
    return;
  }

  isTimeTraveling = true;
  setMorrOSMenuOpen(false);
  desktop.classList.add("time-travel-active");
  timeTravelOverlay.classList.remove("hidden");
  timeTravelOverlay.setAttribute("aria-hidden", "false");
  preloadGeoPage();

  if (profileVideo) {
    profileVideo.pause();
  }

  timeTravelVideo.currentTime = 0;
  const playPromise = timeTravelVideo.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      triggerTimeTravelFlash();
    });
  }

  timeTravelFallbackTimeout = setTimeout(() => {
    triggerTimeTravelFlash();
  }, TIME_TRAVEL_FALLBACK_MS);
}

if (morrOSMenuButton && morrOSMenu) {
  morrOSMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen =
      morrOSMenuButton.getAttribute("aria-expanded") === "true";
    setMorrOSMenuOpen(!isOpen);
  });

  morrOSMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    const menuItem = event.target.closest(".dropdown-item");
    if (menuItem) {
      setMorrOSMenuOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (
      !morrOSMenu.contains(event.target) &&
      !morrOSMenuButton.contains(event.target)
    ) {
      setMorrOSMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMorrOSMenuOpen(false);
    }
  });
}

if (timeTravelTrigger) {
  timeTravelTrigger.addEventListener("click", () => {
    startTimeTravelSequence();
  });
}

document.getElementById("boot-replay")?.addEventListener("click", () => {
  setMorrOSMenuOpen(false);
  if (profileReplayTimeout) {
    clearTimeout(profileReplayTimeout);
    profileReplayTimeout = null;
  }
  window.MorrOSBoot?.start({ replay: true, onComplete: () => {
    showDesktop();
    // Replay may have interrupted either playback or the pause between loops.
    playProfileVideoFromStart();
    morrOSMenuButton?.focus({ preventScroll: true });
  } });
});

if (timeTravelVideo) {
  timeTravelVideo.addEventListener("ended", () => {
    triggerTimeTravelFlash();
  });
}

window.addEventListener("pagehide", () => {
  window.MorrOSBoot?.cancel();
  resetTimeTravelState();
});

window.addEventListener("pageshow", (event) => {
  const navigationEntry =
    performance.getEntriesByType("navigation")[0];
  const isHistoryRestore =
    event.persisted || navigationEntry?.type === "back_forward";

  if (isHistoryRestore) {
    window.MorrOSBoot?.cancel();
    resetTimeTravelState();
    startProfileVideoWhenReady();
  }
});

// Close buttons on windows
document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const win = btn.closest(".window");
    if (!win) return;
    win.classList.add("hidden");
  });
});

// Simple live clock
function updateClock() {
  if (!clockEl) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  clockEl.textContent = `${hh}:${mm}:${ss}`;
}
updateClock();
setInterval(updateClock, 1000);

// Populate the clock before the intro measures the stacked mobile navigation.
startBootSequence();
