import supabase, { supabaseAdmin } from '../supabase.js';

window.addEventListener("DOMContentLoaded", async () => {
    console.log("Admin page successfully loaded, initializing data...");
    await checkAdmin();

    // Announcement Form Listener Bind Karein
    const announcementForm = document.getElementById('announcement-form');
    if (announcementForm) {
        announcementForm.addEventListener('submit', handleCreateAnnouncement);
    }
});

async function checkAdmin() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = "index.html";
        return;
    }
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
        Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: 'You are not authorized to view this page!',
            confirmButtonColor: '#d33'
        }).then(() => {
            window.location.href = "adminlogin.html";
        });
        return;
    }

    console.log("Welcome admin!", user.email);
    await loadStats();
    await loadAllPost();
    await loadAllUsers();
}

async function loadAllUsers() {
    try {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) throw error;

        const users = data.users;
        const tableBody = document.getElementById("users-table-body");
        if (!tableBody) return;

        if (!users || users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No users registered yet.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";
        users.forEach((user, index) => {
            const joinedDate = new Date(user.created_at).toLocaleDateString();
            const fullName = `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Anonymous User';
            const role = user.user_metadata?.role || 'user';

            tableBody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${fullName}</strong></td>
                    <td>${user.email}</td>
                    <td><span class="badge ${role === 'admin' ? 'bg-danger' : 'bg-success'}">${role}</span></td>
                    <td>${joinedDate}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });

        const totalUsersEl = document.getElementById("total-users");
        if (totalUsersEl) {
            totalUsersEl.innerText = users.length;
        }

    } catch (err) {
        console.error("Error loading users with supabaseAdmin:", err.message);
    }
}

async function deleteUser(userId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "Kya aap waqai is user ko delete karna chahte hain? Iske saare posts bhi delete ho jayenge!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444', 
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Yes, delete user!',
        cancelButtonText: 'Cancel',
        background: '#1e293b',
        color: '#fff'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'Deleting user...',
        html: 'Please wait while we remove the user data.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        background: '#1e293b',
        color: '#fff'
    });

    try {
        const { error: postsError } = await supabase
            .from("post_app_table")
            .delete()
            .eq("user_id", userId);

        if (postsError) console.error("Error deleting user posts:", postsError);

        const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            console.error("Auth error:", error);
            let errorMessage = error.message.includes("service_role")
                ? "Admin permissions error. Please check your service role key."
                : error.message;

            Swal.fire({
                icon: 'error',
                title: 'Delete Failed',
                text: errorMessage,
                background: '#1e293b',
                color: '#fff'
            });
            return;
        }

        await Swal.fire({
            icon: 'success',
            title: 'Deleted Successfully!',
            text: 'User aur unka saara data system se remove kar diya gaya hai.',
            timer: 2000,
            showConfirmButton: false,
            background: '#1e293b',
            color: '#fff'
        });

        await loadAllUsers();
        await loadStats();

    } catch (error) {
        console.error("Unexpected error:", error);
        Swal.fire({
            icon: 'error',
            title: 'Unexpected Error',
            text: 'An unexpected error occurred while deleting the user.',
            background: '#1e293b',
            color: '#fff'
        });
    }
}

async function loadStats() {
    try {
        const { count: postsCount } = await supabase.from('post_app_table').select('*', { count: 'exact', head: true });
        const { count: commentsCount } = await supabase.from('comment_table').select('*', { count: 'exact', head: true });
        const { count: likesCount } = await supabase.from('like_table').select('*', { count: 'exact', head: true });
        const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
        const { count: materialCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

        const totalPostsEl = document.getElementById("total-posts");
        const totalCommentsEl = document.getElementById("total-comments");
        const totalLikesEl = document.getElementById("total-likes");
        const totalEventsEl = document.getElementById("total-events");
        const totalMaterialEl = document.getElementById("total-study") || document.getElementById("study-material");

        if (totalPostsEl) totalPostsEl.innerText = postsCount || 0;
        if (totalCommentsEl) totalCommentsEl.innerText = commentsCount || 0;
        if (totalLikesEl) totalLikesEl.innerText = likesCount || 0;
        if (totalEventsEl) totalEventsEl.innerText = eventsCount ?? 0;
        if (totalMaterialEl) totalMaterialEl.innerText = materialCount ?? 0;

    } catch (err) {
        console.error("Error in fetchStats:", err);
    }
}

async function loadAllPost() {
    try {
        const { data: posts, error } = await supabase
            .from('post_app_table')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tableBody = document.getElementById("posts-table-body");
        if (!tableBody) return;

        if (posts.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No posts available.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";
        posts.forEach((post, index) => {
            tableBody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <strong>${post.user_name || 'Anonymous'}</strong><br>
                        <small class="text-muted">${post.email || ''}</small>
                    </td>
                    <td>${post.title || 'No Title'}</td>
                    <td class="text-truncate" style="max-width: 250px;">${post.description || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger px-3" onclick="deletePost('${post.id}')">
                            <i class="bi bi-trash3 me-1"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error loading posts:", err);
    }
}

async function deletePost(postId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this post!",
        icon: 'warning',
        iconColor: '#f59e0b',
        showCancelButton: true,
        confirmButtonColor: '#0d9488',
        cancelButtonColor: '#e11d48',
        confirmButtonText: '<i class="bi bi-trash"></i> Yes, delete it!',
        cancelButtonText: 'Cancel',
        background: '#15222e',
        color: '#f3f4f6',
        customClass: { popup: 'rounded-4 border border-secondary shadow-lg' }
    });

    if (result.isConfirmed) {
        try {
            const { error } = await supabase
                .from('post_app_table')
                .delete()
                .eq('id', postId);

            if (error) throw error;

            Swal.fire({
                title: 'Deleted!',
                text: 'Post has been removed.',
                icon: 'success',
                iconColor: '#10b981',
                background: '#15222e',
                color: '#f3f4f6',
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: 'rounded-4 border border-secondary' }
            });

            await loadAllPost();
            await loadStats();

        } catch (err) {
            Swal.fire({
                title: 'Error!',
                text: err.message,
                icon: 'error',
                background: '#15222e',
                color: '#f3f4f6'
            });
        }
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.add('d-none');
        section.classList.remove('active-section');
    });

    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) {
        targetSection.classList.remove('d-none');
        targetSection.classList.add('active-section');
    }

    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.getElementById(`tab-${sectionId}`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    if (sectionId === 'events') {
        loadAllEvents();
    } else if (sectionId === 'users') {
        loadAllUsers();
    } else if (sectionId === 'posts') {
        loadAllPost();
    } else if (sectionId === 'announcements') {
        loadAnnouncements();
    }
}

async function logoutAdmin() {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You will be logged out of the admin panel!",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Yes, Log out',
        background: '#15222e',
        color: '#f3f4f6'
    });

    if (result.isConfirmed) {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            Swal.fire({
                title: 'Logged Out!',
                text: 'Redirecting to login page...',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#15222e',
                color: '#f3f4f6'
            });

            setTimeout(() => {
                window.location.href = "adminlogin.html";
            }, 1500);

        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message,
                background: '#15222e',
                color: '#f3f4f6'
            });
        }
    }
}

// --- UPDATED EVENTS LOGIC WITH APPROVE / REJECT FEATURE ---

async function loadAllEvents() {
    const tableBody = document.getElementById("events-table-body");
    if (!tableBody) return;

    const sanitize = (str) => {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    try {
        const { data: events, error } = await supabase
            .from("events")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!events || events.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="bi bi-calendar-x fs-3 d-block mb-2"></i>
                        No events registered yet.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = "";
        events.forEach((event, index) => {
            const title = sanitize(event.title || "Untitled Event");
            const date = sanitize(event.event_date || event.date || "N/A");
            const time = sanitize(event.event_time || event.time || "N/A");
            const location = sanitize(event.location || "N/A");
            const status = event.status || "pending";

            // Theme-Matched Badges (Dark Glassmorphism Style)
            let statusBadge = `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);">Pending</span>`;
            if (status === 'approved') {
                statusBadge = `<span class="badge" style="background: rgba(0, 223, 162, 0.15); color: #00DFA2; border: 1px solid rgba(0, 223, 162, 0.3);">Approved</span>`;
            } else if (status === 'rejected') {
                statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">Rejected</span>`;
            }

            tableBody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${title}</strong></td>
                    <td><i class="bi bi-calendar3 me-1"></i>${date}</td>
                    <td><i class="bi bi-clock me-1"></i>${time}</td>
                    <td><i class="bi bi-geo-alt me-1"></i>${location}</td>
                    <td>${statusBadge}</td>
                    <td class="text-center">
                        <div class="d-inline-flex gap-1">
                            ${status !== 'approved' ? `
                                <button class="btn btn-sm" onclick="updateEventStatus('${event.id}', 'approved')" title="Approve" style="background: rgba(0, 223, 162, 0.2); color: #00DFA2; border: 1px solid #00DFA2;">
                                    <i class="bi bi-check-lg"></i>
                                </button>
                            ` : ''}
                            ${status !== 'rejected' ? `
                                <button class="btn btn-sm" onclick="updateEventStatus('${event.id}', 'rejected')" title="Reject" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid #f59e0b;">
                                    <i class="bi bi-x-lg"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm" onclick="deleteEvent('${event.id}')" title="Delete" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444;">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Error loading events:", err);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
                    Failed to load events. (${err.message || 'Error'})
                </td>
            </tr>
        `;
    }
}
// Function to Approve or Reject Event Status
async function updateEventStatus(eventId, newStatus) {
    try {
        const { error } = await supabase
            .from("events")
            .update({ status: newStatus })
            .eq("id", Number(eventId));

        if (error) throw error;

        Swal.fire({
            icon: 'success',
            title: `Event ${newStatus.toUpperCase()}!`,
            text: `Event status successfully updated to ${newStatus}.`,
            timer: 1500,
            showConfirmButton: false,
            background: '#15222e',
            color: '#f3f4f6'
        });

        await loadAllEvents();

    } catch (err) {
        console.error("Error updating event status:", err);
        Swal.fire({
            icon: 'error',
            title: 'Action Failed',
            text: err.message,
            background: '#15222e',
            color: '#f3f4f6'
        });
    }
}

// Global exports update
window.updateEventStatus = updateEventStatus;

async function deleteEvent(eventId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        iconColor: '#f43f5e',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel',
        reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
        const numericId = Number(eventId);

        try {
            await supabase
                .from("event_participants")
                .delete()
                .eq("event_id", numericId);
        } catch (pErr) {
            console.warn("Participant delete skipped:", pErr);
        }

        const { error } = await supabase
            .from("events")
            .delete()
            .eq("id", numericId);

        if (error) throw error;

        Swal.fire({
            icon: 'success',
            iconColor: '#0d9488',
            title: 'Deleted!',
            text: 'Event has been deleted successfully.',
            timer: 2000,
            showConfirmButton: false
        });

        loadAllEvents();

    } catch (err) {
        console.error("Error deleting event:", err);
        Swal.fire({
            icon: 'error',
            iconColor: '#e11d48',
            title: 'Failed!',
            text: err.message || 'Database error occurred.'
        });
    }
}

// --- ANNOUNCEMENTS LOGIC ---
async function loadAnnouncements() {
    const tableBody = document.getElementById("announcements-table-body");
    if (!tableBody) return;

    try {
        const { data: announcements, error } = await supabase
            .from('Announcements')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!announcements || announcements.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No announcements published yet.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";
        announcements.forEach((item, index) => {
            const createdDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A';
            
            tableBody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong class="text-white">${item.title || 'Untitled'}</strong></td>
                    <td class="text-truncate" style="max-width: 300px;">${item.message || ''}</td>
                    <td>${createdDate}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger px-3" onclick="deleteAnnouncement('${item.id}')">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error loading announcements:", err.message);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Failed to load announcements.</td></tr>`;
    }
}

async function handleCreateAnnouncement(e) {
    e.preventDefault();
    const titleInput = document.getElementById('announcement-title');
    const messageInput = document.getElementById('announcement-message');

    const title = titleInput?.value.trim();
    const message = messageInput?.value.trim();

    if (!title || !message) {
        Swal.fire({
            icon: 'warning',
            title: 'Incomplete Data',
            text: 'Please enter both title and message.',
            background: '#15222e',
            color: '#f3f4f6'
        });
        return;
    }

    try {
        const { error } = await supabase
            .from('Announcements')
            .insert([{ title, message }]);

        if (error) throw error;

        Swal.fire({
            icon: 'success',
            title: 'Published!',
            text: 'Announcement has been published successfully.',
            timer: 1500,
            showConfirmButton: false,
            background: '#15222e',
            color: '#f3f4f6'
        });

        const form = document.getElementById('announcement-form');
        if (form) form.reset();

        const modalEl = document.getElementById('announcementModal');
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
        }

        await loadAnnouncements();

    } catch (err) {
        console.error("Error creating announcement:", err);
        Swal.fire({
            icon: 'error',
            title: 'Failed',
            text: err.message,
            background: '#15222e',
            color: '#f3f4f6'
        });
    }
}

async function deleteAnnouncement(id) {
    const result = await Swal.fire({
        title: 'Delete Announcement?',
        text: "This action cannot be undone!",
        icon: 'warning',
        iconColor: '#f43f5e',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Yes, delete it!',
        background: '#15222e',
        color: '#f3f4f6'
    });

    if (!result.isConfirmed) return;

    try {
        const { error } = await supabase
            .from('Announcements')
            .delete()
            .eq('id', id);

        if (error) throw error;

        Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Announcement removed successfully.',
            timer: 1500,
            showConfirmButton: false,
            background: '#15222e',
            color: '#f3f4f6'
        });

        await loadAnnouncements();

    } catch (err) {
        console.error("Error deleting announcement:", err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.message,
            background: '#15222e',
            color: '#f3f4f6'
        });
    }
}

// Mobile Sidebar Toggle Logic
document.addEventListener("DOMContentLoaded", () => {
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebar = document.querySelector(".sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const navLinks = document.querySelectorAll(".sidebar .nav-link");

    function toggleSidebar() {
        sidebar.classList.toggle("show");
        sidebarOverlay.classList.toggle("show");
    }

    if (sidebarToggle) sidebarToggle.addEventListener("click", toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", toggleSidebar);

    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            if (window.innerWidth < 992 && sidebar) {
                sidebar.classList.remove("show");
                if (sidebarOverlay) sidebarOverlay.classList.remove("show");
            }
        });
    });

    // Custom GSAP Cursor Pointer
    let pointer = document.getElementById("pointer");
    if (!pointer) {
        pointer = document.createElement("div");
        pointer.id = "pointer";
        document.body.appendChild(pointer);
    }

    gsap.set(pointer, { xPercent: -50, yPercent: -50 });

    window.addEventListener("mousemove", (e) => {
        gsap.to(pointer, {
            x: e.clientX,
            y: e.clientY,
            duration: 0.12,
            ease: "power2.out",
            boxShadow: "0 0 25px rgba(16, 185, 129, 1)"
        });
    });
});

// --- GLOBAL EXPORTS ---
window.loadAllUsers = loadAllUsers;
window.deleteUser = deleteUser;
window.loadStats = loadStats;
window.loadAllPost = loadAllPost;
window.deletePost = deletePost;
window.showSection = showSection;
window.logoutAdmin = logoutAdmin;
window.loadAllEvents = loadAllEvents;
window.deleteEvent = deleteEvent;
window.loadAnnouncements = loadAnnouncements;
window.handleCreateAnnouncement = handleCreateAnnouncement;
window.deleteAnnouncement = deleteAnnouncement;