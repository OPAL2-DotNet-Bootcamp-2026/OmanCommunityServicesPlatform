(function initializeRegisterPage(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const auth = ocsp.authService;
  const session = ocsp.sessionService;
  const shell = ocsp.siteSession;
  const motion = ocsp.animations;
  const feedback = ocsp.feedback;
  let elements = {};
  let submitting = false;

  function cacheElements() {
    elements = {
      form: global.document.getElementById("registerForm"),
      name: global.document.getElementById("name"),
      email: global.document.getElementById("email"),
      phone: global.document.getElementById("phoneNumber"),
      password: global.document.getElementById("password"),
      submit: global.document.getElementById("registerSubmit"),
      status: global.document.getElementById("registerStatus")
    };
  }

  function setStatus(message, tone) {
    if (!message) {
      elements.status.className = "alert d-none";
      elements.status.textContent = "";
      return;
    }

    const safeTone = ["success", "danger", "warning", "info"].includes(tone)
      ? tone
      : "info";
    elements.status.className = `alert alert-${safeTone} mb-3`;
    elements.status.textContent = message;
    if (motion) motion.revealStatus(elements.status);
    if (feedback && ["success", "danger", "warning"].includes(safeTone)) {
      feedback.show(message, { tone: safeTone, announce: false });
    }
  }

  function setSubmitting(isSubmitting) {
    submitting = isSubmitting;
    elements.form.setAttribute("aria-busy", String(isSubmitting));
    if (motion) {
      motion.setButtonBusy(elements.submit, isSubmitting, "Creating account...");
    } else {
      elements.submit.disabled = isSubmitting;
      elements.submit.innerHTML = isSubmitting
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Creating account...'
        : '<i class="bi bi-person-check" aria-hidden="true"></i>Register';
    }
  }

  async function submitRegistration(event) {
    event.preventDefault();
    if (submitting || !elements.form.reportValidity()) {
      return;
    }

    setStatus("", "info");
    setSubmitting(true);
    try {
      // The anonymous register route accepts a null region. Region lookup is a
      // protected backend route, so it becomes available after sign-in.
      await auth.register({
        name: elements.name.value.trim(),
        email: elements.email.value.trim(),
        phoneNumber: elements.phone.value.trim() || null,
        password: elements.password.value
      });
      session.setFlash({
        message: "Your account was created successfully. Sign in to continue.",
        tone: "success",
        email: elements.email.value.trim()
      });
      global.location.replace("login.html");
    } catch (error) {
      setStatus(error.message || "Registration could not be completed.", "danger");
      elements.status.focus();
    } finally {
      setSubmitting(false);
    }
  }

  function start() {
    if (shell && !shell.isPageAllowed()) {
      return;
    }

    cacheElements();
    if (!auth || !session || Object.values(elements).some((element) => !element)) {
      throw new Error("The registration page modules were not loaded in the expected order.");
    }

    elements.form.addEventListener("submit", submitRegistration);
  }

  global.document.addEventListener("DOMContentLoaded", () => {
    try {
      start();
    } catch (error) {
      cacheElements();
      if (elements.status) {
        elements.status.className = "alert alert-danger mb-3";
        elements.status.textContent = error.message;
      }
    }
  });
})(window);
