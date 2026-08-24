

import supabase from "../supabase.js";

let edited = false;
var selectedTextColor = "";
var cardBg = "";
var title = document.getElementById("title");
var description = document.getElementById("description");
let editIndex = null;
let userName = "";
let userid = null;
let Email = "";
let userRole = "";

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

async function checkUserSession() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
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

            if (!displayName) displayName = "User";

            const firstLetter = displayName.charAt(0).toUpperCase();

            const navUserName = document.getElementById("navUserName");
            const userAvatarText = document.getElementById("char") || document.getElementById("userAvatarText") || document.getElementById("userInitialText");
            const userEmailText = document.getElementById("dropdownEmail") || document.getElementById("userEmailText");

            if (navUserName) navUserName.innerText = displayName;
            if (userAvatarText) userAvatarText.innerText = firstLetter;
            if (userEmailText) userEmailText.innerText = user.email;

            await loadUserProfileImage(userid);
        } else {
            window.location.href = "index.html";
        }
    } catch (err) {
        console.log("Auth session error:", err);
    }
}

async function fetchLikeCounts() {
    try {
        const { data, error } = await supabase.from("like_table").select("post_id");
        if (error) throw error;

        const counts = {};
        data.forEach(like => {
            counts[like.post_id] = (counts[like.post_id] || 0) + 1;
        });

        document.querySelectorAll("[id^='like-']").forEach(el => el.innerText = "0");

        Object.keys(counts).forEach(postId => {
            const el = document.getElementById(`like-${postId}`);
            if (el) el.innerText = counts[postId];
        });
    } catch (err) {
        console.log("Error fetching initial likes:", err);
    }
}

async function searchPosts() {
    let searchInput = document.getElementById("searchInput")?.value || "";
    try {
        const { data, error } = await supabase
            .from("post_app_table")
            .select("*")
            .order('id', { ascending: false })
            .or(`title.ilike.%${searchInput}%,description.ilike.%${searchInput}%`);

        const postsContainer = document.getElementById("posts");
        if (!postsContainer) return;
        postsContainer.innerHTML = "";

        if (error) {
            console.log("Error searching posts:", error);
            return;
        }

        if (!data || data.length === 0) {
            postsContainer.innerHTML = `
        <div class="empty-state-card p-5 text-center my-3 shadow-sm">
            <i class="bi bi-search display-4 mb-3 d-block empty-icon"></i>
            <h5 class="fw-bold mb-2 empty-title">No Posts Found</h5>
            <p class="mb-0 empty-text">We couldn't find anything matching "<strong>${searchInput}</strong>". Try searching for something else!</p>
        </div>
        `;
            return;
        }
        data.forEach(post => { postsContainer.innerHTML += createPostCard(post); });
        await fetchLikeCounts();
    } catch (error) {
        console.log("Error searching posts:", error);
    }
}

function createPostCard(post) {
    let currentTextColor = post.text_color || "#ffffff";
    let displayUserName = post.user_name || "Anonymous";
    let displayEmail = post.email ? `~${post.email}` : "";

    let currentTheme = localStorage.getItem("theme") || "light";
    let emailColor = currentTheme === "dark" ? "#cbd5e1" : "#475569";

    const escapedDesc = (post.description || "").replace(/`/g, '\\`').replace(/\n/g, '\\n').replace(/"/g, '&quot;');
    const escapedTitle = (post.title || "").replace(/`/g, '\\`').replace(/\n/g, '\\n').replace(/"/g, '&quot;');

    return `
<div class="card mb-3" style="border: 1px solid rgba(255,255,255,0.12); overflow: hidden;">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span>
            <strong style="font-size: 16px; display: block;"> ${post.id}. ${displayUserName}</strong> 
            <small class="d-block email-text-element" style="font-size: 12.5px; margin-top: 2px; color: ${emailColor} !important; font-weight: 500;">
                <i class="bi bi-envelope-fill me-1" style="color: #38bdf8 !important; font-size: 11px;"></i>${displayEmail}
            </small>
        </span>
        <div>
            <button class="btn btn-sm"
            onclick="editPost(event, ${post.id}, \`${escapedDesc}\`, \`${escapedTitle}\`, '${post.bg_img}', '${post.text_color}', '${currentTextColor}', '${post.user_id}')">
                <i class="bi bi-pencil-square text-warning"></i>
            </button>
            <button class="btn btn-sm"
            onclick="delpost(event, ${post.id}, '${post.user_id}')">
                <i class="bi bi-trash text-danger"></i>
            </button>
        </div>
    </div>

    <div class="card-body" style="background-image:url('${post.bg_img}');background-size:cover;background-position:center; min-height: 140px;">
        <h4 style="color:${currentTextColor}; font-weight: bold;">${post.title}</h4>
        <p style="color:${currentTextColor}">${post.description}</p>
    </div>

    <div class="card-footer bg-transparent border-top-0 pt-2 pb-2">
        <div class="d-flex justify-content-around w-100 mb-2">
            <button class="btn btn-sm d-flex align-items-center gap-2 text-secondary" onclick="toggleLike(${post.id})">
                <i class="bi bi-hand-thumbs-up" style="font-size: 16px;"></i><span id="like-${post.id}">0</span> Like
            </button>
            <button class="btn btn-sm d-flex align-items-center gap-2 text-secondary" onclick="toggleCommentSection(${post.id})">
                <i class="bi bi-chat-left-text" style="font-size: 16px;"></i> Comment
            </button>
        </div>
        
        <div id="comment-box-${post.id}" class="d-none w-100 mt-2 border-top pt-3">
            <div id="comments-list-${post.id}" class="mb-3 overflow-y-auto" style="max-height: 150px;"></div>
            
            <div class="input-group">
                <input type="text" id="comment-input-${post.id}" class="form-control comment-input-field" placeholder="Write a comment..." style="font-size: 14px; padding: 10px;">
                <button class="btn px-4 fw-bold text-white" style="background-color: #14b8a6; border: none; transition: 0.2s;" onmouseover="this.style.backgroundColor='#0d9488'" onmouseout="this.style.backgroundColor='#14b8a6'" onclick="addComment(${post.id})">Send</button>
            </div>
        </div>
    </div>
</div>
`;
}

window.onload = async function () {
    initProfileDropdown();
    await checkUserSession();

    const savedTheme = localStorage.getItem("theme") || "dark";
    applyTheme(savedTheme);

    const postsContainer = document.getElementById("posts");
    const imgInput = document.getElementById("imgInput");
    if (imgInput) {
        imgInput.addEventListener("change", previewFile);
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user) {
            userid = user.id;
            Email = user.email;
            userName = `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`.trim();
            if (!userName) {
                userName = user.email.split("@")[0];
            }
            userRole = user.user_metadata?.role || "";
            const firstLetter = userName.charAt(0).toUpperCase();

            if (document.getElementById("userInitial")) {
                document.getElementById("userInitial").innerText = firstLetter;
            }
            if (document.getElementById("dropdownEmail")) {
                document.getElementById("dropdownEmail").innerText = Email;
            }
        }
        if (userRole === "admin") {
            const adminBtn = document.getElementById("admin-panel-btn");
            if (adminBtn) {
                adminBtn.classList.remove("d-none");
            }
        }

        if (error) console.log("Auth Error:", error);
    } catch (error) {
        console.log("User load error:", error);
    }

    try {
        const { data, error } = await supabase
            .from('post_app_table')
            .select("*")
            .order('id', { ascending: false });

        if (error) {
            console.log("Supabase Fetch Error:", error);
            return;
        }

        if (postsContainer) {
            if (!data || data.length === 0) {
                postsContainer.innerHTML = "<p class='text-center no-comment-text'>No posts available yet.</p>";
            } else {
                postsContainer.innerHTML = "";
                data.forEach(post => {
                    postsContainer.innerHTML += createPostCard(post);
                });
            }
        }

        await fetchLikeCounts();
        realTimePost();
        realTimeLikes();
        realTimeComments();
    } catch (err) {
        console.log("Catch Block Error:", err);
    }
};

async function toggleCommentSection(postId) {
    const commentBox = document.getElementById(`comment-box-${postId}`);
    if (!commentBox) return;

    commentBox.classList.toggle("d-none");

    if (!commentBox.classList.contains("d-none")) {
        await fetchComments(postId);
    }
}

async function addComment(postId) {
    if (!userid) {
        Swal.fire("Error", "Please login first to comment.", "error");
        return;
    }

    const input = document.getElementById(`comment-input-${postId}`);
    if (!input) return;
    const text = input.value.trim();

    if (!text) return;

    try {
        const { error } = await supabase
            .from("comment_table")
            .insert({
                post_id: postId,
                user_id: userid,
                user_name: userName,
                comment_text: text
            });

        if (error) throw error;
        input.value = "";

    } catch (err) {
        console.log("Error inserting comment:", err);
        Swal.fire("Error", "Could not submit your comment.", "error");
    }
}

async function fetchComments(postId) {
    const container = document.getElementById(`comments-list-${postId}`);
    if (!container) return;

    try {
        const { data, error } = await supabase
            .from("comment_table")
            .select("*")
            .eq("post_id", postId)
            .order("id", { ascending: true });

        if (error) throw error;

        container.innerHTML = "";

        if (data.length === 0) {
            container.innerHTML = `<p class="no-comment-text small ps-2 mb-1" style="font-size:12px;">No comments yet. Be the first to comment!</p>`;
            return;
        }

        data.forEach(c => {
            const isOwnerOrAdmin = (userid === c.user_id || userRole === 'admin');
            const escapedCommentText = c.comment_text.replace(/`/g, '\\`').replace(/"/g, '&quot;');

            container.innerHTML += `
<div class="p-2 mb-2 rounded comment-box-item d-flex justify-content-between align-items-start"
     id="comment-item-${c.id}"
     style="font-size:13px; border-left:3px solid #14b8a6; position: relative;">
    
    <div class="flex-grow-1 me-2 text-start">
        <strong style="color:#14b8a6; display:block; font-size:12px;">${c.user_name}</strong>
        <span class="comment-text-content" id="comment-text-${c.id}">${c.comment_text}</span>
    </div>

    ${isOwnerOrAdmin ? `
    <div class="dropdown">
        <button class="btn btn-sm comment-dots-btn p-0 border-0 shadow-none" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-three-dots" style="font-size: 16px;"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end custom-comment-dropdown shadow">
            ${userid === c.user_id ? `
            <li>
                <button class="dropdown-item text-warning d-flex align-items-center gap-2" onclick="editComment(${c.id}, \`${escapedCommentText}\`, ${c.post_id})">
                    <i class="bi bi-pencil-square"></i> Edit
                </button>
            </li>
            ` : ''}
            <li>
                <button class="dropdown-item text-danger d-flex align-items-center gap-2" onclick="deleteComment(${c.id}, '${c.user_id}', ${c.post_id})">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </li>
        </ul>
    </div>
    ` : ''}
</div>`;
        });
        container.scrollTop = container.scrollHeight;

    } catch (err) {
        console.log("Error fetching comments:", err);
    }
}

async function editComment(commentId, oldText, postId) {
    if (!userid) {
        Swal.fire("Error", "Please login first", "error");
        return;
    }

    const { value: newCommentText } = await Swal.fire({
        title: 'Edit Comment',
        input: 'text',
        inputValue: oldText,
        showCancelButton: true,
        confirmButtonText: 'Update',
        confirmButtonColor: '#14b8a6',
        inputValidator: (value) => {
            if (!value.trim()) {
                return 'Comment cannot be empty!';
            }
        }
    });

    if (newCommentText && newCommentText.trim() !== oldText) {
        try {
            const { error } = await supabase
                .from("comment_table")
                .update({ comment_text: newCommentText.trim() })
                .eq("id", commentId);

            if (error) throw error;

            const commentTextElem = document.getElementById(`comment-text-${commentId}`);
            if (commentTextElem) {
                commentTextElem.innerText = newCommentText.trim();
            }

            Swal.fire({
                icon: "success",
                title: "Comment Updated!",
                timer: 1000,
                showConfirmButton: false
            });

        } catch (err) {
            console.log("Error updating comment:", err);
            Swal.fire("Error", "Could not update comment.", "error");
        }
    }
}

async function deleteComment(commentId, commentUserId, postId) {
    if (!userid) {
        Swal.fire("Error", "Please login first", "error");
        return;
    }
    if (userid !== commentUserId && userRole !== 'admin') {
        Swal.fire("Access Denied", "You can delete only your own comment", "error");
        return;
    }

    let result = await Swal.fire({
        title: "Delete Comment?",
        text: "This comment will be permanently deleted",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete"
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase
        .from("comment_table")
        .delete()
        .eq("id", commentId);

    if (error) {
        console.log(error);
        Swal.fire("Error", error.message, "error");
        return;
    }

    Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1000,
        showConfirmButton: false
    });
}

async function toggleLike(postId) {
    if (!userid) {
        Swal.fire("Error", "Please login first to like posts.", "error");
        return;
    }

    try {
        const { data: likeData, error: likeError } = await supabase
            .from('like_table')
            .select("*")
            .eq('post_id', postId)
            .eq('user_id', userid);

        if (likeError) throw likeError;

        if (likeData && likeData.length > 0) {
            const { error: deleteError } = await supabase
                .from('like_table')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', userid);
            if (deleteError) throw deleteError;
        } else {
            const { error: insertError } = await supabase
                .from("like_table")
                .insert({ post_id: postId, user_id: userid });
            if (insertError) throw insertError;
        }
    } catch (err) {
        console.log("Error in toggleLike handling:", err);
    }
}

async function post() {
    var title = document.getElementById("title");
    var description = document.getElementById("description");
    let imageInput = document.getElementById("imgInput");
    let previewImg = document.getElementById("previewImg");

    if (title.value.trim() && description.value.trim()) {
        let colorToSave = selectedTextColor || "#ffffff";
        let imageFile = imageInput ? imageInput.files[0] : null;
        let finalBgUrl = "";

        if (imageFile) {
            let fileExtension = imageFile.name.split('.').pop();
            let fileName = `${Date.now()}_${fileExtension}`;

            const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, imageFile);

            if (uploadError) {
                Swal.fire("Image Upload Failed!", "There was an error uploading the image.", "error");
                return;
            }

            const { data: imageData } = supabase.storage.from('post-images').getPublicUrl(fileName);
            finalBgUrl = imageData.publicUrl;

        } else if (cardBg) {
            finalBgUrl = cardBg;
        } else {
            Swal.fire("No Image Selected!", "Please select or upload an image for the post.", "error");
            return;
        }

        if (edited) {
            try {
                const { error } = await supabase
                    .from('post_app_table')
                    .update({
                        title: title.value,
                        description: description.value,
                        bg_img: finalBgUrl,
                        text_color: colorToSave
                    })
                    .eq('id', editIndex);

                if (error) console.log(error);

                Swal.fire({
                    icon: "success",
                    title: "Updated!",
                    text: "Your post has been updated successfully.",
                });
                edited = false;
                editIndex = null;
                const postBtn = document.getElementById("postBtn");
                if (postBtn) postBtn.innerHTML = "Post";

            } catch (error) {
                console.log(error);
            }
        } else {
            try {
                const { error } = await supabase
                    .from('post_app_table')
                    .insert({
                        title: title.value,
                        description: description.value,
                        bg_img: finalBgUrl,
                        text_color: colorToSave,
                        email: Email,
                        user_id: userid,
                        user_name: userName,
                        role: userRole
                    });

                if (error) {
                    console.log("Database Insert Error:", error);
                }
            } catch (error) {
                console.log(error);
            }
        }

        title.value = "";
        description.value = "";
        cardBg = "";
        if (imageInput) imageInput.value = "";
        if (previewImg) {
            previewImg.classList.add("d-none");
            previewImg.src = "";
        }
    } else {
        Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Title & description can't be empty!",
        });
    }
}

function realTimePost() {
    supabase
        .channel('realtime-post')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: "post_app_table" },
            async payload => {
                console.log('Post table change received!', payload);
                try {
                    const { data, error } = await supabase
                        .from("post_app_table")
                        .select("*")
                        .order("id", { ascending: false });

                    if (error) throw error;

                    const postsContainer = document.getElementById("posts");
                    if (!postsContainer) return;

                    postsContainer.innerHTML = "";

                    if (!data || data.length === 0) {
                        postsContainer.innerHTML = "<p class='text-center no-comment-text'>No posts available yet.</p>";
                        return;
                    }

                    data.forEach(post => {
                        postsContainer.innerHTML += createPostCard(post);
                    });

                    await fetchLikeCounts();
                } catch (error) {
                    console.log(error);
                }
            }
        )
        .subscribe((status) => {
            console.log(status);
        });
}

function realTimeLikes() {
    supabase
        .channel('realtime-likes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'like_table' },
            async (payload) => {
                console.log("Like change received:", payload);
                const postId = payload.new?.post_id || payload.old?.post_id;
                if (!postId) return;

                const { count } = await supabase
                    .from("like_table")
                    .select("*", { count: "exact", head: true })
                    .eq("post_id", postId);

                const likeElement = document.getElementById(`like-${postId}`);
                if (likeElement) {
                    likeElement.innerText = count || 0;
                }
            }
        )
        .subscribe((status) => {
            console.log(status);
        });
}

function realTimeComments() {
    supabase
        .channel('realtime-comments')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'comment_table' },
            async (payload) => {
                console.log("Comment change received:", payload);
                const postId = payload.new?.post_id || payload.old?.post_id;
                if (postId) {
                    const commentBox = document.getElementById(`comment-box-${postId}`);
                    if (commentBox && !commentBox.classList.contains("d-none")) {
                        await fetchComments(postId);
                    }
                }
            }
        )
        .subscribe((status) => {
            console.log(status);
        });
}

async function editPost(event, id, desc, titleVal, bg_img, textColor, currentTextColor, UserId) {
    if (!userid) {
        Swal.fire({ icon: "error", title: "Login Required", text: "Please login first." });
        return;
    }

    if (userid !== UserId && userRole !== 'admin') {
        Swal.fire({ icon: "error", title: "Access Denied", text: "You can only edit your own post." });
        return;
    }

    const titleInput = document.getElementById("title");
    const descInput = document.getElementById("description");
    if (titleInput) titleInput.value = titleVal;
    if (descInput) descInput.value = desc;

    cardBg = bg_img;
    selectedTextColor = textColor || "#ffffff";
    edited = true;
    editIndex = id;
    let postBtn = document.getElementById("postBtn");
    if (postBtn) postBtn.innerHTML = "Update Post";
}

function previewFile(e) {
    const previewImg = document.getElementById("previewImg");
    const file = e.target.files[0];

    if (!file || !previewImg) return;

    previewImg.src = URL.createObjectURL(file);
    previewImg.classList.remove("d-none");
    previewImg.style.display = "block";

    cardBg = "";
    document.querySelectorAll(".bgImg").forEach(img => {
        img.classList.remove("addImg");
    });
}

function addImg(src) {
    cardBg = src;
    let imageInput = document.getElementById("imgInput");
    let previewImg = document.getElementById("previewImg");
    if (imageInput) imageInput.value = "";
    if (previewImg) {
        previewImg.classList.add("d-none");
        previewImg.src = "";
    }

    const images = document.querySelectorAll(".bgImg");
    images.forEach((img) => {
        img.classList.remove("addImg");
        if (img.getAttribute("src") === src) {
            img.classList.add("addImg");
        }
    });
}

async function delpost(event, id, UserId) {
    if (!userid) {
        Swal.fire("Error", "Please login first", "error");
        return;
    }
    if (userid !== UserId && userRole !== 'admin') {
        Swal.fire({ icon: "error", title: "Access Denied", text: "You can only delete your own post." });
        return;
    }

    let result = await Swal.fire({
        title: "Are you sure?",
        text: "This post will be deleted permanently!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!"
    });

    if (!result.isConfirmed) return;

    const { error: deleteError } = await supabase
        .from("post_app_table")
        .delete()
        .eq("id", id);

    if (deleteError) {
        Swal.fire("Error", deleteError.message, "error");
        return;
    }

    Swal.fire("Deleted!", "Post deleted successfully.", "success");
    const card = event.target.closest(".card");
    if (card) card.remove();
}

function applycolor(element) {
    var colorbox = document.getElementsByClassName('colorbox');
    for (var i = 0; i < colorbox.length; i++) {
        colorbox[i].classList.remove('selected');
    }
    element.classList.add('selected');
    selectedTextColor = element.getAttribute("data-color") || element.style.backgroundColor || window.getComputedStyle(element).backgroundColor || "#ffffff";
}


function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);

    // Sync Checkbox Pill Switch State
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.checked = (theme === "dark");
    }

    // Sync Old Theme Icon (if used somewhere)
    const icon = document.getElementById("themeIcon");
    if (icon) {
        icon.className = theme === "dark" ? "bi bi-sun-fill" : "bi bi-moon-fill";
        icon.style.setProperty('color', '#ffffff', 'important');
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

// Toggle Function
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    document.body.classList.toggle("dark-mode", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
}

// Checkbox Event Handling safely
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('change', (e) => {
        applyTheme(e.target.checked ? 'dark' : 'light');
    });
}

// Initialization
(function initTheme() {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
})();
// Window Bindings for ES Module Scope Compatibility
window.searchPosts = searchPosts;
window.post = post;
window.toggleLike = toggleLike;
window.toggleCommentSection = toggleCommentSection;
window.addComment = addComment;
window.editComment = editComment;
window.deleteComment = deleteComment;
window.editPost = editPost;
window.delpost = delpost;
window.applycolor = applycolor;
window.addImg = addImg;
window.previewFile = previewFile;
window.initProfileDropdown = initProfileDropdown;
window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;
document.addEventListener("DOMContentLoaded", () => {

    if (typeof gsap === "undefined") {
        console.warn("GSAP is not loaded.");
        return;
    }

    let pointer = document.getElementById("pointer");

    if (!pointer) {
        pointer = document.createElement("div");
        pointer.id = "pointer";
        document.body.appendChild(pointer);
    }

    gsap.set(pointer, {
        xPercent: -50,
        yPercent: -50
    });

    window.addEventListener("mousemove", (e) => {
        gsap.to(pointer, {
            x: e.clientX,
            y: e.clientY,
            duration: 0.12,
            ease: "power2.out",
            boxShadow: "0 0 25px rgba(16, 185, 129, 1)"
        });
    });

    const tl = gsap.timeline({
        defaults: {
            ease: "power3.out",
            duration: 0.8,
            clearProps: "all"
        }
    });

    tl.from("nav, .navbar, .custom-navbar", {
        y: -50,
        opacity: 0
    })
    .from(
        ".col-lg-4, .col-md-6:first-child, .create-post-card, .form-container",
        {
            x: -50,
            opacity: 0
        },
        "-=0.4"
    )
    .from(
        ".search-box",
        {
            y: -20,
            opacity: 0
        },
        "-=0.3"
    )
    .from(
        ".card",
        {
            y: 30,
            opacity: 0,
            stagger: 0.12
        },
        "-=0.3"
    );
});
