(function initializeRegisterPage(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const auth = ocsp.authService;
  const session = ocsp.sessionService;
  const shell = ocsp.siteSession;
  let elements = {};
  let submitting = false;

  function cacheElements() {
    elements = {
      form: global.document.getElementById("registerForm"),
      name: global.document.getElementById("name"),
      email: global.document.getElementById("email"),
      phone: global.document.getElementById("phoneNumber"),
      region: global.document.getElementById("regionId"),
      regionHint: global.document.getElementById("regionHint"),
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
  }

  function setSubmitting(isSubmitting) {
    submitting = isSubmitting;
    elements.submit.disabled = isSubmitting;
    elements.form.setAttribute("aria-busy", String(isSubmitting));
    elements.submit.innerHTML = isSubmitting
      ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Creating account...'
      : '<i class="bi bi-person-check" aria-hidden="true"></i>Register';
  }

  function populateRegions(regions) {
    elements.region.replaceChildren(new Option("Select your region", ""));
    regions.forEach((region) => {
      const regionId = Number(region.regionId);
      if (!Number.isInteger(regionId) || regionId < 1) {
        return;
      }
      const label = region.governorate
        ? `${region.regionName} — ${region.governorate}`
        : region.regionName;
      elements.region.add(new Option(label, String(regionId)));
    });

    elements.region.disabled = regions.length === 0;
    elements.regionHint.textContent = regions.length
      ? "Region is optional and can be updated later."
      : "Region can be added after registration.";
  }

  async function loadRegions() {
    elements.region.disabled = true;
    elements.regionHint.textContent = "Loading available regions...";
    try {
      populateRegions(await auth.getRegistrationRegions());
    } catch (_error) {
      populateRegions([]);
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
      await auth.register({
        name: elements.name.value.trim(),
        email: elements.email.value.trim(),
        phoneNumber: elements.phone.value.trim() || null,
        regionId: elements.region.value ? Number(elements.region.value) : null,
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
    loadRegions();
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
