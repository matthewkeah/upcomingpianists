/**
 * ============================================================================
 * KCPO PORTAL - CORE APPLICATION ENGINE
 * Handles dynamic data rendering, search algorithms, and UI validation.
 * ============================================================================
 */

// 1. THE REPERTOIRE DATABASE
// To add new sheet music, simply add a new object to this array.
let repertoireRegistry = [
    {
        title: "Prelude and Fugue in C Minor, BWV 847",
        composer: "J.S. Bach",
        notes: "Presented in Year Two active phase. Focuses on contrapuntal voice independence and articulation.",
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

            // Close modal & reset form
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById("addScoreModal"));
            modalInstance.hide();
            logForm.reset();
            logForm.classList.remove("was-validated");
        });
    }
});