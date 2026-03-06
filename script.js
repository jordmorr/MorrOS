const bootScreen = document.getElementById("boot-screen");
const desktop = document.getElementById("desktop");
const clockEl = document.getElementById("top-clock");
const welcomeModal = document.getElementById("welcome-modal");
const welcomeOk = document.getElementById("welcome-ok");
const profileVideo = document.getElementById("profile-video");

let profileReplayTimeout = null;
let hasStartedProfileVideo = false;
const PROFILE_REPLAY_DELAY = 15000;

let hasBooted = false; // Prevents re-showing the welcome modal after it has been closed

function showDesktop() {
  if (bootScreen) bootScreen.classList.add("hidden");
  if (desktop) desktop.classList.remove("hidden");

  // Show the welcome modal ONLY on the very first boot (never again)
  if (welcomeModal && !hasBooted) {
    welcomeModal.classList.remove("hidden");
    hasBooted = true;
  }
}

// Boot sequence – reliable single timeout (CSS animation handles the loading bar)
function startBootSequence() {
  console.log("[BOOT] Sequence started – CSS animation will finish in 1500 ms");

  setTimeout(() => {
    console.log("[BOOT] Transitioning to desktop");
    showDesktop();
  }, 1650);
}

// Start boot sequence immediately (script is at the bottom of index.html)
startBootSequence();

// Profile video behavior
function playProfileVideoFromStart() {
  if (!profileVideo) return;
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

// Welcome modal close
if (welcomeOk && welcomeModal) {
  welcomeOk.addEventListener("click", () => {
    welcomeModal.classList.add("hidden");
    startProfileVideoWhenReady();
  });
}
