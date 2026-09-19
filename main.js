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
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    setDoc,
    getDocs,
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
// GLOBAL CONSTANTS
// ----------------------------------------------------------------------------
const ADMIN_EMAILS = [
    "matthew.keah@strathmore.edu",
    "matthewstanley785@gmail.com",
    "johnmusila001@gmail.com",
    "jabalitongwa@gmail.com"
];
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/xy7vxeyj/raw/upload"; 
const CLOUDINARY_PRESET = "qe5c4qkd"; 

// ----------------------------------------------------------------------------
// THEME & NAV STATE
// ----------------------------------------------------------------------------
function initTheme() {
    const stored = localStorage.getItem("kcpo-theme") || "dark";
    document.documentElement.setAttribute("data-bs-theme", stored);
    const icon = document.getElementById("themeIcon");
    if (icon) icon.className = stored === "dark" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";

    document.getElementById("themeToggle")?.addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-bs-theme", next);
        localStorage.setItem("kcpo-theme", next);
        if (icon) icon.className = next === "dark" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
    });
}

function markActiveNavLink() {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".navbar-nav .nav-link").forEach(link => {
        if (link.getAttribute("href") === currentPage) link.classList.add("active");
    });
}

// ----------------------------------------------------------------------------
// DYNAMIC MONTH GENERATOR
// ----------------------------------------------------------------------------
function populateDynamicMonths() {
    const registerDropdown = document.getElementById("sessionMonth");
    const masterclassDropdown = document.getElementById("repertoireMonthSelect");
    
    if (!registerDropdown && !masterclassDropdown) return;

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
}

// ----------------------------------------------------------------------------
// AUTHENTICATION
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
    if (!document.getElementById("authModal")) document.body.insertAdjacentHTML("beforeend", AUTH_MODAL_HTML);
}

window.logoutUser = async function() {
    await signOut(auth);
    sessionStorage.clear();
    window.location.href = "index.html";
};

function showAuthAlert(msg, type = "danger") {
    const box = document.getElementById("authAlert");
    if (box) { box.className = `alert alert-${type} mt-3 mb-0 d-block small py-2`; box.textContent = msg; }
}

function initAuth() {
    const navBtn = document.getElementById("navAuthBtn");

    onAuthStateChanged(auth, (user) => {
        if (!navBtn) return;
        document.getElementById("dynamicLogoutBtn")?.remove();

        if (user) {
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
            sessionStorage.setItem("kcpo_name", user.displayName || user.email);
        } else {
            navBtn.innerHTML = `<i class="bi bi-person-circle me-1"></i> Sign In`;
            navBtn.className = "btn btn-outline-gold btn-sm px-3";
            navBtn.setAttribute("data-bs-toggle", "modal");
            navBtn.setAttribute("data-bs-target", "#authModal");
            navBtn.onclick = null;
        }
    });

    document.getElementById("signInForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, document.getElementById("signInEmail").value, document.getElementById("signInPassword").value);
            window.location.reload();
        } catch (err) { showAuthAlert(err.message); }
    });

    document.getElementById("signUpForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
            const email = document.getElementById("signUpEmail").value;
            const cred = await createUserWithEmailAndPassword(auth, email, document.getElementById("signUpPassword").value);
            await setDoc(doc(db, "users", cred.user.uid), {
                name: document.getElementById("signUpName").value,
                email: email,
                role: ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "member",
                createdAt: serverTimestamp()
            });
            window.location.reload();
        } catch (err) { showAuthAlert(err.message); }
    });
}

// ----------------------------------------------------------------------------
// ACTION PLAN (Registration Gatekeeper & Upload)
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

        if (!form.checkValidity()) { form.classList.add("was-validated"); return; }

        const btn = form.querySelector("button[type=submit]");
        const status = document.getElementById("registrationStatus");
        const file = document.getElementById("actionPdfFile").files[0];
        const month = document.getElementById("sessionMonth").value;
        const title = document.getElementById("repertoire").value.trim();

        btn.disabled = true; btn.textContent = "Uploading Score...";
        status.classList.add("d-none");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", CLOUDINARY_PRESET);
            
            const cloudinaryRes = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
            const cloudinaryData = await cloudinaryRes.json();
            if (!cloudinaryRes.ok) throw new Error("Cloudinary upload failed.");

            await addDoc(collection(db, "scores"), {
                pieceTitle: title,
                pdfUrl: cloudinaryData.secure_url,
                fileName: file.name,
                sessionMonth: month,
                uploadedByEmail: auth.currentUser.email,
                uploadedByUid: auth.currentUser.uid,
                createdAt: serverTimestamp()
            });

            status.className = "alert alert-success mt-3 d-block";
            status.textContent = "Slot secured and score uploaded successfully!";
            form.reset(); form.classList.remove("was-validated");
        } catch (err) {
            status.className = "alert alert-danger mt-3 d-block";
            status.textContent = err.message;
        } finally {
            btn.disabled = false; btn.textContent = "Submit Registration";
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
            const msgInput = document.getElementById("chatInputMessage");
            const submitBtn = document.getElementById("chatSubmitBtn");
            const statusMsg = document.getElementById("chatStatusMsg");
            
            const msg = msgInput.value.trim();
            if (!msg || !auth.currentUser) return;

            // UI Feedback: Disable button and show sending state
            submitBtn.disabled = true;
            submitBtn.textContent = "Sending...";
            statusMsg.textContent = "";

            try {
                await addDoc(collection(db, "score_feedback"), {
                    scoreId: scoreId,
                    pieceTitle: pieceTitle,
                    performerEmail: performerEmail,
                    message: msg,
                    senderEmail: auth.currentUser.email,
                    senderName: sessionStorage.getItem("kcpo_name") || "Member",
                    createdAt: serverTimestamp()
                });
                
                msgInput.value = "";
                statusMsg.className = "small mt-2 text-center text-success";
                statusMsg.textContent = "Feedback sent successfully!";
                
                // Clear the success message after 3 seconds
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

            list.innerHTML += `
                <div class="col-md-6 col-lg-4">
                    <div class="card kcpo-card p-4 h-100 d-flex flex-column">
                        <h5 class="accent-gold mb-1">${data.pieceTitle}</h5>
                        <p class="small text-muted-c mb-3"><i class="bi bi-person me-1"></i>${data.uploadedByEmail}<br><i class="bi bi-clock me-1"></i>${dateStr}</p>
                        
                        <div class="mt-auto d-flex flex-column gap-2">
                            <a href="${data.pdfUrl}" target="_blank" class="btn btn-outline-gold btn-sm"><i class="bi bi-box-arrow-up-right me-1"></i> View / Download</a>
                            <button class="btn btn-outline-line btn-sm" onclick="openFeedbackChat('${scoreId}', '${data.pieceTitle.replace(/'/g, "\\'")}', ${data.chatLocked || false}, '${data.uploadedByEmail}')">
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

// Updated function to receive and store performer details
window.openFeedbackChat = function(scoreId, title, isLocked, performerEmail) {
    document.getElementById("chatModalTitle").textContent = `Feedback: ${title}`;
    
    // Bind routing data to hidden inputs
    document.getElementById("currentChatScoreId").value = scoreId;
    document.getElementById("chatPieceTitle").value = title;
    document.getElementById("chatPerformerEmail").value = performerEmail;
    
    const input = document.getElementById("chatInputMessage");
    const submitBtn = document.getElementById("chatSubmitBtn");
    const statusMsg = document.getElementById("chatStatusMsg");
    const adminControls = document.getElementById("adminChatControls");
    
    adminControls.innerHTML = "";
    statusMsg.textContent = ""; 
    
    if (isLocked && sessionStorage.getItem("kcpo_role") !== "admin") {
        input.disabled = true; submitBtn.disabled = true;
        statusMsg.className = "small mt-2 text-center text-danger";
        statusMsg.textContent = "This feedback session has been locked by an admin.";
    } else {
        input.disabled = !auth.currentUser; submitBtn.disabled = !auth.currentUser;
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
                </div>`;
        });
    } catch (error) {
        console.error("Error loading chat:", error);
        box.innerHTML = `<div class="alert alert-danger small p-2 text-center mt-2">Failed to load feedback. Open your browser console (F12) and click the Firebase Index link to build the database index!</div>`;
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
            if (accessMsg) accessMsg.classList.add("d-none");
            adminContent.classList.remove("d-none");
            await loadAdminUsers();
            await loadAdminFeedback();
        } else {
            adminContent.classList.add("d-none");
            if (accessMsg) accessMsg.classList.remove("d-none");
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
        userTable.innerHTML = `<tr><td colspan="4" class="text-danger text-center py-4">Failed to load member directory: ${error.message}</td></tr>`;
    }
}

window.promoteUser = async function(userId) {
    if (!confirm("Are you sure you want to promote this member to an Administrator?")) return;
    try {
        await updateDoc(doc(db, "users", userId), { role: "admin" });
        alert("Member successfully promoted to Administrator.");
        loadAdminUsers(); 
    } catch (error) {
        console.error("Error promoting user:", error);
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
        console.error("Error deleting user:", error);
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
            
            feedbackTable.innerHTML += `
                <tr>
                    <td class="text-light">${data.senderName || data.senderEmail}</td>
                    <td class="text-muted-c"><span class="badge badge-kcpo">ID: ${data.scoreId.substring(0,6)}...</span></td>
                    <td class="small">${snippet}</td>
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
        console.error("Error deleting feedback:", error);
        alert("Failed to delete comment: " + error.message);
    }
};

async function initMemberDashboard() {
    const memberContent = document.getElementById("memberContent");
    if (!memberContent) return;

    const accessDeniedMsg = document.getElementById("memberAccessDenied");
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (accessDeniedMsg) accessDeniedMsg.classList.add("d-none");
            memberContent.classList.remove("d-none");
            
            await loadMemberInbox(user.email);
            
            const uploadForm = document.getElementById("memberScoreUploadForm");
            if (uploadForm) {
                uploadForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    
                    const titleInput = document.getElementById("scoreTitle");
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
                        const cloudinaryRes = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
                        const cloudinaryData = await cloudinaryRes.json();
                        
                        await addDoc(collection(db, "scores"), {
                            pieceTitle: titleInput.value.trim(),
                            pdfUrl: cloudinaryData.secure_url,
                            fileName: file.name,
                            uploadedByEmail: user.email,
                            uploadedByUid: user.uid,
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
            if (accessDeniedMsg) accessDeniedMsg.classList.remove("d-none");
        }
    });
}

// Updated Inbox Fetching Logic to retrieve and sort targeted feedback
async function loadMemberInbox(userEmail) {
    const inboxFeed = document.getElementById("memberInboxFeed");
    if (!inboxFeed) return;

    try {
        const q = query(collection(db, "score_feedback"), where("performerEmail", "==", userEmail));
        const querySnapshot = await getDocs(q);
        inboxFeed.innerHTML = "";
        
        if (querySnapshot.empty) {
            inboxFeed.innerHTML = `
                <div class="card kcpo-card p-4 text-center">
                    <i class="bi bi-envelope-paper display-4 text-faint-c mb-3"></i>
                    <p class="text-muted-c small mb-0">Your peer feedback from recent masterclasses will appear here.</p>
                </div>`;
            return;
        }

        // Sort messages chronologically in JavaScript to bypass Firebase composite index requirements
        let messages = [];
        querySnapshot.forEach(docSnap => messages.push(docSnap.data()));
        messages.sort((a, b) => {
            const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
            return timeB - timeA; 
        });

        messages.forEach((item) => {
            const dateStr = item.createdAt ? item.createdAt.toDate().toLocaleDateString() : "Recently";
            inboxFeed.innerHTML += `
                <div class="card kcpo-card p-3 mb-2">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge badge-kcpo">${item.pieceTitle || "Repertoire Item"}</span>
                        <small class="text-muted-c">From: ${item.senderName || item.senderEmail} • ${dateStr}</small>
                    </div>
                    <p class="small mb-0 text-muted-c">${item.message}</p>
                </div>`;
        });
    } catch (error) {
        console.error("Error loading inbox:", error);
    }
}

// ----------------------------------------------------------------------------
// BOOT
// ----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    markActiveNavLink();
    injectAuthModal();
    initAuth();
    populateDynamicMonths();
    initRegistrationForm();
    initMasterclasses();
    initAdminDashboard();
    initMemberDashboard();
});