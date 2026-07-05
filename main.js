/**
 * ============================================================================
 * KCPO PORTAL - CORE APPLICATION ENGINE & SUPABASE BACKEND SETUP
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 0. CLOUD BACKEND INITIALIZATION (SUPABASE)
// ----------------------------------------------------------------------------
const SUPABASE_URL = "https://ovinidzsqzakofhjpwgl.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aW5pZHpzcXpha29maGpwd2dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyODE2OTcsImV4cCI6MjA5ODg1NzY5N30.x_8g68lxyM73K-3QJEOT1B7-fX9jZKmN20bWjPxhEtA";

// Create the Supabase client connection
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Quick diagnostic test to verify connection
console.log("KCPO Engine: Supabase Cloud Client successfully initialized!", supabase);


// ----------------------------------------------------------------------------
// 1. THE REPERTOIRE DATABASE (with LocalStorage Persistence)
// ----------------------------------------------------------------------------
const defaultRepertoire = [
    {
        title: "Prelude and Fugue in C Minor, BWV 847",
        composer: "J.S. Bach",
        notes: "Presented in Year Two active phase. Focuses on contrapuntal voice independence.",
        era: "Baroque",
        pdfFile: "bach_bwv847.pdf"
    },
    {
        title: "Prelude in C# Minor, Op. 3 No. 2",
        composer: "Sergei Rachmaninoff",
        notes: "Examines heavy chordal weighting, sfortzando dynamics, and three-stave reading.",
        era: "Late Romantic",
        pdfFile: "rachmaninoff_op3.pdf"
    },
    {
        title: "Piano Sonata No. 8 'Pathétique'",
        composer: "Ludwig van Beethoven",
        notes: "Grave introduction pacing and left-hand tremolo endurance workout.",
        era: "Classical",
        pdfFile: "beethoven_pathetique.pdf"
    },
    {
        title: "Ballade No. 1 in G Minor, Op. 23",
        composer: "Frédéric Chopin",
        notes: "Advanced narrative phrasing, rubato control, and rapid coda execution.",
        era: "Romantic",
        pdfFile: "chopin_ballade1.pdf"
    }
];

let repertoireRegistry = JSON.parse(localStorage.getItem("kcpo_repertoire")) || defaultRepertoire;

document.addEventListener("DOMContentLoaded", () => {
    // Global Navigation Active State
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".navbar-nav .nav-link").forEach(link => {
        if (link.getAttribute("href") === currentPage) {
            link.classList.add("active", "text-warning");
            link.setAttribute("aria-current", "page");
        }
    });

    // Archive Module: Dynamic Card Renderer
    const gridContainer = document.getElementById("archiveGrid");
    const searchInput = document.getElementById("repertoireSearch");

    function renderRegistry(dataSet) {
        if (!gridContainer) return;
        gridContainer.innerHTML = ""; 

        if (dataSet.length === 0) {
            gridContainer.innerHTML = `<div class="col-12 text-center text-muted py-5">No repertoire found matching your search criteria.</div>`;
            return;
        }

        dataSet.forEach(item => {
            const cardHTML = `
                <div class="col-md-6 archive-item">
                    <div class="card kcpo-card p-3 h-100 d-flex flex-column justify-content-between">
                        <div>
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="font-serif text-light mb-0 pe-2">${item.title}</h5>
                                <span class="badge bg-secondary shrink-0">${item.era}</span>
                            </div>
                            <span class="text-warning small fw-bold d-block mb-2">${item.composer}</span>
                            <p class="text-secondary small mb-3">${item.notes || "No performance notes documented."}</p>
                        </div>
                        <div class="border-top border-secondary pt-3 mt-auto d-flex justify-content-between align-items-center">
                            <span class="small text-muted font-monospace"><i class="bi bi-file-earmark-pdf"></i> ${item.pdfFile}</span>
                            <a href="assets/scores/${item.pdfFile}" target="_blank" class="btn btn-sm btn-outline-light px-3">View PDF Score</a>
                        </div>
                    </div>
                </div>
            `;
            gridContainer.insertAdjacentHTML("beforeend", cardHTML);
        });
    }

    if (gridContainer) {
        renderRegistry(repertoireRegistry);
    }

    // Archive Module: Instant Search Algorithm
    if (searchInput && gridContainer) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filteredData = repertoireRegistry.filter(item => 
                item.title.toLowerCase().includes(query) || 
                item.composer.toLowerCase().includes(query) ||
                item.era.toLowerCase().includes(query)
            );
            renderRegistry(filteredData);
        });
    }

    // Archive Module: Form Validation & Dynamic Insertion
    const logForm = document.getElementById("quickLogForm");
    if (logForm) {
        logForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            if (!logForm.checkValidity()) {
                e.stopPropagation();
                logForm.classList.add("was-validated");
                return;
            }

            const newEntry = {
                title: document.getElementById("scoreTitle").value.trim(),
                composer: document.getElementById("scoreComposer").value.trim(),
                notes: document.getElementById("scoreNotes").value.trim(),
                era: document.getElementById("scoreEra").value,
                pdfFile: document.getElementById("scoreFile").value.trim()
            };

            repertoireRegistry.unshift(newEntry);
            renderRegistry(repertoireRegistry);
            localStorage.setItem("kcpo_repertoire", JSON.stringify(repertoireRegistry));

            const modalInstance = bootstrap.Modal.getInstance(document.getElementById("addScoreModal"));
            if (modalInstance) modalInstance.hide();
            logForm.reset();
            logForm.classList.remove("was-validated");
        });
    }
});


// ----------------------------------------------------------------------------
// 2. MEMBERSHIP MODULE: Dynamic Faculty Renderer (tutors.html)
// ----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const memberGrid = document.getElementById("memberGridContainer");

    const memberRegistry = [
        {
            name: "John Musila",
            role: "Founding Authority • Legal Convener",
            location: "United States (Remote)",
            bio: "Initiated the original network. Spearheading formal legal registration and strategic global positioning for KCPO.",
            statusBadge: "Remote Founder",
            photo: "musila.png.jpeg"
        },
        {
            name: "Leon Jabali",
            role: "Logistical Engine • Production Lead",
            location: "Nairobi, Kenya",
            bio: "Foundational anchor attendee. Managed end-to-end organizational production and staging for the inaugural public recital.",
            statusBadge: "Active Core",
            photo: "jabali.png.jpeg"
        },
        {
            name: "Matthew Keah",
            role: "Masterclass Coordinator • Technical Anchor",
            location: "Nairobi, Kenya",
            bio: "Owns monthly session curation, venue verification, and maintains rigorous performance standards during live critiques.",
            statusBadge: "Active Core",
            photo: "matthew.png.jpeg"
        },
        {
            name: "Jesse Kinyanjui",
            role: "Artistic Peer • Collaborative Presenter",
            location: "Nairobi, Kenya",
            bio: "Active revival contributor. Fosters community accountability and repertoire exploration during monthly anchor sessions.",
            statusBadge: "Consistent Core",
            photo: ""
        },
        {
            name: "Victor Ngatia",
            role: "Founding Peer • Critique Facilitator",
            location: "Nairobi, Kenya",
            bio: "Provides vital operational continuity and delivers highly technical peer feedback on wrist weight and phrasing.",
            statusBadge: "Consistent Core",
            photo: ""
        },
        {
            name: "Keoni Ngugi",
            role: "Repertoire Anchor • Performance Track",
            location: "Nairobi, Kenya",
            bio: "Committed monthly participant dedicated to mastering complex classical literature through disciplined peer review.",
            statusBadge: "Consistent Core",
            photo: "keoni.png.jpeg"
        }
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
                        <div class="avatar-container">
                            ${avatarHTML}
                        </div>
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
        console.log("KCPO Logic: Executive Faculty cards rendered successfully.");
    }
});


// ----------------------------------------------------------------------------
// 3. SUPABASE AUTHENTICATION MODULE (Global 6-Digit OTP Email Verification)
// ----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    console.log("KCPO Diagnostics: Initializing Authentication Module globally...");

    const signInForm = document.getElementById("signInForm");
    const signUpForm = document.getElementById("signUpForm");
    const forgotForm = document.getElementById("forgotForm");
    const otpForm = document.getElementById("otpForm");
    const authAlert = document.getElementById("authAlert");
    const navAuthBtn = document.getElementById("navAuthBtn");

    let currentAuthEmail = "";

    // Helper: Display Alert inside Modal
    function showAuthAlert(message, type = "danger") {
        if (!authAlert) return;
        authAlert.className = `alert alert-${type} mt-3 mb-0 d-block small py-2`;
        authAlert.textContent = message;
        console.log(`KCPO UI Alert (${type}): ${message}`);
    }

    // Helper: Check current session & adjust Navbar Button
    async function checkUserSession() {
        if (!supabase || !navAuthBtn) return;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            const userEmail = session.user.email;
            const isAdmin = userEmail.toLowerCase() === "matthew.keah@strathmore.edu";
            
            navAuthBtn.innerHTML = isAdmin 
                ? `<i class="bi bi-shield-lock-fill text-danger me-1"></i> Admin Portal`
                : `<i class="bi bi-person-check-fill text-success me-1"></i> My Account`;
            navAuthBtn.classList.replace("btn-outline-warning", "btn-warning");
            navAuthBtn.classList.add("text-dark", "fw-bold");
            
            sessionStorage.setItem("kcpo_role", isAdmin ? "admin" : "member");
            sessionStorage.setItem("kcpo_user", userEmail);
            console.log(`KCPO Auth: Active Session -> ${userEmail} [Role: ${isAdmin ? 'ADMIN' : 'MEMBER'}]`);
        } else {
            sessionStorage.removeItem("kcpo_role");
            sessionStorage.removeItem("kcpo_user");
            console.log("KCPO Auth: No active user session.");
        }
    }

    // 1. SIGN IN ACTION (Standard Password Login)
    if (signInForm && supabase) {
        signInForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("KCPO Diagnostics: 'Sign In' button clicked!");
            showAuthAlert("Authenticating...", "info");
            const email = document.getElementById("signInEmail").value.trim();
            const password = document.getElementById("signInPassword").value;

            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                showAuthAlert(error.message, "danger");
            } else {
                showAuthAlert("Welcome back! Loading portal...", "success");
                await checkUserSession();
                setTimeout(() => {
                    const modalInstance = bootstrap.Modal.getInstance(document.getElementById("authModal"));
                    if (modalInstance) modalInstance.hide();
                    window.location.reload(); 
                }, 1000);
            }
        });
    }

    // 2. SIGN UP ACTION (Triggers the 6-Digit Email Code)
    if (signUpForm && supabase) {
        signUpForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("KCPO Diagnostics: 'Register' button clicked!");
            showAuthAlert("Sending verification code to email...", "info");
            const name = document.getElementById("signUpName").value.trim();
            const email = document.getElementById("signUpEmail").value.trim();
            const password = document.getElementById("signUpPassword").value;

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: name } }
            });

            if (error) {
                showAuthAlert(error.message, "danger");
            } else {
                currentAuthEmail = email; 
                showAuthAlert("Account created! We just emailed you a 6-digit code.", "success");
                
                signUpForm.classList.add("d-none");
                const otpSec = document.getElementById("otpSection");
                if (otpSec) otpSec.classList.remove("d-none");
            }
        });
    }

    // 3. VERIFY THE 6-DIGIT CODE ACTION
    if (otpForm && supabase) {
        otpForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("KCPO Diagnostics: 'Verify' button clicked!");
            showAuthAlert("Verifying code...", "info");
            
            const token = document.getElementById("otpCode").value.replace(/\s+/g, '').trim();

            const { data, error } = await supabase.auth.verifyOtp({
                email: currentAuthEmail,
                token: token,
                type: 'email' 
            });

            if (error) {
                showAuthAlert("Invalid code. Please check your inbox and try again: " + error.message, "danger");
            } else {
                showAuthAlert("Email verified! Welcome to the portal.", "success");
                await checkUserSession();
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        });
    }

    // 4. FORGOT PASSWORD ACTION
    if (forgotForm && supabase) {
        forgotForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            showAuthAlert("Sending reset link...", "info");
            const email = document.getElementById("forgotEmail").value.trim();

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + "/index.html"
            });

            if (error) {
                showAuthAlert(error.message, "danger");
            } else {
                showAuthAlert("Password reset link sent to your email!", "success");
                forgotForm.reset();
            }
        });
    }

    // Check session on load
    checkUserSession();
});