// ================= GLOBAL CLIENT LOGIC =================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Dynamic Navbar Active State Manager
    // Highlights the navigation link corresponding to the current page URL
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const navLinks = document.querySelectorAll(".navbar-nav .nav-link");

    navLinks.forEach(link => {
        if (link.getAttribute("href") === currentPage) {
            link.classList.add("active", "text-warning");
            link.setAttribute("aria-current", "page");
        }
    });

    console.log("KCPO Portal: Core JavaScript successfully initialized.");
});