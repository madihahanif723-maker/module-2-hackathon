import supabase from "../supabase.js";

document.addEventListener('DOMContentLoaded', () => {
    const subtitle = document.getElementById('headerSubtitle');
    const signupTab = document.getElementById('signup-tab');
    const loginTab = document.getElementById('login-tab');

    if (signupTab && loginTab && subtitle) {
        // Sign Up Tab Click
        signupTab.addEventListener('click', () => {
            subtitle.textContent = "Create your account to get started!";
        });

        // Login Tab Click
        loginTab.addEventListener('click', () => {
            subtitle.textContent = "Welcome back! Please login to your account.";
        });
    }
});
// ================= SIGNUP =================

const signupForm = document.getElementById('signupForm')
if (signupForm) {
    signupForm.addEventListener('submit', signup)
}
async function signup(event) {
    event.preventDefault()
    const firstName = document.getElementById('firstName').value.trim()
    const lastName = document.getElementById('lastName').value.trim()
    const email = document.getElementById('signEmail').value.trim()
    const password = document.getElementById('signPassword').value
    const number = document.getElementById('signNumber').value.trim()

    if (!firstName || !lastName || !email || !number || !password) {
        Swal.fire("Error", "Please fill in all fields!", "error");
        return;
    }
    const passwordRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/
    if (!passwordRe.test(password)) {
        Swal.fire({
            icon: 'warning',
            title: 'Weak Password',
            text: 'Password must be 6+ characters with at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.',
            confirmButtonText: 'OK'
        })
        return
    }
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
    if (!emailRe.test(email)) {
        Swal.fire('Invalid email', 'Please enter a valid email address.', 'error')
        return
    }

    const submitBtn = signupForm.querySelector('button[type="submit"]')
    if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '.7'; }

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                full_name: `${firstName} ${lastName}`,
                number: number
            }
        }
    })

    if (error) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
        Swal.fire('Error', error.message, 'error')
        return
    }

    Swal.fire({
        icon: 'success',
        title: `${firstName}, Registration Successful`,
        text: 'Please check your email for verification link.',
        showConfirmButton: true,
        confirmButtonText: 'OK'
    })
    setTimeout(() => {
        window.location.href = "dashboard.html"
    }, 2500);
}

// ================= LOGIN =================

const loginForm = document.getElementById('loginForm')

if (loginForm) {
    loginForm.addEventListener('submit', login)
}

async function login(event) {
    event.preventDefault()
    const loginEmail = document.getElementById('email').value.trim()
    const loginPassword = document.getElementById('password').value

    const submitBtn = loginForm.querySelector('button[type="submit"]')
    if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '.7'; }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: loginPassword,
        })

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
                window.location.href = "dashboard.html"
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

// ================= AUTH STATE =================//
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Event:', event)
    console.log('Session:', session)
    if (event === 'INITIAL_SESSION') {
        // console.log("Please log in again.");
        Swal.fire({
            title: "Account Not Found",
            html: `<a href="index.html" style="color: #14b8a6; font-weight: bold; text-decoration: none;">Create an Account</a>`,
            icon: 'warning'
        });
    }
    if (event === 'SIGNED_IN') {
        console.log('User:', session?.user?.email)
        Swal.fire({
            title: 'Welcome!',
            text: `Hello, ${session.user.user_metadata.first_name || session.user.email}`,
            icon: 'success'
        });
    }
    if (event === "SIGNED_OUT") {
        Swal.fire({
            icon: "info",
            title: "Logged Out",
            text: "You have been signed out."
        });
    }
})

async function loginWithGoogle() {
    console.log("Google button clicked");

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${window.location.origin}/dashboard.html`
            // redirectTo: 'http://127.0.0.1:5500/dashboard.html'    
            // redirectTo: 'https://postifly-app.netlify.app/dashboard.html'    
            //redirectTo: 'https://rafiapanjwani7-afk.github.io/post_app/dashboard.html' 
        }
    });

    console.log(data);
    console.log(error);

    if (error) {
        Swal.fire("Error", error.message, "error");
    }
}
window.signup = signup
window.login = login
window.loginWithGoogle = loginWithGoogle

export { supabase }