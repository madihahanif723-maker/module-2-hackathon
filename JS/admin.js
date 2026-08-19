
import supabase, { supabaseAdmin } from '../supabase.js';


window.addEventListener("DOMContentLoaded", async () => {
    console.log("Admin page successfully loaded, initializing data...");
    await checkAdmin();
});
async function checkAdmin() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = "adminlogin.html";
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
    await loadAllComments();
    await loadAllUsers();
}

async function loadAllUsers() {
    try {
        // Direct admin API call using supabaseAdmin
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) throw error;

        const users = data.users;
        const tableBody = document.getElementById("users-table-body");
        if (!tableBody) return;

        if (!users || users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No users registered yet.</td></tr>`;
            return;
        }

        // Table ko render karein
        tableBody.innerHTML = "";
        users.forEach((user, index) => {
            const joinedDate = new Date(user.created_at).toLocaleDateString();

            // User metadata se names aur role nikalna
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

        // Dashboard overview stats card ko dynamic update karein
        const totalUsersEl = document.getElementById("total-users");
        if (totalUsersEl) {
            totalUsersEl.innerText = users.length;
        }

    } catch (err) {
        console.error("Error loading users with supabaseAdmin:", err.message);
    }
}

window.loadAllUsers = loadAllUsers;
async function deleteUser(userId) {
    // 1. SweetAlert2 Confirmation Dialog
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "Kya aap waqai is user ko delete karna chahte hain? Iske saare posts bhi delete ho jayenge!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444', // Red color for delete
        cancelButtonColor: '#4b5563',  // Gray color for cancel
        confirmButtonText: 'Yes, delete user!',
        cancelButtonText: 'Cancel',
        background: '#1e293b',         // Admin panel dark theme match karne ke liye
        color: '#fff'
    });

    // Agar user ne cancel kiya toh function se exit kar jayein
    if (!result.isConfirmed) {
        return;
    }

    // Loader show karein jab tak delete operation chal raha ho
    Swal.fire({
        title: 'Deleting user...',
        html: 'Please wait while we remove the user data.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        },
        background: '#1e293b',
        color: '#fff'
    });

    try {
        // First, delete all posts by this user
        const { error: postsError } = await supabase
            .from("My Posts")
            .delete()
            .eq("user_id", userId);

        if (postsError) {
            console.error("Error deleting user posts:", postsError);
        }

        // Delete the user using admin client
        const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            console.error("Auth error:", error);

            let errorMessage = error.message;
            if (error.message.includes("service_role")) {
                errorMessage = "Admin permissions error. Please check your service role key.";
            }

            // Error SweetAlert
            Swal.fire({
                icon: 'error',
                title: 'Delete Failed',
                text: errorMessage,
                background: '#1e293b',
                color: '#fff'
            });
            return;
        }

        console.log("User deleted successfully:", data);

        // Success SweetAlert
        await Swal.fire({
            icon: 'success',
            title: 'Deleted Successfully!',
            text: 'User aur unka saara data system se remove kar diya gaya hai.',
            timer: 2000,
            showConfirmButton: false,
            background: '#1e293b',
            color: '#fff'
        });

        // Refresh the users list and stats
        await loadAllUsers();
        await loadStats();

    } catch (error) {
        console.error("Unexpected error:", error);

        // Unexpected Error SweetAlert
        Swal.fire({
            icon: 'error',
            title: 'Unexpected Error',
            text: 'An unexpected error occurred while deleting the user.',
            background: '#1e293b',
            color: '#fff'
        });
    }
}
window.deleteUser = deleteUser

async function loadStats() {
    try {
        const { count: postsCount, error: postErr } = await supabase
            .from('post_app_table')
            .select('*', { count: 'exact', head: true });

        const { count: commentsCount, error: commentErr } = await supabase
            .from('comment_table')
            .select('*', { count: 'exact', head: true });

        const { count: likesCount, error: likeErr } = await supabase
            .from('like_table')
            .select('*', { count: 'exact', head: true });
            const { count: eventsCount, error: eventErr } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true });

        const { count: materialCount, error: materialErr } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (eventErr) console.error("Event stats error:", eventErr);
        if (materialErr) console.error("Material stats error:", materialErr);

        if (postErr) console.error("Post stats error:", postErr);
        if (commentErr) console.error("Comment stats error:", commentErr);
        if (likeErr) console.error("Like stats error:", likeErr);

        const totalPostsEl = document.getElementById("total-posts");
        const totalCommentsEl = document.getElementById("total-comments");
        const totalLikesEl = document.getElementById("total-likes");
        const totalEventsEl = document.getElementById("total-events");
        const totalMaterialEl = document.getElementById("total-study") || document.getElementById("study-material");
        if (totalPostsEl) {
            totalPostsEl.innerText = postsCount || 0;
        }
        if (totalCommentsEl) totalCommentsEl.innerText = commentsCount || 0;
        if (totalLikesEl) totalLikesEl.innerText = likesCount || 0;
        if (totalEventsEl) totalEventsEl.innerText = eventsCount ?? 0;
if (totalMaterialEl) totalMaterialEl.innerText = materialCount ?? 0;

    } catch (err) {
        console.error("Error in fetchStats:", err);
    }
}
// 2. Load Posts Table
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
                        <div class="d-flex flex-column gap-2" style="max-width: 100px;">
        <button class="btn btn-sm btn-outline-info px-3 w-100" 
                onclick="openEditMode('${post.id}', '${post.title}', '${post.description}')"
                style="border-radius: 6px; font-weight: 500; transition: all 0.2s ease;">
            <i class="bi bi-pencil-square me-1"></i> Edit
        </button>

        <button class="btn btn-sm btn-outline-danger px-3 w-100" 
                onclick="deletePost('${post.id}')"
                style="border-radius: 6px; font-weight: 500; transition: all 0.2s ease;">
            <i class="bi bi-trash3 me-1"></i> Delete
        </button>
    </div>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error loading posts:", err);
    }
}
// 3. Load Comments Table
async function loadAllComments() {
    try {
        const { data: comments, error } = await supabase
            .from('comment_table')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tableBody = document.getElementById("comments-table-body");
        if (!tableBody) return;

        if (comments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No comments available.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";

        comments.forEach((comment, index) => {
            tableBody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${comment.user_name || 'Anonymous'}</strong></td>
                    <td>${comment.comment_text || comment.text || 'No comment text'}</td>
                    <td>Post #${comment.post_id || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger px-3"
                         onclick="deleteComment('${comment.id}')">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                       <button type="button" class="btn btn-sm btn-outline-info edit-post-btn px-3 me-1" onclick="updatecommentData()"><i class="bi bi-pencil-square me-1"></i> Edit</button> 
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error loading comments:", err);
    }
}
function openEditMode(id, title, description) {
    document.getElementById('edit-post-id').value = id;
    document.getElementById('edit-post-title').value = title;
    document.getElementById('edit-post-desc').value = description;

    // Bootstrap modal show karne ke liye
    const editModal = new bootstrap.Modal(document.getElementById('editPostModal'));
    editModal.show();
}
async function updatePostData() {
    const postId = document.getElementById('edit-post-id').value;
    const updatedTitle = document.getElementById('edit-post-title').value;
    const updatedDesc = document.getElementById('edit-post-desc').value;

    if (!updatedTitle.trim() || !updatedDesc.trim()) {
        Swal.fire({
            icon: 'error',
            title: 'Fields Empty',
            text: 'Title and Description cannot be empty!',
            background: '#15222e',
            color: '#f3f4f6'
        });
        return;
    }

    try {
        const { error } = await supabase
            .from('post_app_table')
            .update({
                title: updatedTitle,
                description: updatedDesc
            })
            .eq('id', postId);

        if (error) throw error;

        // Modal close karne ke liye
        const modalEl = document.getElementById('editPostModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) {
            modalInstance.hide();
        }

        // Success Alert
        Swal.fire({
            title: 'Updated!',
            text: 'Post has been updated successfully.',
            icon: 'success',
            iconColor: '#10b981',
            background: '#15222e',
            color: '#f3f4f6',
            timer: 1500,
            showConfirmButton: false
        });

        // UI refresh
        await loadAllPost();

    } catch (err) {
        Swal.fire({
            title: 'Error!',
            text: err.message,
            icon: 'error',
            background: '#15222e',
            color: '#f3f4f6'
        });
        console.error("Update error:", err);
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
// 5. Delete Comment
async function deleteComment(commentId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "This comment will be permanently deleted!",
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
                .from('comment_table')
                .delete()
                .eq('id', commentId);

            if (error) throw error;

            Swal.fire({
                title: 'Deleted!',
                text: 'Comment has been removed.',
                icon: 'success',
                iconColor: '#10b981',
                background: '#15222e',
                color: '#f3f4f6',
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: 'rounded-4 border border-secondary' }
            });

            await loadAllComments();
            await fetchStats();

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

// 🚀 clean and safe global tab-switching logic
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

    // Is conditional routing mein sectionId check hoga
    if (sectionId === 'events') {
        loadAllEvents();
    } else if (sectionId === 'users') {
        loadAllUsers();
    } else if (sectionId === 'posts') {
        loadAllPost();
    } else if (sectionId === 'comments') {
        loadAllComments();
    }
}
// Security Check (Role-based instead of Email-based)

async function logoutAdmin() {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You will be logged out of the admin panel!",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#e11d48', // Red color for logout
        cancelButtonColor: '#4b5563',  // Gray for cancel
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

            // 1.5 seconds ke baad login page par bhej dein
            setTimeout(() => {
                window.location.href = "adminlogin.html"; // 👈 Apne login page ka sahi name check kar lein
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
// ================= MOBILE SIDEBAR TOGGLE LOGIC =================
document.addEventListener("DOMContentLoaded", () => {
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebar = document.querySelector(".sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const navLinks = document.querySelectorAll(".sidebar .nav-link");

    function toggleSidebar() {
        sidebar.classList.toggle("show");
        sidebarOverlay.classList.toggle("show");
    }

    // Hamburger button click event
    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", toggleSidebar);
    }

    // Overlay par click karne se sidebar close ho jaye
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", toggleSidebar);
    }

    // Mobile par jab kisi tab/link par click ho toh sidebar automatic close ho jaye
    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            if (window.innerWidth < 992) {
                sidebar.classList.remove("show");
                sidebarOverlay.classList.remove("show");
            }
        });
    });
});

/// ==========================================
// LOAD ALL EVENTS (BUG FIXED)
// ==========================================
async function loadAllEvents() {
    const tableBody = document.getElementById("events-table-body");
    if (!tableBody) return;

    // Local Helper Function to prevent ReferenceError
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
        console.log("Fetching events from Supabase...");

        const { data: events, error } = await supabase
            .from("events")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        console.log("Retrieved events successfully:", events);

        if (!events || events.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
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

            tableBody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${title}</strong></td>
                    <td><i class="bi bi-calendar3 me-1"></i>${date}</td>
                    <td><i class="bi bi-clock me-1"></i>${time}</td>
                    <td><i class="bi bi-geo-alt me-1"></i>${location}</td>
                    <td>
                        <button 
                            class="btn btn-sm btn-outline-danger px-3"
                            onclick="deleteEvent('${event.id}')"
                        >
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Error loading events:", err);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
                    Failed to load events. (${err.message || 'Error'})
                </td>
            </tr>
        `;
    }
}
async function deleteEvent(eventId) {
    const result = await Swal.fire({
        title: "Are you sure?",
        text: "This event will be permanently deleted!",
        icon: "warning",
        iconColor: "#f59e0b",
        showCancelButton: true,
        confirmButtonColor: "#0d9488",
        cancelButtonColor: "#e11d48",
        confirmButtonText: '<i class="bi bi-trash"></i> Yes, delete it!',
        cancelButtonText: "Cancel",
        background: "#15222e",
        color: "#f3f4f6"
    });

    if (!result.isConfirmed) return;

    try {
        // Delete related participants first (Optional safety catch)
        const { error: participantError } = await supabase
            .from("event_participants")
            .delete()
            .eq("event_id", eventId);

        if (participantError && participantError.code !== 'PGRST116') {
            console.warn("Participant deletion warning:", participantError.message);
        }

        // Delete Main Event
        const { error } = await supabase
            .from("events")
            .delete()
            .eq("id", eventId);

        if (error) throw error;

        await Swal.fire({
            title: "Deleted!",
            text: "Event has been removed.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
            background: "#15222e",
            color: "#f3f4f6"
        });

        await loadAllEvents();

        if (typeof loadStats === "function") {
            await loadStats();
        }

    } catch (err) {
        console.error("Delete event error:", err);
        Swal.fire({
            title: "Error!",
            text: err.message || "Unable to delete event.",
            icon: "error",
            background: "#15222e",
            color: "#f3f4f6"
        });
    }
}

// 3. Global Exports
window.loadAllEvents = loadAllEvents;
window.deleteEvent = deleteEvent;
window.logoutAdmin = logoutAdmin;
window.showSection = showSection;
window.deletePost = deletePost;
window.deleteComment = deleteComment;
window.loadStats = loadStats;
window.loadAllPost = loadAllPost;
window.loadAllComments = loadAllComments;
window.updatePostData = updatePostData
window.openEditMode = openEditMode
window.loadAllEvents =loadAllEvents
document.addEventListener("DOMContentLoaded", () => {
    // 1. FOOLPROOF POINTER MOVEMENT
    let pointer = document.getElementById("pointer");

    // Agar HTML mein pointer missing ho toh khud create kar dega
    if (!pointer) {
        pointer = document.createElement("div");
        pointer.id = "pointer";
        document.body.appendChild(pointer);
    }

    // Pointer ko Exact Center align karna
    gsap.set(pointer, { xPercent: -50, yPercent: -50 });

    // Direct Mouse Move Listener
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