import supabase from "../supabase.js";

// =====================================================
// GLOBAL VARIABLES
// =====================================================

let userid = "";
let userName = "";
let Email = "";
let userRole = "";
let allPartners = [];
let editIndex = null;
let edited = false;
let oldAvatarUrl = "";


// =====================================================
// PROFILE DROPDOWN
// =====================================================

window.toggleProfileMenu = function () {
  const popup = document.getElementById("profilePopup");

  if (popup) {
    popup.classList.toggle("show");
  }
};

window.addEventListener("click", function (e) {
  const dropdown = document.querySelector(".profile-dropdown");
  const popup = document.getElementById("profilePopup");

  if (dropdown && popup && !dropdown.contains(e.target)) {
    popup.classList.remove("show");
  }
});


// =====================================================
// SWEETALERT THEME
// =====================================================

function showAlert(options = {}) {
  const theme =
    document.documentElement.getAttribute("data-theme") ||
    localStorage.getItem("theme") ||
    "light";

  const isDark = theme === "dark";

  return Swal.fire({
    background: isDark ? "#0f172a" : "#ffffff",
    color: isDark ? "#f8fafc" : "#0f172a",
    confirmButtonColor: "#10b981",
    cancelButtonColor: "#64748b",
    customClass: {
      popup: "custom-swal-popup"
    },
    ...options
  });
}


// =====================================================
// AUTHENTICATION
// =====================================================

async function getCurrentUser() {
  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error) {
      console.log("Auth Error:", error);
      return null;
    }

    if (!user) {
      console.log("No active session found.");
      return null;
    }

    userid = user.id;
    Email = user.email || "";

    userName =
      `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`.trim();

    if (!userName) {
      userName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Anonymous";
    }

    userRole = user.user_metadata?.role || "";

    const userInitial = document.getElementById("userInitial");

    if (userInitial) {
      userInitial.innerText =
        userName.charAt(0).toUpperCase();
    }

    const dropdownEmail =
      document.getElementById("dropdownEmail");

    if (dropdownEmail) {
      dropdownEmail.innerText = Email;
    }

    if (userRole === "admin") {
      const adminBtn =
        document.getElementById("admin-panel-btn");

      if (adminBtn) {
        adminBtn.classList.remove("d-none");
      }
    }

    return user;

  } catch (error) {
    console.log("User load error:", error);
    return null;
  }
}


// =====================================================
// SAFE ARRAY PARSER
// =====================================================

function safeParseArray(data) {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return data
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =====================================================
// FETCH STUDY PARTNERS
// =====================================================

async function fetchStudyPartners() {
  try {
    const {
      data,
      error
    } = await supabase
      .from("profiles")
      .select(`
                id,
                user_id,
                full_name,
                avatar_url,
                subjects,
                skills,
                experience_level,
                availability,
                bio
            `)
      .order("id", {
        ascending: false
      });

    if (error) {
      console.log("Supabase Fetch Error:", error);
      return;
    }

    allPartners = data || [];

    renderStudyPartners(allPartners);

  } catch (error) {
    console.log("Fetch Study Partners Error:", error);
  }
}
// =====================================================
// CREATE PARTNER CARD
// =====================================================

function createPartnerCard(partner) {
  const subjects = safeParseArray(partner.subjects);
  const skills = safeParseArray(partner.skills);

  const avatar =
    partner.avatar_url ||
    "https://via.placeholder.com/80";

  const name =
    partner.full_name ||
    "Anonymous";

  const isOwner =
    userid && partner.user_id === userid;

  const subjectsHTML = subjects.length
    ? subjects.map(subject => `
        <span class="badge badge-skill me-1 mb-2">
          ${escapeHTML(subject)}
        </span>
      `).join("")
    : `<span class="text-muted small">No subjects listed</span>`;

  const skillsHTML = skills.length
    ? skills.map(skill => `
        <span class="badge badge-level me-1 mb-2">
          ${escapeHTML(skill)}
        </span>
      `).join("")
    : `<span class="text-muted small">No skills listed</span>`;

  return `
    <div class="col-md-6 partner-card-item">

      <div
        class="card partner-card h-100 d-flex flex-column justify-content-between p-3"
        data-id="${escapeHTML(partner.id)}"
      >

        <div>

          <!-- HEADER -->
          <div class="d-flex align-items-center justify-content-between mb-3">

            <div class="d-flex align-items-center">

              <img
                src="${escapeHTML(avatar)}"
                alt="${escapeHTML(name)}"
                class="partner-avatar me-3"
                style="
                  width:50px;
                  height:50px;
                  border-radius:50%;
                  object-fit:cover;
                "
                onerror="this.src='https://via.placeholder.com/80';"
              >

              <div>

                <h5 class="mb-1 fw-bold">
                  ${escapeHTML(name)}
                </h5>

                <span class="badge badge-skill small">
                  <i class="fa-solid fa-graduation-cap me-1"></i>
                  ${escapeHTML(
                    partner.experience_level || "Student"
                  )}
                </span>

              </div>

            </div>

            ${
              isOwner
                ? `
                  <div class="action-buttons">

                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary me-1 edit-btn"
                      data-id="${escapeHTML(partner.id)}"
                      title="Edit"
                    >
                      <i class="fa-solid fa-pen"></i>
                    </button>

                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger delete-btn"
                      data-id="${escapeHTML(partner.id)}"
                      title="Delete"
                    >
                      <i class="fa-solid fa-trash"></i>
                    </button>

                  </div>
                `
                : ""
            }

          </div>


          <!-- BIO -->
          <p
            class="text-muted small mb-3"
            style="line-height:1.5;"
          >
            ${escapeHTML(
              partner.bio ||
              "No introduction provided."
            )}
          </p>


          <!-- SUBJECTS -->
          <div class="mb-2">

            <small
              class="d-block text-emerald fw-bold mb-1 text-uppercase"
              style="
                letter-spacing:0.5px;
                font-size:11px;
              "
            >
              <i class="fa-solid fa-book me-1"></i>
              Subjects
            </small>

            <div>
              ${subjectsHTML}
            </div>

          </div>


          <!-- SKILLS -->
          <div class="mb-3">

            <small
              class="d-block text-emerald fw-bold mb-1 text-uppercase"
              style="
                letter-spacing:0.5px;
                font-size:11px;
              "
            >
              <i class="fa-solid fa-code me-1"></i>
              Skills
            </small>

            <div>
              ${skillsHTML}
            </div>

          </div>

        </div>


        <!-- FOOTER -->
        <div
          class="
            pt-3
            border-top
            border-secondary
            border-opacity-25
            d-flex
            justify-content-between
            align-items-center
          "
        >

          <small class="text-muted">
            <i class="fa-regular fa-clock me-1"></i>
            ${escapeHTML(
              partner.availability || "N/A"
            )}
          </small>


          ${
            !isOwner
              ? `
                <button
                  type="button"
                  class="btn btn-sm btn-emerald fw-bold px-3 connect-btn"
                  data-id="${escapeHTML(partner.user_id || "")}"
                  data-name="${escapeHTML(name)}"
                >
                  <i class="fa-solid fa-paper-plane me-1"></i>
                  Connect
                </button>
              `
              : ""
          }

        </div>

      </div>

    </div>
  `;
}

// =====================================================
// RENDER PARTNERS
// =====================================================

function renderStudyPartners(partners) {
  const container =
    document.getElementById("partnersGrid");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!partners || partners.length === 0) {
    container.innerHTML = `
            <div class="col-12 text-center py-5">

                <i
                    class="fa-solid fa-user-slash fs-1 mb-3 text-secondary"
                ></i>

                <h5 class="text-muted">
                    No study partners found.
                </h5>

            </div>
        `;

    return;
  }

  const fragment =
    document.createDocumentFragment();

  partners.forEach(partner => {
    const wrapper =
      document.createElement("div");

    wrapper.innerHTML =
      createPartnerCard(partner);

    fragment.appendChild(
      wrapper.firstElementChild
    );
  });

  container.appendChild(fragment);

  container
    .querySelectorAll(".connect-btn")
    .forEach(button => {
      button.addEventListener("click", () => {
        connectPartner(
          button.dataset.name
        );
      });
    });

  container
    .querySelectorAll(".edit-btn")
    .forEach(button => {
      button.addEventListener("click", () => {
        editPartner(
          button.dataset.id
        );
      });
    });

  container
    .querySelectorAll(".delete-btn")
    .forEach(button => {
      button.addEventListener("click", () => {
        deletePartner(
          button.dataset.id
        );
      });
    });

  if (typeof gsap !== "undefined") {
    gsap.fromTo(
      container.querySelectorAll(".partner-card-item"),
      {
        y: 30,
        opacity: 0
      },
      {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
        clearProps: "all"
      }
    );
  }
}


// =====================================================
// SEARCH & FILTER
// =====================================================

function filterPartners() {
  const subjectInput =
    document.getElementById("searchSubject");

  const skillInput =
    document.getElementById("searchSkill");

  const levelInput =
    document.getElementById("filterLevel");

  const subjectSearch =
    subjectInput?.value.toLowerCase().trim() || "";

  const skillSearch =
    skillInput?.value.toLowerCase().trim() || "";

  const levelSearch =
    levelInput?.value || "";

  const filtered =
    allPartners.filter(partner => {
      const subjects =
        safeParseArray(partner.subjects);

      const skills =
        safeParseArray(partner.skills);

      const subjectMatch =
        !subjectSearch ||
        subjects.some(subject =>
          String(subject)
            .toLowerCase()
            .includes(subjectSearch)
        );

      const skillMatch =
        !skillSearch ||
        skills.some(skill =>
          String(skill)
            .toLowerCase()
            .includes(skillSearch)
        );

      const levelMatch =
        !levelSearch ||
        partner.experience_level === levelSearch;

      return (
        subjectMatch &&
        skillMatch &&
        levelMatch
      );
    });

  renderStudyPartners(filtered);
}


// =====================================================
// UPLOAD PROFILE IMAGE
// =====================================================

async function uploadAvatar(file) {
  if (!file || !userid) {
    return "";
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error(
      "Image size must be less than 5MB."
    );
  }

  const extension =
    file.name.split(".").pop().toLowerCase();

  const fileName =
    `${userid}_${Date.now()}.${extension}`;

  const filePath =
    `avatars/${fileName}`;

  const {
    error: uploadError
  } = await supabase.storage
    .from("campus-assets")
    .upload(
      filePath,
      file,
      {
        cacheControl: "3600",
        upsert: false
      }
    );

  if (uploadError) {
    console.log(
      "Storage Upload Error:",
      uploadError
    );

    throw uploadError;
  }

  const {
    data
  } = supabase.storage
    .from("campus-assets")
    .getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error(
      "Could not generate image URL."
    );
  }

  return data.publicUrl;
}


// =====================================================
// SAVE STUDY PARTNER
// =====================================================

async function saveStudyPartner(e) {
  e.preventDefault();

  try {
    if (!userid) {
      await showAlert({
        icon: "warning",
        title: "Login Required",
        text: "Please login first."
      });

      return;
    }

    const name =
      document.getElementById("inputName")
        ?.value.trim();

    const subjects =
      document.getElementById("inputSubjects")
        ?.value
        .split(",")
        .map(item => item.trim())
        .filter(Boolean) || [];

    const skills =
      document.getElementById("inputSkills")
        ?.value
        .split(",")
        .map(item => item.trim())
        .filter(Boolean) || [];

    const level =
      document.getElementById("inputLevel")
        ?.value || "";

    const availability =
      document.getElementById("inputAvailability")
        ?.value.trim() || "";

    const bio =
      document.getElementById("inputBio")
        ?.value.trim() || "";

    const avatarInput =
      document.getElementById("inputAvatar");

    const avatarFile =
      avatarInput?.files?.[0];

    if (!name) {
      await showAlert({
        icon: "warning",
        title: "Name Required",
        text: "Please enter your full name."
      });

      return;
    }

    if (!subjects.length) {
      await showAlert({
        icon: "warning",
        title: "Subject Required",
        text: "Please enter at least one subject."
      });

      return;
    }

    if (!skills.length) {
      await showAlert({
        icon: "warning",
        title: "Skill Required",
        text: "Please enter at least one skill."
      });

      return;
    }

    let avatarUrl = oldAvatarUrl || "";

    if (avatarFile) {
      try {
        avatarUrl =
          await uploadAvatar(avatarFile);

      } catch (error) {
        console.log(
          "Avatar Upload Error:",
          error
        );

        await showAlert({
          icon: "error",
          title: "Image Upload Failed",
          text:
            error.message ||
            "Profile picture could not be uploaded."
        });

        return;
      }
    }

    const profileData = {
      user_id: userid,
      full_name: name,
      subjects: subjects,
      skills: skills,
      experience_level: level,
      availability: availability,
      bio: bio
    };

    if (avatarUrl) {
      profileData.avatar_url = avatarUrl;
    }

    // UPDATE

    if (edited && editIndex) {
      const {
        error
      } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("id", editIndex)
        .eq("user_id", userid);

      if (error) {
        console.log(
          "Update Error:",
          error
        );

        await showAlert({
          icon: "error",
          title: "Update Failed",
          text: error.message
        });

        return;
      }

      await showAlert({
        icon: "success",
        title: "Updated!",
        text:
          "Study partner profile updated successfully.",
        timer: 1500,
        showConfirmButton: false
      });
    }

    // INSERT

    else {
      const {
        error
      } = await supabase
        .from("profiles")
        .insert([profileData]);

      if (error) {
        console.log(
          "Insert Error:",
          error
        );

        await showAlert({
          icon: "error",
          title: "Save Failed",
          text: error.message
        });

        return;
      }

      await showAlert({
        icon: "success",
        title: "Saved!",
        text:
          "Study partner profile saved successfully.",
        timer: 1500,
        showConfirmButton: false
      });
    }

    resetPartnerForm();

    await fetchStudyPartners();

  } catch (error) {
    console.log(
      "Save Study Partner Error:",
      error
    );

    await showAlert({
      icon: "error",
      title: "Error",
      text:
        "Something went wrong while saving your profile."
    });
  }
}


// =====================================================
// RESET FORM
// =====================================================

function resetPartnerForm() {
  const form =
    document.getElementById("partnerForm");

  if (form) {
    form.reset();
  }

  edited = false;
  editIndex = null;
  oldAvatarUrl = "";

  const button =
    document.querySelector(
      "#partnerForm button[type='submit']"
    );

  if (button) {
    button.innerHTML = `
            <i class="fa-solid fa-check me-1"></i>
            Save Profile
        `;
  }
}


// =====================================================
// EDIT PARTNER
// =====================================================

async function editPartner(id) {
  const partner =
    allPartners.find(
      item =>
        String(item.id) === String(id)
    );

  if (!partner) {
    return;
  }

  if (
    userid !== partner.user_id &&
    userRole !== "admin"
  ) {
    await showAlert({
      icon: "error",
      title: "Access Denied",
      text:
        "You can only edit your own profile."
    });

    return;
  }

  document.getElementById("inputName").value =
    partner.full_name || "";

  document.getElementById("inputSubjects").value =
    safeParseArray(partner.subjects).join(", ");

  document.getElementById("inputSkills").value =
    safeParseArray(partner.skills).join(", ");

  document.getElementById("inputLevel").value =
    partner.experience_level || "";

  document.getElementById("inputAvailability").value =
    partner.availability || "";

  document.getElementById("inputBio").value =
    partner.bio || "";

  oldAvatarUrl =
    partner.avatar_url || "";

  edited = true;
  editIndex = id;

  const form =
    document.getElementById("partnerForm");

  if (form) {
    form.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  const button =
    document.querySelector(
      "#partnerForm button[type='submit']"
    );

  if (button) {
    button.innerHTML = `
            <i class="fa-solid fa-pen me-1"></i>
            Update Profile
        `;
  }
}


// =====================================================
// DELETE PARTNER
// =====================================================

async function deletePartner(id) {
  const partner =
    allPartners.find(
      item =>
        String(item.id) === String(id)
    );

  if (!partner) {
    return;
  }

  if (
    userid !== partner.user_id &&
    userRole !== "admin"
  ) {
    await showAlert({
      icon: "error",
      title: "Access Denied",
      text:
        "You can only delete your own profile."
    });

    return;
  }

  const result =
    await showAlert({
      title: "Are you sure?",
      text:
        "This study partner profile will be deleted permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText:
        "Yes, delete it!",
      cancelButtonText:
        "Cancel",
      confirmButtonColor:
        "#ef4444"
    });

  if (!result.isConfirmed) {
    return;
  }

  let query =
    supabase
      .from("profiles")
      .delete()
      .eq("id", id);

  if (userRole !== "admin") {
    query = query.eq(
      "user_id",
      userid
    );
  }

  const {
    error
  } = await query;

  if (error) {
    console.log(
      "Delete Error:",
      error
    );

    await showAlert({
      icon: "error",
      title: "Delete Failed",
      text: error.message
    });

    return;
  }

  await showAlert({
    icon: "success",
    title: "Deleted!",
    text:
      "Study partner profile deleted successfully.",
    timer: 1200,
    showConfirmButton: false
  });

  await fetchStudyPartners();
}


// =====================================================
// CONNECT PARTNER
// =====================================================

async function connectPartner(name) {
  if (!userid) {
    await showAlert({
      icon: "warning",
      title: "Login Required",
      text: "Please login first."
    });

    return;
  }

  const result =
    await showAlert({
      title: "Send Request?",
      text:
        `Do you want to connect with ${name}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText:
        "Yes, Send Request",
      cancelButtonText:
        "Cancel"
    });

  if (!result.isConfirmed) {
    return;
  }

  await showAlert({
    icon: "success",
    title: "Request Sent!",
    text:
      `Connection request sent to ${name}.`,
    timer: 1500,
    showConfirmButton: false
  });
}


// =====================================================
// REALTIME
// =====================================================

function realTimeStudyPartners() {
  supabase
    .channel("realtime-study-partners")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "profiles"
      },
      async () => {
        await fetchStudyPartners();
      }
    )
    .subscribe(status => {
      console.log(
        "Study Partner Realtime:",
        status
      );
    });
}


// =====================================================
// LOGOUT
// =====================================================

async function logout() {
  const {
    error
  } = await supabase.auth.signOut();

  if (error) {
    await showAlert({
      icon: "error",
      title: "Logout Failed",
      text: error.message
    });

    return;
  }

  await showAlert({
    icon: "success",
    title: "Logged Out",
    timer: 1200,
    showConfirmButton: false
  });

  window.location.href =
    "index.html";
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
    document.getElementById(
      "theme-toggle"
    );

  if (toggle) {
    toggle.checked =
      theme === "dark";
  }

  const emailElements =
    document.querySelectorAll(
      ".email-text-element"
    );

  emailElements.forEach(element => {
    element.style.setProperty(
      "color",
      theme === "dark"
        ? "#cbd5e1"
        : "#475569",
      "important"
    );
  });

  const headings =
    document.querySelectorAll(
      ".heading, .page-title, .hero-title, h1, h2, h3"
    );

  headings.forEach(element => {
    element.style.setProperty(
      "color",
      theme === "dark"
        ? "#f8fafc"
        : "#0f172a",
      "important"
    );
  });
}


function initTheme() {
  const stored =
    localStorage.getItem("theme");

  const prefersDark =
    window.matchMedia &&
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

  const theme =
    stored ||
    (prefersDark
      ? "dark"
      : "light");

  applyTheme(theme);

  const toggle =
    document.getElementById(
      "theme-toggle"
    );

  if (toggle) {
    toggle.addEventListener(
      "change",
      e => {
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
// GSAP
// =====================================================

function initAnimations() {
  if (typeof gsap === "undefined") {
    return;
  }

  let pointer =
    document.getElementById("pointer");

  if (!pointer) {
    pointer =
      document.createElement("div");

    pointer.id = "pointer";

    document.body.appendChild(pointer);
  }

  gsap.set(pointer, {
    xPercent: -50,
    yPercent: -50
  });

  window.addEventListener(
    "mousemove",
    e => {
      gsap.to(pointer, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.12,
        ease: "power2.out",
        boxShadow:
          "0 0 25px rgba(16,185,129,1)"
      });
    }
  );

  const tl =
    gsap.timeline({
      defaults: {
        ease: "power3.out",
        duration: 0.8,
        clearProps: "all"
      }
    });

  tl.from(
    "nav, .navbar, .custom-navbar",
    {
      y: -50,
      opacity: 0
    }
  )
    .from(
      ".studypartner-card-form, .col-lg-4",
      {
        x: -50,
        opacity: 0
      },
      "-=0.4"
    )
    .from(
      ".filter-card",
      {
        y: -20,
        opacity: 0
      },
      "-=0.3"
    );
}


// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  async function () {

    initTheme();

    await getCurrentUser();

    const form =
      document.getElementById(
        "partnerForm"
      );

    if (form) {
      form.addEventListener(
        "submit",
        saveStudyPartner
      );
    }

    const searchSubject =
      document.getElementById(
        "searchSubject"
      );

    const searchSkill =
      document.getElementById(
        "searchSkill"
      );

    const filterLevel =
      document.getElementById(
        "filterLevel"
      );

    searchSubject?.addEventListener(
      "input",
      filterPartners
    );

    searchSkill?.addEventListener(
      "input",
      filterPartners
    );

    filterLevel?.addEventListener(
      "change",
      filterPartners
    );

    await fetchStudyPartners();

    realTimeStudyPartners();

    initAnimations();
  }
);
window.logout = logout;
window.connectPartner = connectPartner;
window.editPartner = editPartner;
window.deletePartner = deletePartner;
window.fetchStudyPartners = fetchStudyPartners;
window.filterPartners = filterPartners;
window.renderStudyPartners = renderStudyPartners;
window.createPartnerCard = createPartnerCard;
window.applyTheme = applyTheme;
window.showAlert = showAlert;