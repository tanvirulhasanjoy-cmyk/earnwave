// ======================================
// EarnWave - Frontend Application
// ======================================

// https://ajhdkptjmbanngzqtqfv.supabase.co/rest/v1/ে.
// sb_publishable_mUbL40Gw_8sDNuVcqLhiCg_hEGlZJFt.
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_PUBLISHABLE_KEY = "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY";

let supabaseClient = null;
let authMode = "login";

const $ = (id) => document.getElementById(id);

function showMessage(text, type = "info") {
  const message = $("authMessage");
  if (!message) return;

  message.textContent = text;
  message.style.color =
    type === "error" ? "#b91c1c" :
    type === "success" ? "#15803d" : "#4f46e5";
}

function showSection(sectionId) {
  ["authSection", "dashboard"].forEach((id) => {
    $(id)?.classList.add("hidden");
  });

  if (sectionId) {
    $(sectionId)?.classList.remove("hidden");
    $(sectionId).scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function openAuth(mode) {
  authMode = mode;

  showSection("authSection");

  $("loginTab").classList.toggle("active", mode === "login");
  $("signupTab").classList.toggle("active", mode === "signup");

  $("nameField").classList.toggle("hidden", mode !== "signup");
  $("fullName").required = mode === "signup";

  $("authTitle").textContent =
    mode === "signup" ? "Create your account" : "Welcome back!";

  $("authDescription").textContent =
    mode === "signup"
      ? "Join EarnWave with your email address."
      : "Login to your EarnWave account.";

  $("authSubmit").textContent =
    mode === "signup" ? "Create Account" : "Login";

  $("password").autocomplete =
    mode === "signup" ? "new-password" : "current-password";

  showMessage("");
}

function showDashboard(user) {
  showSection("dashboard");

  const displayName =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Member";

  $("userName").textContent = displayName;
  $("accountStatus").textContent =
    user.email_confirmed_at ? "Email verified" : "Email verification pending";

  // Balances are not calculated or credited in the browser.
  // Connect a secure server-side balance endpoint before showing real money.
  $("balance").textContent = "৳—";
  $("completedTasks").textContent = "—";
  $("currentLevel").textContent = "Level 1";
}

async function refreshSession() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Session check failed:", error.message);
    return;
  }

  if (data.session?.user) {
    showDashboard(data.session.user);
  } else {
    showSection(null);
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  if (!supabaseClient) {
    showMessage(
      "Supabase connection সেটআপ করা হয়নি। app.js-এর URL ও Publishable Key পরীক্ষা করো।",
      "error"
    );
    return;
  }

  const email = $("email").value.trim();
  const password = $("password").value;
  const fullName = $("fullName").value.trim();

  if (!email || password.length < 8) {
    showMessage("সঠিক ইমেইল এবং কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দাও।", "error");
    return;
  }

  if (authMode === "signup" && !fullName) {
    showMessage("তোমার নাম লিখো।", "error");
    return;
  }

  const submitButton = $("authSubmit");
  submitButton.disabled = true;
  submitButton.textContent = "Please wait...";

  try {
    if (authMode === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: fullName
          }
        }
      });

      if (error) throw error;

      if (data.session && data.user) {
        showDashboard(data.user);
      } else {
        showMessage(
          "রেজিস্ট্রেশন অনুরোধ পাঠানো হয়েছে। ইমেইল যাচাই করে তারপর লগইন করো।",
          "success"
        );
        openAuth("login");
      }
    } else {
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      if (data.user) {
        showDashboard(data.user);
      }
    }
  } catch (error) {
    // Display normal error messages; never expose keys or internal details.
    showMessage(error.message || "অনুরোধটি সম্পন্ন হয়নি। আবার চেষ্টা করো.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent =
      authMode === "signup" ? "Create Account" : "Login";
  }
}

async function logout() {
  if (!supabaseClient) return;

  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("Logout করা যায়নি। আবার চেষ্টা করো।");
    return;
  }

  $("authForm").reset();
  showSection(null);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initialiseUI() {
  $("year").textContent = new Date().getFullYear();

  $("headerLogin").addEventListener("click", () => openAuth("login"));
  $("heroLogin").addEventListener("click", () => openAuth("login"));
  $("heroSignup").addEventListener("click", () => openAuth("signup"));

  $("loginTab").addEventListener("click", () => openAuth("login"));
  $("signupTab").addEventListener("click", () => openAuth("signup"));

  $("authForm").addEventListener("submit", handleAuthSubmit);
  $("logoutButton").addEventListener("click", logout);

  $("walletInfoButton").addEventListener("click", () => {
    $("walletMessage").textContent =
      "ওয়ালেটের বাস্তব ব্যালেন্স ও উত্তোলনের সুবিধা চালু করতে নিরাপদ সার্ভার যাচাই প্রয়োজন।";
  });
}

function initialiseSupabase() {
  const looksConfigured =
    SUPABASE_URL.startsWith("https://") &&
    SUPABASE_URL.includes(".supabase.co") &&
    SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_");

  if (!looksConfigured) {
    console.warn("EarnWave: Supabase configuration is missing.");
    return;
  }

  if (!window.supabase?.createClient) {
    showMessage("Supabase লাইব্রেরি লোড হয়নি। পেজ রিফ্রেশ করে চেষ্টা করো।", "error");
    return;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      showDashboard(session.user);
    }

    if (event === "SIGNED_OUT") {
      showSection(null);
    }
  });

  refreshSession();
}

document.addEventListener("DOMContentLoaded", () => {
  initialiseUI();

  // Load Supabase JS library before creating the client.
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.async = true;
  script.onload = initialiseSupabase;
  script.onerror = () => {
    console.error("Could not load Supabase JS.");
    showMessage("Supabase লাইব্রেরি লোড করা যায়নি। ইন্টারনেট পরীক্ষা করো।", "error");
  };

  document.head.appendChild(script);
});
