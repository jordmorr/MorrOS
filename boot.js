/* Simulated workers assemble the existing DOM; no content is cloned or rewritten. */
(() => {
  const SEEN_KEY = "morros.boot.v1";
  const INTRO_DURATION = 8000;
  const root = document.documentElement;
  const desktop = document.getElementById("desktop");
  const overlay = document.getElementById("boot-screen");
  const effects = document.getElementById("boot-effects");
  const status = document.getElementById("boot-status");
  const counter = document.getElementById("boot-counter");
  const progress = document.getElementById("boot-progress-fill");
  const skip = document.getElementById("boot-skip");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const params = new URLSearchParams(window.location.search);
  const svgNS = "http://www.w3.org/2000/svg";
  let session = null;

  function seenBefore() {
    try { return localStorage.getItem(SEEN_KEY) === "complete"; }
    catch { return false; }
  }

  function later(run, callback, delay) {
    run.timers.push(setTimeout(() => {
      if (session === run) callback();
    }, delay * run.pace));
  }

  function animate(run, element, frames, options) {
    const animation = element.animate(frames, {
      ...options,
      duration: options.duration * run.pace,
      delay: (options.delay || 0) * run.pace,
    });
    run.animations.push(animation);
    return animation;
  }

  // Use viewport coordinates, intersected with the independently scrolling windows area.
  function visibleBox(element) {
    if (!element || !element.getClientRects().length) return null;
    const rect = element.getBoundingClientRect();
    const area = element.closest(".windows-area");
    const clip = area ? area.getBoundingClientRect() : { top: 0, bottom: innerHeight };
    const box = {
      left: Math.max(4, rect.left),
      right: Math.min(innerWidth - 4, rect.right),
      top: Math.max(4, rect.top, clip.top),
      bottom: Math.min(innerHeight - 4, rect.bottom, clip.bottom),
    };
    return box.right - box.left > 12 && box.bottom - box.top > 12 ? box : null;
  }

  function finish({ notify = true } = {}) {
    const run = session;
    session = null;
    clearTimeout(window.morrosBootFallback);
    root.classList.remove("boot-pending", "boot-building", "boot-frame-ready");
    if (!run) return;
    run.timers.forEach(clearTimeout);
    run.animations.forEach(animation => animation.cancel());
    run.elements.forEach(element => element.classList.remove("boot-piece-pending"));
    effects.replaceChildren();
    overlay.classList.add("hidden");
    desktop.inert = run.wasInert;
    window.removeEventListener("resize", run.interrupt);
    motion.removeEventListener("change", run.interrupt);
    document.removeEventListener("keydown", run.onKey);
    try { localStorage.setItem(SEEN_KEY, "complete"); } catch {}
    if (notify) run.onComplete({ played: true });
    if (run.resumeVideo && !document.hidden) {
      document.getElementById("profile-video")?.play().catch(() => {});
    }
  }

  function elementName(element) {
    if (!element) return "Desktop frame";
    const text = node => node?.textContent.replace(/\s+/g, " ").trim() || "";
    const window = element.closest(".window");
    const windowName = text(window?.querySelector(".window-header > span"))
      .replace(/\.md$/i, "").toLowerCase().replace(/^./, letter => letter.toUpperCase());
    if (element.dataset.bootLabel) return element.dataset.bootLabel;
    if (element.matches(".top-bar")) return "Navigation bar";
    if (element.matches(".menu-dropdown")) return "MorrOS menu";
    if (element.matches(".top-item")) return `${text(element)} menu item`;
    if (element.matches(".top-icon")) return `${element.title || element.getAttribute("aria-label") || "Social"} link`;
    if (element.id === "top-clock") return "Clock";
    if (element.matches(".window")) return `${windowName} window`;
    if (element.matches(".window-header")) return `${windowName} title bar`;
    if (element.matches(".about-image")) return "Profile portrait";
    if (element.matches(".project-column")) return `${text(element.querySelector("h3"))} panel`;
    if (element.matches(".education-column")) return `${text(element.querySelector(".degree")).split(/\s+[–-]\s+/)[0]} qualification`;
    if (element.matches(".skills-subwindow")) return text(element.querySelector(".skills-subwindow-header"));
    if (element.querySelector(".section-title")) return `${windowName} heading`;
    return text(element.querySelector(".paper-title")) || `${windowName || "Page"} text`;
  }

  function makeWorker(run, task) {
    const index = task.index;
    const color = `hsl(${136 + index * 11 % 28} 100% ${58 + index * 7 % 18}%)`;
    const cursor = document.createElement("div");
    cursor.className = "boot-cursor";
    cursor.style.setProperty("--agent-color", color);
    cursor.innerHTML = '<svg viewBox="0 0 22 28"><path d="M2 1 L2 22 L7 17 L12 26 L16 24 L11 15 L19 15 Z" fill="currentColor" stroke="#001008" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    const label = document.createElement("span");
    label.className = "boot-cursor-label";
    cursor.append(label);
    effects.append(cursor);
    const x = Math.max(8, Math.min(innerWidth - 24, task.box.left - 45 + Math.sin(index) * 22));
    const y = Math.max(8, Math.min(innerHeight - 30, task.box.top - 35));
    cursor.style.transform = `translate(${x - 2}px, ${y - 1}px)`;
    animate(run, cursor, [{ opacity: 0 }, { opacity: 1 }], { duration: 140, fill: "both" });
    return { cursor, label, color, x, y, moves: index };
  }

  function placementGesture(worker, task) {
    const box = task.box;
    const width = box.right - box.left;
    const height = box.bottom - box.top;
    const direction = worker.moves++ % 2 ? -1 : 1;
    // Shells stay fixed so their children's viewport coordinates remain accurate.
    const shiftX = task.shell || !task.element ? 0 : Math.max(4 - box.left, Math.min(12 * direction, innerWidth - 4 - box.right));
    const shiftY = task.shell || !task.element ? 0 : Math.max(4 - box.top, -9);
    const anchor = { x: box.left + shiftX, y: box.top + shiftY };
    const end = { x: box.right, y: box.bottom };
    const points = [];

    // Sample a bowed cubic path, easing at each end like a hand moving a mouse.
    const arc = (from, to, bend, start, stop, samples) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / length * bend;
      const ny = dx / length * bend;
      const control = fraction => ({
        x: Math.max(4, Math.min(innerWidth - 4, from.x + dx * fraction + nx)),
        y: Math.max(4, Math.min(innerHeight - 4, from.y + dy * fraction + ny)),
      });
      // Bound the control points, rather than flattening the curve at the viewport edge.
      const c1 = control(0.28);
      const c2 = control(0.72);
      for (let i = 0; i <= samples; i++) {
        const time = i / samples;
        const t = time * time * (3 - 2 * time);
        const u = 1 - t;
        points.push({
          x: Math.max(4, Math.min(innerWidth - 4, u ** 3 * from.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t ** 3 * to.x)),
          y: Math.max(4, Math.min(innerHeight - 4, u ** 3 * from.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t ** 3 * to.y)),
          offset: start + (stop - start) * time,
        });
      }
    };
    const travel = Math.hypot(anchor.x - worker.x, anchor.y - worker.y);
    arc(worker, anchor, Math.min(70, travel * 0.18) * direction, 0, 0.28, 20);
    const smooth = t => t * t * (3 - 2 * t);
    // The pointer is the marquee's lower-right handle throughout the drag.
    for (let i = 0; i <= 24; i++) {
      const time = i / 24;
      const tx = smooth(time);
      const ty = tx + 0.12 * Math.sin(Math.PI * tx) * tx * (1 - tx);
      const size = { width: Math.max(1, width * tx), height: Math.max(1, height * ty) };
      points.push({
        x: anchor.x + size.width, y: anchor.y + size.height,
        offset: 0.34 + 0.34 * time,
        box: { left: anchor.x, top: anchor.y, ...size },
        opacity: 0.72 * tx, selectionOpacity: 1,
      });
    }
    const drawn = points.at(-1);
    points.push({ ...drawn, offset: 0.74 });
    // Keep the ghost, marquee, handles, and cursor attached while snapping into place.
    for (let i = 1; i <= 18; i++) {
      const time = i / 18;
      const t = smooth(time);
      const left = anchor.x - shiftX * t;
      const top = anchor.y - shiftY * t;
      points.push({
        x: left + width, y: top + height, offset: 0.74 + 0.22 * time,
        box: { left, top, width, height }, opacity: 0.72 + 0.28 * t, selectionOpacity: 1,
      });
    }
    points.push({ ...points.at(-1), offset: 1 });
    worker.x = end.x;
    worker.y = end.y;
    return points.map(point => ({
      box: { left: anchor.x, top: anchor.y, width: 1, height: 1 },
      opacity: 0, selectionOpacity: 0, ...point,
    }));
  }

  function buildPiece(run, task) {
    // Refresh queued geometry after fonts and media have had time to settle.
    if (task.element) task.box = visibleBox(task.element) || task.box;
    const worker = makeWorker(run, task);
    const duration = task.duration;
    const box = task.box;
    const width = box.right - box.left;
    const height = box.bottom - box.top;
    const selection = document.createElementNS(svgNS, "g");
    selection.classList.add("boot-selection");
    run.traces.append(selection);
    const trace = document.createElementNS(svgNS, "rect");
    trace.setAttribute("width", width);
    trace.setAttribute("height", height);
    trace.setAttribute("rx", "2");
    trace.setAttribute("stroke", worker.color);
    trace.classList.add("boot-trace");
    selection.append(trace);
    const points = placementGesture(worker, task);
    const options = { duration, fill: "forwards", easing: "linear" };
    worker.label.textContent = elementName(task.element);
    const labelWidth = worker.label.offsetWidth;
    const labelHeight = worker.label.offsetHeight;
    animate(run, selection, points.map(point => ({ opacity: point.selectionOpacity, offset: point.offset })), options);
    animate(run, trace, points.map(point => ({
      transform: `translate(${point.box.left}px, ${point.box.top}px) scale(${point.box.width / width}, ${point.box.height / height})`,
      offset: point.offset,
    })), options);
    for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const handle = document.createElementNS(svgNS, "rect");
      handle.classList.add("boot-handle");
      handle.setAttribute("width", "5");
      handle.setAttribute("height", "5");
      handle.setAttribute("stroke", worker.color);
      selection.append(handle);
      animate(run, handle, points.map(point => ({
        transform: `translate(${point.box.left + point.box.width * cx - 2.5}px, ${point.box.top + point.box.height * cy - 2.5}px)`,
        offset: point.offset,
      })), options);
    }
    animate(run, worker.cursor, points.map(({ x: px, y: py, offset }) => ({
      transform: `translate(${px - 2}px, ${py - 1}px)`, offset,
    })), options);
    // Show the element's name only while sizing/placing it; travel stays unlabeled.
    animate(run, worker.label, points.map(({ x: px, y: py, offset }) => ({
      transform: `translate(${-Math.max(0, px + 14 + labelWidth - innerWidth + 8)}px, ${-Math.max(0, py + 28 + labelHeight - innerHeight + 8)}px)`,
      opacity: offset <= 0.34 ? 0 : offset < 0.4 ? (offset - 0.34) / 0.06 : offset <= 0.96 ? 1 : (1 - offset) / 0.04,
      offset,
    })), options);
    animate(run, worker.cursor.querySelector("svg"), [
      { scale: "1", offset: 0 }, { scale: "1", offset: 0.28 },
      { scale: "0.9", offset: 0.34 }, { scale: "0.9", offset: 0.96 },
      { scale: "1", offset: 1 },
    ], options);

    let elementAnimation;
    if (task.element) {
      const rect = task.element.getBoundingClientRect();
      elementAnimation = animate(run, task.element, points.map(point => ({
        opacity: point.opacity,
        transform: `translate(${point.box.left - box.left}px, ${point.box.top - box.top}px)`,
        // Pixel insets keep even partially scrolled elements inside the visible marquee.
        clipPath: `inset(${Math.max(0, box.top - rect.top)}px ${Math.max(0, rect.right - box.left - point.box.width)}px ${Math.max(0, rect.bottom - box.top - point.box.height)}px ${Math.max(0, box.left - rect.left)}px)`,
        offset: point.offset,
      })), { ...options, fill: "both" });
      // The animation now hides and reveals the real element inside its growing marquee.
      task.element.classList.remove("boot-piece-pending");
    }

    later(run, () => {
      elementAnimation?.cancel();
      if (!task.element) root.classList.add("boot-frame-ready");
      // Release the placed element, then let the selection briefly linger.
      animate(run, selection, [{ opacity: 1 }, { opacity: 0 }], {
        delay: 120, duration: 240, fill: "forwards",
      });
      later(run, () => selection.remove(), 360);
      // Each cursor exists only for its placement, so concurrency follows the work.
      animate(run, worker.cursor, [
        { opacity: 1, transform: `translate(${worker.x - 2}px, ${worker.y - 1}px)` },
        { opacity: 0, transform: `translate(${Math.min(innerWidth - 8, worker.x + 16)}px, ${Math.min(innerHeight - 8, worker.y + 12)}px)` },
      ], { duration: 180, fill: "forwards", easing: "ease-out" });
      later(run, () => worker.cursor.remove(), 180);
      run.completed += 1;
      counter.textContent = `${run.completed} / ${run.total} elements placed`;
    }, duration);
  }

  function start({ replay = false, onComplete = () => {} } = {}) {
    if (session) return;
    clearTimeout(window.morrosBootFallback);
    root.classList.remove("boot-pending");
    const bypass = params.get("skipBoot") === "1" || motion.matches ||
      (!replay && params.get("boot") !== "1" && seenBefore());
    if (bypass || !desktop || !overlay || !effects || !Element.prototype.animate) {
      onComplete({ played: false });
      return;
    }

    const video = document.getElementById("profile-video");
    const run = {
      timers: [], animations: [], elements: new Set(), completed: 0,
      onComplete, wasInert: desktop.inert, resumeVideo: video && !video.paused,
    };
    session = run;
    try {
      desktop.classList.remove("hidden");
      video?.pause();
      desktop.inert = true;
      root.classList.add("boot-building");
      root.classList.remove("boot-frame-ready");
      overlay.classList.remove("hidden");
      status.textContent = "Preparing desktop…";
      counter.textContent = "Preparing elements";
      progress.style.transform = "scaleX(0)";
      effects.replaceChildren();
      run.traces = document.createElementNS(svgNS, "svg");
      run.traces.classList.add("boot-traces");
      effects.append(run.traces);
      const collect = selector => [...document.querySelectorAll(selector)].flatMap(element => {
        const box = visibleBox(element);
        if (!box || element.closest(".window.hidden")) return [];
        run.elements.add(element);
        element.classList.add("boot-piece-pending");
        return [{ element, box, shell: element.matches(".top-bar, .window") }];
      });
      const topToBottom = (a, b) => {
        if (a.element.contains(b.element)) return -1;
        if (b.element.contains(a.element)) return 1;
        return a.box.top - b.box.top || a.box.left - b.box.left;
      };
      const frame = { box: visibleBox(document.querySelector(".desktop-inner")), at: 0, duration: 500 };
      const tasks = [frame];
      const schedule = (task, at, duration, gap) => {
        const ancestors = tasks.filter(parent => parent.element?.contains(task.element));
        const parentReady = Math.max(frame.duration, ...ancestors.map(parent => parent.at + parent.duration));
        task.at = Math.max(at, tasks.at(-1).at + gap, parentReady + 40);
        task.duration = duration;
        tasks.push(task);
      };
      const header = collect(".top-bar, .top-bar-left > .menu-dropdown, .top-item, #top-clock").sort(topToBottom);
      header.forEach(task => schedule(task, 540, task.shell ? 460 : 340, 90));

      const body = collect(
        ".windows-area > .window, .windows-area > .window > .window-header, .about-image, .about-content > p, " +
        ".education-column, .project-column, .windows-area > .window > .window-body > p, " +
        "#publications-window .project-list > li, .skills-subwindow"
      ).sort(topToBottom);
      const bodyStart = tasks.at(-1).at + 100;
      const step = 2800 / Math.max(1, body.length - 1);
      const gap = Math.max(100, Math.min(260, step * 0.7));
      body.forEach((task, i) => schedule(task, bodyStart + i * step,
        task.element.matches(".about-image") ? 700 : 600, gap));

      // Finish the visible page first, then sweep the shortcut row left to right.
      const mainEnd = Math.max(...tasks.map(task => task.at + task.duration));
      const iconStart = mainEnd + 160;
      const icons = collect(".top-icon").sort((a, b) => a.box.left - b.box.left || a.box.top - b.box.top);
      icons.forEach((task, i) => {
        task.at = iconStart + i * 150;
        task.duration = 420;
        tasks.push(task);
      });
      run.total = tasks.length;
      counter.textContent = `0 / ${run.total} elements placed`;
      const readyAt = Math.max(...tasks.map(task => task.at + task.duration)) + 400;
      // Normalize the entire timeline to eight seconds, regardless of visible task count.
      run.pace = INTRO_DURATION / (readyAt + 700);
      tasks.forEach((task, index) => {
        task.index = index;
        later(run, () => buildPiece(run, task), task.at);
      });
      animate(run, progress, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
        duration: readyAt + 200, fill: "forwards", easing: "linear",
      });
      status.textContent = "Drawing the desktop shell…";
      later(run, () => { status.textContent = "Building the page from top to bottom…"; }, 540);
      if (icons.length) later(run, () => {
        status.textContent = "Placing shortcuts from left to right…";
      }, iconStart);
      later(run, () => {
        status.textContent = "All systems ready. Welcome to MorrOS.";
      }, readyAt);
      later(run, () => finish(), readyAt + 700);
      run.interrupt = () => finish();
      run.onKey = event => {
        if (event.key === "Escape") { event.preventDefault(); finish(); }
      };
      window.addEventListener("resize", run.interrupt);
      motion.addEventListener("change", run.interrupt);
      document.addEventListener("keydown", run.onKey);
      skip.focus({ preventScroll: true });
    } catch (error) {
      console.warn("MorrOS startup animation skipped:", error);
      finish();
    }
  }

  skip?.addEventListener("click", () => finish());
  window.MorrOSBoot = { start, cancel: () => finish({ notify: false }) };
})();
