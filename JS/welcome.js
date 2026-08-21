import supabase from "../supabase.js";

let userid = null;

// ==========================================
// 1. THEME & UI SETUP
// ==========================================

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.classList.toggle("dark-mode", theme === "dark");
    localStorage.setItem("theme", theme);

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.checked = (theme === "dark");
    }
     const navUserText = document.querySelectorAll("#navUserName, .user-name, #profileDropdownBtn span");
    navUserText.forEach(text => {
        text.style.setProperty(
            "color",
            theme === "dark" ? "#ffffff" : "#0f172a",
            "important"
        );
    });
}

function initTheme() {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
}

function initProfileDropdown() {
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    const profileMenu = document.getElementById('profileMenu');
    const uploadPicBtn = document.getElementById('uploadPicBtn');
    const profilePicInput = document.getElementById('profilePicInput');
    const logoutBtn = document.getElementById('logoutBtn');

    if (profileDropdownBtn && profileMenu) {
        profileDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle("show");
        });

        document.addEventListener('click', (e) => {
            if (!profileMenu.contains(e.target) && !profileDropdownBtn.contains(e.target)) {
                profileMenu.classList.remove("show");
            }
        });
    }

    if (uploadPicBtn && profilePicInput) {
        uploadPicBtn.addEventListener('click', () => {
            profilePicInput.click();
        });
        profilePicInput.addEventListener('change', uploadProfilePicture);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// ==========================================
// 2. PROFILE PICTURE LOGIC
// ==========================================

async function loadUserProfileImage(userId) {
    try {
        const userAvatarImg = document.getElementById("userAvatarImg");
        const userInitialText = document.getElementById("userInitialText");

        const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", userId)
            .maybeSingle();

        if (profile && profile.avatar_url) {
            if (userAvatarImg) {
                userAvatarImg.src = profile.avatar_url;
                userAvatarImg.classList.remove("d-none");
            }
            if (userInitialText) userInitialText.classList.add("d-none");
        }
    } catch (err) {
        console.error("Error fetching avatar:", err);
    }
}

async function uploadProfilePicture(e) {
    const file = e.target.files[0];
    if (!file || !userid) return;

    try {
        if (typeof Swal !== "undefined") {
            Swal.fire({ title: 'Uploading...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        }

        const fileExt = file.name.split('.').pop();
        const filePath = `avatars/${userid}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

        const publicUrl = publicUrlData.publicUrl;

        await supabase
            .from("profiles")
            .upsert({ id: userid, avatar_url: publicUrl, updated_at: new Date() });

        const userAvatarImg = document.getElementById("userAvatarImg");
        const userInitialText = document.getElementById("userInitialText");

        if (userAvatarImg) {
            userAvatarImg.src = publicUrl;
            userAvatarImg.classList.remove("d-none");
        }
        if (userInitialText) userInitialText.classList.add("d-none");

        if (typeof Swal !== "undefined") {
            Swal.fire({ icon: 'success', title: 'Profile Picture Updated!', timer: 1500, showConfirmButton: false });
        } else {
            alert("Profile Picture Updated!");
        }

    } catch (err) {
        console.error("Upload Error:", err);
        if (typeof Swal !== "undefined") {
            Swal.fire("Upload Failed", err.message || "Could not upload image.", "error");
        } else {
            alert("Upload failed: " + err.message);
        }
    }
}

async function logout() {
    if (supabase) {
        await supabase.auth.signOut();
    }
    if (typeof Swal !== "undefined") {
        Swal.fire({
            icon: 'success',
            title: 'Logged Out',
            timer: 1200,
            showConfirmButton: false
        }).then(() => {
            window.location.href = "index.html";
        });
    } else {
        window.location.href = "index.html";
    }
}

// ==========================================
// 3. FETCH COUNTS & DATA LOGIC
// ==========================================

async function loadDashboardData() {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            window.location.href = "index.html";
            return;
        }

        userid = user.id;

        let displayName = "";
        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, name")
            .eq("id", user.id)
            .maybeSingle();

        if (profile && (profile.full_name || profile.name)) {
            displayName = profile.full_name || profile.name;
        } else if (user.user_metadata) {
            displayName = user.user_metadata.full_name || user.user_metadata.name || `${user.user_metadata.first_name || ""} ${user.user_metadata.last_name || ""}`.trim();
        } 
        
        if (!displayName && user.email) {
            const prefix = user.email.split("@")[0];
            displayName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
        }

        if (!displayName) displayName = "Student";

        const firstLetter = displayName.charAt(0).toUpperCase();

        const navUserName = document.getElementById("navUserName");
        const welcomeUserName = document.getElementById("welcomeUserName");
        const userInitialText = document.getElementById("userInitialText");

        if (navUserName) navUserName.innerText = displayName;
        if (welcomeUserName) welcomeUserName.innerText = displayName;
        if (userInitialText) userInitialText.innerText = firstLetter;

        await loadUserProfileImage(userid);

        // Fetch Dashboard Stat Data
        await Promise.all([
            fetchTotalPostsCount(),
            fetchEventsData(),
            fetchAnnouncementsData(),
            fetchNotificationsCount()
        ]);

        // Real-Time Listeners Enable Karein
        setupRealtimeListeners();

    } catch (err) {
        console.error("Dashboard Load Error:", err);
    }
}

async function fetchTotalPostsCount() {
    try {
        const { count, error } = await supabase
            .from("post_app_table")
            .select("*", { count: 'exact', head: true });

        if (!error && count !== null) {
            const statTotalPosts = document.getElementById("statTotalPosts");
            if (statTotalPosts) statTotalPosts.innerText = count;
        }
    } catch (err) {
        console.log("Error counting posts:", err);
    }
}

// Fetch Announcements Count & Render List
async function fetchAnnouncementsData() {
    const announcementsList = document.getElementById("announcementsList");
    const statAnnouncements = document.getElementById("statAnnouncements");

    try {
        // Table name Capital 'Announcements' use kiya hai
        const { data: announcements, count, error } = await supabase
            .from("Announcements")
            .select("*", { count: 'exact' })
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Stat counter set karein
        if (statAnnouncements) {
            statAnnouncements.innerText = count !== null ? count : 0;
        }

        // Announcements UI render karein
        if (announcements && announcements.length > 0 && announcementsList) {
            announcementsList.innerHTML = "";
            
            announcements.slice(0, 3).forEach(item => {
                const title = item.title || "Announcement";
                const content = item.message || ""; // Exact column 'message' map ho gaya
                const date = item.created_at ? new Date(item.created_at).toLocaleDateString() : "";

                announcementsList.innerHTML += `
                    <div class="p-2 border-bottom border-secondary border-opacity-25">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <h6 class="event-title text-teal mb-0" style="font-size: 0.95rem;">${title}</h6>
                            <small class="text-muted" style="font-size: 0.75rem;">${date}</small>
                        </div>
                        <p class="event-desc text-muted mb-0 small">${content}</p>
                    </div>
                `;
            });
        } else if (announcementsList) {
            announcementsList.innerHTML = `<p class="event-desc text-muted mb-0">No new announcements at the moment.</p>`;
        }
    } catch (err) {
        console.error("Announcements Fetch Error:", err);
        if (statAnnouncements) statAnnouncements.innerText = "0";
        if (announcementsList) {
            announcementsList.innerHTML = `<p class="event-desc text-muted mb-0">No new announcements at the moment.</p>`;
        }
    }
}

// Fetch Approved Events Data & Update Stat Counter
async function fetchEventsData() {
    const eventsList = document.getElementById("eventsList");
    const statUpcomingEvents = document.getElementById("statUpcomingEvents");

    try {
        const { data: events, count, error } = await supabase
            .from("events")
            .select("*", { count: 'exact' })
            .eq("status", "approved")
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (statUpcomingEvents) {
            statUpcomingEvents.innerText = count !== null ? count : 0;
        }

        if (events && events.length > 0 && eventsList) {
            eventsList.innerHTML = "";
            events.slice(0, 3).forEach(evt => {
                eventsList.innerHTML += `
                    <div class="p-2 border-bottom border-secondary border-opacity-25">
                        <h6 class="event-title text-teal mb-1" style="font-size: 0.95rem;">${evt.title || evt.event_name || 'Campus Event'}</h6>
                        <small class="event-desc text-muted">${evt.location || 'Campus'} • ${evt.event_date || 'Upcoming'}</small>
                    </div>
                `;
            });
        } else if (eventsList) {
            eventsList.innerHTML = `<p class="event-desc text-muted mb-0">No upcoming events found.</p>`;
        }
    } catch (err) {
        console.error("Events Fetch Error:", err);
        if (statUpcomingEvents) statUpcomingEvents.innerText = "0";
        if (eventsList) {
            eventsList.innerHTML = `<p class="event-desc text-muted mb-0">No upcoming events found.</p>`;
        }
    }
}

async function fetchNotificationsCount() {
    try {
        const statNotifications = document.getElementById("statNotifications");
        
        // Notifications count fetch
        const { count, error } = await supabase
            .from("notifications")
            .select("*", { count: 'exact', head: true });

        if (!error && statNotifications) {
            statNotifications.innerText = count !== null ? count : 0;
        }
    } catch (err) {
        console.error("Notifications Fetch Error:", err);
    }
}

// Real-Time Listeners setup for live announcements
function setupRealtimeListeners() {
    supabase
        .channel('public:announcements')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
            fetchAnnouncementsData();
        })
        .subscribe();
}

// ==========================================
// 4. INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initProfileDropdown();

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('change', (e) => {
            applyTheme(e.target.checked ? 'dark' : 'light');
        });
    }

    await loadDashboardData();
});