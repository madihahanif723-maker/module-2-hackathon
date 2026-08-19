import supabase from "../supabase.js";

// ================= ADMIN SIGNUP =================
const adminSignupForm = document.getElementById('adminSignupForm');
if (adminSignupForm) {
    adminSignupForm.addEventListener('submit', adminSignup);
}

async function adminSignup(event) {
    event.preventDefault();
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim(); // 👈 Fixed: 'mail' ki jagah 'email' kiya
    const password = document.getElementById('password').value;

    if (!firstName || !lastName || !email || !password) {
        Swal.fire("Error", "Please fill in all fields!", "error");
        return;
    }
    
    const passwordRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passwordRe.test(password)) {
        Swal.fire({
            icon: 'warning',
            title: 'Weak Password',
            text: 'Password must be 6+ characters with at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.',
            confirmButtonText: 'OK'
        });
        return;
    }
    
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRe.test(email)) {
        Swal.fire('Invalid email', 'Please enter a valid email address.', 'error');
        return;
    }

    const submitBtn = adminSignupForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '.7'; }

    // 🌟 Auth Signup calling
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                full_name: `${firstName} ${lastName}`,
                role: 'admin' // 
            }
        }
    });

    if (error) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
        Swal.fire('Error', error.message, 'error');
        return;
    }

    Swal.fire({
        icon: 'success',
        title: `${firstName}, Registration Successful`,
        text: 'Please check your email for verification link.',
        showConfirmButton: true,
        confirmButtonText: 'OK'
    });
    
    setTimeout(() => {
        window.location.href = "adminpanel.html";
    }, 2500);
}


// ================= ADMIN LOGIN =================
const loginForm = document.getElementById('adminLoginForm');
if (loginForm) {
    loginForm.addEventListener('submit', adminLogin);
}

async function adminLogin(event) {
    event.preventDefault();
    const loginEmail = document.getElementById('adminEmail').value.trim();
    const loginPassword = document.getElementById('adminPassword').value; // 👈 Fixed: adminPassword ki ID sahi ki

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '.7'; }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: loginPassword,
        });

        console.log(data);

        if (error) {
            console.log(error);
            if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
            Swal.fire({
                title: 'Error!',
                text: error.message,
                icon: 'error',
            });
        } else {
            Swal.fire({
                title: 'Success!',
                text: 'Login Successful',
                icon: 'success',
                showConfirmButton: '#10b981'
            });
            setTimeout(() => {
                window.location.href = "adminpanel.html";
            }, 2000);
        }
    } catch (error) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
        Swal.fire({
            title: 'Error!',
            text: 'Login failed',
            icon: 'error',
        });
    }
}
// async function loginWithGoogle() {
//     console.log("Google button clicked");
//     try {
//          const { data, error } = await supabase.auth.signInWithOAuth({
//         provider: "google",
//         options: {
//             redirectTo: `${window.location.origin}/dashboard.html`
//             // redirectTo: 'http://127.0.0.1:5500/dashboard.html'    
//             //redirectTo: 'https://rafiapanjwani7-afk.github.io/post_app/dashboard.html'
//         }
//     });

//     console.log(data);
//     console.log(error);

//     if (error) {
//         Swal.fire({
//             icon: "error",
//             title: "OAuth Error",
//             text: err.message,
//             background: '#15222e',
//             color: '#f3f4f6'
//         });
//     }
//     } catch (error) {
//         console.log(error);
        
//     }

   
// }

// Google Redirect check
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
        const userRole = session?.user?.user_metadata?.role;
        if (userRole !== 'admin') {
            await supabase.auth.signOut();
            Swal.fire({
                icon: 'error',
                title: 'Access Denied',
                text: 'Your Google account does not have Admin privileges!',
                background: '#15222e',
                color: '#f3f4f6'
            });
            return;
        }
        window.location.href = "adminpanel.html";
    }
});

window.loginWithGoogle = loginWithGoogle;
window.adminSignup = adminSignup;
window.adminLogin = adminLogin;

export { supabase };