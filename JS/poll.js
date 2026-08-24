import supabase from "../supabase.js";
import { 
  fetchNotifications, 
  markAsRead, 
  listenForNotifications, 
  createNotification 
} from "./notification.js";
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

let userid = "";
let userName = "";
let Email = "";
// =====================================================
// HELPER
// =====================================================
function escapeHTML(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
// =====================================================
// SWEETALERT
// =====================================================
function showAlert(options = {}) {

    const theme =
        document.documentElement.getAttribute("data-theme") ||
        localStorage.getItem("theme") ||
        "light";

    return Swal.fire({
        background: theme === "dark" ? "#080F1F" : "#ffffff",
        color: theme === "dark" ? "#ffffff" : "#111827",
        confirmButtonColor: "#00c9a7",
        ...options
    });
}


// =====================================================
// THEME
// =====================================================

function applyTheme(theme) {

    document.documentElement.setAttribute(
        "data-theme",
        theme
    );

    document.body.setAttribute(
        "data-theme",
        theme
    );

    localStorage.setItem(
        "theme",
        theme
    );

    const toggle =
        document.getElementById("theme-toggle");

    if (toggle) {
        toggle.checked = theme === "dark";
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

    const savedTheme =
        localStorage.getItem("theme");

    const systemDark =
        window.matchMedia &&
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;

    const theme =
        savedTheme ||
        (systemDark ? "dark" : "light");

    applyTheme(theme);

    const toggle =
        document.getElementById("theme-toggle");

    if (toggle) {

        toggle.addEventListener(
            "change",
            (e) => {

                applyTheme(
                    e.target.checked
                        ? "dark"
                        : "light"
                );

            }
        );
    }
}


// =====================================================
// PROFILE DROPDOWN
// =====================================================

function initProfileDropdown() {

    const profileBtn =
        document.getElementById(
            "profileDropdownBtn"
        );

    const profileMenu =
        document.getElementById(
            "profileMenu"
        );

    const uploadBtn =
        document.getElementById(
            "uploadPicBtn"
        );

    const profileInput =
        document.getElementById(
            "profilePicInput"
        );

    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );


    if (profileBtn && profileMenu) {

        profileBtn.addEventListener(
            "click",
            (e) => {

                e.stopPropagation();

                profileMenu.style.display =
                    profileMenu.style.display === "block"
                        ? "none"
                        : "block";

            }
        );


        document.addEventListener(
            "click",
            (e) => {

                if (
                    !profileMenu.contains(e.target) &&
                    !profileBtn.contains(e.target)
                ) {

                    profileMenu.style.display =
                        "none";

                }

            }
        );
    }


    if (uploadBtn && profileInput) {

        uploadBtn.addEventListener(
            "click",
            () => {

                profileInput.click();

            }
        );


        profileInput.addEventListener(
            "change",
            uploadProfilePicture
        );
    }


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            logout
        );

    }
}


// =====================================================
// CHECK SESSION
// =====================================================

async function checkUserSession() {

    try {

        const {
            data: { user },
            error
        } = await supabase.auth.getUser();


        if (error) {
            throw error;
        }


        if (!user) {

            window.location.href =
                "index.html";

            return false;
        }


        userid = user.id;

        Email = user.email || "";


        // ---------------------------------------------
        // Get profile
        // ---------------------------------------------

        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("profiles")
            .select(
                "full_name, name, avatar_url"
            )
            .eq("id", userid)
            .maybeSingle();


        if (profileError) {

            console.error(
                "Profile Error:",
                profileError
            );

        }


        // ---------------------------------------------
        // User name
        // ---------------------------------------------

        let displayName =
            profile?.full_name ||
            profile?.name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.user_metadata?.first_name ||
            "";


        if (!displayName && Email) {

            displayName =
                Email
                    .split("@")[0];

        }


        userName =
            displayName || "User";


        // ---------------------------------------------
        // Navbar user name
        // ---------------------------------------------

        const navUserName =
            document.getElementById(
                "navUserName"
            );

        if (navUserName) {

            navUserName.textContent =
                userName;

        }


        // ---------------------------------------------
        // Dropdown user name
        // ---------------------------------------------

        const dropdownUserName =
            document.getElementById(
                "dropdownUserName"
            );

        if (dropdownUserName) {

            dropdownUserName.textContent =
                userName;

        }


        // ---------------------------------------------
        // Dropdown email
        // ---------------------------------------------

        const dropdownEmail =
            document.getElementById(
                "dropdownEmail"
            );

        if (dropdownEmail) {

            dropdownEmail.textContent =
                Email;

        }


        // ---------------------------------------------
        // Avatar
        // ---------------------------------------------

        const avatarImg =
            document.getElementById(
                "userAvatarImg"
            );

        const initialText =
            document.getElementById(
                "userInitialText"
            );


        if (profile?.avatar_url) {

            if (avatarImg) {

                avatarImg.src =
                    profile.avatar_url;

                avatarImg.classList.remove(
                    "d-none"
                );

            }


            if (initialText) {

                initialText.classList.add(
                    "d-none"
                );

            }

        } else {

            if (avatarImg) {

                avatarImg.classList.add(
                    "d-none"
                );

            }


            if (initialText) {

                initialText.textContent =
                    userName
                        .charAt(0)
                        .toUpperCase();

                initialText.classList.remove(
                    "d-none"
                );

            }

        }


        return true;


    } catch (error) {

        console.error(
            "Session Error:",
            error
        );

        return false;
    }
}


// =====================================================
// UPLOAD PROFILE PICTURE
// =====================================================

async function uploadProfilePicture(e) {

    const file =
        e.target.files?.[0];

    if (!file || !userid) {
        return;
    }


    if (!file.type.startsWith("image/")) {

        await showAlert({

            icon: "warning",

            title: "Invalid File",

            text:
                "Please select an image."

        });

        e.target.value = "";

        return;
    }


    if (
        file.size >
        5 * 1024 * 1024
    ) {

        await showAlert({

            icon: "warning",

            title: "File Too Large",

            text:
                "Image must be smaller than 5MB."

        });

        e.target.value = "";

        return;
    }


    try {

        Swal.fire({

            title: "Uploading...",

            allowOutsideClick: false,

            didOpen: () => {
                Swal.showLoading();
            }

        });


        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();


        const filePath =
            `avatars/${userid}-${Date.now()}.${extension}`;


        const {
            error: uploadError
        } = await supabase.storage
            .from("avatars")
            .upload(
                filePath,
                file,
                {
                    upsert: true,
                    contentType: file.type
                }
            );


        if (uploadError) {
            throw uploadError;
        }


        const {
            data: publicUrlData
        } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);


        const publicUrl =
            publicUrlData.publicUrl;


        const {
            error: updateError
        } = await supabase
            .from("profiles")
            .update({
                avatar_url:
                    publicUrl
            })
            .eq(
                "id",
                userid
            );


        if (updateError) {
            throw updateError;
        }


        const avatarImg =
            document.getElementById(
                "userAvatarImg"
            );

        const initialText =
            document.getElementById(
                "userInitialText"
            );


        if (avatarImg) {

            avatarImg.src =
                publicUrl;

            avatarImg.classList.remove(
                "d-none"
            );

        }


        if (initialText) {

            initialText.classList.add(
                "d-none"
            );

        }


        await showAlert({

            icon: "success",

            title:
                "Profile Picture Updated",

            timer: 1500,

            showConfirmButton: false

        });


    } catch (error) {

        console.error(
            "Upload Error:",
            error
        );


        await showAlert({

            icon: "error",

            title: "Upload Failed",

            text:
                error.message ||
                "Could not upload profile picture."

        });

    } finally {

        e.target.value = "";

    }
}


// =====================================================
// LOGOUT
// =====================================================

async function logout() {

    try {

        const {
            error
        } = await supabase.auth.signOut();


        if (error) {
            throw error;
        }


        window.location.href =
            "index.html";


    } catch (error) {

        console.error(
            "Logout Error:",
            error
        );


        await showAlert({

            icon: "error",

            title: "Logout Failed",

            text:
                error.message

        });

    }
}


// =====================================================
// ADD POLL OPTION
// =====================================================

function setupDynamicOptions() {

    const addOptionBtn =
        document.getElementById(
            "addOptionBtn"
        );

    const optionsContainer =
        document.getElementById(
            "optionsContainer"
        );


    if (
        !addOptionBtn ||
        !optionsContainer
    ) {
        return;
    }


    addOptionBtn.addEventListener(
        "click",
        () => {

            const count =
                optionsContainer
                    .querySelectorAll(
                        ".option-input"
                    )
                    .length;


            const input =
                document.createElement(
                    "input"
                );


            input.type = "text";

            input.className =
                "form-control option-input mb-2";

            input.placeholder =
                `Option ${count + 1}`;

            input.maxLength =
                150;

            input.required =
                true;


            optionsContainer.appendChild(
                input
            );


            input.focus();

        }
    );
}


// =====================================================
// CREATE POLL
// =====================================================

async function createPoll(
    question,
    options
) {

    try {

        // ---------------------------------------------
        // Insert poll
        // ---------------------------------------------

        const {
            data: poll,
            error: pollError
        } = await supabase
            .from("polls")
            .insert({
                question: question,
                user_id: userid
            })
            .select()
            .single();


        if (pollError) {
            throw pollError;
        }


        if (!poll?.id) {

            throw new Error(
                "Poll was not created."
            );

        }


        // ---------------------------------------------
        // Insert options
        // ---------------------------------------------

        const optionRows =
            options.map(
                (option) => ({

                    poll_id:
                        poll.id,

                    option_text:
                        option,

                    user_id:
                        userid

                })
            );


        const {
            error: optionError
        } = await supabase
            .from("poll_option")
            .insert(
                optionRows
            );


        if (optionError) {

            // Remove poll if options failed
            await supabase
                .from("polls")
                .delete()
                .eq(
                    "id",
                    poll.id
                );

            throw optionError;
        }


        await showAlert({

            icon: "success",

            title: "Poll Published!",

            timer: 1500,

            showConfirmButton: false

        });


        return true;


    } catch (error) {

        console.error(
            "Create Poll Error:",
            error
        );


        await showAlert({

            icon: "error",

            title: "Could Not Create Poll",

            text:
                error.message

        });


        return false;
    }
}


// =====================================================
// FETCH POLLS
// =====================================================

async function fetchPolls() {

    const container =
        document.getElementById(
            "pollsContainer"
        );

    const loading =
        document.getElementById(
            "pollsLoading"
        );


    if (loading) {

        loading.style.display =
            "block";

    }


    try {

        // =================================================
        // 1. GET POLLS
        // =================================================

        const {
            data: polls,
            error: pollsError
        } = await supabase
            .from("polls")
            .select(
                "id, question, created_at, user_id"
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (pollsError) {
            throw pollsError;
        }


        if (!polls || polls.length === 0) {

            renderPolls([]);

            return;
        }


        const pollIds =
            polls.map(
                poll => poll.id
            );


        // =================================================
        // 2. GET OPTIONS SEPARATELY
        // =================================================

        const {
            data: options,
            error: optionsError
        } = await supabase
            .from("poll_option")
            .select(
                "id, poll_id, option_text"
            )
            .in(
                "poll_id",
                pollIds
            );


        if (optionsError) {
            throw optionsError;
        }


        // =================================================
        // 3. GET VOTES SEPARATELY
        // =================================================

        const {
            data: votes,
            error: votesError
        } = await supabase
            .from("poll_votes")
            .select(
                "id, poll_id, option_id, user_id"
            )
            .in(
                "poll_id",
                pollIds
            );


        if (votesError) {
            throw votesError;
        }


        // =================================================
        // 4. COMBINE DATA
        // =================================================

        const finalPolls =
            polls.map(
                poll => ({

                    ...poll,

                    poll_option:
                        (options || [])
                            .filter(
                                option =>
                                    String(
                                        option.poll_id
                                    ) ===
                                    String(
                                        poll.id
                                    )
                            ),

                    poll_votes:
                        (votes || [])
                            .filter(
                                vote =>
                                    String(
                                        vote.poll_id
                                    ) ===
                                    String(
                                        poll.id
                                    )
                            )

                })
            );


        renderPolls(
            finalPolls
        );


    } catch (error) {

        console.error(
            "Fetch Polls Error:",
            error
        );


        if (container) {

            container.innerHTML = `

                <div class="alert alert-danger">

                    <i
                        class="bi bi-exclamation-triangle me-2"
                    ></i>

                    <strong>
                        Unable to load polls.
                    </strong>

                    <br>

                    <small>
                        ${escapeHTML(
                            error.message
                        )}
                    </small>

                </div>

            `;

        }

    } finally {

        if (loading) {

            loading.style.display =
                "none";

        }

    }
}


// =====================================================
// RENDER POLLS
// =====================================================

function renderPolls(polls) {

    const container =
        document.getElementById(
            "pollsContainer"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!polls.length) {

        container.innerHTML = `

            <div
                class="text-center text-muted py-5"
            >

                <i
                    class="bi bi-bar-chart fs-1 d-block mb-2"
                ></i>

                <h5>
                    No Polls Yet
                </h5>

                <p class="mb-0">
                    Create the first poll!
                </p>

            </div>

        `;

        return;
    }


    polls.forEach(
        poll => {

            const options =
                poll.poll_option || [];

            const votes =
                poll.poll_votes || [];


            // -----------------------------------------
            // Total votes
            // -----------------------------------------

            const totalVotes =
                votes.length;


            // -----------------------------------------
            // Current user's vote
            // -----------------------------------------

            const userVote =
                votes.find(
                    vote =>
                        String(
                            vote.user_id
                        ) ===
                        String(userid)
                );


            const hasVoted =
                Boolean(userVote);


            // -----------------------------------------
            // Count votes per option
            // -----------------------------------------

            const voteCounts = {};


            votes.forEach(
                vote => {

                    voteCounts[
                        vote.option_id
                    ] =
                        (
                            voteCounts[
                                vote.option_id
                            ] || 0
                        ) + 1;

                }
            );


            // -----------------------------------------
            // Options HTML
            // -----------------------------------------

            const optionsHTML =
                options.map(
                    option => {

                        const count =
                            voteCounts[
                                option.id
                            ] || 0;


                        const percentage =
                            totalVotes > 0
                                ? (
                                    count /
                                    totalVotes
                                    * 100
                                ).toFixed(1)
                                : 0;


                        const selected =
                            userVote &&
                            String(
                                userVote.option_id
                            ) ===
                            String(
                                option.id
                            );


                        return `

                            <div
                                class="poll-option mb-3"
                            >

                                <div
                                    class="d-flex justify-content-between align-items-center mb-1"
                                >

                                    <span
                                        class="fw-semibold"
                                    >

                                        ${escapeHTML(
                                            option.option_text
                                        )}

                                        ${
                                            selected
                                                ? `
                                                    <span
                                                        class="badge bg-success ms-2"
                                                    >
                                                        Your Vote
                                                    </span>
                                                `
                                                : ""
                                        }

                                    </span>


                                    <small
                                        class="text-muted"
                                    >

                                        ${count}
                                        vote${count === 1 ? "" : "s"}

                                        ·

                                        ${percentage}%

                                    </small>

                                </div>


                                <div
                                    class="progress mb-2"
                                    style="height:8px;"
                                >

                                    <div
                                        class="progress-bar bg-success"
                                        style="
                                            width:${percentage}%;
                                        "
                                    ></div>

                                </div>


                                ${
                                    !hasVoted
                                        ? `

                                            <button
                                                type="button"
                                                class="btn btn-outline-success btn-sm vote-btn"
                                                data-poll-id="${poll.id}"
                                                data-option-id="${option.id}"
                                            >

                                                <i
                                                    class="bi bi-check2-circle me-1"
                                                ></i>

                                                Vote

                                            </button>

                                          `
                                        : ""
                                }

                            </div>

                        `;

                    }
                ).join("");


            // -----------------------------------------
            // Card
            // -----------------------------------------

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "card poll-card shadow-sm mb-4";


            card.innerHTML = `

                <div class="card-body p-4">

                    <div
                        class="d-flex justify-content-between align-items-start mb-2"
                    >

                        <h5
                            class="card-title fw-bold mb-0"
                        >

                            ${escapeHTML(
                                poll.question
                            )}

                        </h5>

                    </div>


                    <div
                        class="text-muted small mb-4"
                    >

                        <i
                            class="bi bi-bar-chart me-1"
                        ></i>

                        ${totalVotes}
                        total vote${totalVotes === 1 ? "" : "s"}

                    </div>


                    <div>
                        ${optionsHTML}
                    </div>

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );


    // =================================================
    // VOTE BUTTON EVENTS
    // =================================================

    container
        .querySelectorAll(
            ".vote-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const pollId =
                            button.dataset
                                .pollId;

                        const optionId =
                            button.dataset
                                .optionId;


                        await submitVote(
                            pollId,
                            optionId
                        );

                    }
                );

            }
        );
}


// =====================================================
// SUBMIT VOTE
// =====================================================

async function submitVote(
    pollId,
    optionId
) {

    if (!userid) {

        await showAlert({

            icon: "warning",

            title: "Login Required",

            text:
                "Please login first."

        });

        return;
    }


    try {

        // Disable buttons
        document
            .querySelectorAll(
                `.vote-btn[data-poll-id="${pollId}"]`
            )
            .forEach(
                button => {
                    button.disabled = true;
                }
            );


        // Check existing vote first
        const {
            data: existingVote,
            error: checkError
        } = await supabase
            .from("poll_votes")
            .select("id")
            .eq(
                "poll_id",
                pollId
            )
            .eq(
                "user_id",
                userid
            )
            .maybeSingle();


        if (checkError) {
            throw checkError;
        }


        if (existingVote) {

            await showAlert({

                icon: "info",

                title: "Already Voted",

                text:
                    "You have already voted on this poll."

            });

            await fetchPolls();

            return;
        }


        // Insert vote
        const {
            error: voteError
        } = await supabase
            .from("poll_votes")
            .insert({
                poll_id:
                    Number(pollId),

                option_id:
                    Number(optionId),

                user_id:
                    userid
            });


        if (voteError) {
            throw voteError;
        }


        await showAlert({

            icon: "success",

            title: "Vote Recorded!",

            timer: 1200,

            showConfirmButton: false

        });


        await fetchPolls();


    } catch (error) {

        console.error(
            "Vote Error:",
            error
        );


        await showAlert({

            icon: "error",

            title: "Vote Failed",

            text:
                error.message ||
                "Could not submit vote."

        });


        await fetchPolls();
    }
}


// =====================================================
// CREATE POLL FORM
// =====================================================

function setupPollForm() {

    const form =
        document.getElementById(
            "createPollForm"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const questionInput =
                document.getElementById(
                    "pollQuestion"
                );


            const optionsContainer =
                document.getElementById(
                    "optionsContainer"
                );


            const question =
                questionInput?.value
                    .trim();


            const inputs =
                optionsContainer
                    ?.querySelectorAll(
                        ".option-input"
                    );


            const options =
                Array.from(
                    inputs || []
                )
                    .map(
                        input =>
                            input.value.trim()
                    )
                    .filter(
                        value =>
                            value.length > 0
                    );


            // -----------------------------------------
            // Validation
            // -----------------------------------------

            if (!question) {

                await showAlert({

                    icon: "warning",

                    title:
                        "Question Required",

                    text:
                        "Please enter a poll question."

                });

                return;
            }


            if (options.length < 2) {

                await showAlert({

                    icon: "warning",

                    title:
                        "Minimum 2 Options",

                    text:
                        "Please add at least two options."

                });

                return;
            }


            // Duplicate options
            const normalized =
                options.map(
                    option =>
                        option.toLowerCase()
                );


            if (
                new Set(normalized).size !==
                normalized.length
            ) {

                await showAlert({

                    icon: "warning",

                    title:
                        "Duplicate Options",

                    text:
                        "Each poll option must be different."

                });

                return;
            }


            // -----------------------------------------
            // Create
            // -----------------------------------------

            const success =
                await createPoll(
                    question,
                    options
                );


            if (!success) {
                return;
            }


            // -----------------------------------------
            // Reset form
            // -----------------------------------------

            form.reset();


            if (optionsContainer) {

                optionsContainer.innerHTML = `

                    <input
                        type="text"
                        class="form-control option-input mb-2"
                        placeholder="Option 1"
                        maxlength="150"
                        required
                    >

                    <input
                        type="text"
                        class="form-control option-input mb-2"
                        placeholder="Option 2"
                        maxlength="150"
                        required
                    >

                `;

            }


            // Reload polls
            await fetchPolls();

        }
    );
}


// =====================================================
// INITIALIZE
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        // Theme
        initTheme();


        // Profile dropdown
        initProfileDropdown();


        // Dynamic options
        setupDynamicOptions();


        // Poll form
        setupPollForm();


        // Session
        const loggedIn =
            await checkUserSession();


        if (!loggedIn) {
            return;
        }


        // Fetch polls
        await fetchPolls();

    }
);