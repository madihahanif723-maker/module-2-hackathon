import supabase from "../supabase.js";

// 1. Notification Database Mein Save Karne Ka Function
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
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
}

// 4. Real-time Listening (Auto-update without reload)
export function listenForNotifications(userId, callback) {
  return supabase
    .channel("public:notifications")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`
      },
      () => callback()
    )
    .subscribe();
}