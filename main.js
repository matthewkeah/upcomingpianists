/**
 * ============================================================================
 * KCPO PORTAL — APP ENGINE
 * Loaded as a module on every page: <script type="module" src="main.js"></script>
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

// Cloudinary Endpoints
const CLOUDINARY_RAW_URL = "https://api.cloudinary.com/v1_1/xy7vxeyj/raw/upload"; 
const CLOUDINARY_IMAGE_URL = "https://api.cloudinary.com/v1_1/xy7vxeyj/image/upload"; 
const CLOUDINARY_VIDEO_URL = "https://api.cloudinary.com/v1_1/xy7vxeyj/video/upload"; 
const CLOUDINARY_PRESET = "qe5c4qkd"; 

// EmailJS Credentials
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
    const memberUploadDropdown = document.getElementById("memberSessionMonth"); // New Target
    
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

    // Populate the new member dashboard dropdown
    if (memberUploadDropdown) {
        upcomingMonths.forEach(monthStr => {
            const opt = document.createElement("option");
            opt.value = monthStr;
            opt.textContent = monthStr;
            memberUploadDropdown.appendChild(opt);
        });
    }
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
                            <div class="mb-4"><input type="password" class="form-control field" id="signInPassword" required placeholder="Password"></div>
                            <button type="submit" class="btn btn-gold w-100 py-2">Sign In</button>
                        </form>
                    </div>
                    <div class="tab-pane fade" id="signup-pane">
                        <form id="signUpForm">
                            <div class="mb-3"><input type="text" class="form-control field" id="signUpName" required placeholder="Full Name"></div>
                            <div class="mb-3"><input type="email" class="form-control field" id="signUpEmail" required placeholder="Email"></div>
                            <div class="mb-4"><input type="password" class="form-control field" id="signUpPassword" required placeholder="Min 6 chars"></div>
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
            } catch (err) { 
                showAuthAlert(err.message); 
            }
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
                    name: name,
                    email: email,
                    role: ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "member",
                    createdAt: serverTimestamp()
                });
                
                window.location.reload();
            } catch (err) { 
                showAuthAlert(err.message); 
            }
        });
    }
}

// ----------------------------------------------------------------------------
// IN-APP IMAGE VIEWER (LIGHTBOX) WITH GALLERY
// ----------------------------------------------------------------------------
let currentGallery = [];
let currentImageIndex = 0;

const IMAGE_VIEWER_HTML = `
<div class="modal fade" id="imageViewerModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content bg-transparent border-0 position-relative">
            <div class="modal-header border-0 pb-0 justify-content-end">
                <button type="button" class="btn btn-dark rounded-circle" data-bs-dismiss="modal" aria-label="Close" style="opacity: 0.8;"><i class="bi bi-x-lg text-light"></i></button>
            </div>
            <div class="modal-body text-center p-0 mt-2 position-relative">
                <button id="btnViewerPrev" class="btn btn-dark rounded-circle position-absolute top-50 start-0 translate-middle-y ms-3" style="opacity: 0.8; z-index: 10;"><i class="bi bi-chevron-left text-light fs-4"></i></button>
                <img id="viewerImageTarget" src="" class="img-fluid rounded" style="max-height: 85vh; box-shadow: 0 10px 30px rgba(0,0,0,0.8);" alt="Annotated Score">
                <button id="btnViewerNext" class="btn btn-dark rounded-circle position-absolute top-50 end-0 translate-middle-y me-3" style="opacity: 0.8; z-index: 10;"><i class="bi bi-chevron-right text-light fs-4"></i></button>
            </div>
        </div>
    </div>
</div>`;

function injectImageViewer() {
    if (!document.getElementById("imageViewerModal")) {
        document.body.insertAdjacentHTML("beforeend", IMAGE_VIEWER_HTML);
        
        document.getElementById('btnViewerPrev').addEventListener('click', () => {
            if (currentImageIndex > 0) {
                currentImageIndex--;
                updateViewerImage();
            }
        });
        
        document.getElementById('btnViewerNext').addEventListener('click', () => {
            if (currentImageIndex < currentGallery.length - 1) {
                currentImageIndex++;
                updateViewerImage();
            }
        });
    }
}

window.updateViewerImage = function() {
    if (!currentGallery || currentGallery.length === 0) return;
    
    const targetImg = document.getElementById('viewerImageTarget');
    targetImg.src = currentGallery[currentImageIndex];
    
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
// INTERACTIVE PDF ANNOTATION ENGINE
// ----------------------------------------------------------------------------
const PDF_MODAL_HTML = `
<div class="modal fade" id="annotatorModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static" style="z-index: 1055;">
    <div class="modal-dialog modal-fullscreen">
        <div class="modal-content bg-dark text-light">
            <div class="modal-header border-secondary py-2 align-items-center">
                <h5 class="modal-title fs-6 accent-gold"><i class="bi bi-pen"></i> Score Editor</h5>
                <div class="ms-auto d-flex gap-2 align-items-center">
                    <span id="pdfPageIndicator" class="small me-2 text-muted-c">Page 1</span>
                    <button class="btn btn-sm btn-outline-secondary" id="btnPdfPrev"><i class="bi bi-chevron-left"></i></button>
                    <button class="btn btn-sm btn-outline-secondary" id="btnPdfNext"><i class="bi bi-chevron-right"></i></button>
                    <div class="vr mx-1 bg-secondary"></div>
                    <button class="btn btn-sm btn-success" id="btnPdfDone">Done <span id="pdfSpinner" class="spinner-border spinner-border-sm d-none"></span></button>
                    <button class="btn btn-sm btn-outline-light" data-bs-dismiss="modal"><i class="bi bi-x-lg"></i></button>
                </div>
            </div>
            <div class="bg-secondary text-center p-2 d-flex justify-content-center gap-3 border-bottom border-dark">
                <button class="btn btn-sm btn-outline-light active" id="toolMove" onclick="setPdfTool('none')"><i class="bi bi-arrows-move"></i> Zoom / Move</button>
                <button class="btn btn-sm btn-outline-danger" id="toolPen" onclick="setPdfTool('pen')"><i class="bi bi-pen"></i> Red Pen</button>
                <button class="btn btn-sm btn-outline-warning" id="toolHighlight" onclick="setPdfTool('highlighter')"><i class="bi bi-marker"></i> Highlighter</button>
            </div>
            <div class="modal-body p-0 overflow-auto" id="pdfContainer" style="position: relative; background: #222; height: calc(100vh - 110px); display: flex; justify-content: center; align-items: flex-start;">
                <div id="pdfCanvasWrapper" style="position: relative; margin-top: 1rem; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                    <canvas id="pdfRenderCanvas" style="display: block; background: white;"></canvas>
                    <canvas id="pdfDrawCanvas" style="position: absolute; top: 0; left: 0; pointer-events: none; touch-action: none; display: block;"></canvas>
                    <canvas id="pdfActiveStrokeCanvas" style="position: absolute; top: 0; left: 0; pointer-events: none; touch-action: none; display: block;"></canvas>
                </div>
            </div>
        </div>
    </div>
</div>`;

let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumIsPending = null;
let pdfScale = 1.5;
    
let pdfCanvas, pdfCtx, drawCanvas, drawCtx, activeCanvas, activeCtx;
let currentTool = 'none'; 
let isDrawing = false;
let currentStroke = []; 

let pageDrawings = {};
let pagesEdited = new Set(); 

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

window.setPdfTool = function(tool) {
    currentTool = tool;
    
    document.getElementById('toolMove').classList.remove('active');
    document.getElementById('toolPen').classList.remove('active');
    document.getElementById('toolHighlight').classList.remove('active');
    
    if (tool === 'none') {
        document.getElementById('toolMove').classList.add('active');
        drawCanvas.style.pointerEvents = 'none'; 
    } else {
        if (tool === 'pen') {
            document.getElementById('toolPen').classList.add('active');
        } else if (tool === 'highlighter') {
            document.getElementById('toolHighlight').classList.add('active');
        }
        drawCanvas.style.pointerEvents = 'auto'; 
    }
}

function startDrawing(e) {
    if (currentTool === 'none') return;
    
    isDrawing = true;
    
    const rect = drawCanvas.getBoundingClientRect();
    const scaleX = drawCanvas.width / rect.width;
    const scaleY = drawCanvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    currentStroke = [{x, y}];
    
    activeCtx.lineCap = 'round';
    activeCtx.lineJoin = 'round';
    
    if (currentTool === 'pen') {
        activeCtx.strokeStyle = '#ff0000';
        activeCtx.lineWidth = 3;
        activeCtx.globalAlpha = 1.0;
    } else if (currentTool === 'highlighter') {
        activeCtx.strokeStyle = '#ff0000';
        activeCtx.lineWidth = 24;
        activeCtx.globalAlpha = 0.3; 
    }
}

function draw(e) {
    if (!isDrawing || currentTool === 'none') return;
    
    e.preventDefault(); 
    pagesEdited.add(pageNum); 
    
    const rect = drawCanvas.getBoundingClientRect();
    const scaleX = drawCanvas.width / rect.width;
    const scaleY = drawCanvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
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
}

function saveCurrentPageDrawings() {
    if (pagesEdited.has(pageNum)) {
        pageDrawings[pageNum] = drawCanvas.toDataURL("image/png");
    }
}

function renderPdfPage(num) {
    pageIsRendering = true;
    
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale: pdfScale });
        
        pdfCanvas.height = viewport.height;
        pdfCanvas.width = viewport.width;
        
        drawCanvas.height = viewport.height;
        drawCanvas.width = viewport.width;
        
        activeCanvas.height = viewport.height;
        activeCanvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: pdfCtx,
            viewport: viewport
        };
        
        page.render(renderContext).promise.then(() => {
            pageIsRendering = false;
            
            drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            activeCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
            
            if (pageDrawings[num]) {
                const img = new Image();
                img.onload = () => drawCtx.drawImage(img, 0, 0);
                img.src = pageDrawings[num];
            }
            
            if (pageNumIsPending !== null) {
                renderPdfPage(pageNumIsPending);
                pageNumIsPending = null;
            }
        });
    });
    
    document.getElementById('pdfPageIndicator').textContent = `Page ${num} of ${pdfDoc.numPages}`;
}

function queueRenderPage(num) {
    if (pageIsRendering) {
        pageNumIsPending = num;
    } else {
        renderPdfPage(num);
    }
}

function onPrevPage() {
    if (pageNum <= 1) return;
    saveCurrentPageDrawings();
    pageNum--;
    queueRenderPage(pageNum);
}

function onNextPage() {
    if (pageNum >= pdfDoc.numPages) return;
    saveCurrentPageDrawings();
    pageNum++;
    queueRenderPage(pageNum);
}

window.openPdfAnnotator = async function(pdfUrl) {
    if (!pdfUrl) return alert("Score file not found.");
    
    injectPdfModal();
    
    pageDrawings = {};
    pagesEdited.clear();
    pageNum = 1;
    setPdfTool('none');
    
    const annotatorModal = new bootstrap.Modal(document.getElementById('annotatorModal'));
    annotatorModal.show();
    
    pdfCtx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    pdfCtx.fillText("Loading PDF Engine...", 10, 50);
    
    try {
        const pdfjs = await loadPDFJSLibrary();
        const loadingTask = pdfjs.getDocument(pdfUrl);
        pdfDoc = await loadingTask.promise;
        renderPdfPage(pageNum);
    } catch (err) {
        console.error("PDF Load Error:", err);
        alert("Failed to load PDF viewer.");
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
    
    btn.disabled = true;
    spinner.classList.remove('d-none');
    
    try {
        window.pendingAttachments = [];
        
        for (let num of pagesEdited) {
            const page = await pdfDoc.getPage(num);
            const viewport = page.getViewport({ scale: pdfScale });
            
            const offScreenCanvas = document.createElement('canvas');
            offScreenCanvas.width = viewport.width;
            offScreenCanvas.height = viewport.height;
            const offCtx = offScreenCanvas.getContext('2d');
            
            await page.render({ canvasContext: offCtx, viewport: viewport }).promise;
            
            const img = new Image();
            await new Promise((resolve) => {
                img.onload = resolve;
                img.src = pageDrawings[num];
            });
            offCtx.drawImage(img, 0, 0);
            
            const mergedDataUrl = offScreenCanvas.toDataURL("image/png");
            
            const formData = new FormData();
            formData.append("file", mergedDataUrl);
            formData.append("upload_preset", CLOUDINARY_PRESET);
            
            const cloudinaryRes = await fetch(CLOUDINARY_IMAGE_URL, { 
                method: "POST", 
                body: formData 
            });
            
            const cloudinaryData = await cloudinaryRes.json();
            
            window.pendingAttachments.push({ 
                url: cloudinaryData.secure_url, 
                type: 'image' 
            });
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
        btn.disabled = false;
        spinner.classList.add('d-none');
    }
}

// ----------------------------------------------------------------------------
// CLOUDINARY UPLOAD ROUTER (Supports Docs, Videos, Images)
// ----------------------------------------------------------------------------
async function uploadMediaArray(fileList) {
    const uploadedData = [];
    
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        let endpoint = CLOUDINARY_RAW_URL; 
        let fileType = 'raw';
        
        if (file.type.startsWith('image/')) { 
            endpoint = CLOUDINARY_IMAGE_URL; 
            fileType = 'image'; 
        } else if (file.type.startsWith('video/')) { 
            endpoint = CLOUDINARY_VIDEO_URL; 
            fileType = 'video'; 
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_PRESET);
        
        const res = await fetch(endpoint, { method: "POST", body: formData });
        const data = await res.json();
        
        uploadedData.push({ 
            url: data.secure_url, 
            type: fileType, 
            name: file.name 
        });
    }
    
    return uploadedData;
}

function generateMediaBadges(attachmentsArray) {
    if (!attachmentsArray || attachmentsArray.length === 0) return '';
    
    let html = '<div class="mt-2 d-flex gap-2 flex-wrap">';
    
    const imageGallery = attachmentsArray.filter(a => a.type === 'image').map(a => a.url);
    const encodedGallery = encodeURIComponent(JSON.stringify(imageGallery));
    
    let imgCounter = 0;
    
    attachmentsArray.forEach((media) => {
        if (media.type === 'image') {
            html += `<span onclick="openImageViewer('${encodedGallery}', ${imgCounter})" class="badge bg-danger text-light" style="cursor: pointer;"><i class="bi bi-image"></i> Image</span>`;
            imgCounter++;
        } else if (media.type === 'video') {
            html += `<a href="${media.url}" target="_blank" class="badge bg-warning text-dark text-decoration-none"><i class="bi bi-play-circle"></i> Video</a>`;
        } else {
            html += `<a href="${media.url}" target="_blank" class="badge bg-secondary text-light text-decoration-none"><i class="bi bi-file-earmark-pdf"></i> ${media.name ? media.name.substring(0,10) + '...' : 'Document'}</a>`;
        }
    });
    
    html += '</div>';
    return html;
}

// ----------------------------------------------------------------------------
// COMMUNICATIONS HUB (BROADCASTS ONLY)
// ----------------------------------------------------------------------------
async function loadCommunicationsHub() {
    const feed = document.getElementById("communicationsFeed");
    if (!feed) return;
    
    feed.innerHTML = "<div class='text-center text-muted-c my-5'>Loading broadcasts...</div>";
    
    try {
        const q = query(collection(db, "communications"), where("type", "==", "broadcast"));
        const querySnapshot = await getDocs(q);
        let posts = [];
        
        querySnapshot.forEach(docSnap => {
            posts.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        if (posts.length === 0) {
            feed.innerHTML = "<div class='text-center text-muted-c my-5'>No public broadcasts found.</div>";
            return;
        }

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
                </div>
            `;
        });
        
    } catch (err) {
        console.error("Failed to load hub:", err);
        feed.innerHTML = "<div class='alert alert-danger'>Failed to load broadcasts. Please check your connection.</div>";
    }
}

// ----------------------------------------------------------------------------
// ADMIN DIRECTORY & COMPOSER LOGIC
// ----------------------------------------------------------------------------
window.setComposerTarget = function(uid, name, email) {
    document.getElementById('broadcastTargetUid').value = uid;
    document.getElementById('broadcastTargetEmail').value = email;
    
    if (uid === 'all') {
        document.getElementById('composerTargetLabel').textContent = "Broadcasting to: All Members";
        document.getElementById('composerPrivateBadge').classList.add('d-none');
    } else {
        document.getElementById('composerTargetLabel').textContent = `Direct Message: ${name}`;
        document.getElementById('composerPrivateBadge').classList.remove('d-none');
    }
    
    if (window.innerWidth < 992) {
        document.getElementById('adminBroadcastForm').scrollIntoView({behavior: 'smooth'});
    }
}

function filterDirectory() {
    const searchInput = document.getElementById('adminMemberSearch');
    if (!searchInput) return;
    
    const queryStr = searchInput.value.toLowerCase();
    const list = document.getElementById('adminMemberList');
    list.innerHTML = "";
    
    globalUserDirectory.filter(u => u.name.toLowerCase().includes(queryStr) || u.email.toLowerCase().includes(queryStr))
    .forEach(u => {
        list.innerHTML += `
            <button class="list-group-item list-group-item-action bg-transparent border-secondary text-light py-3" 
                    onclick="setComposerTarget('${u.id}', '${u.name.replace(/'/g, "\\'")}', '${u.email}')">
                <strong>${u.name}</strong><br>
                <small class="text-muted-c">${u.email}</small>
            </button>`;
    });
}

async function loadAdminDirectory() {
    const list = document.getElementById("adminMemberList");
    if (!list) return;
    
    try {
        const snap = await getDocs(collection(db, "users"));
        globalUserDirectory = [];
        
        snap.forEach(doc => {
            const data = doc.data();
            globalUserDirectory.push({ 
                id: doc.id, 
                name: data.name || "Unknown", 
                email: data.email 
            });
        });
        
        globalUserDirectory.sort((a,b) => a.name.localeCompare(b.name));
        filterDirectory();
        
        document.getElementById('adminMemberSearch').addEventListener('input', filterDirectory);
        
    } catch (err) { 
        console.error("Failed to load directory", err); 
    }
}

async function initAdminBroadcasts() {
    const form = document.getElementById("adminBroadcastForm");
    
    // Stop execution if the form doesn't exist OR if it already has a listener
    if (!form || form.dataset.initialized) return; 
    
    // Set the flag so future auth refreshes don't attach duplicate listeners
    form.dataset.initialized = "true";
    
    await loadAdminDirectory();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const targetUid = document.getElementById("broadcastTargetUid").value;
        const targetEmail = document.getElementById("broadcastTargetEmail").value;
        const title = document.getElementById("broadcastTitle").value.trim();
        const msg = document.getElementById("broadcastMessage").value.trim();
        const fileInput = document.getElementById("broadcastMedia");
        
        const btn = document.getElementById("btnSendBroadcast");
        const status = document.getElementById("broadcastStatus");
        
        btn.disabled = true; 
        btn.textContent = "Publishing & Sending Emails...";
        status.classList.add("d-none");
        
        try {
            let uploadedMedia = [];
            if (fileInput.files.length > 0) {
                uploadedMedia = await uploadMediaArray(fileInput.files);
            }
            
            await addDoc(collection(db, "communications"), {
                type: targetUid === "all" ? "broadcast" : "direct",
                targetUid: targetUid,
                targetEmail: targetEmail,
                title: title,
                message: msg,
                attachments: uploadedMedia,
                adminEmail: auth.currentUser.email,
                createdAt: serverTimestamp()
            });
            
            if (typeof emailjs !== 'undefined') {
                let emailsToNotify = "";
                
                if (targetUid === "all") {
                    emailsToNotify = globalUserDirectory.map(u => u.email).join(",");
                } else {
                    emailsToNotify = targetEmail;
                }
                
                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                    to_email: emailsToNotify, 
                    subject: title,
                    message: msg,
                    admin_name: sessionStorage.getItem("kcpo_name") || "KCPO Admin"
                });
            }
            
            status.className = "alert alert-success mt-3 d-block small";
            status.textContent = "Message published and email notifications sent successfully!";
            
            form.reset();
            setComposerTarget('all', 'All Members', 'all');
            
        } catch (error) {
            console.error("Broadcast Error Payload:", error); 
            status.className = "alert alert-danger mt-3 d-block small";
            const errorMessage = error.text || error.message || "An unknown error occurred. Check the console.";
            status.textContent = "Error: " + errorMessage;
        } finally {
            btn.disabled = false; 
            btn.textContent = "Publish & Send Email Notification";
        }
    });
}

// ----------------------------------------------------------------------------
// REGISTRATION FORM
// ----------------------------------------------------------------------------
function initRegistrationForm() {
    const form = document.getElementById("slotRegistrationForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!auth.currentUser) {
            const authModal = new bootstrap.Modal(document.getElementById('authModal'));
            document.getElementById('signup-tab').click();
            authModal.show();
            showAuthAlert("Please create an account to secure your performance slot and upload scores.", "info");
            return;
        }

        if (!form.checkValidity()) { 
            form.classList.add("was-validated"); 
            return; 
        }

        const btn = form.querySelector("button[type=submit]");
        const status = document.getElementById("registrationStatus");
        const file = document.getElementById("actionPdfFile").files[0];
        const month = document.getElementById("sessionMonth").value;
        const title = document.getElementById("repertoire").value.trim();

        btn.disabled = true; 
        btn.textContent = "Uploading Score...";
        status.classList.add("d-none");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", CLOUDINARY_PRESET);
            
            const res = await fetch(CLOUDINARY_RAW_URL, { method: "POST", body: formData });
            const data = await res.json();
            
            if (!res.ok) throw new Error("Cloudinary upload failed.");

            await addDoc(collection(db, "scores"), {
                pieceTitle: title,
                pdfUrl: data.secure_url,
                fileName: file.name,
                sessionMonth: month,
                uploadedByEmail: auth.currentUser.email,
                uploadedByUid: auth.currentUser.uid,
                uploaderName: sessionStorage.getItem("kcpo_name") || "Member", 
                createdAt: serverTimestamp()
            });

            status.className = "alert alert-success mt-3 d-block";
            status.textContent = "Slot secured and score uploaded successfully!";
            form.reset(); 
            form.classList.remove("was-validated");
            
        } catch (err) {
            status.className = "alert alert-danger mt-3 d-block";
            status.textContent = err.message;
        } finally {
            btn.disabled = false; 
            btn.textContent = "Submit Registration";
        }
    });
}

// ----------------------------------------------------------------------------
// MASTERCLASSES: TIME-TRAVEL REPERTOIRE & CHAT
// ----------------------------------------------------------------------------
function initMasterclasses() {
    const monthSelect = document.getElementById("repertoireMonthSelect");
    if (!monthSelect) return;

    loadRepertoireForMonth(monthSelect.value);

    monthSelect.addEventListener("change", (e) => {
        loadRepertoireForMonth(e.target.value);
    });

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

            submitBtn.disabled = true;
            submitBtn.textContent = "Sending...";
            
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
                
                msgInput.value = "";
                window.pendingAttachments = []; 
                
                statusMsg.className = "small mt-2 text-center text-success";
                statusMsg.textContent = "Feedback sent successfully!";
                
                setTimeout(() => { statusMsg.textContent = ""; }, 3000);
                
                loadChatMessages(scoreId); 
            } catch (err) { 
                console.error("Chat error", err); 
                statusMsg.className = "small mt-2 text-center text-danger";
                statusMsg.textContent = "Failed to send feedback.";
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Send";
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
        const isAdmin = sessionStorage.getItem("kcpo_role") === "admin";
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const scoreId = docSnap.id;
            const isOwner = auth.currentUser && auth.currentUser.uid === data.uploadedByUid;
            
            const allowDelete = isAdmin || (isOwner && targetMonth !== currentMonthString);
            const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleString() : "Recently";
            const uploaderName = data.uploaderName || "KCPO Pianist";
            
            list.innerHTML += `
                <div class="col-md-6 col-lg-4">
                    <div class="card kcpo-card p-4 h-100 d-flex flex-column">
                        <h5 class="accent-gold mb-1">${data.pieceTitle}</h5>
                        <p class="small text-muted-c mb-3">
                            <i class="bi bi-person me-1"></i>${uploaderName}<br>
                            <i class="bi bi-clock me-1"></i>${dateStr}
                        </p>
                        
                        <div class="mt-auto d-flex flex-column gap-2">
                            <a href="${data.pdfUrl}" target="_blank" class="btn btn-outline-gold btn-sm"><i class="bi bi-box-arrow-up-right me-1"></i> View / Download</a>
                            <button class="btn btn-outline-line btn-sm" onclick="openFeedbackChat('${scoreId}', '${data.pieceTitle.replace(/'/g, "\\'")}', ${data.chatLocked || false}, '${data.uploadedByEmail}', '${uploaderName.replace(/'/g, "\\'")}', '${data.pdfUrl}')">
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

window.deleteScore = async function(scoreId) {
    if (!confirm("Delete this repertoire entry?")) return;
    await deleteDoc(doc(db, "scores", scoreId));
    document.getElementById("repertoireMonthSelect").dispatchEvent(new Event("change"));
};

window.openFeedbackChat = function(scoreId, title, isLocked, performerEmail, performerName, pdfUrl) {
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
        annotateBtn.innerHTML = '<i class="bi bi-pen"></i> Open Score to Annotate';
        chatForm.parentNode.insertBefore(annotateBtn, chatForm);
    }
    
    if (annotateBtn) {
        annotateBtn.onclick = () => openPdfAnnotator(pdfUrl);
    }
    
    window.pendingAttachments = [];
    
    const input = document.getElementById("chatInputMessage");
    const submitBtn = document.getElementById("chatSubmitBtn");
    const statusMsg = document.getElementById("chatStatusMsg");
    const adminControls = document.getElementById("adminChatControls");
    
    adminControls.innerHTML = "";
    statusMsg.textContent = ""; 
    
    if (isLocked && sessionStorage.getItem("kcpo_role") !== "admin") {
        input.disabled = true; 
        submitBtn.disabled = true;
        if(annotateBtn) annotateBtn.disabled = true;
        
        statusMsg.className = "small mt-2 text-center text-danger";
        statusMsg.textContent = "This feedback session has been locked by an admin.";
    } else {
        input.disabled = !auth.currentUser; 
        submitBtn.disabled = !auth.currentUser;
        if(annotateBtn) annotateBtn.disabled = !auth.currentUser;
        
        statusMsg.className = "small mt-2 text-center text-muted-c";
        statusMsg.textContent = !auth.currentUser ? "You must be signed in to leave feedback." : "";
        
        if (sessionStorage.getItem("kcpo_role") === "admin") {
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
        
        if (snapshot.empty) {
            box.innerHTML = "<small class='text-muted-c'>No feedback recorded yet. Be the first to review!</small>";
            return;
        }
        
        box.innerHTML = "";
        const isAdmin = sessionStorage.getItem("kcpo_role") === "admin";
        
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
    } catch (error) {
        console.error("Error loading chat:", error);
        box.innerHTML = `<div class="alert alert-danger small p-2 text-center mt-2">Failed to load feedback.</div>`;
    }
}

window.deleteFeedbackMsg = async function(msgId, scoreId) {
    if (!confirm("Delete this comment?")) return;
    await deleteDoc(doc(db, "score_feedback", msgId));
    loadChatMessages(scoreId);
};

// ----------------------------------------------------------------------------
// MEMBER & ADMIN DASHBOARDS
// ----------------------------------------------------------------------------
async function initAdminDashboard() {
    const adminContent = document.getElementById("adminContent");
    if (!adminContent) return;

    const accessMsg = document.getElementById("accessDeniedMsg");
    
    onAuthStateChanged(auth, async (user) => {
        if (user && sessionStorage.getItem("kcpo_role") === "admin") {
            accessMsg.classList.add("d-none");
            adminContent.classList.remove("d-none");
            
            await loadAdminUsers();
            await loadAdminFeedback();
            initAdminBroadcasts();
        } else {
            adminContent.classList.add("d-none");
            accessMsg.classList.remove("d-none");
        }
    });
}

async function loadAdminUsers() {
    const userTable = document.getElementById("adminUserTableBody");
    if (!userTable) return;
    
    userTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted-c py-4">Loading member directory...</td></tr>`;

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        userTable.innerHTML = ""; 

        if (querySnapshot.empty) {
            userTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted-c py-4">No registered members found.</td></tr>`;
            return;
        }

        querySnapshot.forEach((documentSnapshot) => {
            const userData = documentSnapshot.data();
            const userId = documentSnapshot.id;
            
            const isCoreAdmin = ADMIN_EMAILS.includes((userData.email || "").toLowerCase());
            
            const actionButtons = isCoreAdmin ? 
                `<span class="badge bg-secondary">System Admin</span>` : 
                `<button class="btn btn-sm btn-outline-gold me-2" onclick="promoteUser('${userId}')" ${userData.role === 'admin' ? 'disabled' : ''}>Promote</button>
                 <button class="btn btn-sm btn-outline-danger" onclick="deleteUserRecord('${userId}')">Delete</button>`;

            userTable.innerHTML += `
                <tr>
                    <td class="text-light">${userData.name || "Unknown Pianist"}</td>
                    <td class="text-muted-c">${userData.email}</td>
                    <td><span class="badge ${userData.role === 'admin' ? 'bg-warning text-dark' : 'badge-kcpo'} px-2 py-1">${userData.role.toUpperCase()}</span></td>
                    <td>${actionButtons}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        userTable.innerHTML = `<tr><td colspan="4" class="text-danger text-center py-4">Failed to load member directory.</td></tr>`;
    }
}

window.promoteUser = async function(userId) {
    if (!confirm("Are you sure you want to promote this member to an Administrator?")) return;
    try {
        await updateDoc(doc(db, "users", userId), { role: "admin" });
        alert("Member successfully promoted to Administrator.");
        loadAdminUsers(); 
    } catch (error) {
        alert("Failed to promote user: " + error.message);
    }
};

window.deleteUserRecord = async function(userId) {
    if (!confirm("Are you certain you want to permanently remove this user's profile from KCPO?")) return;
    try {
        await deleteDoc(doc(db, "users", userId));
        alert("Member profile successfully removed.");
        loadAdminUsers(); 
    } catch (error) {
        alert("Failed to remove member profile: " + error.message);
    }
};

async function loadAdminFeedback() {
    const feedbackTable = document.getElementById("adminFeedbackTableBody");
    if (!feedbackTable) return;
    
    feedbackTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted-c py-4">Loading feedback records...</td></tr>`;

    try {
        const querySnapshot = await getDocs(collection(db, "score_feedback"));
        feedbackTable.innerHTML = "";

        if (querySnapshot.empty) {
            feedbackTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted-c py-4">No feedback records found.</td></tr>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const msgId = docSnap.id;
            const snippet = data.message.length > 60 ? data.message.substring(0, 60) + "..." : data.message;
            
            const displaySenderName = data.senderName || "Unknown Member";
            const emailHtml = (data.senderEmail && data.senderEmail !== displaySenderName) 
                ? `<small class="text-muted-c">${data.senderEmail}</small>` 
                : '';

            feedbackTable.innerHTML += `
                <tr>
                    <td class="text-light">
                        <div class="mb-1"><strong>Sender:</strong> ${displaySenderName}</div>
                        ${emailHtml}
                    </td>
                    <td class="text-muted-c">
                        <span class="badge badge-kcpo mb-1">${data.pieceTitle || "Score"}</span><br>
                        <small style="font-size: 0.8rem;">For: ${data.performerName || "Pianist"} ${data.performerEmail ? `(${data.performerEmail})` : ''}</small>
                    </td>
                    <td class="small">
                        ${snippet}
                        <div class="mt-1">${generateMediaBadges(data.attachments)}</div>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteGlobalFeedback('${msgId}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error fetching feedback:", error);
        feedbackTable.innerHTML = `<tr><td colspan="4" class="text-danger text-center py-4">Failed to load feedback records.</td></tr>`;
    }
}

window.deleteGlobalFeedback = async function(msgId) {
    if (!confirm("Are you sure you want to permanently delete this comment?")) return;
    try {
        await deleteDoc(doc(db, "score_feedback", msgId));
        loadAdminFeedback(); 
    } catch (error) {
        alert("Failed to delete comment: " + error.message);
    }
};

async function loadMemberInbox(user) {
    const inboxFeed = document.getElementById("memberInboxFeed");
    if (!inboxFeed) return;

    inboxFeed.innerHTML = "<div class='text-center text-muted-c my-5'>Loading inbox...</div>";

    try {
        const feedbackQuery = query(collection(db, "score_feedback"), where("performerEmail", "==", user.email));
        const feedbackSnap = await getDocs(feedbackQuery);
        
        // Fix: Split the communications query to perfectly satisfy the Firestore security rules
        const broadcastQuery = query(collection(db, "communications"), where("type", "==", "broadcast"));
        const broadcastSnap = await getDocs(broadcastQuery);

        const dmQuery = query(collection(db, "communications"), where("targetUid", "==", user.uid));
        const dmSnap = await getDocs(dmQuery);
        
        let messages = [];
        
        feedbackSnap.forEach(doc => {
            messages.push({ ...doc.data(), source: 'feedback' });
        });
        
        broadcastSnap.forEach(doc => {
            messages.push({ ...doc.data(), source: 'comm' });
        });

        dmSnap.forEach(doc => {
            // Prevent duplicate entries if a DM accidentally shares a tag
            if (doc.data().type !== "broadcast") {
                messages.push({ ...doc.data(), source: 'comm' });
            }
        });
        
        if (messages.length === 0) {
            inboxFeed.innerHTML = `
                <div class="card kcpo-card p-4 text-center">
                    <i class="bi bi-envelope-paper display-4 text-faint-c mb-3"></i>
                    <p class="text-muted-c small mb-0">Your inbox is empty.</p>
                </div>`;
            return;
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
        
    } catch (error) {
        console.error("Error loading inbox:", error);
        inboxFeed.innerHTML = "<div class='text-danger'>Failed to load inbox.</div>";
    }
}

async function initMemberDashboard() {
    const memberContent = document.getElementById("memberContent");
    if (!memberContent) return;

    const accessDeniedMsg = document.getElementById("memberAccessDenied");
    
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
                    const monthInput = document.getElementById("memberSessionMonth"); // Target Month
                    const fileInput = document.getElementById("pdfFile");
                    const statusBox = document.getElementById("uploadStatusBox");
                    const submitBtn = uploadForm.querySelector("button[type=submit]");
                    const file = fileInput.files[0];

                    if (!file) return;

                    submitBtn.disabled = true; 
                    submitBtn.innerHTML = `Uploading...`; 
                    statusBox.classList.add("d-none");

                    try {
                        const formData = new FormData();
                        formData.append("file", file); 
                        formData.append("upload_preset", CLOUDINARY_PRESET);
                        
                        const cloudinaryRes = await fetch(CLOUDINARY_RAW_URL, { 
                            method: "POST", 
                            body: formData 
                        });
                        const cloudinaryData = await cloudinaryRes.json();
                        
                        await addDoc(collection(db, "scores"), {
                            pieceTitle: titleInput.value.trim(),
                            pdfUrl: cloudinaryData.secure_url, 
                            fileName: file.name,
                            sessionMonth: monthInput.value, // Saves the target month
                            uploadedByEmail: user.email,    // Automated from session
                            uploadedByUid: user.uid,        // Automated from session
                            uploaderName: sessionStorage.getItem("kcpo_name") || "Member", // Automated from session
                            createdAt: serverTimestamp()
                        });

                        statusBox.className = "alert alert-success small p-2 mt-3 d-block"; 
                        statusBox.textContent = "Score uploaded successfully!"; 
                        uploadForm.reset();
                        
                    } catch (error) {
                        statusBox.className = "alert alert-danger small p-2 mt-3 d-block"; 
                        statusBox.textContent = "Upload failed: " + error.message;
                    } finally { 
                        submitBtn.disabled = false; 
                        submitBtn.textContent = "Upload to Repository"; 
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
// BOOT
// ----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
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
});