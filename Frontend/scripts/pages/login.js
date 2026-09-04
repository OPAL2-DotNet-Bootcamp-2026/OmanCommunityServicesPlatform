(function initializeLoginPage(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const auth = ocsp.authService;
  const session = ocsp.sessionService;
  const shell = ocsp.siteSession;
  let elements = {};
  let submitting = false;

  function cacheElements() {
    elements = {
      form: global.document.getElementById("loginForm"),
      email: global.document.getElementById("email"),
      password: global.document.getElementById("password"),
      submit: global.document.getElementById("loginSubmit"),
      status: global.document.getElementById("loginStatus")
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
  }

  function setSubmitting(isSubmitting) {
    submitting = isSubmitting;
    elements.submit.disabled = isSubmitting;
    elements.form.setAttribute("aria-busy", String(isSubmitting));
    elements.submit.innerHTML = isSubmitting
      ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Signing in...'
      : '<i class="bi bi-box-arrow-in-right" aria-hidden="true"></i>Sign In';
  }

  async function submitLogin(event) {
    event.preventDefault();
    if (submitting || !elements.form.reportValidity()) {
      return;
    }

    setStatus("", "info");
    setSubmitting(true);
    try {
      const activeSession = await auth.login({
        email: elements.email.value.trim(),
        password: elements.password.value
      });
      const requestedTarget = new URLSearchParams(global.location.search).get("returnTo");
      const returnTo = session.safeReturnTo(requestedTarget, activeSession.user.role);
      global.location.replace(returnTo || session.roleHome(activeSession.user.role));
    } catch (error) {
      setStatus(error.message || "Sign in could not be completed.", "danger");
      elements.password.value = "";
      elements.password.focus();
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
      throw new Error("The sign-in page modules were not loaded in the expected order.");
    }

    const flash = session.consumeFlash();
    if (flash) {
      setStatus(flash.message, flash.tone);
      if (flash.email) {
        elements.email.value = flash.email;
      }
    }
    elements.form.addEventListener("submit", submitLogin);
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
