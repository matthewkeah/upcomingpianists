/**
 * ============================================================================
 * KCPO PORTAL — APP ENGINE (PURE CLOUDFLARE R2 WORKER INTEGRATION)
 * Loaded dynamically via cache-buster script in HTML
 * ============================================================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    setDoc,
    getDocs,
    getDoc,
    doc,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAvEHNXSC8XujK8Iuio2xEoLnyD3VItbbY",
    authDomain: "upcomingpianists.firebaseapp.com",
    projectId: "upcomingpianists",
    storageBucket: "upcomingpianists.firebasestorage.app",
    messagingSenderId: "1016884713994",
    appId: "1:1016884713994:web:10c02ef212572f7a605df3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ----------------------------------------------------------------------------
// GLOBAL CONSTANTS & STATE
// ----------------------------------------------------------------------------
const ADMIN_EMAILS = [
    "kenyanpianists@gmail.com"
];

// Cloudflare Worker API Endpoint
const WORKER_URL = "https://kcpo-media-auth.upcomingpianists.workers.dev";

const EMAILJS_PUBLIC_KEY = "knA4KtHIfdGjzsSA0";
const EMAILJS_SERVICE_ID = "service_f3at2ti";
const EMAILJS_TEMPLATE_ID = "template_07vc37l";

window.pendingAttachments = []; 
let globalUserDirectory = [];

if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

// ----------------------------------------------------------------------------
// THEME & NAV STATE
// ----------------------------------------------------------------------------
function initTheme() {
    const stored = localStorage.getItem("kcpo-theme") || "dark";
    document.documentElement.setAttribute("data-bs-theme", stored);
    const icon = document.getElementById("themeIcon");
    if (icon) {
        icon.className = stored === "dark" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
    }

    const themeToggleBtn = document.getElementById("themeToggle");
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            const next = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-bs-theme", next);
            localStorage.setItem("kcpo-theme", next);
            if (icon) icon.className = next === "dark" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
        });
    }
}

function markActiveNavLink() {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".navbar-nav .nav-link").forEach(link => {
        if (link.getAttribute("href") === currentPage) {
            link.classList.add("active");
        }
    });
}

function populateDynamicMonths() {
    const registerDropdown = document.getElementById("sessionMonth");
    const masterclassDropdown = document.getElementById("repertoireMonthSelect");
    const memberUploadDropdown = document.getElementById("memberSessionMonth");
    
    if (!registerDropdown && !masterclassDropdown && !memberUploadDropdown) return;

    const upcomingMonths = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
        const futureDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
        const monthString = futureDate.toLocaleString('default', { month: 'long' }) + " " + futureDate.getFullYear();
        upcomingMonths.push(monthString);
    }

    if (registerDropdown) {
        upcomingMonths.forEach(monthStr => {
            const opt = document.createElement("option");
            opt.value = monthStr;
            opt.textContent = monthStr;
            registerDropdown.appendChild(opt);
        });
    }

    if (masterclassDropdown) {
        upcomingMonths.forEach((monthStr, index) => {
            const opt = document.createElement("option");
            opt.value = monthStr;
            opt.textContent = monthStr;
            if (index === 0) opt.selected = true; 
            masterclassDropdown.appendChild(opt);
        });
    }

    if (memberUploadDropdown) {
        upcomingMonths.forEach(monthStr => {
            const opt = document.createElement("option");
            opt.value = monthStr;
            opt.textContent = monthStr;
            memberUploadDropdown.appendChild(opt);
        });
    }
}

// ----------------------------------------------------------------------------
// AUTHENTICATION & ADMIN ENFORCEMENT
// ----------------------------------------------------------------------------
const AUTH_MODAL_HTML = `
<div class="modal fade" id="authModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content modal-kcpo">
            <div class="modal-header">
                <h5 class="modal-title font-serif accent-gold">KCPO Member Portal</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <ul class="nav nav-tabs mb-4" id="authTabs" role="tablist">
                    <li class="nav-item"><button class="nav-link active" id="signin-tab" data-bs-toggle="tab" data-bs-target="#signin-pane">Sign In</button></li>
                    <li class="nav-item"><button class="nav-link" id="signup-tab" data-bs-toggle="tab" data-bs-target="#signup-pane">New Member</button></li>
                </ul>
                <div class="tab-content" id="authTabsContent">
                    <div class="tab-pane fade show active" id="signin-pane">
                        <form id="signInForm">
                            <div class="mb-3"><input type="email" class="form-control field" id="signInEmail" required placeholder="Email"></div>
                            <div class="mb-4"><input type="password" class="form-control field" id="signInPassword" required placeholder="Password" autocomplete="current-password"></div>
                            <button type="submit" class="btn btn-gold w-100 py-2">Sign In</button>
                        </form>
                    </div>
                    <div class="tab-pane fade" id="signup-pane">
                        <form id="signUpForm">
                            <div class="mb-3"><input type="text" class="form-control field" id="signUpName" required placeholder="Full Name"></div>
                            <div class="mb-3"><input type="email" class="form-control field" id="signUpEmail" required placeholder="Email"></div>
                            <div class="mb-4"><input type="password" class="form-control field" id="signUpPassword" required placeholder="Min 6 chars" autocomplete="new-password"></div>
                            <button type="submit" class="btn btn-outline-gold w-100 py-2">Register</button>
                        </form>
                    </div>
                </div>
                <div id="authAlert" class="alert mt-3 mb-0 d-none small py-2"></div>
            </div>
        </div>
    </div>
</div>`;

function injectAuthModal() {
    if (!document.getElementById("authModal")) {
        document.body.insertAdjacentHTML("beforeend", AUTH_MODAL_HTML);
    }
}

window.logoutUser = async function() {
    await signOut(auth);
    sessionStorage.clear();
    window.location.href = "index.html";
};

function showAuthAlert(msg, type = "danger") {
    const box = document.getElementById("authAlert");
    if (box) { 
        box.className = `alert alert-${type} mt-3 mb-0 d-block small py-2`; 
        box.textContent = msg; 
    }
}

async function ensureAdminRole(user) {
    if (!user || !user.email) return;
    const emailLower = user.email.toLowerCase();
    
    if (ADMIN_EMAILS.includes(emailLower)) {
        try {
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: "admin",
                updatedAt: serverTimestamp()
            }, { merge: true });
            sessionStorage.setItem("kcpo_role", "admin");
        } catch (error) {
            console.error("Failed to enforce admin role:", error);
        }
    }
}

function initAuth() {
    const navBtn = document.getElementById("navAuthBtn");

    onAuthStateChanged(auth, async (user) => {
        if (!navBtn) return;
        const existingLogout = document.getElementById("dynamicLogoutBtn");
        if (existingLogout) existingLogout.remove();

        if (user) {
            await ensureAdminRole(user);

            let realName = user.displayName;
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists() && userDoc.data().name) {
                    realName = userDoc.data().name;
                }
            } catch (err) {
                console.error("Profile name fetch failed", err);
            }

            const finalName = realName || user.email;
            sessionStorage.setItem("kcpo_name", finalName);

            const isAdmin = ADMIN_EMAILS.includes((user.email || "").toLowerCase());
            
            navBtn.innerHTML = isAdmin ? `<i class="bi bi-shield-lock-fill me-1"></i> Admin` : `<i class="bi bi-person-check-fill me-1"></i> Inbox`;
            navBtn.className = "btn btn-gold btn-sm px-3";
            navBtn.removeAttribute("data-bs-toggle");
            navBtn.onclick = () => window.location.href = isAdmin ? "admin.html" : "member.html";

            const li = document.createElement("li");
            li.className = "nav-item ms-lg-2 my-2 my-lg-0";
            li.id = "dynamicLogoutBtn";
            li.innerHTML = `<button class="btn btn-outline-danger btn-sm px-3" onclick="logoutUser()">Sign Out</button>`;
            navBtn.parentElement.parentElement.appendChild(li);

            sessionStorage.setItem("kcpo_role", isAdmin ? "admin" : "member");
            const feed = document.getElementById("communicationsFeed");
            if(feed) loadCommunicationsHub();

        } else {
            navBtn.innerHTML = `<i class="bi bi-person-circle me-1"></i> Sign In`;
            navBtn.className = "btn btn-outline-gold btn-sm px-3";
            navBtn.setAttribute("data-bs-toggle", "modal");
            navBtn.setAttribute("data-bs-target", "#authModal");
            navBtn.onclick = null;

            const feed = document.getElementById("communicationsFeed");
            if(feed) loadCommunicationsHub();
        }
    });

    const signInForm = document.getElementById("signInForm");
    if (signInForm) {
        signInForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            try {
                const email = document.getElementById("signInEmail").value;
                const password = document.getElementById("signInPassword").value;
                await signInWithEmailAndPassword(auth, email, password);
                window.location.reload();
            } catch (err) { showAuthAlert(err.message); }
        });
    }

    const signUpForm = document.getElementById("signUpForm");
    if (signUpForm) {
        signUpForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            try {
                const email = document.getElementById("signUpEmail").value;
                const password = document.getElementById("signUpPassword").value;
                const name = document.getElementById("signUpName").value;
                
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", cred.user.uid), {
                    name: name, email: email, role: ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "member", createdAt: serverTimestamp()
                });
                window.location.reload();
            } catch (err) { showAuthAlert(err.message); }
        });
    }
}

// ----------------------------------------------------------------------------
// SECURE URL RESOLVERS
// ----------------------------------------------------------------------------
window.getSecureViewUrl = async function(fileKey) {
    if (!fileKey) return null;
    if (fileKey.startsWith('http')) return fileKey; // Fallback for old public URLs

    try {
        const response = await fetch(`${WORKER_URL}/download`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileKey })
        });
        
        if (!response.ok) throw new Error("Failed to get viewing ticket.");
        const data = await response.json();
        return data.downloadUrl;
    } catch (error) {
        console.error("View Error:", error);
        alert("Failed to load secure media.");
        return null;
    }
};

window.openSecureMedia = async function(fileKey) {
    const url = await window.getSecureViewUrl(fileKey);
    if (url) window.open(url, '_blank');
};

// ----------------------------------------------------------------------------
// IN-APP IMAGE VIEWER (LIGHTBOX) WITH GALLERY
// ----------------------------------------------------------------------------
let currentGallery = [];
let currentImageIndex = 0;
let imgViewerScale = 1.0;

const IMAGE_VIEWER_HTML = `
<div class="modal fade" id="imageViewerModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content bg-transparent border-0 position-relative">
            <div class="modal-header border-0 pb-0 justify-content-end gap-2">
                <button type="button" class="btn btn-dark rounded-circle" onclick="zoomImageViewer(0.1)" style="opacity: 0.8;" title="Zoom In"><i class="bi bi-zoom-in text-light"></i></button>
                <button type="button" class="btn btn-dark rounded-circle" onclick="zoomImageViewer(-0.1)" style="opacity: 0.8;" title="Zoom Out"><i class="bi bi-zoom-out text-light"></i></button>
                <button type="button" class="btn btn-dark rounded-circle" onclick="downloadViewerImage()" style="opacity: 0.8;" title="Download"><i class="bi bi-download text-light"></i></button>
                <button type="button" class="btn btn-dark rounded-circle" data-bs-dismiss="modal" aria-label="Close" style="opacity: 0.8;" title="Close"><i class="bi bi-x-lg text-light"></i></button>
            </div>
            <div class="modal-body text-center p-0 mt-2 position-relative" style="overflow: auto; max-height: 85vh;">
                <button type="button" id="btnViewerPrev" class="btn btn-dark rounded-circle position-fixed top-50 start-0 translate-middle-y ms-3" style="opacity: 0.8; z-index: 10;"><i class="bi bi-chevron-left text-light fs-4"></i></button>
                <img id="viewerImageTarget" src="" class="img-fluid rounded" style="transition: width 0.2s ease, height 0.2s ease; transform-origin: top center; box-shadow: 0 10px 30px rgba(0,0,0,0.8);" alt="Media">
                <button type="button" id="btnViewerNext" class="btn btn-dark rounded-circle position-fixed top-50 end-0 translate-middle-y me-3" style="opacity: 0.8; z-index: 10;"><i class="bi bi-chevron-right text-light fs-4"></i></button>
            </div>
        </div>
    </div>
</div>`;

function injectImageViewer() {
    if (!document.getElementById("imageViewerModal")) {
        document.body.insertAdjacentHTML("beforeend", IMAGE_VIEWER_HTML);
        document.getElementById('btnViewerPrev').addEventListener('click', () => { if (currentImageIndex > 0) { currentImageIndex--; updateViewerImage(); } });
        document.getElementById('btnViewerNext').addEventListener('click', () => { if (currentImageIndex < currentGallery.length - 1) { currentImageIndex++; updateViewerImage(); } });
    }
}

window.zoomImageViewer = function(delta) {
    imgViewerScale += delta;
    if (imgViewerScale < 0.1) imgViewerScale = 0.1;
    if (imgViewerScale > 4.0) imgViewerScale = 4.0;
    
    const targetImg = document.getElementById('viewerImageTarget');
    targetImg.style.width = (imgViewerScale * 100) + '%';
    targetImg.style.height = "auto";
};

window.downloadViewerImage = async function() {
    const key = currentGallery[currentImageIndex];
    if (!key) return;
    try {
        const url = await window.getSecureViewUrl(key);
        const res = await fetch(url);
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `kcpo_media_${Date.now()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (err) { console.error("Download failed", err); }
};

window.updateViewerImage = async function() {
    if (!currentGallery || currentGallery.length === 0) return;
    imgViewerScale = 1.0;
    const targetImg = document.getElementById('viewerImageTarget');
    targetImg.style.width = '100%';
    
    const secureUrl = await window.getSecureViewUrl(currentGallery[currentImageIndex]);
    targetImg.src = secureUrl;
    
    document.getElementById('btnViewerPrev').style.display = currentImageIndex > 0 ? 'block' : 'none';
    document.getElementById('btnViewerNext').style.display = currentImageIndex < currentGallery.length - 1 ? 'block' : 'none';
};

window.openImageViewer = function(encodedUrls, startIndex) {
    currentGallery = JSON.parse(decodeURIComponent(encodedUrls));
    currentImageIndex = startIndex;
    updateViewerImage();
    new bootstrap.Modal(document.getElementById('imageViewerModal')).show();
};

// ----------------------------------------------------------------------------
// INTERACTIVE PDF & PHOTO ANNOTATION ENGINE
// ----------------------------------------------------------------------------
const PDF_MODAL_HTML = `
<div class="modal fade" id="annotatorModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static" style="z-index: 1055;">
    <div class="modal-dialog modal-fullscreen">
        <div class="modal-content bg-dark text-light">
            <div class="modal-header border-secondary py-2 align-items-center">
                <h5 class="modal-title fs-6 accent-gold"><i class="bi bi-pen"></i> Score Editor</h5>
                <div class="ms-auto d-flex gap-2 align-items-center">
                    <span id="pdfPageIndicator" class="small me-2 text-muted-c">Page 1</span>
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="btnPdfPrev"><i class="bi bi-chevron-left"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="btnPdfNext"><i class="bi bi-chevron-right"></i></button>
                    <div class="vr mx-1 bg-secondary"></div>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="zoomPdf(-0.1)" title="Zoom Out"><i class="bi bi-zoom-out"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="zoomPdf(0.1)" title="Zoom In"><i class="bi bi-zoom-in"></i></button>
                    <div class="vr mx-1 bg-secondary"></div>
                    <button type="button" class="btn btn-sm btn-success" id="btnPdfDone">Done <span id="pdfSpinner" class="spinner-border spinner-border-sm d-none"></span></button>
                    <button type="button" class="btn btn-sm btn-outline-light" data-bs-dismiss="modal"><i class="bi bi-x-lg"></i></button>
                </div>
            </div>
            <div class="bg-secondary text-center p-2 d-flex justify-content-center gap-3 border-bottom border-dark align-items-center">
                <button type="button" class="btn btn-sm btn-outline-light active" id="toolMove" onclick="setPdfTool('none')"><i class="bi bi-arrows-move"></i> Move</button>
                <button type="button" class="btn btn-sm btn-outline-danger" id="toolPen" onclick="setPdfTool('pen')"><i class="bi bi-pen"></i> Pen</button>
                <button type="button" class="btn btn-sm btn-outline-warning" id="toolHighlight" onclick="setPdfTool('highlighter')"><i class="bi bi-marker"></i> Highlighter</button>
                <input type="color" id="pdfColorPicker" value="#ff0000" class="form-control form-control-color form-control-sm p-0 border-0" style="width: 25px; height: 25px; cursor: pointer;" title="Choose tool color">
                <div class="vr bg-dark mx-1"></div>
                <button type="button" class="btn btn-sm btn-outline-info" onclick="undoPdfStroke()"><i class="bi bi-arrow-counterclockwise"></i> Undo</button>
            </div>
            
            <div class="modal-body p-4" id="pdfScrollArea" style="background: #222; height: calc(100vh - 110px); overflow: auto; text-align: center;">
                <div id="pdfSizer" style="display: inline-block; position: relative; text-align: left; transition: width 0.2s, height 0.2s;">
                    <div id="pdfCanvasWrapper" style="transform-origin: top left; transition: transform 0.2s; position: absolute; top: 0; left: 0; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                        <canvas id="pdfRenderCanvas" style="display: block; background: white;"></canvas>
                        <canvas id="pdfDrawCanvas" style="position: absolute; top: 0; left: 0; pointer-events: none; touch-action: none; display: block;"></canvas>
                        <canvas id="pdfActiveStrokeCanvas" style="position: absolute; top: 0; left: 0; pointer-events: none; touch-action: none; display: block;"></canvas>
                    </div>
                </div>
            </div>
            
        </div>
    </div>
</div>`;

let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumIsPending = null;

let pdfCssScale = 1.0;         
let pdfRenderResolution = 1.5; 

window.baseRenderWidth = 0;
window.baseRenderHeight = 0;

window.isImageAnnotator = false;
window.imagePageUrls = [];
    
let pdfCanvas, pdfCtx, drawCanvas, drawCtx, activeCanvas, activeCtx;
let currentTool = 'none'; 
let isDrawing = false;
let currentStroke = []; 

let pageDrawings = {};     
let pagesEdited = new Set(); 
let undoHistory = {};      

function injectPdfModal() {
    if (!document.getElementById("annotatorModal")) {
        document.body.insertAdjacentHTML("beforeend", PDF_MODAL_HTML);
        
        pdfCanvas = document.getElementById("pdfRenderCanvas");
        pdfCtx = pdfCanvas.getContext("2d");
        
        drawCanvas = document.getElementById("pdfDrawCanvas");
        drawCtx = drawCanvas.getContext("2d", { willReadFrequently: true });
        
        activeCanvas = document.getElementById("pdfActiveStrokeCanvas");
        activeCtx = activeCanvas.getContext("2d", { willReadFrequently: true });
        
        drawCanvas.addEventListener('pointerdown', startDrawing);
        drawCanvas.addEventListener('pointermove', draw);
        window.addEventListener('pointerup', stopDrawing);
        window.addEventListener('pointercancel', stopDrawing);
        
        document.getElementById('btnPdfPrev').addEventListener('click', onPrevPage);
        document.getElementById('btnPdfNext').addEventListener('click', onNextPage);
        document.getElementById('btnPdfDone').addEventListener('click', processAndSaveAnnotations);
    }
}

async function loadPDFJSLibrary() {
    if (window.pdfjsLib) return window.pdfjsLib;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            resolve(window.pdfjsLib);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function applyZoom() {
    const wrapper = document.getElementById('pdfCanvasWrapper');
    const sizer = document.getElementById('pdfSizer');
    
    wrapper.style.transform = `scale(${pdfCssScale})`;
    sizer.style.width = (window.baseRenderWidth * pdfCssScale) + 'px';
    sizer.style.height = (window.baseRenderHeight * pdfCssScale) + 'px';
}

window.zoomPdf = function(delta) {
    const scrollArea = document.getElementById('pdfScrollArea');
    let centerX = 0, centerY = 0;
    
    if (scrollArea) {
        centerX = scrollArea.scrollLeft + scrollArea.clientWidth / 2;
        centerY = scrollArea.scrollTop + scrollArea.clientHeight / 2;
    }
    
    const relX = centerX / pdfCssScale;
    const relY = centerY / pdfCssScale;
    
    pdfCssScale += delta;
    if (pdfCssScale < 0.1) pdfCssScale = 0.1;
    if (pdfCssScale > 3.0) pdfCssScale = 3.0;
    
    applyZoom();
    
    if (scrollArea) {
        scrollArea.scrollLeft = (relX * pdfCssScale) - scrollArea.clientWidth / 2;
        scrollArea.scrollTop = (relY * pdfCssScale) - scrollArea.clientHeight / 2;
    }
};

window.setPdfTool = function(tool) {
    currentTool = tool;
    document.getElementById('toolMove').classList.remove('active');
    document.getElementById('toolPen').classList.remove('active');
    document.getElementById('toolHighlight').classList.remove('active');
    
    const scrollArea = document.getElementById('pdfScrollArea');
    
    if (tool === 'none') {
        document.getElementById('toolMove').classList.add('active');
        drawCanvas.style.pointerEvents = 'none'; 
        if (scrollArea) scrollArea.style.overflow = 'auto'; 
    } else {
        if (tool === 'pen') document.getElementById('toolPen').classList.add('active');
        else if (tool === 'highlighter') document.getElementById('toolHighlight').classList.add('active');
        
        drawCanvas.style.pointerEvents = 'auto'; 
        if (scrollArea) scrollArea.style.overflow = 'hidden'; 
    }
}

function getPointerCoords(e) {
    if (e.touches && e.touches.length > 0) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
}

function startDrawing(e) {
    if (currentTool === 'none') return;
    isDrawing = true;
    
    if (e.cancelable) e.preventDefault(); 
    
    const rect = drawCanvas.getBoundingClientRect();
    const scaleX = drawCanvas.width / rect.width; 
    const scaleY = drawCanvas.height / rect.height; 
    
    const coords = getPointerCoords(e);
    const x = (coords.clientX - rect.left) * scaleX;
    const y = (coords.clientY - rect.top) * scaleY;
    
    currentStroke = [{x, y}];
    
    activeCtx.lineCap = 'round';
    activeCtx.lineJoin = 'round';
    const activeColor = document.getElementById('pdfColorPicker').value || '#ff0000';
    
    if (currentTool === 'pen') {
        activeCtx.globalCompositeOperation = 'source-over';
        activeCtx.strokeStyle = activeColor;
        activeCtx.lineWidth = 3; 
        activeCtx.globalAlpha = 1.0;
    } else if (currentTool === 'highlighter') {
        activeCtx.globalCompositeOperation = 'source-over';
        activeCtx.strokeStyle = activeColor;
        activeCtx.lineWidth = 12; 
        activeCtx.globalAlpha = 0.3; 
    }
}

function draw(e) {
    if (!isDrawing || currentTool === 'none') return;
    if (e.cancelable) e.preventDefault(); 
    pagesEdited.add(pageNum); 
    
    const rect = drawCanvas.getBoundingClientRect();
    const scaleX = drawCanvas.width / rect.width;
    const scaleY = drawCanvas.height / rect.height;
    
    const coords = getPointerCoords(e);
    const x = (coords.clientX - rect.left) * scaleX;
    const y = (coords.clientY - rect.top) * scaleY;
    
    currentStroke.push({x, y});
    
    activeCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
    activeCtx.beginPath();
    activeCtx.moveTo(currentStroke[0].x, currentStroke[0].y);
    
    for (let i = 1; i < currentStroke.length; i++) {
        activeCtx.lineTo(currentStroke[i].x, currentStroke[i].y);
    }
    
    activeCtx.stroke();
}

function stopDrawing() { 
    if (!isDrawing) return;
    
    isDrawing = false;
    drawCtx.drawImage(activeCanvas, 0, 0);
    activeCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
    currentStroke = [];
    
    if (!undoHistory[pageNum]) {
        undoHistory[pageNum] = [drawCanvas.toDataURL("image/png")];
    }
    undoHistory[pageNum].push(drawCanvas.toDataURL("image/png"));
    pageDrawings[pageNum] = undoHistory[pageNum][undoHistory[pageNum].length - 1];
}

window.undoPdfStroke = function() {
    if (undoHistory[pageNum] && undoHistory[pageNum].length > 1) {
        undoHistory[pageNum].pop(); 
        const targetState = undoHistory[pageNum][undoHistory[pageNum].length - 1];
        
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        
        const img = new Image();
        img.onload = () => {
            drawCtx.drawImage(img, 0, 0);
        };
        img.src = targetState;
        
        if (undoHistory[pageNum].length === 1) {
            delete pageDrawings[pageNum];
            pagesEdited.delete(pageNum);
        } else {
            pageDrawings[pageNum] = targetState;
            pagesEdited.add(pageNum);
        }
    }
};

function saveCurrentPageDrawings() {
    if (pagesEdited.has(pageNum) && undoHistory[pageNum] && undoHistory[pageNum].length > 0) {
        pageDrawings[pageNum] = undoHistory[pageNum][undoHistory[pageNum].length - 1];
    }
}

function finalizeRenderStep(num) {
    pageIsRendering = false;
    
    drawCtx.clearRect(0, 0, window.baseRenderWidth, window.baseRenderHeight);
    activeCtx.clearRect(0, 0, window.baseRenderWidth, window.baseRenderHeight);
    
    if (pageDrawings[num]) {
        const img = new Image();
        img.onload = () => {
            drawCtx.drawImage(img, 0, 0);
            if (!undoHistory[num]) undoHistory[num] = [drawCanvas.toDataURL("image/png")];
        };
        img.src = pageDrawings[num];
    } else {
        if (!undoHistory[num]) undoHistory[num] = [drawCanvas.toDataURL("image/png")];
    }
    
    const totalPages = window.isImageAnnotator ? window.imagePageUrls.length : pdfDoc.numPages;
    document.getElementById('pdfPageIndicator').textContent = `Page ${num} of ${totalPages}`;
    document.getElementById('btnPdfPrev').disabled = (num <= 1);
    document.getElementById('btnPdfNext').disabled = (num >= totalPages);
    
    if (pageNumIsPending !== null) {
        const n = pageNumIsPending;
        pageNumIsPending = null;
        renderPage(n);
    }
}

function renderPage(num) {
    pageIsRendering = true;
    
    if (window.isImageAnnotator) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            window.baseRenderWidth = img.width;
            window.baseRenderHeight = img.height;
            
            [pdfCanvas, drawCanvas, activeCanvas].forEach(c => {
                c.width = window.baseRenderWidth;
                c.height = window.baseRenderHeight;
            });
            
            const container = document.getElementById('pdfScrollArea');
            const availableWidth = container ? container.clientWidth - 40 : window.innerWidth;
            pdfCssScale = Math.min(availableWidth / window.baseRenderWidth, 1.0); 
            
            applyZoom();
            pdfCtx.drawImage(img, 0, 0);
            finalizeRenderStep(num);
        };
        img.src = window.imagePageUrls[num - 1];
    } else {
        pdfDoc.getPage(num).then(page => {
            const viewport = page.getViewport({ scale: pdfRenderResolution });
            
            window.baseRenderWidth = viewport.width;
            window.baseRenderHeight = viewport.height;
            
            [pdfCanvas, drawCanvas, activeCanvas].forEach(c => {
                c.width = window.baseRenderWidth;
                c.height = window.baseRenderHeight;
            });
            
            const container = document.getElementById('pdfScrollArea');
            const availableWidth = container ? container.clientWidth - 40 : window.innerWidth;
            pdfCssScale = Math.min(availableWidth / window.baseRenderWidth, 1.0); 
            
            applyZoom();
            
            const renderContext = { canvasContext: pdfCtx, viewport: viewport };
            page.render(renderContext).promise.then(() => finalizeRenderStep(num));
        });
    }
}

function queueRenderPage(num) {
    if (pageIsRendering) {
        pageNumIsPending = num;
    } else {
        renderPage(num);
    }
}

function onPrevPage() {
    if (pageNum <= 1) return;
    saveCurrentPageDrawings();
    pageNum--;
    queueRenderPage(pageNum);
}

function onNextPage() {
    const totalPages = window.isImageAnnotator ? window.imagePageUrls.length : pdfDoc.numPages;
    if (pageNum >= totalPages) return;
    saveCurrentPageDrawings();
    pageNum++;
    queueRenderPage(pageNum);
}

window.openMediaAnnotator = async function(mediaUrlsString, mediaType) {
    if (!mediaUrlsString) return alert("Media file not found.");
    
    injectPdfModal();
    
    window.isImageAnnotator = (mediaType === 'image');
    
    pageDrawings = {};
    pagesEdited.clear();
    undoHistory = {};
    pageNum = 1;
    pdfCssScale = 1.0;
    
    setPdfTool('none');
    
    const modalEl = document.getElementById('annotatorModal');
    const annotatorModal = bootstrap.Modal.getOrCreateInstance(modalEl);

    const modalShown = new Promise(resolve => {
        modalEl.addEventListener('shown.bs.modal', resolve, { once: true });
    });
    annotatorModal.show();

    pdfCtx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    pdfCtx.fillText("Loading Engine...", 10, 50);

    try {
        await modalShown;
        
        // Resolve the secure URL via Cloudflare Worker before passing to viewer
        if (!window.isImageAnnotator) {
            const resolvedUrl = await window.getSecureViewUrl(mediaUrlsString);
            if (!resolvedUrl) throw new Error("Could not resolve media URL");
            
            const pdfjs = await loadPDFJSLibrary();
            const loadingTask = pdfjs.getDocument(resolvedUrl);
            pdfDoc = await loadingTask.promise;
        } else {
            const keys = mediaUrlsString.split(',');
            window.imagePageUrls = [];
            for (let key of keys) {
                const imgUrl = await window.getSecureViewUrl(key);
                window.imagePageUrls.push(imgUrl);
            }
        }
        renderPage(pageNum);
    } catch (err) {
        console.error("Media Load Error:", err);
        alert("Failed to load viewer.");
    }
};

async function processAndSaveAnnotations() {
    saveCurrentPageDrawings(); 
    
    if (pagesEdited.size === 0) {
        bootstrap.Modal.getInstance(document.getElementById('annotatorModal')).hide();
        return; 
    }

    const btn = document.getElementById('btnPdfDone');
    const spinner = document.getElementById('pdfSpinner');
    btn.disabled = true; spinner.classList.remove('d-none');
    
    try {
        window.pendingAttachments = [];
        
        for (let num of pagesEdited) {
            const offCanvas = document.createElement('canvas');
            const offCtx = offCanvas.getContext('2d');
            
            if (window.isImageAnnotator) {
                const srcUrl = window.imagePageUrls[num - 1];
                const baseImg = new Image();
                baseImg.crossOrigin = "Anonymous";
                await new Promise(r => { baseImg.onload = r; baseImg.src = srcUrl; });
                
                offCanvas.width = baseImg.width;
                offCanvas.height = baseImg.height;
                offCtx.drawImage(baseImg, 0, 0);
            } else {
                const page = await pdfDoc.getPage(num);
                const viewport = page.getViewport({ scale: pdfRenderResolution });
                
                offCanvas.width = viewport.width;
                offCanvas.height = viewport.height;
                await page.render({ canvasContext: offCtx, viewport: viewport }).promise;
            }
            
            const annImg = new Image();
            await new Promise(r => { annImg.onload = r; annImg.src = pageDrawings[num]; });
            offCtx.drawImage(annImg, 0, 0);
            
            const dataUrl = offCanvas.toDataURL("image/png");
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const fileName = `annotated-page-${num}-${Date.now()}.png`;
            const fileType = "image/png";

            const ticketRes = await fetch(`${WORKER_URL}/upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: fileName,
                    fileType: fileType,
                    uid: auth.currentUser ? auth.currentUser.uid : "guest"
                })
            });
            
            if (!ticketRes.ok) throw new Error("Failed to get upload ticket from Worker.");
            const { uploadUrl, fileKey } = await ticketRes.json();
            
            const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                body: blob,
                headers: {
                    "Content-Type": fileType
                }
            });
            
            if (!uploadRes.ok) throw new Error("Cloudflare R2 annotation upload failed.");
            window.pendingAttachments.push({ url: fileKey, type: 'image' });
        }
        
        const statusMsg = document.getElementById("chatStatusMsg");
        if (statusMsg) {
            statusMsg.className = "small mt-2 text-center text-success";
            statusMsg.textContent = `${window.pendingAttachments.length} annotated page(s) attached. Add text and send!`;
        }
        bootstrap.Modal.getInstance(document.getElementById('annotatorModal')).hide();
        
    } catch (error) {
        console.error("Failed to process annotations:", error);
        alert("Failed to save edits.");
    } finally {
        btn.disabled = false; spinner.classList.add('d-none');
    }
}

// ----------------------------------------------------------------------------
// CLOUDFLARE R2 UPLOAD PIPELINE
// ----------------------------------------------------------------------------
async function uploadMediaArray(fileList) {
    const uploadedData = [];
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        
        const ticketRes = await fetch(`${WORKER_URL}/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fileName: file.name,
                fileType: file.type || "application/octet-stream",
                uid: auth.currentUser ? auth.currentUser.uid : "guest"
            })
        });
        
        if (!ticketRes.ok) throw new Error("Failed to get upload ticket from Worker.");
        const { uploadUrl, fileKey } = await ticketRes.json();

        const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: {
                "Content-Type": file.type || "application/octet-stream"
            }
        });

        if (!uploadRes.ok) throw new Error(`Cloudflare R2 media upload failed for ${file.name}.`);

        const isImage = file.type.startsWith('image');
        const isVideo = file.type.startsWith('video');
        
        uploadedData.push({ 
            url: fileKey, 
            type: isImage ? 'image' : (isVideo ? 'video' : 'raw'), 
            name: file.name 
        });
    }
    return uploadedData;
}

function generateMediaBadges(attachmentsArray) {
    if (!attachmentsArray || attachmentsArray.length === 0) return '';
    let html = '<div class="mt-2 d-flex gap-2 flex-wrap">';
    const imageGallery = attachmentsArray.filter(a => a.type === 'image' && a.url && a.url !== 'undefined').map(a => a.url);
    const encodedGallery = encodeURIComponent(JSON.stringify(imageGallery));
    let imgCounter = 0;
    
    attachmentsArray.forEach((media) => {
        if (!media.url || media.url === 'undefined') return;
        if (media.type === 'image') {
            html += `<span onclick="openImageViewer('${encodedGallery}', ${imgCounter})" class="badge bg-danger text-light" style="cursor: pointer;"><i class="bi bi-image"></i> Image</span>`;
            imgCounter++;
        } else if (media.type === 'video') {
            html += `<button type="button" onclick="openSecureMedia('${media.url}')" class="btn btn-sm btn-outline-warning text-dark"><i class="bi bi-play-circle"></i> Video</button>`;
        } else {
            html += `<button type="button" onclick="openSecureMedia('${media.url}')" class="btn btn-sm btn-outline-secondary text-light"><i class="bi bi-file-earmark-pdf"></i> ${media.name ? media.name.substring(0,10) + '...' : 'Document'}</button>`;
        }
    });
    html += '</div>';
    return html;
}

// ----------------------------------------------------------------------------
// ADMIN DIRECTORY & REPERTOIRE (WITH ATTENDANCE LOGIC)
// ----------------------------------------------------------------------------
const PARTICIPATION_MODAL_HTML = `
<div class="modal fade" id="participationModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content modal-kcpo bg-dark text-light border-secondary">
            <div class="modal-header border-line">
                <h5 class="modal-title accent-gold" id="participationTitle">User Participation</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4" id="participationBody">
                <div class="text-center text-muted-c">Loading records...</div>
            </div>
        </div>
    </div>
</div>`;

function injectAdminModals() {
    if (!document.getElementById("participationModal")) {
        document.body.insertAdjacentHTML("beforeend", PARTICIPATION_MODAL_HTML);
    }
}

function getMonthRange(startDate) {
    const start = startDate || new Date();
    const end = new Date();
    const months = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
        months.push(current.toLocaleString('default', { month: 'long' }) + " " + current.getFullYear());
        current.setMonth(current.getMonth() + 1);
    }
    return months.reverse(); 
}

window.adminWipeSingleScore = async function(scoreId, email, name, uid, joinedMs) {
    if(!confirm("Wipe this score and its associated feedback?")) return;
    await window.deleteScore(scoreId, true); 
    window.viewUserParticipation(email, name, uid, joinedMs); 
}

window.adminWipeAllScores = async function(uid, email, name, joinedMs) {
    if(!confirm("Wipe ALL scores for this user?")) return;
    const q = query(collection(db, "scores"), where("uploadedByUid", "==", uid));
    const snap = await getDocs(q);
    const promises = [];
    snap.forEach(d => promises.push(window.deleteScore(d.id, true)));
    await Promise.all(promises);
    window.viewUserParticipation(email, name, uid, joinedMs); 
}

window.adminWipeMonthFeedback = async function(email, monthStr, name, uid, joinedMs) {
    if(!confirm(`Wipe all feedback from this user for ${monthStr}?`)) return;
    const q = query(collection(db, "score_feedback"), where("senderEmail", "==", email));
    const snap = await getDocs(q);
    const promises = [];
    snap.forEach(d => {
        const date = d.data().createdAt?.toDate();
        if (date) {
            const mStr = date.toLocaleString('default', { month: 'long' }) + " " + date.getFullYear();
            if (mStr === monthStr) promises.push(deleteDoc(d.ref));
        }
    });
    await Promise.all(promises);
    window.viewUserParticipation(email, name, uid, joinedMs); 
}

window.viewUserParticipation = async function(email, name, uid, joinedTimestamp) {
    const body = document.getElementById("participationBody");
    document.getElementById("participationTitle").textContent = `${name}'s Masterclass Log`;
    body.innerHTML = `<div class="text-center text-muted-c my-4">Pulling database records...</div>`;
    new bootstrap.Modal(document.getElementById('participationModal')).show();
    
    try {
        const joinDate = joinedTimestamp ? new Date(Number(joinedTimestamp)) : new Date();
        const activeMonthsRange = getMonthRange(joinDate);
        
        const scQ = query(collection(db, "scores"), where("uploadedByEmail", "==", email));
        const scSnap = await getDocs(scQ);
        const fbQ = query(collection(db, "score_feedback"), where("senderEmail", "==", email));
        const fbSnap = await getDocs(fbQ);
        
        const feedbackByMonth = {};
        fbSnap.forEach(d => {
            const f = d.data();
            const date = f.createdAt ? f.createdAt.toDate() : new Date();
            const monthStr = date.toLocaleString('default', { month: 'long' }) + " " + date.getFullYear();
            if (!feedbackByMonth[monthStr]) feedbackByMonth[monthStr] = [];
            feedbackByMonth[monthStr].push({ id: d.id, ...f, dateObj: date });
        });

        let html = `<div class="d-flex justify-content-between align-items-center mt-2 mb-2">
            <h6 class="accent-gold mb-0">Scores Uploaded (${scSnap.size})</h6>
            ${scSnap.size > 0 ? `<button class="btn btn-sm btn-outline-danger" onclick="adminWipeAllScores('${uid}', '${email}', '${name.replace(/'/g, "\\'")}', '${joinedTimestamp}')">Wipe All Scores</button>` : ''}
        </div>
        <ul class="list-group list-group-flush mb-4 border-secondary">`;
        
        if(scSnap.empty) {
            html += `<li class="list-group-item bg-transparent text-muted-c px-0 border-line">No scores uploaded yet.</li>`;
        } else {
            scSnap.forEach(d => {
                const s = d.data();
                const viewUrl = s.pdfUrl ? s.pdfUrl.split(',')[0] : '#';
                html += `<li class="list-group-item bg-transparent text-light px-0 border-line d-flex justify-content-between align-items-center">
                    <div>
                        <span>${s.pieceTitle}</span> <span class="badge badge-kcpo ms-2">${s.sessionMonth}</span>
                    </div>
                    <div>
                        <button type="button" onclick="openSecureMedia('${viewUrl}')" class="btn btn-sm btn-outline-info me-3">View Media</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="adminWipeSingleScore('${d.id}', '${email}', '${name.replace(/'/g, "\\'")}', '${uid}', '${joinedTimestamp}')"><i class="bi bi-trash"></i></button>
                    </div>
                </li>`;
            });
        }
        
        html += `</ul><h6 class="accent-gold mb-3">Attendance Timeline (Since ${joinDate.toLocaleDateString()})</h6><div class="accordion accordion-flush" id="participationAccordion">`;
        
        activeMonthsRange.forEach((monthStr, index) => {
            const monthFeedback = feedbackByMonth[monthStr] || [];
            const isPresent = monthFeedback.length > 0;
            const badgeHtml = isPresent ? `<span class="badge bg-success ms-2">Present</span>` : `<span class="badge bg-secondary ms-2">Absent</span>`;
            
            html += `
            <div class="accordion-item bg-transparent border-line">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed bg-transparent text-light px-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${index}">
                        ${monthStr} ${badgeHtml} <span class="ms-auto small text-muted-c me-3">${monthFeedback.length} comments</span>
                    </button>
                </h2>
                <div id="collapse-${index}" class="accordion-collapse collapse" data-bs-parent="#participationAccordion">
                    <div class="accordion-body px-0 pt-2 pb-4">`;
            
            if (isPresent) {
                html += `<div class="text-end mb-3"><button class="btn btn-sm btn-outline-danger" onclick="adminWipeMonthFeedback('${email}', '${monthStr}', '${name.replace(/'/g, "\\'")}', '${uid}', '${joinedTimestamp}')">Wipe Feedback for ${monthStr}</button></div>`;
                monthFeedback.forEach(f => {
                    const dateStr = f.dateObj ? f.dateObj.toLocaleDateString() : "Unknown Date";
                    html += `
                        <div class="mb-3 p-3 rounded" style="background: rgba(255,255,255,0.02);">
                            <div class="d-flex justify-content-between mb-2">
                                <small class="text-muted-c">For: ${f.performerName}</small>
                                <small class="text-muted-c">${dateStr}</small>
                            </div>
                            <div class="small">${f.message}</div>
                        </div>`;
                });
            } else {
                html += `<div class="text-muted-c small">No feedback submitted. Rendered absent.</div>`;
            }
            
            html += `</div></div></div>`;
        });
        
        html += `</div>`;
        body.innerHTML = html;
        
    } catch(err) {
        body.innerHTML = `<div class="alert alert-danger">Error retrieving logs.</div>`;
    }
}

async function loadAdminUsers() {
    const userTable = document.getElementById("adminUserTableBody");
    if (!userTable) return;
    
    userTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted-c py-4">Loading member directory & attendance logic...</td></tr>`;
    injectAdminModals();

    try {
        const currentMonthString = new Date().toLocaleString('default', { month: 'long' }) + " " + new Date().getFullYear();
        
        const [usersSnap, scoresSnap, fbSnap] = await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(query(collection(db, "scores"), where("sessionMonth", "==", currentMonthString))),
            getDocs(collection(db, "score_feedback"))
        ]);

        const userScores = {};
        scoresSnap.forEach(d => { userScores[d.data().uploadedByEmail] = true; });

        const userFeedback = {};
        fbSnap.forEach(d => { 
            if (d.data().createdAt) {
                const fbDate = d.data().createdAt.toDate();
                const fbMonth = fbDate.toLocaleString('default', { month: 'long' }) + " " + fbDate.getFullYear();
                if (!userFeedback[d.data().senderEmail]) userFeedback[d.data().senderEmail] = new Set();
                userFeedback[d.data().senderEmail].add(fbMonth);
            }
        });

        userTable.innerHTML = ""; 
        if (usersSnap.empty) {
            userTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted-c py-4">No registered members found.</td></tr>`;
            return;
        }

        const usersArray = [];
        usersSnap.forEach(doc => usersArray.push({ id: doc.id, ...doc.data() }));
        usersArray.sort((a,b) => (a.name || "Z").localeCompare(b.name || "Z"));

        usersArray.forEach((userData) => {
            const isCoreAdmin = ADMIN_EMAILS.includes((userData.email || "").toLowerCase());
            
            if (!isCoreAdmin && userData.role === 'admin') {
                updateDoc(doc(db, "users", userData.id), { role: "member" }).catch(err => console.error("Failed to auto-demote:", err));
            }
            
            const actualRole = isCoreAdmin ? "ADMIN" : "MEMBER";
            const roleBadgeClass = isCoreAdmin ? "bg-warning text-dark" : "badge-kcpo";
            
            const hasRegistered = userScores[userData.email] ? 
                `<i class="bi bi-circle-fill text-success small me-1" title="Registered this month"></i>` : 
                `<i class="bi bi-circle-fill text-danger small me-1" title="Not registered this month"></i>`;
            
            const joinDate = userData.createdAt ? userData.createdAt.toDate() : new Date();
            const totalMonthsSinceJoined = getMonthRange(joinDate).length;
            const uniqueMonthsAttended = userFeedback[userData.email] ? userFeedback[userData.email].size : 0;
            const activePercentage = Math.round((uniqueMonthsAttended / totalMonthsSinceJoined) * 100);
            
            const actionButtons = isCoreAdmin ? 
                `<span class="badge bg-secondary">System Admin</span>` : 
                `<button class="btn btn-sm btn-outline-info me-2" onclick="viewUserParticipation('${userData.email}', '${(userData.name||'').replace(/'/g, "\\'")}', '${userData.id}', '${joinDate.getTime()}')">Participation</button>`;

            userTable.innerHTML += `
                <tr>
                    <td class="text-light">${hasRegistered} ${userData.name || "Unknown Pianist"} <span class="badge bg-secondary ms-2 opacity-75">${activePercentage}% Active</span></td>
                    <td class="text-muted-c">${userData.email}</td>
                    <td><span class="badge ${roleBadgeClass} px-2 py-1">${actualRole}</span></td>
                    <td>${actionButtons}</td>
                </tr>
            `;
        });
    } catch (error) {
        userTable.innerHTML = `<tr><td colspan="4" class="text-danger text-center py-4">Failed to load member directory.</td></tr>`;
    }
}

// ----------------------------------------------------------------------------
// DATA CONCURRENCY ENFORCERS (CASCADE DELETES)
// ----------------------------------------------------------------------------
window.deleteScore = async function(scoreId, skipConfirm = false) {
    if (!skipConfirm && !confirm("Delete this repertoire entry AND wipe all associated feedback?")) return;
    try {
        const fbQ = query(collection(db, "score_feedback"), where("scoreId", "==", scoreId));
        const fbSnap = await getDocs(fbQ);
        fbSnap.forEach(d => deleteDoc(d.ref));
        await deleteDoc(doc(db, "scores", scoreId));
        
        if (!skipConfirm) document.getElementById("repertoireMonthSelect").dispatchEvent(new Event("change"));
    } catch (err) { alert("Concurrency error during deletion."); }
};

window.deleteUserRecord = async function(userId, userEmail) {
    if (!confirm("Are you certain you want to completely WIPE this user and cascade delete all their uploads and feedback?")) return;
    try {
        const scQ = query(collection(db, "scores"), where("uploadedByUid", "==", userId));
        const scSnap = await getDocs(scQ);
        scSnap.forEach(d => window.deleteScore(d.id, true)); 
        
        const fbQ = query(collection(db, "score_feedback"), where("senderEmail", "==", userEmail));
        const fbSnap = await getDocs(fbQ);
        fbSnap.forEach(d => deleteDoc(d.ref));
        
        await deleteDoc(doc(db, "users", userId));
        alert("Member profile and associated data successfully wiped.");
        loadAdminUsers(); 
    } catch (error) { alert("Failed to wipe member: " + error.message); }
};

// ----------------------------------------------------------------------------
// REGISTRATION & DASHBOARDS
// ----------------------------------------------------------------------------
function initRegistrationForm() {
    const form = document.getElementById("slotRegistrationForm");
    if (!form) return;

    const regTypeObj = document.getElementById("regMediaType");
    const regFileObj = document.getElementById("actionPdfFile");
    if (regTypeObj && regFileObj) {
        regTypeObj.addEventListener("change", (e) => {
            if (e.target.value === "image") {
                regFileObj.accept = "image/*";
                regFileObj.multiple = true;
            } else {
                regFileObj.accept = "application/pdf";
                regFileObj.multiple = false;
            }
            regFileObj.value = ""; 
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!auth.currentUser) {
            const authModal = new bootstrap.Modal(document.getElementById('authModal'));
            document.getElementById('signup-tab').click();
            authModal.show();
            showAuthAlert("Please create an account to secure your performance slot and upload media.", "info");
            return;
        }

        if (!form.checkValidity()) { form.classList.add("was-validated"); return; }

        const btn = form.querySelector("button[type=submit]");
        const status = document.getElementById("registrationStatus");
        const month = document.getElementById("sessionMonth").value;
        const title = document.getElementById("repertoire").value.trim();

        const fName = document.getElementById("firstName")?.value.trim() || "";
        const lName = document.getElementById("lastName")?.value.trim() || "";
        const formEmail = document.getElementById("email")?.value.trim() || auth.currentUser.email;
        const isHybrid = document.getElementById("hybridCheck")?.checked || false;
        const fullName = (fName + " " + lName).trim() || sessionStorage.getItem("kcpo_name") || "Member";

        btn.disabled = true; btn.textContent = "Uploading Media to R2..."; status.classList.add("d-none");

        try {
            const uploadedMedia = await uploadMediaArray(regFileObj.files);
            
            let fileType = 'image';
            for (let i = 0; i < regFileObj.files.length; i++) {
                if (regFileObj.files[i].type.includes('pdf')) fileType = 'pdf';
            }
            
            const joinedUrls = uploadedMedia.map(m => m.url).join(',');

            await addDoc(collection(db, "scores"), {
                pieceTitle: title,
                pdfUrl: joinedUrls,
                mediaType: fileType, 
                fileName: regFileObj.files[0].name,
                sessionMonth: month,
                uploadedByEmail: formEmail,
                uploadedByUid: auth.currentUser.uid,
                uploaderName: fullName, 
                isHybrid: isHybrid,
                createdAt: serverTimestamp()
            });

            status.className = "alert alert-success mt-3 d-block";
            status.textContent = "Slot secured successfully!";
            form.reset(); form.classList.remove("was-validated");
            
        } catch (err) {
            status.className = "alert alert-danger mt-3 d-block"; status.textContent = err.message;
        } finally {
            btn.disabled = false; btn.textContent = "Submit Registration";
        }
    });
}

function initMasterclasses() {
    const monthSelect = document.getElementById("repertoireMonthSelect");
    if (!monthSelect) return;

    loadRepertoireForMonth(monthSelect.value);
    monthSelect.addEventListener("change", (e) => { loadRepertoireForMonth(e.target.value); });

    const chatForm = document.getElementById("chatSubmitForm");
    if (chatForm) {
        chatForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const scoreId = document.getElementById("currentChatScoreId").value;
            const pieceTitle = document.getElementById("chatPieceTitle").value;
            const performerEmail = document.getElementById("chatPerformerEmail").value;
            const performerName = chatForm.dataset.performerName || "Pianist";
            
            const msgInput = document.getElementById("chatInputMessage");
            const submitBtn = document.getElementById("chatSubmitBtn");
            const statusMsg = document.getElementById("chatStatusMsg");
            
            const msg = msgInput.value.trim();
            if (!msg || !auth.currentUser) return;

            submitBtn.disabled = true; submitBtn.textContent = "Sending...";
            const finalAttachments = window.pendingAttachments || [];

            try {
                await addDoc(collection(db, "score_feedback"), {
                    scoreId: scoreId,
                    pieceTitle: pieceTitle,
                    performerEmail: performerEmail,
                    performerName: performerName,
                    message: msg,
                    attachments: finalAttachments,
                    senderEmail: auth.currentUser.email,
                    senderName: sessionStorage.getItem("kcpo_name") || auth.currentUser.email,
                    createdAt: serverTimestamp()
                });
                
                msgInput.value = ""; window.pendingAttachments = []; 
                statusMsg.className = "small mt-2 text-center text-success";
                statusMsg.textContent = "Feedback sent successfully!";
                setTimeout(() => { statusMsg.textContent = ""; }, 3000);
                
                loadChatMessages(scoreId); 
            } catch (err) { 
                statusMsg.className = "small mt-2 text-center text-danger";
                statusMsg.textContent = "Failed to send feedback.";
            } finally {
                submitBtn.disabled = false; submitBtn.textContent = "Send";
            }
        });
    }
}

async function loadRepertoireForMonth(targetMonth) {
    const list = document.getElementById('repertoireList');
    if (!list) return;
    list.innerHTML = `<div class="text-center text-muted-c w-100">Loading repertoire...</div>`;

    try {
        const q = query(collection(db, "scores"), where("sessionMonth", "==", targetMonth));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            list.innerHTML = `<div class="alert kcpo-card border-line text-muted-c text-center w-100 py-4"><i class="bi bi-calendar-x me-2 accent-gold"></i> No presentations scheduled for ${targetMonth} yet.</div>`;
            return;
        }

        list.innerHTML = "";
        const currentDate = new Date();
        const currentMonthString = currentDate.toLocaleString('default', { month: 'long' }) + " " + currentDate.getFullYear();
        
        let isAdmin = false;
        if (auth.currentUser && auth.currentUser.email) {
            isAdmin = ADMIN_EMAILS.includes(auth.currentUser.email.toLowerCase());
        }
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const scoreId = docSnap.id;
            const isOwner = auth.currentUser && auth.currentUser.uid === data.uploadedByUid;
            const allowDelete = isAdmin || (isOwner && targetMonth !== currentMonthString);
            const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleString() : "Recently";
            const mediaTypeStr = data.mediaType || 'pdf'; 
            const viewUrl = data.pdfUrl ? data.pdfUrl.split(',')[0] : '#';

            list.innerHTML += `
                <div class="col-md-6 col-lg-4">
                    <div class="card kcpo-card p-4 h-100 d-flex flex-column">
                        <h5 class="accent-gold mb-1">${data.pieceTitle}</h5>
                        <p class="small text-muted-c mb-3">
                            <i class="bi bi-person me-1"></i>${data.uploaderName || "Pianist"}<br>
                            <i class="bi bi-clock me-1"></i>${dateStr}
                        </p>
                        
                        <div class="mt-auto d-flex flex-column gap-2">
                            <button type="button" onclick="openSecureMedia('${viewUrl}')" class="btn btn-outline-gold btn-sm"><i class="bi bi-box-arrow-up-right me-1"></i> View Media</button>
                            <button class="btn btn-outline-line btn-sm" onclick="openFeedbackChat('${scoreId}', '${data.pieceTitle.replace(/'/g, "\\'")}', ${data.chatLocked || false}, '${data.uploadedByEmail}', '${(data.uploaderName||"").replace(/'/g, "\\'")}', '${data.pdfUrl}', '${mediaTypeStr}')">
                                <i class="bi bi-chat-text me-1"></i> Feedback Chat
                            </button>
                            ${allowDelete ? `<button class="btn btn-outline-danger btn-sm mt-1" onclick="deleteScore('${scoreId}')"><i class="bi bi-trash"></i> Remove</button>` : ''}
                        </div>
                    </div>
                </div>`;
        });
    } catch (err) {
        list.innerHTML = `<div class="text-danger w-100">Failed to load repertoire.</div>`;
    }
}

window.openFeedbackChat = function(scoreId, title, isLocked, performerEmail, performerName, mediaUrlsString, mediaType) {
    document.getElementById("chatModalTitle").textContent = `Feedback: ${title}`;
    document.getElementById("currentChatScoreId").value = scoreId;
    document.getElementById("chatPieceTitle").value = title;
    document.getElementById("chatPerformerEmail").value = performerEmail;
    
    const chatForm = document.getElementById("chatSubmitForm");
    if (chatForm) chatForm.dataset.performerName = performerName || "Pianist";
    
    let annotateBtn = document.getElementById('btnLaunchAnnotator');
    if (!annotateBtn && chatForm) {
        annotateBtn = document.createElement('button');
        annotateBtn.id = 'btnLaunchAnnotator';
        annotateBtn.className = 'btn btn-outline-danger btn-sm w-100 mb-3';
        annotateBtn.innerHTML = '<i class="bi bi-pen"></i> Open Media to Annotate';
        chatForm.parentNode.insertBefore(annotateBtn, chatForm);
    }
    
    if (annotateBtn) {
        annotateBtn.onclick = () => openMediaAnnotator(mediaUrlsString, mediaType);
    }
    
    window.pendingAttachments = [];
    const input = document.getElementById("chatInputMessage");
    const submitBtn = document.getElementById("chatSubmitBtn");
    const statusMsg = document.getElementById("chatStatusMsg");
    const adminControls = document.getElementById("adminChatControls");
    
    adminControls.innerHTML = ""; statusMsg.textContent = ""; 
    
    let isAdmin = false;
    if (auth.currentUser && auth.currentUser.email) {
        isAdmin = ADMIN_EMAILS.includes(auth.currentUser.email.toLowerCase());
    }
    
    if (isLocked && !isAdmin) {
        input.disabled = true; submitBtn.disabled = true; if(annotateBtn) annotateBtn.disabled = true;
        statusMsg.className = "small mt-2 text-center text-danger";
        statusMsg.textContent = "This feedback session has been locked by an admin.";
    } else {
        input.disabled = !auth.currentUser; submitBtn.disabled = !auth.currentUser; if(annotateBtn) annotateBtn.disabled = !auth.currentUser;
        statusMsg.className = "small mt-2 text-center text-muted-c";
        statusMsg.textContent = !auth.currentUser ? "You must be signed in to leave feedback." : "";
        
        if (isAdmin) {
            adminControls.innerHTML = `<button class="btn btn-sm ${isLocked ? 'btn-success' : 'btn-warning'}" onclick="toggleChatLock('${scoreId}', ${!isLocked})">${isLocked ? 'Unlock Chat' : 'Lock Chat'}</button>`;
        }
    }
    
    loadChatMessages(scoreId);
    new bootstrap.Modal(document.getElementById('chatModal')).show();
};

window.toggleChatLock = async function(scoreId, lockState) {
    await updateDoc(doc(db, "scores", scoreId), { chatLocked: lockState });
    bootstrap.Modal.getInstance(document.getElementById('chatModal')).hide();
    document.getElementById("repertoireMonthSelect").dispatchEvent(new Event("change")); 
};

async function loadChatMessages(scoreId) {
    const box = document.getElementById("chatMessages");
    box.innerHTML = "<small class='text-muted-c'>Loading feedback...</small>";
    try {
        const q = query(collection(db, "score_feedback"), where("scoreId", "==", scoreId), orderBy("createdAt", "asc"));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { box.innerHTML = "<small class='text-muted-c'>No feedback recorded yet. Be the first to review!</small>"; return; }
        
        box.innerHTML = "";
        let isAdmin = false;
        if (auth.currentUser && auth.currentUser.email) {
            isAdmin = ADMIN_EMAILS.includes(auth.currentUser.email.toLowerCase());
        }
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            box.innerHTML += `
                <div class="p-2 border-bottom border-line">
                    <div class="d-flex justify-content-between">
                        <strong class="small accent-gold">${data.senderName || data.senderEmail}</strong>
                        ${isAdmin ? `<i class="bi bi-trash text-danger" style="cursor:pointer;" onclick="deleteFeedbackMsg('${docSnap.id}', '${scoreId}')"></i>` : ''}
                    </div>
                    <div class="small">${data.message}</div>
                    ${generateMediaBadges(data.attachments)}
                </div>`;
        });
    } catch (error) { box.innerHTML = `<div class="alert alert-danger small p-2 text-center mt-2">Failed to load feedback.</div>`; }
}

window.deleteFeedbackMsg = async function(msgId, scoreId) {
    if (!confirm("Delete this comment?")) return;
    await deleteDoc(doc(db, "score_feedback", msgId));
    loadChatMessages(scoreId);
};

// ----------------------------------------------------------------------------
// MEMBER DASHBOARD & HUB LOGIC
// ----------------------------------------------------------------------------
async function loadCommunicationsHub() {
    const feed = document.getElementById("communicationsFeed");
    if (!feed) return;
    feed.innerHTML = "<div class='text-center text-muted-c my-5'>Loading broadcasts...</div>";
    
    try {
        const q = query(collection(db, "communications"), where("type", "==", "broadcast"));
        const querySnapshot = await getDocs(q);
        let posts = [];
        querySnapshot.forEach(docSnap => { posts.push({ id: docSnap.id, ...docSnap.data() }); });
        
        if (posts.length === 0) { feed.innerHTML = "<div class='text-center text-muted-c my-5'>No public broadcasts found.</div>"; return; }
        posts.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        
        feed.innerHTML = "";
        posts.forEach(post => {
            const dateStr = post.createdAt ? post.createdAt.toDate().toLocaleString() : "Recently";
            const badgeHtml = `<span class="badge bg-gold text-dark ms-2">Broadcast</span>`;
            feed.innerHTML += `
                <div class="card kcpo-card p-4 mb-4 border-secondary">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="mb-1 text-light">${post.title} ${badgeHtml}</h5>
                            <small class="text-muted-c">From: KCPO Admin • ${dateStr}</small>
                        </div>
                    </div>
                    <div class="text-light" style="white-space: pre-wrap;">${post.message}</div>
                    ${generateMediaBadges(post.attachments)}
                </div>`;
        });
    } catch (err) { feed.innerHTML = "<div class='alert alert-danger'>Failed to load broadcasts. Please check your connection.</div>"; }
}

async function loadMemberInbox(user) {
    const inboxFeed = document.getElementById("memberInboxFeed");
    if (!inboxFeed) return;
    inboxFeed.innerHTML = "<div class='text-center text-muted-c my-5'>Loading inbox...</div>";

    try {
        const feedbackQuery = query(collection(db, "score_feedback"), where("performerEmail", "==", user.email));
        const feedbackSnap = await getDocs(feedbackQuery);
        const broadcastQuery = query(collection(db, "communications"), where("type", "==", "broadcast"));
        const broadcastSnap = await getDocs(broadcastQuery);
        const dmQuery = query(collection(db, "communications"), where("targetUid", "==", user.uid));
        const dmSnap = await getDocs(dmQuery);
        
        let messages = [];
        feedbackSnap.forEach(doc => { messages.push({ ...doc.data(), source: 'feedback' }); });
        broadcastSnap.forEach(doc => { messages.push({ ...doc.data(), source: 'comm' }); });
        dmSnap.forEach(doc => { if (doc.data().type !== "broadcast") messages.push({ ...doc.data(), source: 'comm' }); });
        
        if (messages.length === 0) {
            inboxFeed.innerHTML = `<div class="card kcpo-card p-4 text-center"><i class="bi bi-envelope-paper display-4 text-faint-c mb-3"></i><p class="text-muted-c small mb-0">Your inbox is empty.</p></div>`; return;
        }

        messages.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        inboxFeed.innerHTML = "";
        
        messages.forEach((item) => {
            const dateStr = item.createdAt ? item.createdAt.toDate().toLocaleDateString() : "Recently";
            if (item.source === 'feedback') {
                inboxFeed.innerHTML += `
                    <div class="card kcpo-card p-3 mb-2">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge badge-kcpo">${item.pieceTitle || "Repertoire Item"}</span>
                            <small class="text-muted-c">Feedback From: ${item.senderName || "Member"} • ${dateStr}</small>
                        </div>
                        <p class="small mb-0 text-muted-c">${item.message}</p>
                        ${generateMediaBadges(item.attachments)}
                    </div>`;
            } else {
                const isDM = item.type === "direct";
                const badgeHtml = isDM ? `<span class="badge bg-danger ms-2">Direct Message</span>` : `<span class="badge bg-gold text-dark ms-2">Admin Broadcast</span>`;
                inboxFeed.innerHTML += `
                    <div class="card kcpo-card p-3 mb-2 border-${isDM ? 'danger' : 'secondary'}">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <strong>${item.title} ${badgeHtml}</strong>
                            <small class="text-muted-c">${dateStr}</small>
                        </div>
                        <p class="small mb-2 text-light" style="white-space: pre-wrap;">${item.message}</p>
                        ${generateMediaBadges(item.attachments)}
                    </div>`;
            }
        });
    } catch (error) { inboxFeed.innerHTML = "<div class='text-danger'>Failed to load inbox.</div>"; }
}

async function initAdminDashboard() {
    const adminContent = document.getElementById("adminContent");
    if (!adminContent) return;

    const accessMsg = document.getElementById("accessDeniedMsg");
    
    onAuthStateChanged(auth, async (user) => {
        if (user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
            if (accessMsg) accessMsg.classList.add("d-none");
            adminContent.classList.remove("d-none");
            await loadAdminUsers();
            await loadAdminFeedback();
            initAdminBroadcasts();
        } else {
            adminContent.classList.add("d-none");
            if (accessMsg) accessMsg.classList.remove("d-none");
        }
    });
}

async function initMemberDashboard() {
    const memberContent = document.getElementById("memberContent");
    if (!memberContent) return;

    const accessDeniedMsg = document.getElementById("memberAccessDenied");
    
    const memTypeObj = document.getElementById("memberMediaType");
    const memFileObj = document.getElementById("pdfFile");
    if (memTypeObj && memFileObj) {
        memTypeObj.addEventListener("change", (e) => {
            if (e.target.value === "image") {
                memFileObj.accept = "image/*";
                memFileObj.multiple = true;
            } else {
                memFileObj.accept = "application/pdf";
                memFileObj.multiple = false;
            }
            memFileObj.value = "";
        });
    }
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            accessDeniedMsg?.classList.add("d-none");
            memberContent.classList.remove("d-none");
            await loadMemberInbox(user);
            const uploadForm = document.getElementById("memberScoreUploadForm");
            
            if (uploadForm && !uploadForm.dataset.initialized) {
                uploadForm.dataset.initialized = "true";
                uploadForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const titleInput = document.getElementById("scoreTitle");
                    const monthInput = document.getElementById("memberSessionMonth");
                    const statusBox = document.getElementById("uploadStatusBox");
                    const submitBtn = uploadForm.querySelector("button[type=submit]");

                    if (memFileObj.files.length === 0) return;

                    submitBtn.disabled = true; submitBtn.innerHTML = `Uploading to R2...`; statusBox.classList.add("d-none");

                    try {
                        const uploadedMedia = await uploadMediaArray(memFileObj.files);
                        
                        let fileType = 'image';
                        for (let i = 0; i < memFileObj.files.length; i++) {
                            if (memFileObj.files[i].type.includes('pdf')) fileType = 'pdf';
                        }
                        
                        const joinedUrls = uploadedMedia.map(m => m.url).join(',');

                        await addDoc(collection(db, "scores"), {
                            pieceTitle: titleInput.value.trim(),
                            pdfUrl: joinedUrls, 
                            mediaType: fileType, 
                            fileName: memFileObj.files[0].name,
                            sessionMonth: monthInput.value,
                            uploadedByEmail: user.email, 
                            uploadedByUid: user.uid,
                            uploaderName: sessionStorage.getItem("kcpo_name") || "Member",
                            createdAt: serverTimestamp()
                        });

                        statusBox.className = "alert alert-success small p-2 mt-3 d-block"; 
                        statusBox.textContent = "Media uploaded successfully to R2!"; 
                        uploadForm.reset();
                        
                    } catch (error) {
                        statusBox.className = "alert alert-danger small p-2 mt-3 d-block"; statusBox.textContent = "Upload failed: " + error.message;
                    } finally { 
                        submitBtn.disabled = false; submitBtn.textContent = "Upload to Repository"; 
                    }
                });
            }
        } else {
            memberContent.classList.add("d-none");
            accessDeniedMsg?.classList.remove("d-none");
        }
    });
}

// ----------------------------------------------------------------------------
// BOOT SEQUENCE
// ----------------------------------------------------------------------------
initTheme(); 
markActiveNavLink(); 
injectAuthModal(); 
injectImageViewer(); 
initAuth();
populateDynamicMonths(); 
initRegistrationForm(); 
initMasterclasses(); 
initAdminDashboard(); 
initMemberDashboard();