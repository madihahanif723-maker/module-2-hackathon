import supabase from "../supabase.js";
import { 
  fetchNotifications, 
  markAsRead, 
  listenForNotifications, 
  createNotification 
} from "./notification.js";

// ==========================================
// NOTIFICATION SYSTEM INITIALIZER
// ==========================================
export async function initNotificationSystem(currentUserId) {
  if (!currentUserId) return;

  const notifBtn = document.getElementById("notifBtn");
  const notifMenu = document.getElementById("notifMenu");
  const notifBadge = document.getElementById("notifBadge");
  const notifListContainer = document.getElementById("notifListContainer");

  // Toggle Dropdown Menu
  if (notifBtn && notifMenu) {
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = notifMenu.style.display === "none" || notifMenu.style.display === "";
      notifMenu.style.display = isHidden ? "block" : "none";
    });

    window.addEventListener("click", (e) => {
      if (!notifMenu.contains(e.target) && !notifBtn.contains(e.target)) {
        notifMenu.style.display = "none";
      }
    });
  }

  // Load and Render Notifications
  async function loadUI() {
    const notifications = await fetchNotifications(currentUserId);
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    if (notifBadge) {
      if (unreadCount > 0) {
        notifBadge.innerText = unreadCount;
        notifBadge.classList.remove("d-none");
      } else {
        notifBadge.classList.add("d-none");
      }
    }

    if (notifListContainer) {
      if (notifications.length === 0) {
        notifListContainer.innerHTML = `<p class="text-muted small text-center my-2">No notifications yet.</p>`;
        return;
      }

      notifListContainer.innerHTML = notifications.map((n) => `
        <div class="p-2 mb-1 rounded cursor-pointer notif-item ${n.is_read ? 'opacity-50' : 'bg-dark'}" 
             data-id="${n.id}" style="border-left: 3px solid #00dfa2;">
          <p class="small text-light mb-0" style="font-size:12px;">${n.message}</p>
          <small class="text-muted" style="font-size:10px;">${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
        </div>
      `).join("");

      // Mark as read on click
      notifListContainer.querySelectorAll(".notif-item").forEach((item) => {
        item.addEventListener("click", async () => {
          await markAsRead(item.dataset.id);
          loadUI();
        });
      });
    }
  }

  await loadUI();
  
  // Realtime updates listener
  listenForNotifications(currentUserId, () => loadUI());
}

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

    const navUserText = document.querySelectorAll("#navUserName, .user-name, #profileDropdownBtn span");
    navUserText.forEach(text => {
        text.style.setProperty(
            "color",
            theme === "dark" ? "#ffffff" : "#0f172a",
            "important"
        );
    });

    const notifBtn = document.getElementById("notifDropdown") || document.getElementById("notifBtn");
    if (notifBtn) {
        notifBtn.style.setProperty(
            "color",
            theme === "dark" ? "#ffffff" : "#0f172a",
            "important"
        );
    }
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
// IMAGE PREVIEW LOGIC
// ==========================================
function initImagePreview() {
    const imageInput = document.getElementById("imageFile") || document.getElementById("eventBannerUrl");
    const previewContainer = document.getElementById("imagePreviewContainer");
    const previewImage = document.getElementById("imagePreview");

    if (imageInput && previewContainer && previewImage) {
        imageInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImage.src = event.target.result;
                    previewContainer.classList.remove("d-none");
                };
                reader.readAsDataURL(file);
            } else {
                resetImagePreview();
            }
        });
    }
}

function resetImagePreview() {
    const previewContainer = document.getElementById("imagePreviewContainer");
    const previewImage = document.getElementById("imagePreview");
    if (previewContainer && previewImage) {
        previewImage.src = "";
        previewContainer.classList.add("d-none");
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
            .upsert({ id: userId, avatar_url: publicUrl, updated_at: new Date() });

        const userAvatarImg = document.getElementById("userAvatarImg");
        const userInitialText = document.getElementById("userInitialText") || document.getElementById("char") || document.getElementById("userAvatarText");

        if (userAvatarImg) {
            userAvatarImg.src = publicUrl;
            userAvatarImg.classList.remove("d-none");
        }
        if (userInitialText) userInitialText.classList.add("d-none");

        if (typeof Swal !== "undefined") {
            Swal.fire({ icon: 'success', title: 'Profile Picture Updated!', timer: 1500,
                 showConfirmButton: false });
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

async function checkUserSession() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            userId = user.id;

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

            const navUserName = document.getElementById("navUserName");
            const userAvatarText = document.getElementById("char") || document.getElementById("userAvatarText") || document.getElementById("userInitialText");
            const userEmailText = document.getElementById("dropdownEmail") || document.getElementById("userEmailText");

            if (navUserName) navUserName.innerText = displayName;
            if (userAvatarText) userAvatarText.innerText = firstLetter;
            if (userEmailText) userEmailText.innerText = user.email;

            await loadUserProfileImage(userId);
            
            // Initialize Notification System for authenticated user
            await initNotificationSystem(userId);
        } else {
            window.location.href = "index.html";
        }
    } catch (err) {
        console.log("Auth session error:", err);
    }
}

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

function createEventCard(event, count, isJoined) {
    const banner = event.image_url || 'https://via.placeholder.com/600x200?text=Event+Banner';

    return `
    <div class="card mb-4 event-card border-0 shadow-sm">
        <img src="${banner}" class="card-img-top" style="max-height: 200px; object-fit: cover;" alt="Event Banner">
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <h4 class="card-title text-success fw-bold">${event.title}</h4>
                <span class="badge bg-secondary"><i class="bi bi-people-fill"></i> ${count} Attending</span>
            </div>
            <p class="card-text mt-2">${event.description}</p>
            <div class="d-flex gap-3 text-info small mb-3">
                <span><i class="bi bi-calendar"></i> ${event.event_date || ''}</span>
                <span><i class="bi bi-clock"></i> ${event.event_time || ''}</span>
                <span><i class="bi bi-geo-alt"></i> ${event.location || ''}</span>
            </div>
            
            <div class="d-flex justify-content-between align-items-center">
                ${isJoined ?
            `<button class="btn btn-outline-danger btn-sm" onclick="toggleJoin('${event.id}', true, '${event.title.replace(/'/g, "\\'")}')">Cancel Registration</button>` :
            `<button class="btn btn-success btn-sm" onclick="toggleJoin('${event.id}', false, '${event.title.replace(/'/g, "\\'")}')">Join Event</button>`
        }
                ${userId === event.user_id ?
            `<button class="btn btn-sm text-danger" onclick="deleteEvent('${event.id}')"><i class="bi bi-trash"></i></button>` : ''
        }
            </div>
        </div>
    </div>`;
}

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

        // Trigger Notification for Event Creation
        await createNotification(userId, `🎉 Event "${title}" created successfully!`);

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

        resetImagePreview();

        await fetchAndRenderEvents();

    } catch (err) {
        console.log("Create event error:", err);
        alert("Error creating event: " + err.message);
    }
}

async function toggleJoin(eventId, isJoined, eventTitle = "Event") {
    if (!userId) {
        alert("Please login first to join events!");
        return;
    }

    try {
        if (isJoined) {
            await supabase.from("event_participants").delete().eq("event_id", eventId).eq("user_id", userId);
            // Trigger Notification for Unjoining
            await createNotification(userId, `❌ You cancelled registration for "${eventTitle}".`);
        } else {
            await supabase.from("event_participants").insert([{ event_id: eventId, user_id: userId }]);
            // Trigger Notification for Joining
            await createNotification(userId, `🗓️ You successfully joined "${eventTitle}"!`);
        }
        await fetchAndRenderEvents();
    } catch (err) {
        console.log("Error joining event:", err);
    }
}

async function deleteEvent(eventId) {
    if (confirm("Are you sure you want to delete this event?")) {
        await supabase.from("events").delete().eq("id", eventId);
        await fetchAndRenderEvents();
    }
}

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
    initImagePreview();

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

    const createForm = document.getElementById("createEventForm") || document.querySelector("form");
    if (createForm) {
        createForm.addEventListener("submit", createEvent);
    }
});

// Window Exports (Required for HTML onclicks inside Modules)
window.createEvent = createEvent;
window.toggleJoin = toggleJoin;
window.deleteEvent = deleteEvent;