import supabase from "../supabase.js";

let userId = null;
let currentFilter = "all";

// ==========================================
// 1. THEME & PROFILE DROPDOWN SETUP
// ==========================================

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.classList.toggle("dark-mode", theme === "dark");
    localStorage.setItem("theme", theme);

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.checked = (theme === "dark");
    }

    const emailElements = document.querySelectorAll('.email-text-element');
    emailElements.forEach(el => {
        el.style.setProperty('color', (theme === "dark" ? "#cbd5e1" : "#475569"), 'important');
    });
}

function initTheme() {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
}

function initProfileDropdown() {
    const profileDropdownBtn = document.getElementById('profileDropdownBtn') || document.getElementById('avatarBtn');
    const profileMenu = document.getElementById('profileMenu') || document.getElementById('profilePopup');
    const uploadPicBtn = document.getElementById('uploadPicBtn');
    const profilePicInput = document.getElementById('profilePicInput');
    const logoutBtn = document.getElementById('logoutBtn');

    // 1. Toggle Dropdown Open / Close via .show Class
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

    // 2. Profile Picture Upload Trigger
    if (uploadPicBtn && profilePicInput) {
        uploadPicBtn.addEventListener('click', () => {
            profilePicInput.click();
        });
        profilePicInput.addEventListener('change', uploadProfilePicture);
    }

    // 3. Logout Action
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

function initGSAPAnimations() {
    if (typeof gsap !== "undefined") {
        if (typeof ScrollTrigger !== "undefined") {
            gsap.registerPlugin(ScrollTrigger);
        }

        gsap.from(".event-card-form", {
            duration: 0.8,
            y: 30,
            opacity: 0,
            ease: "power2.out"
        });

        gsap.from(".custom-navbar", {
            duration: 0.6,
            y: -20,
            opacity: 0,
            ease: "power2.out"
        });
    }
}

// ==========================================
// 2. PROFILE PICTURE LOGIC
// ==========================================

async function loadUserProfileImage(uId) {
    try {
        const userAvatarImg = document.getElementById("userAvatarImg");
        const userInitialText = document.getElementById("userInitialText") || document.getElementById("char") || document.getElementById("userAvatarText");

        const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", uId)
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
    if (!file || !userId) return;

    try {
        if (typeof Swal !== "undefined") {
            Swal.fire({ title: 'Uploading...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        }

        const fileExt = file.name.split('.').pop();
        const filePath = `avatars/${userId}-${Date.now()}.${fileExt}`;

        // Upload to Storage Bucket
        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

        const publicUrl = publicUrlData.publicUrl;

        // Save URL in database
        await supabase
            .from("profiles")
            .upsert({ id: userId, avatar_url: publicUrl, updated_at: new Date() });

        // Update UI Elements
        const userAvatarImg = document.getElementById("userAvatarImg");
        const userInitialText = document.getElementById("userInitialText") || document.getElementById("char") || document.getElementById("userAvatarText");

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
// 3. EVENTS SYSTEM LOGIC
// ==========================================

// Fetch User & Initialize
async function checkUserSession() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            userId = user.id;

            // Fetch dynamic display name
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

            if (!displayName) displayName = "User";

            const firstLetter = displayName.charAt(0).toUpperCase();

            // Set text elements safely
            const navUserName = document.getElementById("navUserName");
            const userAvatarText = document.getElementById("char") || document.getElementById("userAvatarText") || document.getElementById("userInitialText");
            const userEmailText = document.getElementById("dropdownEmail") || document.getElementById("userEmailText");

            if (navUserName) navUserName.innerText = displayName;
            if (userAvatarText) userAvatarText.innerText = firstLetter;
            if (userEmailText) userEmailText.innerText = user.email;

            // Load user profile picture
            await loadUserProfileImage(userId);
        } else {
            window.location.href = "index.html";
        }
    } catch (err) {
        console.log("Auth session error:", err);
    }
}

// Fetch & Render Events Card List
async function fetchAndRenderEvents() {
    const eventsContainer = document.getElementById("eventsContainer");
    if (!eventsContainer) return;

    try {
        let query = supabase.from("events").select("*").order("created_at", { ascending: false });

        const searchInput = document.getElementById("searchInput");
        const searchVal = searchInput?.value.trim() || "";
        if (searchVal) {
            query = query.or(`title.ilike.%${searchVal}%,location.ilike.%${searchVal}%`);
        }

        const { data: events, error } = await query;
        if (error) throw error;

        // Fetch participants data
        const { data: participants } = await supabase.from("event_participants").select("*");

        const participantCounts = {};
        const userJoinedMap = {};

        if (participants) {
            participants.forEach(item => {
                participantCounts[item.event_id] = (participantCounts[item.event_id] || 0) + 1;
                if (item.user_id === userId) {
                    userJoinedMap[item.event_id] = true;
                }
            });
        }

        eventsContainer.innerHTML = "";

        let filteredEvents = events || [];
        if (currentFilter === "joined") {
            filteredEvents = filteredEvents.filter(e => userJoinedMap[e.id]);
        }

        if (filteredEvents.length === 0) {
            eventsContainer.innerHTML = `
                <div class="text-center text-muted p-5">
                    <h5>No Events Found</h5>
                    <p class="small">Try creating a new event or changing search keywords.</p>
                </div>`;
            return;
        }

        filteredEvents.forEach(event => {
            const count = participantCounts[event.id] || 0;
            const isJoined = !!userJoinedMap[event.id];
            eventsContainer.innerHTML += createEventCard(event, count, isJoined);
        });

    } catch (err) {
        console.log("Error loading events:", err);
    }
}

// Event Card HTML Generation
function createEventCard(event, count, isJoined) {
    const banner = event.image_url || 'https://via.placeholder.com/600x200?text=Event+Banner';

    return `
    <div class="card mb-4 bg-dark text-white border-secondary">
        <img src="${banner}" class="card-img-top" style="max-height: 200px; object-fit: cover;" alt="Event Banner">
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <h4 class="card-title text-success">${event.title}</h4>
                <span class="badge bg-secondary"><i class="bi bi-people-fill"></i> ${count} Attending</span>
            </div>
            <p class="card-text text-light mt-2">${event.description}</p>
            <div class="d-flex gap-3 text-info small mb-3">
                <span><i class="bi bi-calendar"></i> ${event.event_date || ''}</span>
                <span><i class="bi bi-clock"></i> ${event.event_time || ''}</span>
                <span><i class="bi bi-geo-alt"></i> ${event.location || ''}</span>
            </div>
            
            <div class="d-flex justify-content-between align-items-center">
                ${isJoined ?
            `<button class="btn btn-outline-danger btn-sm" onclick="toggleJoin('${event.id}', true)">Cancel Registration</button>` :
            `<button class="btn btn-success btn-sm" onclick="toggleJoin('${event.id}', false)">Join Event</button>`
        }
                ${userId === event.user_id ?
            `<button class="btn btn-sm text-danger" onclick="deleteEvent('${event.id}')"><i class="bi bi-trash"></i></button>` : ''
        }
            </div>
        </div>
    </div>`;
}

// Create & Publish Event Function
async function createEvent(e) {
    if (e && e.preventDefault) e.preventDefault();

    const titleInput = document.getElementById("title") || document.getElementById("eventTitle");
    const descInput = document.getElementById("description") || document.getElementById("eventDescription");
    const dateInput = document.getElementById("eventDate");
    const timeInput = document.getElementById("eventTime");
    const locationInput = document.getElementById("location") || document.getElementById("eventLocation");
    const imageInput = document.getElementById("imageFile") || document.getElementById("eventBannerUrl");

    const title = titleInput?.value.trim();
    const description = descInput?.value.trim();
    const date = dateInput?.value;
    const time = timeInput?.value;
    const location = locationInput?.value.trim();

    if (!title || !description || !date || !time || !location) {
        if (typeof Swal !== "undefined") {
            Swal.fire("Error", "Please fill all required fields!", "error");
        } else {
            alert("Please fill all required fields!");
        }
        return;
    }

    if (!userId) {
        alert("Aap login nahi hain. Kripya pehle login karein.");
        return;
    }

    let imageUrl = "";

    if (imageInput && imageInput.files && imageInput.files[0]) {
        const file = imageInput.files[0];
        imageUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    } else if (imageInput && imageInput.value) {
        imageUrl = imageInput.value.trim();
    }

    try {
        const { error } = await supabase.from("events").insert([{
            title: title,
            description: description,
            event_date: date,
            event_time: time,
            location: location,
            image_url: imageUrl,
            user_id: userId
        }]);

        if (error) throw error;

        if (typeof Swal !== "undefined") {
            Swal.fire("Success", "Event Created Successfully!", "success");
        } else {
            alert("Event Created Successfully!");
        }

        if (titleInput) titleInput.value = "";
        if (descInput) descInput.value = "";
        if (dateInput) dateInput.value = "";
        if (timeInput) timeInput.value = "";
        if (locationInput) locationInput.value = "";
        if (imageInput) imageInput.value = "";

        await fetchAndRenderEvents();

    } catch (err) {
        console.log("Create event error:", err);
        alert("Error creating event: " + err.message);
    }
}

// Join / Cancel Registration Toggle
async function toggleJoin(eventId, isJoined) {
    if (!userId) {
        alert("Please login first to join events!");
        return;
    }

    try {
        if (isJoined) {
            await supabase.from("event_participants").delete().eq("event_id", eventId).eq("user_id", userId);
        } else {
            await supabase.from("event_participants").insert([{ event_id: eventId, user_id: userId }]);
        }
        await fetchAndRenderEvents();
    } catch (err) {
        console.log("Error joining event:", err);
    }
}

// Delete Event Function
async function deleteEvent(eventId) {
    if (confirm("Are you sure you want to delete this event?")) {
        await supabase.from("events").delete().eq("id", eventId);
        await fetchAndRenderEvents();
    }
}

// Real-time Listeners Setup
function setupRealtime() {
    supabase.channel('events-realtime-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchAndRenderEvents())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, () => fetchAndRenderEvents())
        .subscribe();
}

// ==========================================
// 4. DOM LOADED INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initProfileDropdown();
    initGSAPAnimations();

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('change', (e) => {
            applyTheme(e.target.checked ? 'dark' : 'light');
        });
    }

    await checkUserSession();
    await fetchAndRenderEvents();
    setupRealtime();

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", fetchAndRenderEvents);
    }

    const filterDropdown = document.getElementById("filterEvents") || document.getElementById("filterEventsDropdown");
    if (filterDropdown) {
        filterDropdown.addEventListener("change", (e) => {
            currentFilter = e.target.value;
            fetchAndRenderEvents();
        });
    }

    const publishBtn = document.getElementById("eventBtn") || document.getElementById("publishEventBtn");
    if (publishBtn) {
        publishBtn.addEventListener("click", createEvent);
    }
});

// Window Exports
window.createEvent = createEvent;
window.toggleJoin = toggleJoin;
window.deleteEvent = deleteEvent;