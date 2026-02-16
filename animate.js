//NAV: lighten on scroll
$(window).on("scroll", function () {
 if ($(window).scrollTop() > 0) {
   $("nav").addClass("light");
 } else {
   $("nav").removeClass("light");
 }
});

/* =========================
  jQuery label effect (kept)
  ========================= */
$(window).on("load", function () {
 $(".border-animation input").val("");
 $(".input-effect input").on("focusout", function () {
   if ($(this).val() !== "") {
     $(this).addClass("has-content");
   } else {
     $(this).removeClass("has-content");
   }
 });
});

/* =========================================
  GSAP: horizontal scroll for projects section
  ========================================= */
gsap.registerPlugin(ScrollTrigger);

function setupHorizontalScroll(containerSelector, wrapperSelector, reverse = false) {
 const wrapper = document.querySelector(wrapperSelector);
 if (!wrapper) return;
 const scrollLength = wrapper.scrollWidth - window.innerWidth;
 gsap.to(wrapper, {
   x: reverse ? scrollLength : -scrollLength,
   ease: "none",
   scrollTrigger: {
     trigger: containerSelector,
     start: "top top",
     end: () => "+=" + scrollLength,
     scrub: true,
     pin: true,
     anticipatePin: 1,
   }
 });
}

setupHorizontalScroll(".projects-scroll-container", ".projects-scroll-wrapper");

/* =========================================
  Intro: FADA SVG line drawing
  ========================================= */
document.addEventListener("DOMContentLoaded", () => {
 const fadawrap = document.querySelector("#fada .fada-svg");
 if (!fadawrap) return;


 const paths = Array.from(fadawrap.querySelectorAll(".js-draw"));
 const subtitle = document.getElementById("architects");

 // timing vars (can be overridden in CSS as --draw-duration)
 const drawDuration = 1100;             // ms per path
 const stagger = 120;                    // ms between path starts

 // prepare each path with its real length & staggered delay
 paths.forEach((p, i) => {
   const len = p.getTotalLength ? p.getTotalLength() : 1000;
   p.style.setProperty("--len", len);
   p.style.animationDelay = `${i * stagger}ms`;
 });

 const start = () => {
   paths.forEach(p => {
     p.classList.add("is-animating");
     p.classList.add("animate");
     p.addEventListener("animationend", () => p.classList.remove("is-animating"), { once: true });
   });

   // reveal subtitle after last stroke likely completes
   const total = (paths.length - 1) * stagger + drawDuration + 200;
   window.setTimeout(() => subtitle && subtitle.classList.add("reveal"), total);
 };

 // start when #introduction is visible
 const section = document.getElementById("introduction");
 const io = new IntersectionObserver((entries) => {
   if (entries.some(e => e.isIntersecting)){
     start();
     io.disconnect();
   }
 }, { threshold: 0.2 });
 io.observe(section);
});

/* =========================================
  Modern Custom Cursor (magnifier restricted
  to .project-card img only)
  ========================================= */
(() => {
 const supportsHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
 if (!supportsHover) return;

 const root = document.querySelector('.cursor');
 if (!root) return;

 const dot  = root.querySelector('.cursor__dot');
 const lens = root.querySelector('.cursor__lens');

 // Palette (unchanged)
 const PALETTE = [
   { label: '#A9C3D4', rgb: [169,195,212] },
   { label: '#f0f0f0', rgb: [240,240,240] },
   { label: 'rgb(108,124,135)', rgb: [108,124,135] }
 ];

 // ---- Color/contrast helpers ----
 const parseRGB = str => {
   const m = str && str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
   if (!m) return null;
   return { rgb:[+m[1],+m[2],+m[3]], a: m[4] !== undefined ? parseFloat(m[4]) : 1 };
 };
 const srgbToLin = c => { c/=255; return c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); };
 const relLum = ([r,g,b]) => 0.2126*srgbToLin(r)+0.7152*srgbToLin(g)+0.0722*srgbToLin(b);
 const contrast = (a,b) => {
   const L1=relLum(a), L2=relLum(b);
   const [hi,lo] = L1>L2 ? [L1,L2] : [L2,L1];
   return (hi+0.05)/(lo+0.05);
 };
 const effectiveBgRGB = (el) => {
   let node = el;
   while (node && node !== document.documentElement){
     const cs = getComputedStyle(node);
     const parsed = parseRGB(cs.backgroundColor);
     if (parsed && parsed.a>0.001) return parsed.rgb;
     node = node.parentElement;
   }
   const bodyParsed = parseRGB(getComputedStyle(document.body).backgroundColor);
   return (bodyParsed && bodyParsed.rgb) || [255,255,255];
 };
 const pickPaletteContrast = (bgRGB) => {
   // find nearest palette color to background → exclude it → pick highest contrast of the rest
   let bestIdx=0, bestDist=Infinity;
   for (let i=0;i<PALETTE.length;i++){
     const p=PALETTE[i].rgb;
     const d = Math.hypot(bgRGB[0]-p[0], bgRGB[1]-p[1], bgRGB[2]-p[2]);
     if (d<bestDist){bestDist=d; bestIdx=i;}
   }
   const confident = bestDist <= 30;
   const candidates = confident ? PALETTE.filter((_,i)=>i!==bestIdx) : PALETTE;

   let best = candidates[0], bestCR = contrast(candidates[0].rgb, bgRGB);
   for (let i=1;i<candidates.length;i++){
     const cr = contrast(candidates[i].rgb, bgRGB);
     if (cr>bestCR){ bestCR = cr; best = candidates[i]; }
   }
   return best.rgb;
 };
 const setCursorRGBVar = ([r,g,b]) => {
   root.style.setProperty('--cursor-color', `${Math.round(r)},${Math.round(g)},${Math.round(b)}`);
 };

 // ---- Magnifier helpers (RESTRICTED to .project-card) ----
 // Only treat <img> inside a .project-card as magnifiable
 const isMagnifiableImg = (el) =>
   el &&
   el.tagName === 'IMG' &&
   el.complete &&
   el.naturalWidth > 0 &&
   el.closest('.project-card');

 let currentImg = null;
 let naturalW = 0, naturalH = 0;

 const setLensImage = (img) => {
   if (currentImg === img) return;
   currentImg = img;
   if (!img){
     lens.style.backgroundImage = 'none';
     return;
   }
   lens.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
   naturalW = img.naturalWidth;
   naturalH = img.naturalHeight;
 };

 const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

 const updateLensBackground = (img, mouseX, mouseY, zoom) => {
   const rect = img.getBoundingClientRect();

   // Mouse relative to displayed rect
   const relX = clamp(mouseX - rect.left, 0, rect.width);
   const relY = clamp(mouseY - rect.top,  0, rect.height);

   // Map accounting for object-fit
   const style = getComputedStyle(img);
   const objectFit = style.objectFit || 'fill';

   let renderW = rect.width, renderH = rect.height;
   let offsetX = 0, offsetY = 0;

   if (objectFit === 'cover' || objectFit === 'contain'){
     const scale = (objectFit==='cover')
       ? Math.max(rect.width/naturalW, rect.height/naturalH)
       : Math.min(rect.width/naturalW, rect.height/naturalH);

     renderW = naturalW * scale;
     renderH = naturalH * scale;
     offsetX = (rect.width  - renderW) / 2;
     offsetY = (rect.height - renderH) / 2;
   }

   const rx = clamp(relX - offsetX, 0, renderW);
   const ry = clamp(relY - offsetY, 0, renderH);

   lens.style.backgroundSize = `${renderW * zoom}px ${renderH * zoom}px`;
   const bx = (rx / renderW) * 100;
   const by = (ry / renderH) * 100;
   lens.style.backgroundPosition = `${bx}% ${by}%`;
 };

 // ---- Motion state ----
 let mouseX = innerWidth/2, mouseY = innerHeight/2;
 let dotX = mouseX, dotY = mouseY;
 const spring = { tension: 0.25 };

 let hoveringInteractive = false;
 let overImage = false;

 const setTransform = (el, x, y) =>
   el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;

 const onMove = (e) => {
   mouseX = e.clientX; mouseY = e.clientY;

   const el = document.elementFromPoint(mouseX, mouseY);

   // Contrast-based color by default
   let bgRGB = effectiveBgRGB(el);
   let cursorRGB = pickPaletteContrast(bgRGB);

   // If over a contact input/textarea, force the brand accent
   if (el && el.closest('#contact-form') && el.matches('.input-field, .input-field *')) {
     cursorRGB = [108,124,135]; // --input-highlight-strong
   }
   setCursorRGBVar(cursorRGB);

   // Interactive enlarge (links/buttons etc.)
   const interactive = !!(el && el.closest('a,button,[role="button"],input,textarea,select,summary,.is-interactive'));
   if (interactive !== hoveringInteractive){
     hoveringInteractive = interactive;
     root.classList.toggle('cursor--hover', hoveringInteractive && !overImage);
   }

   // Magnifier detection — ONLY .project-card img
   let img = null;
   if (el) {
     if (isMagnifiableImg(el)) {
       img = el;
     } else {
       const maybeImg = el.closest('img');
       if (isMagnifiableImg(maybeImg)) img = maybeImg;
     }
   }

   const nowOverImage = !!img;

   if (nowOverImage !== overImage){
     overImage = nowOverImage;
     root.classList.toggle('cursor--image', overImage);
     if (!overImage) setLensImage(null);
   }

   if (overImage && img){
     if (currentImg !== img) setLensImage(img);
     const zoomVar = getComputedStyle(document.documentElement).getPropertyValue('--lens-zoom').trim();
     const zoom = parseFloat(zoomVar) || 2.0;
     updateLensBackground(img, mouseX, mouseY, zoom);
   }
   root.classList.remove('cursor--hidden');
 };

 const onLeave = () => root.classList.add('cursor--hidden');
 const onDown  = () => root.classList.add('cursor--down');
 const onUp    = () => root.classList.remove('cursor--down');

 const animate = () => {
   dotX += (mouseX - dotX) * spring.tension;
   dotY += (mouseY - dotY) * spring.tension;
   setTransform(dot, dotX, dotY);
   setTransform(lens, mouseX, mouseY); // lens tracks pointer
   requestAnimationFrame(animate);
 };

 // Init
 setTransform(dot, mouseX, mouseY);
 setTransform(lens, mouseX, mouseY);
 window.addEventListener('mousemove', onMove, { passive:true });
 window.addEventListener('mouseenter', () => root.classList.remove('cursor--hidden'), { passive:true });
 window.addEventListener('mouseleave', onLeave);
 window.addEventListener('mousedown', onDown);
 window.addEventListener('mouseup', onUp);
 requestAnimationFrame(animate);
})();

/* =========================
   SERVICES — reversible text reveal with bold words
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  // Split a paragraph into word spans once
  function splitToWords(p){
    if (!p || p.querySelector(".reveal-word")) return;
    const text = (p.textContent || "").trim().replace(/\s+/g, " ");
    p.setAttribute("aria-label", text);
    p.textContent = "";
    text.split(" ").forEach((w, i, arr) => {
      const span = document.createElement("span");
      span.className = "reveal-word";
      span.textContent = w + (i < arr.length - 1 ? " " : "");
      p.appendChild(span);
    });
  }

  // Build timelines per service block
  const blocks = gsap.utils.toArray("#services_container > div");
  blocks.forEach(block => {
    const h3 = block.querySelector("h3");
    const p  = block.querySelector("p");
    if (!h3 || !p) return;

    splitToWords(p);
    const words = p.querySelectorAll(".reveal-word");

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      scrollTrigger: {
        trigger: block,
        start: "top 85%",
        end: "bottom 65%",
        toggleActions: "play reverse play reverse",
        invalidateOnRefresh: true
      }
    });

    // Heading wipe-in
    tl.fromTo(h3,
      { clipPath: "inset(0 100% 0 0)", opacity: 0 },
      { clipPath: "inset(0 0% 0 0)", opacity: 1, duration: 0.9 }
    );

    // Words: rise + fade + bold (via toggleClass)
    tl.to(words, {
      y: 0,
      opacity: 1,
      duration: 0.75,
      stagger: { each: 0.02, from: "start" },
      toggleClass: "on"        // <-- adds "on" on play, removes on reverse
    }, "-=0.2");
  });

  // Recalculate after wrapping words
  ScrollTrigger.refresh();
});

/* =========================================
  Contact form validation shake (kept)
  ========================================= */
document.addEventListener('DOMContentLoaded', () => {
 const form = document.getElementById('contact-form');
 if (!form) return;

 form.addEventListener('submit', (e) => {
   let hasError = false;
   form.querySelectorAll('.input-field').forEach((field) => {
     const wrap = field.closest('.inputfield-animation');
     if (!field.checkValidity()) {
       hasError = true;
       wrap && wrap.classList.add('error');
       setTimeout(() => wrap && wrap.classList.remove('error'), 500);
     }
   });
   if (hasError) e.preventDefault();
 });

 form.querySelectorAll('.input-field').forEach((field) => {
   field.addEventListener('input', () => {
     const wrap = field.closest('.inputfield-animation');
     wrap && wrap.classList.remove('error');
   });
 });
});

/* =========================================
  TEAM: 3D tilt on avatars (kept)
  ========================================= */
document.addEventListener("DOMContentLoaded", () => {
 const avatars = Array.from(document.querySelectorAll("#team .team-container img"));
 const maxTilt = 7;

 avatars.forEach(img => {
   let rect;
   function onMove(e){
     rect = rect || img.getBoundingClientRect();
     const x = (e.clientX - rect.left) / rect.width - 0.5;
     const y = (e.clientY - rect.top) / rect.height - 0.5;
     img.style.transform = `rotateX(${-y*maxTilt}deg) rotateY(${x*maxTilt}deg) translateZ(0)`;
   }
   function reset(){ rect = null; img.style.transform = ""; }
   img.addEventListener("pointerenter", () => rect = img.getBoundingClientRect());
   img.addEventListener("pointermove", onMove);
   img.addEventListener("pointerleave", reset);
 });
});

// OVERLAP STYLING
// ===== Overlap-on-scroll panels (sticky stack) =====
document.addEventListener("DOMContentLoaded", () => {
 const ids = ["#projects", "#services", "#team", "#contact"];
 const sections = ids.map(sel => document.querySelector(sel)).filter(Boolean);
 if (!sections.length) return;

 // 1) Add .overlap-panel to each and wrap existing children into .overlap-card
 sections.forEach((sec, i) => {
   sec.classList.add("overlap-panel");

   // Create a .overlap-card only if not present
   if (!sec.querySelector(":scope > .overlap-card")){
     const card = document.createElement("div");
     card.className = "overlap-card";

     // Move all direct children into the card (keeps your markup intact)
     // except any <script> tags
     const kids = Array.from(sec.childNodes);
     kids.forEach(node => {
       if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
         if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "SCRIPT") return;
         card.appendChild(node);
       }
     });
     sec.appendChild(card);
   }
 });

 // 2) Z-index so later sections are on top of earlier ones
 // (first section gets the lowest, last gets the highest)
 sections.forEach((sec, i) => {
   sec.style.zIndex = String(10 + i); // increasing upward in DOM order
 });

 // 3) Mark whichever panel is currently closest to the top as .is-top
 //    This improves the “active” shadow/lift feel.
 const opts = { root: null, threshold: [0, 0.51, 1] };
 const io = new IntersectionObserver((entries) => {
   // Find entries whose top edge is near the viewport top
   entries.forEach(({ target, isIntersecting, boundingClientRect }) => {
     if (!isIntersecting) {
       target.classList.remove("is-top");
       return;
     }
     // Heuristic: if the top is within ~10px of the viewport top, mark as top
     if (Math.abs(boundingClientRect.top) < 12) {
       sections.forEach(s => s.classList.remove("is-top"));
       target.classList.add("is-top");
     }
   });
 }, opts);
 sections.forEach(sec => io.observe(sec));
});

// Additional - Team fix - responsiveness for Overlap effect
// ===== TEAM: assemble responsive member cards from existing containers =====
document.addEventListener("DOMContentLoaded", () => {
 const teamSection = document.querySelector("#team");
 const card = teamSection?.querySelector(".overlap-card") || teamSection;
 if (!card) return;
 const imgsWrap   = card.querySelector(".team-container");
 const namesWrap  = card.querySelector(".teamname-container");
 const titlesWrap = card.querySelector(".teamtitle-container");
 if (!imgsWrap || !namesWrap || !titlesWrap) return;
 const imgs   = Array.from(imgsWrap.querySelectorAll("img"));
 const names  = Array.from(namesWrap.querySelectorAll("p"));
 const titles = Array.from(titlesWrap.querySelectorAll("p"));

 // Guard: use the shortest length to avoid undefineds
 const count = Math.min(imgs.length, names.length, titles.length);
 if (!count) return;

 // Build the grid container (once)
 let grid = card.querySelector(".team-grid");
 if (!grid) {
   grid = document.createElement("div");
   grid.className = "team-grid";
   // Insert after the header (if present), else at top
 const header = card.querySelector(':scope > header#title');
   if (header && header.nextSibling) {
     header.parentNode.insertBefore(grid, header.nextSibling);
   } else {
     card.prepend(grid);
   }
 } else {
   grid.innerHTML = "";
 }

 // Move (not clone) nodes into unified member cards
 for (let i = 0; i < count; i++) {
   const member = document.createElement("article");
   member.className = "team-member";
   const img = imgs[i];
   const nm  = names[i];
   const tl  = titles[i];

   // Wrap text nodes to style easily
   const nameEl = document.createElement("p");
   nameEl.className = "team-name";
   nameEl.textContent = (nm?.textContent || "").trim();
   const titleEl = document.createElement("p");
   titleEl.className = "team-title";
   titleEl.textContent = (tl?.textContent || "").trim();

   // Move the actual IMG node so AOS attributes still apply
   if (img) member.appendChild(img);
   member.appendChild(nameEl);
   member.appendChild(titleEl);
   grid.appendChild(member);
 }

 // Hide the original wrappers (keep in DOM for accessibility/AOS but not visible)
 imgsWrap.style.display   = "none";
 namesWrap.style.display  = "none";
 titlesWrap.style.display = "none";
});
