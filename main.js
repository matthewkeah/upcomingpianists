/**
 * ============================================================================
 * KCPO PORTAL - CORE APPLICATION ENGINE & FIREBASE BACKEND SETUP
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 0. CLOUD BACKEND INITIALIZATION (FIREBASE)
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
    getDocs, 
    addDoc, 
    query, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";

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
const storage = getStorage(app);

console.log("KCPO Engine: Firebase Cloud Client successfully initialized!");


// ----------------------------------------------------------------------------
// 1. THE REPERTOIRE DATABASE (Cloud Connected & XSS Secured)
// ----------------------------------------------------------------------------

// SECURITY: HTML escaper to prevent Stored XSS attacks
function escapeHTML(str) {
    if (!str) return "No performance notes documented.";
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

document.addEventListener("DOMContentLoaded", () => {
    // Global Navigation Active State
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".navbar-nav .nav-link").forEach(link => {
        if (link.getAttribute("href") === currentPage) {
            link.classList.add("active", "text-warning");
            link.setAttribute("aria-current", "page");
        }
    });

    const gridContainer = document.getElementById("archiveGrid");
    const searchInput = document.getElementById("repertoireSearch");
    const logForm = document.getElementById("quickLogForm");

    function renderRegistry(dataSet) {
        if (!gridContainer) return;
        gridContainer.innerHTML = ""; 

        if (!dataSet || dataSet.length === 0) {
            gridContainer.innerHTML = `<div class="col-12 text-center text-muted py-5">No repertoire found.</div>`;
            return;
        }

        dataSet.forEach(item => {
            const safeNotes = escapeHTML(item.notes);
            const safeTitle = escapeHTML(item.title);
            const safeComposer = escapeHTML(item.composer);
            const safeEra = escapeHTML(item.era);
            const safePdf = escapeHTML(item.pdfFile);

            const cardHTML = `
                <div class="col-md-6 archive-item">
                    <div class="card kcpo-card p-3 h-100 d-flex flex-column justify-content-between">
                        <div>
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="font-serif text-light mb-0 pe-2">${safeTitle}</h5>
                                <span class="badge bg-secondary shrink-0">${safeEra}</span>
                            </div>
                            <span class="text-warning small fw-bold d-block mb-2">${safeComposer}</span>
                            <p class="text-secondary small mb-3">${safeNotes}</p>
                        </div>
                        <div class="border-top border-secondary pt-3 mt-auto d-flex justify-content-between align-items-center">
                            <span class="small text-muted font-monospace"><i class="bi bi-file-earmark-pdf"></i> ${safePdf}</span>
                            <a href="assets/scores/${safePdf}" target="_blank" class="btn btn-sm btn-outline-light px-3">View PDF Score</a>
                        </div>
                    </div>
                </div>
            `;
            gridContainer.insertAdjacentHTML("beforeend", cardHTML);
        });
    }

    // Fetch from Firestore
    async function loadRepertoire() {
        if (!gridContainer) return;
        gridContainer.innerHTML = `<div class="col-12 text-center text-muted py-5">Loading cloud registry...</div>`;
        
        try {
            const q = query(collection(db, "performances"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const data = [];
            
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
            
            renderRegistry(data);

            if (searchInput) {
                searchInput.addEventListener("input", (e) => {
                    const queryText = e.target.value.toLowerCase().trim();
                    const filteredData = data.filter(item => 
                        item.title.toLowerCase().includes(queryText) || 
                        item.composer.toLowerCase().includes(queryText) ||
                        item.era.toLowerCase().includes(queryText)
                    );
                    renderRegistry(filteredData);
                });
            }
        } catch (error) {
            console.error("Failed to load repertoire:", error);
            gridContainer.innerHTML = `<div class="col-12 text-center text-danger py-5">Error loading database.</div>`;
        }
    }

    // Insert into Firestore
    if (logForm) {
        logForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            if (!logForm.checkValidity()) {
                e.stopPropagation();
                logForm.classList.add("was-validated");
                return;
            }

            try {
                await addDoc(collection(db, "performances"), {
                    title: document.getElementById("scoreTitle").value.trim(),
                    composer: document.getElementById("scoreComposer").value.trim(),
                    notes: document.getElementById("scoreNotes").value.trim(),
                    era: document.getElementById("scoreEra").value,
                    pdfFile: document.getElementById("scoreFile").value.trim(),
                    createdAt: serverTimestamp()
                });
                
                loadRepertoire(); 
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById("addScoreModal"));
                if (modalInstance) modalInstance.hide();
                logForm.reset();
                logForm.classList.remove("was-validated");
            } catch (error) {
                alert("Database Error: You might not have permission to add scores. (" + error.message + ")");
            }
        });
    }

    loadRepertoire();
});


// ----------------------------------------------------------------------------
// 2. MEMBERSHIP MODULE: Dynamic Faculty Renderer (tutors.html)
// ----------------------------------------------------------------------------
// (Keeping this local for now as per previous logic)
document.addEventListener("DOMContentLoaded", () => {
    const memberGrid = document.getElementById("memberGridContainer");

    const memberRegistry = [
        { name: "John Musila", role: "Founding Authority • Legal Convener", location: "United States (Remote)", bio: "Initiated the original network. Spearheading formal legal registration and strategic global positioning for KCPO.", statusBadge: "Remote Founder", photo: "musila.png.jpeg" },
        { name: "Leon Jabali", role: "Logistical Engine • Production Lead", location: "Nairobi, Kenya", bio: "Foundational anchor attendee. Managed end-to-end organizational production and staging for the inaugural public recital.", statusBadge: "Active Core", photo: "jabali.png.jpeg" },
        { name: "Matthew Keah", role: "Masterclass Coordinator • Technical Anchor", location: "Nairobi, Kenya", bio: "Owns monthly session curation, venue verification, and maintains rigorous performance standards during live critiques.", statusBadge: "Active Core", photo: "matthew.png.jpeg" },
        { name: "Jesse Kinyanjui", role: "Artistic Peer • Collaborative Presenter", location: "Nairobi, Kenya", bio: "Active revival contributor. Fosters community accountability and repertoire exploration during monthly anchor sessions.", statusBadge: "Consistent Core", photo: "" },
        { name: "Victor Ngatia", role: "Founding Peer • Critique Facilitator", location: "Nairobi, Kenya", bio: "Provides vital operational continuity and delivers highly technical peer feedback on wrist weight and phrasing.", statusBadge: "Consistent Core", photo: "" },
        { name: "Keoni Ngugi", role: "Repertoire Anchor • Performance Track", location: "Nairobi, Kenya", bio: "Committed monthly participant dedicated to mastering complex classical literature through disciplined peer review.", statusBadge: "Consistent Core", photo: "keoni.png.jpeg" }
    ];

    if (memberGrid) {
        memberGrid.innerHTML = ""; 
        memberRegistry.forEach(member => {
            const avatarHTML = member.photo 
                ? `<img src="assets/members/${member.photo}" alt="${member.name} Profile" class="avatar-pfp shadow">`
                : `<i class="bi bi-person-circle default-avatar-icon"></i>`;

            const cardHTML = `
                <div class="col-md-6 col-lg-4">
                    <div class="profile-card h-100 d-flex flex-column text-center p-4">
                        <div class="avatar-container">${avatarHTML}</div>
                        <div class="card-body p-0 d-flex flex-column flex-grow-1">
                            <span class="member-role-tag mb-1">${member.role}</span>
                            <h3 class="font-serif text-light fw-bold mb-1">${member.name}</h3>
                            <span class="text-muted small mb-3"><i class="bi bi-geo-alt"></i> ${member.location}</span>
                            <p class="text-secondary small px-2 my-auto">${member.bio}</p>
                        </div>
                        <div class="border-top border-secondary pt-3 mt-4">
                            <span class="badge bg-dark border border-secondary text-light px-3 py-2 fw-normal">${member.statusBadge}</span>
                        </div>
                    </div>
                </div>
            `;
            memberGrid.insertAdjacentHTML("beforeend", cardHTML);
        });
    }
});


// ----------------------------------------------------------------------------
// 3. FIREBASE AUTHENTICATION MODULE
// ----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const signInForm = document.getElementById("signInForm");
    const signUpForm = document.getElementById("signUpForm");
    const forgotForm = document.getElementById("forgotForm");
    const authAlert = document.getElementById("authAlert");
    const navAuthBtn = document.getElementById("navAuthBtn");

    function showAuthAlert(message, type = "danger") {
        if (!authAlert) return;
        authAlert.className = `alert alert-${type} mt-3 mb-0 d-block small py-2`;
        authAlert.textContent = message;
    }

    // Listen for session changes globally
    onAuthStateChanged(auth, (user) => {
        if (!navAuthBtn) return;
        if (user) {
            const userEmail = user.email;
            
            // Updated Admin Array
            const adminEmails = [
                "matthew.keah@strathmore.edu",
                "john.musila@example.com",
                "leon.jabali@example.com"
            ];
            const isAdmin = adminEmails.includes(userEmail.toLowerCase());
            
            navAuthBtn.innerHTML = isAdmin 
                ? `<i class="bi bi-shield-lock-fill text-danger me-1"></i> Admin Portal`
                : `<i class="bi bi-person-check-fill text-success me-1"></i> My Account`;
            navAuthBtn.classList.replace("btn-outline-warning", "btn-warning");
            navAuthBtn.classList.add("text-dark", "fw-bold");
            
            sessionStorage.setItem("kcpo_role", isAdmin ? "admin" : "member");
            sessionStorage.setItem("kcpo_user", userEmail);
        } else {
            sessionStorage.removeItem("kcpo_role");
            sessionStorage.removeItem("kcpo_user");
        }
    });

    // 1. SIGN IN ACTION
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
                    const modalInstance = bootstrap.Modal.getInstance(document.getElementById("authModal"));
                    if (modalInstance) modalInstance.hide();
                    window.location.reload(); 
                }, 1000);
            } catch (error) {
                showAuthAlert(error.message, "danger");
            }
        });
    }

    // 2. SIGN UP ACTION (Standard Firebase Email/Password)
    if (signUpForm) {
        signUpForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            showAuthAlert("Creating account...", "info");
            const email = document.getElementById("signUpEmail").value.trim();
            const password = document.getElementById("signUpPassword").value;

            try {
                await createUserWithEmailAndPassword(auth, email, password);
                showAuthAlert("Account created successfully!", "success");
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } catch (error) {
                showAuthAlert(error.message, "danger");
            }
        });
    }

    // 3. FORGOT PASSWORD ACTION
    if (forgotForm) {
        forgotForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            showAuthAlert("Sending reset link...", "info");
            const email = document.getElementById("forgotEmail").value.trim();

            try {
                await sendPasswordResetEmail(auth, email);
                showAuthAlert("Password reset link sent to your email!", "success");
                forgotForm.reset();
            } catch (error) {
                showAuthAlert(error.message, "danger");
            }
        });
    }
});