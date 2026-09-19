/**
 * ============================================================================
 * KCPO PORTAL — APP ENGINE
 * Loaded as a module on every page: <script type="module" src="main.js"></script>
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. FIREBASE INIT
// ----------------------------------------------------------------------------
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
    serverTimestamp
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
// 2. THEME TOGGLE (persisted, applied on every page)
// ----------------------------------------------------------------------------
function setThemeIcon(theme) {
    const icon = document.getElementById("themeIcon");
    if (!icon) return;
    icon.className = theme === "dark" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
}

function initTheme() {
    const stored = localStorage.getItem("kcpo-theme");
    const current = stored || document.documentElement.getAttribute("data-bs-theme") || "dark";
    document.documentElement.setAttribute("data-bs-theme", current);
    setThemeIcon(current);

    const toggleBtn = document.getElementById("themeToggle");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const next = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-bs-theme", next);
            localStorage.setItem("kcpo-theme", next);
            setThemeIcon(next);
        });
    }
}

// ----------------------------------------------------------------------------
// 3. NAV ACTIVE STATE
// ----------------------------------------------------------------------------
function markActiveNavLink() {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".navbar-nav .nav-link").forEach(link => {
        if (link.getAttribute("href") === currentPage) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        }
    });
}

// ----------------------------------------------------------------------------
// 4. SHARED AUTH MODAL
// ----------------------------------------------------------------------------
const AUTH_MODAL_HTML = `
<div class="modal fade" id="authModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content modal-kcpo">
            <div class="modal-header">
                <h5 class="modal-title font-serif accent-gold">KCPO Member Portal</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
                <ul class="nav nav-tabs mb-4" id="authTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="signin-tab" data-bs-toggle="tab" data-bs-target="#signin-pane" type="button" role="tab">Sign In</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="signup-tab" data-bs-toggle="tab" data-bs-target="#signup-pane" type="button" role="tab">New Member</button>
                    </li>
                    <li class="nav-item ms-auto" role="presentation">
                        <button class="nav-link small" id="forgot-tab" data-bs-toggle="tab" data-bs-target="#forgot-pane" type="button" role="tab">Forgot Password?</button>
                    </li>
                </ul>

                <div class="tab-content" id="authTabsContent">
                    <div class="tab-pane fade show active" id="signin-pane" role="tabpanel">
                        <form id="signInForm" novalidate>
                            <div class="mb-3">
                                <label class="form-label small">Email Address</label>
                                <input type="email" class="form-control field" id="signInEmail" required placeholder="you@example.com">
                            </div>
                            <div class="mb-4">
                                <label class="form-label small">Password</label>
                                <input type="password" class="form-control field" id="signInPassword" required placeholder="••••••••">
                            </div>
                            <button type="submit" class="btn btn-gold w-100 py-2">Sign In to Portal</button>
                        </form>
                    </div>

                    <div class="tab-pane fade" id="signup-pane" role="tabpanel">
                        <form id="signUpForm" novalidate>
                            <div class="mb-3">
                                <label class="form-label small">Full Name</label>
                                <input type="text" class="form-control field" id="signUpName" required placeholder="e.g., Leon Jabali">
                            </div>
                            <div class="mb-3">
                                <label class="form-label small">Email Address</label>
                                <input type="email" class="form-control field" id="signUpEmail" required placeholder="pianist@example.com">
                            </div>
                            <div class="mb-4">
                                <label class="form-label small">Create Password</label>
                                <input type="password" class="form-control field" id="signUpPassword" required placeholder="Min. 6 characters">
                            </div>
                            <button type="submit" class="btn btn-outline-gold w-100 py-2">Register for KCPO</button>
                        </form>
                    </div>

                    <div class="tab-pane fade" id="forgot-pane" role="tabpanel">
                        <form id="forgotForm" novalidate>
                            <p class="text-muted-c small mb-3">Enter your registered email address and we will send you a secure password reset link.</p>
                            <div class="mb-4">
                                <label class="form-label small">Email Address</label>
                                <input type="email" class="form-control field" id="forgotEmail" required placeholder="you@example.com">
                            </div>
                            <button type="submit" class="btn btn-outline-line w-100 py-2">Send Reset Link</button>
                        </form>
                    </div>
                </div>

                <div id="authAlert" class="alert mt-3 mb-0 d-none small py-2" role="alert"></div>
            </div>
        </div>
    </div>
</div>`;

function injectAuthModal() {
    if (document.getElementById("authModal")) return;
    document.body.insertAdjacentHTML("beforeend", AUTH_MODAL_HTML);
}

// ----------------------------------------------------------------------------
// 5. FIREBASE AUTHENTICATION & ROUTING
// ----------------------------------------------------------------------------
const ADMIN_EMAILS = [
    "matthew.keah@strathmore.edu"
];

function showAuthAlert(message, type = "danger") {
    const authAlert = document.getElementById("authAlert");
    if (!authAlert) return;
    authAlert.className = `alert alert-${type} mt-3 mb-0 d-block small py-2 status-alert`;
    authAlert.textContent = message;
}

window.logoutUser = async function() {
    try {
        await signOut(auth);
        sessionStorage.removeItem("kcpo_role");
        sessionStorage.removeItem("kcpo_user");
        alert("You have been signed out.");
        window.location.href = "index.html";
    } catch (error) {
        console.error("Error signing out:", error);
    }
};

function initAuth() {
    const navAuthBtn = document.getElementById("navAuthBtn");

    onAuthStateChanged(auth, (user) => {
        if (!navAuthBtn) return;

        const existingLogout = document.getElementById("dynamicLogoutBtn");
        if (existingLogout) existingLogout.remove();

        if (user) {
            const isAdmin = ADMIN_EMAILS.includes((user.email || "").toLowerCase());
            
            navAuthBtn.innerHTML = isAdmin
                ? `<i class="bi bi-shield-lock-fill me-1"></i> Admin Portal`
                : `<i class="bi bi-person-check-fill me-1"></i> Member Inbox`;
            navAuthBtn.classList.remove("btn-outline-gold");
            navAuthBtn.classList.add("btn-gold");
            
            navAuthBtn.removeAttribute("data-bs-toggle");
            navAuthBtn.removeAttribute("data-bs-target");
            navAuthBtn.onclick = () => {
                window.location.href = isAdmin ? "admin.html" : "member.html";
            };

            const li = document.createElement("li");
            li.className = "nav-item ms-lg-2 my-2 my-lg-0";
            li.id = "dynamicLogoutBtn";
            li.innerHTML = `<button class="btn btn-outline-danger btn-sm px-3" onclick="logoutUser()">Sign Out</button>`;
            navAuthBtn.parentElement.parentElement.appendChild(li);

            sessionStorage.setItem("kcpo_role", isAdmin ? "admin" : "member");
            sessionStorage.setItem("kcpo_user", user.email);
        } else {
            navAuthBtn.innerHTML = `<i class="bi bi-person-circle me-1"></i> Member Sign In`;
            navAuthBtn.classList.remove("btn-gold");
            navAuthBtn.classList.add("btn-outline-gold");
            
            navAuthBtn.setAttribute("data-bs-toggle", "modal");
            navAuthBtn.setAttribute("data-bs-target", "#authModal");
            navAuthBtn.onclick = null;
        }
    });

    const signInForm = document.getElementById("signInForm");
    if (signInForm) {
        signInForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            showAuthAlert("Authenticating...", "info");
            const email = document.getElementById("signInEmail").value.trim();
            const password = document.getElementById("signInPassword").value;
            try {
                await signInWithEmailAndPassword(auth, email, password);
                showAuthAlert("Welcome back! Loading portal...", "success");
                setTimeout(() => {
                    bootstrap.Modal.getInstance(document.getElementById("authModal"))?.hide();
                    window.location.reload();
                }, 900);
            } catch (error) {
                showAuthAlert(friendlyAuthError(error), "danger");
            }
        });
    }

    const signUpForm = document.getElementById("signUpForm");
    if (signUpForm) {
        signUpForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            showAuthAlert("Creating account...", "info");
            const email = document.getElementById("signUpEmail").value.trim();
            const password = document.getElementById("signUpPassword").value;
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const fullName = document.getElementById("signUpName").value.trim();
                
                // Save public profile to Firestore for admin visibility
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    name: fullName,
                    email: email,
                    role: ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "member",
                    createdAt: serverTimestamp()
                });

                showAuthAlert("Account created! Welcome to KCPO.", "success");
                setTimeout(() => window.location.reload(), 900);
            } catch (error) {
                showAuthAlert(friendlyAuthError(error), "danger");
            }
        });
    }

    const forgotForm = document.getElementById("forgotForm");
    if (forgotForm) {
        forgotForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            showAuthAlert("Sending reset link...", "info");
            const email = document.getElementById("forgotEmail").value.trim();
            try {
                await sendPasswordResetEmail(auth, email);
                showAuthAlert("Password reset link sent — check your inbox.", "success");
                forgotForm.reset();
            } catch (error) {
                showAuthAlert(friendlyAuthError(error), "danger");
            }
        });
    }
}

function friendlyAuthError(error) {
    const map = {
        "auth/invalid-email": "That email address doesn't look right.",
        "auth/user-not-found": "No account found with that email.",
        "auth/wrong-password": "Incorrect password. Try again or reset it.",
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/email-already-in-use": "An account already exists for that email.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/unauthorized-domain": "This domain isn't authorized in Firebase yet."
    };
    return map[error.code] || error.message;
}

// ----------------------------------------------------------------------------
// 6. REGISTRATION FORM -> FIRESTORE
// ----------------------------------------------------------------------------
function initRegistrationForm() {
    const form = document.getElementById("slotRegistrationForm");
    if (!form) return;

    const statusBox = document.getElementById("registrationStatus");
    const submitBtn = form.querySelector("button[type=submit]");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }

        const payload = {
            firstName: document.getElementById("firstName").value.trim(),
            lastName: document.getElementById("lastName").value.trim(),
            email: document.getElementById("email").value.trim(),
            repertoire: document.getElementById("repertoire").value.trim(),
            sessionMonth: document.getElementById("sessionMonth").value,
            attendingHybrid: document.getElementById("hybridCheck").checked,
            submittedByUid: auth.currentUser ? auth.currentUser.uid : null,
            createdAt: serverTimestamp()
        };

        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";

        try {
            await addDoc(collection(db, "registrations"), payload);
            if (statusBox) {
                statusBox.className = "alert alert-success status-alert mb-4";
                statusBox.textContent = `Thanks, ${payload.firstName} — your repertoire is booked in for review.`;
                statusBox.classList.remove("d-none");
            }
            form.reset();
            form.classList.remove("was-validated");
        } catch (error) {
            if (statusBox) {
                statusBox.className = "alert alert-danger status-alert mb-4";
                statusBox.textContent = "Something went wrong saving your registration: " + error.message;
                statusBox.classList.remove("d-none");
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Registration";
        }
    });
}

// ----------------------------------------------------------------------------
// 7. DYNAMIC REPERTOIRE BANNER
// ----------------------------------------------------------------------------
function initRepertoireBanner() {
    const list = document.getElementById('repertoireList');
    if (list) {
        if (list.children.length === 0) {
            list.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="alert kcpo-card d-inline-block border-line text-muted-c px-4 py-3" role="alert">
                        <i class="bi bi-calendar-x me-2 accent-gold"></i> No presentations scheduled for this month yet.
                    </div>
                </div>`;
        }
    }
}

// ----------------------------------------------------------------------------
// 8. ADMIN DASHBOARD LOGIC
// ----------------------------------------------------------------------------
async function initAdminDashboard() {
    const adminContent = document.getElementById("adminContent");
    if (!adminContent) return; // Exit if not on admin.html

    const accessMsg = document.getElementById("accessDeniedMsg");
    const userRole = sessionStorage.getItem("kcpo_role");

    // Enforce Admin-only access
    if (userRole !== "admin") {
        if (accessMsg) {
            accessMsg.innerHTML = `<h3 class='text-danger'>Access Restricted</h3><p class='text-muted-c'>You do not have administrative privileges.</p>`;
            accessMsg.classList.remove("d-none");
        }
        return;
    }

    // Grant access
    if (accessMsg) accessMsg.classList.add("d-none");
    adminContent.classList.remove("d-none");

    await loadAdminUsers();
    await loadAdminFeedback();
}

async function loadAdminUsers() {
    const userTable = document.getElementById("adminUserTableBody");
    if (!userTable) return;
    userTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted-c">Loading members...</td></tr>`;

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        userTable.innerHTML = ""; // Clear loading state

        if (querySnapshot.empty) {
            userTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted-c">No members found. (Existing users must re-register to appear here).</td></tr>`;
            return;
        }

        querySnapshot.forEach((documentSnapshot) => {
            const userData = documentSnapshot.data();
            const userId = documentSnapshot.id;
            
            // Prevent admins from deleting core admins
            const isCoreAdmin = ADMIN_EMAILS.includes(userData.email.toLowerCase());
            
            const actionButtons = isCoreAdmin ? 
                `<span class="badge bg-secondary">Core Admin</span>` : 
                `<button class="btn btn-sm btn-outline-gold me-2" onclick="promoteUser('${userId}')" ${userData.role === 'admin' ? 'disabled' : ''}>Promote</button>
                 <button class="btn btn-sm btn-outline-danger" onclick="deleteUserRecord('${userId}')">Delete</button>`;

            userTable.innerHTML += `
                <tr>
                    <td>${userData.name || "Unknown"}</td>
                    <td>${userData.email}</td>
                    <td><span class="badge ${userData.role === 'admin' ? 'bg-warning text-dark' : 'badge-kcpo'}">${userData.role}</span></td>
                    <td>${actionButtons}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        userTable.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Failed to load users.</td></tr>`;
    }
}

window.promoteUser = async function(userId) {
    if (!confirm("Are you sure you want to promote this member to Admin?")) return;
    try {
        await updateDoc(doc(db, "users", userId), { role: "admin" });
        alert("User promoted successfully.");
        loadAdminUsers(); // Refresh table
    } catch (error) {
        console.error("Error promoting user:", error);
        alert("Failed to promote user.");
    }
};

window.deleteUserRecord = async function(userId) {
    if (!confirm("Remove this user's profile from the platform? This cannot be undone.")) return;
    try {
        await deleteDoc(doc(db, "users", userId));
        alert("User profile deleted.");
        loadAdminUsers(); // Refresh table
    } catch (error) {
        console.error("Error deleting user:", error);
        alert("Failed to delete user profile.");
    }
};

async function loadAdminFeedback() {
    const feedbackTable = document.getElementById("adminFeedbackTableBody");
    if (!feedbackTable) return;
    
    feedbackTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted-c">No feedback records found.</td></tr>`;
}

// ----------------------------------------------------------------------------
// BOOT
// ----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    markActiveNavLink();
    injectAuthModal();
    initAuth();
    initRegistrationForm();
    initRepertoireBanner();
    initAdminDashboard();
});