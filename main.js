/**
 * ============================================================================
 * KCPO PORTAL — APP ENGINE
 * Loaded as a module on every page: <script type="module" src="main.js"></script>
 * ============================================================================
 * Sections:
 *   1. Firebase init
 *   2. Theme toggle (light/dark)
 *   3. Nav active-state
 *   4. Shared auth modal (injected once, so it works from any page)
 *   5. Firebase Authentication (sign in / sign up / forgot password)
 *   6. Registration form -> Firestore ("registrations" collection)
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
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
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
// 4. SHARED AUTH MODAL (single source of truth, injected on every page)
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
// 5. FIREBASE AUTHENTICATION
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

function initAuth() {
    const navAuthBtn = document.getElementById("navAuthBtn");

    onAuthStateChanged(auth, (user) => {
        if (!navAuthBtn) return;
        if (user) {
            const isAdmin = ADMIN_EMAILS.includes((user.email || "").toLowerCase());
            navAuthBtn.innerHTML = isAdmin
                ? `<i class="bi bi-shield-lock-fill me-1"></i> Admin Portal`
                : `<i class="bi bi-person-check-fill me-1"></i> My Account`;
            navAuthBtn.classList.remove("btn-outline-gold");
            navAuthBtn.classList.add("btn-gold");
            sessionStorage.setItem("kcpo_role", isAdmin ? "admin" : "member");
            sessionStorage.setItem("kcpo_user", user.email);
        } else {
            navAuthBtn.innerHTML = `<i class="bi bi-person-circle me-1"></i> Member Sign In`;
            navAuthBtn.classList.remove("btn-gold");
            navAuthBtn.classList.add("btn-outline-gold");
            sessionStorage.removeItem("kcpo_role");
            sessionStorage.removeItem("kcpo_user");
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
                await createUserWithEmailAndPassword(auth, email, password);
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

// Translate raw Firebase error codes into plain, human sentences.
function friendlyAuthError(error) {
    const map = {
        "auth/invalid-email": "That email address doesn't look right.",
        "auth/user-not-found": "No account found with that email.",
        "auth/wrong-password": "Incorrect password. Try again or reset it.",
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/email-already-in-use": "An account already exists for that email.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/unauthorized-domain": "This domain isn't authorized in Firebase yet. Add it under Authentication → Settings → Authorized domains."
    };
    return map[error.code] || error.message;
}

// ----------------------------------------------------------------------------
// 6. REGISTRATION FORM -> FIRESTORE (register.html)
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
                statusBox.textContent = `Thanks, ${payload.firstName} — your repertoire is booked in for review by the Masterclass Coordinator.`;
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
// BOOT
// ----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    markActiveNavLink();
    injectAuthModal();
    initAuth();
    initRegistrationForm();
});

// main.js

// 1. Define Core Admins (Replace with your actual emails)
const CORE_ADMINS = [
    "matthew.keah@strathmore.edu",
    "admin2@example.com", 
    "admin3@example.com"
];

// 2. Authentication & Code Verification Logic
async function sendVerificationCode(email) {
    const authCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
        // 1. Save code to Firestore (Expires in 10 minutes)
        const expirationTime = Date.now() + 10 * 60 * 1000;
        await setDoc(doc(db, "auth_codes", email), {
            code: authCode,
            expiresAt: expirationTime
        });

        // 2. Send the email via your free Google Apps Script API
        const scriptUrl = "https://script.google.com/macros/s/AKfycby24rlwxyI-X9--7WIz5PY7Y01RRFeeB7oFxvoUbfzEAP0dcFMiVd2J9dboB8GqunJlkg/exec"; 
        
        await fetch(scriptUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" }, 
            body: JSON.stringify({ 
                email: email, 
                code: authCode 
            })
        });

        console.log("Verification code sent successfully.");
        return true;
        
    } catch (error) {
        console.error("Error during code generation or email dispatch:", error);
        return false;
    }
}

async function verifyCodeAndLogin(email, userEnteredCode) {
    // TODO: Fetch the saved code from your database for this email
    const dbCode = "123456"; // Placeholder for fetched code
    
    if (userEnteredCode === dbCode) {
        // Code matches - authenticate user
        let userRole = "member";
        
        // Check if they are a core admin
        if (CORE_ADMINS.includes(email)) {
            userRole = "core_admin";
        } else {
            // TODO: Check database if this user was promoted to rotational admin
            // const dbRole = await checkUserRoleInDatabase(email);
            // if (dbRole === "admin") userRole = "admin";
        }
        
        // Store session data (Preferably use secure tokens/cookies in production)
        localStorage.setItem("kcpo_user", JSON.stringify({ email: email, role: userRole }));
        checkAuthStatus();
        return true;
    }
    return false;
}

// 3. Admin Panel Functions
function loadAdminDashboard() {
    const user = JSON.parse(localStorage.getItem("kcpo_user"));
    
    // Ensure only admins can view the dashboard
    if (user && (user.role === "core_admin" || user.role === "admin")) {
        document.getElementById("accessDeniedMsg").classList.add("d-none");
        document.getElementById("adminContent").classList.remove("d-none");
        
        fetchUsersForAdmin();
        fetchFeedbackForAdmin();
    } else {
        document.getElementById("accessDeniedMsg").innerHTML = "<h3 class='text-danger'>Access Restricted</h3><p class='text-muted-c'>You do not have the required permissions.</p>";
    }
}

async function promoteUserToAdmin(userEmail) {
    // TODO: Update user role in your database to 'admin'
    console.log(`${userEmail} promoted to rotational admin.`);
    // Refresh the table UI
    fetchUsersForAdmin();
}

async function deleteFeedback(feedbackId) {
    // TODO: Send delete request to database for this feedback ID
    console.log(`Feedback ${feedbackId} deleted.`);
    fetchFeedbackForAdmin();
}

// 4. PDF Upload & Repertoire
document.getElementById('scoreUploadForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('pdfFile');
    const file = fileInput.files[0];
    
    if (file && file.type === "application/pdf") {
        // TODO: Send file to your storage bucket (e.g., Firebase Storage, AWS S3)
        // TODO: Save the returned file URL to the database under this month's repertoire
        console.log(`Uploading ${file.name}...`);
        
        // Close modal on success
        bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide();
        fileInput.value = "";
    } else {
        alert("Please upload a valid PDF file.");
    }
});

// --- Logout Logic ---
function logoutUser() {
    // 1. Remove the user session data from the browser
    localStorage.removeItem("kcpo_user");
    
    // 2. Notify the user and redirect to the home page
    alert("You have been signed out.");
    window.location.href = "index.html"; 
}

// Ensure this goes inside your existing DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    
    // ... (your existing DOMContentLoaded code like sendCodeBtn) ...

    // 3. Attach logout function to the admin sign-out button
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }
});