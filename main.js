/**
 * ============================================================================
 * KCPO PORTAL - CORE APPLICATION ENGINE
 * Handles dynamic data rendering, search algorithms, and UI validation.
 * ============================================================================
 */

// 1. THE REPERTOIRE DATABASE ( with LocalStorage Persistence)
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

// Check if the user has saved scores in their browser memory..
let repertoireRegistry = JSON.parse(localStorage.getItem("kcpo_repertoire")) || defaultRepertoire;

document.addEventListener("DOMContentLoaded", () => {
    // ------------------------------------------------------------------------
    // GLOBAL: Navigation Active State
    // ------------------------------------------------------------------------
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".navbar-nav .nav-link").forEach(link => {
        if (link.getAttribute("href") === currentPage) {
            link.classList.add("active", "text-warning");
            link.setAttribute("aria-current", "page");
        }
    });

    // ------------------------------------------------------------------------
    // ARCHIVE MODULE: Dynamic Card Renderer
    // ------------------------------------------------------------------------
    const gridContainer = document.getElementById("archiveGrid");
    const searchInput = document.getElementById("repertoireSearch");

    function renderRegistry(dataSet) {
        if (!gridContainer) return;
        gridContainer.innerHTML = ""; // Clear grid

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

    // Initial render on load
    if (gridContainer) {
        renderRegistry(repertoireRegistry);
    }

    // ------------------------------------------------------------------------
    // ARCHIVE MODULE: Instant Search Algorithm
    // ------------------------------------------------------------------------
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

    // ------------------------------------------------------------------------
    // ARCHIVE MODULE: Form Validation & Dynamic Insertion
    // ------------------------------------------------------------------------
    const logForm = document.getElementById("quickLogForm");
    if (logForm) {
        logForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            // Bootstrap Form Validation Check
            if (!logForm.checkValidity()) {
                e.stopPropagation();
                logForm.classList.add("was-validated");
                return;
            }

            // Extract values
            const newEntry = {
                title: document.getElementById("scoreTitle").value.trim(),
                composer: document.getElementById("scoreComposer").value.trim(),
                notes: document.getElementById("scoreNotes").value.trim(),
                era: document.getElementById("scoreEra").value,
                pdfFile: document.getElementById("scoreFile").value.trim()
            };

            // Push to active array and re-render
            repertoireRegistry.unshift(newEntry); // Adds to top of list
            renderRegistry(repertoireRegistry);

            //  Save the updated array permanently to the browser!
            localStorage.setItem("kcpo_repertoire", JSON.stringify(repertoireRegistry));

            // Close modal & reset form
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById("addScoreModal"));
            modalInstance.hide();
            logForm.reset();
            logForm.classList.remove("was-validated");
        });
    }
});


    // MEMBERSHIP MODULE: Dynamic Faculty Renderer (tutors.html)
    
    const memberGrid = document.getElementById("memberGridContainer");

    const memberRegistry = [
        {
            name: "John Musila",
            role: "Founding Authority • Legal Convener",
            location: "United States (Remote)",
            bio: "Initiated the original network. Spearheading formal legal registration and strategic global positioning for KCPO.",
            statusBadge: "Remote Founder",
            photo: "musila.png.jpeg" // Leave empty to see the clean grey placeholder icon!
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
            // Bulletproof Fallback Logic:
            // If photo exists, render an <img> tag. If empty, render a sleek Bootstrap Icon.
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