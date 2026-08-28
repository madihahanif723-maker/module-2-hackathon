import supabase from "../supabase.js";

// 1. Notification Database Mein Save Karna
export async function createNotification({ userId, actorId, actorName, type, message, targetId }) {
  if (userId === actorId && type !== "announcement") return;

  try {
    const { error } = await supabase.from("notifications").insert([
      {
        user_id: userId,
        actor_id: actorId,
        actor_name: actorName,
        type: type,
        message: message,
        target_id: targetId,
        is_read: false
      }
    ]);

    if (error) console.error("Notification Create Error:", error);
  } catch (err) {
    console.error("Notification Error:", err);
  }
}

// 2. User Ki Notifications Fetch Karna
export async function fetchNotifications(userId) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch Notifications Error:", error);
    return [];
  }
  return data || [];
}

// 3. Single Notification Read Mark Karna
export async function markAsRead(notificationId) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) console.error("Mark as Read Error:", error);
}

// 4. Real-time Listening (Auto-update without reload)
export function listenForNotifications(userId, callback) {
  return supabase
    .channel(`public:notifications:user_id=eq.${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        if (callback) callback(payload.new);
      }
    )
    .subscribe();
}

// 5. UI Rendering Logic for Dropdown
export function renderNotificationsUI(notifications) {
  const notifContainer = document.getElementById("notifListContainer");
  const notifBadge = document.getElementById("notifBadge");

  if (!notifContainer) return;

  if (!notifications || notifications.length === 0) {
    notifContainer.innerHTML = `<p class="text-muted small text-center my-2">No notifications yet.</p>`;
    if (notifBadge) notifBadge.classList.add("d-none");
    return;
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  if (notifBadge) {
    if (unreadCount > 0) {
      notifBadge.innerText = unreadCount;
      notifBadge.classList.remove("d-none");
    } else {
      notifBadge.classList.add("d-none");
    }
  }

  let html = "";
  notifications.forEach((notif) => {
    html += `
      <div class="dropdown-item p-2 border-bottom border-secondary text-light ${notif.is_read ? '' : 'bg-dark'}" 
           data-id="${notif.id}" style="cursor: pointer; border-radius: 4px;">
        <div class="d-flex align-items-center justify-content-between">
          <strong class="small text-emerald text-truncate" style="max-width: 170px;">${notif.actor_name || "System"}</strong>
          <small class="text-muted" style="font-size: 0.7rem;">${new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
        </div>
        <p class="mb-0 small text-wrap text-secondary">${notif.message}</p>
      </div>
    `;
  });

  notifContainer.innerHTML = html;

  notifContainer.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", async () => {
      const notifId = item.getAttribute("data-id");
      if (notifId) {
        await markAsRead(notifId);
        item.classList.remove("bg-dark");
      }
    });
  });
}

// 6. Main Initialization Function (Jo crash ki wajah tha)
export async function initNotificationSystem(userId) {
  if (!userId) return;

  // Initial load
  const initialNotifications = await fetchNotifications(userId);
  renderNotificationsUI(initialNotifications);

  // Realtime subscription
  listenForNotifications(userId, async () => {
    const updatedNotifications = await fetchNotifications(userId);
    renderNotificationsUI(updatedNotifications);
  });
}