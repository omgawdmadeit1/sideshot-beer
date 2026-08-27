(function () {
  const form = document.getElementById("waitlist-form");
  if (!form) return;

  const status = document.getElementById("waitlist-status");
  const submit = form.querySelector("[type='submit']");

  function setStatus(message, kind) {
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind || "";
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (submit) submit.disabled = true;
    setStatus("Saving…", "pending");

    const data = new FormData(form);
    const payload = {
      email: data.get("email"),
      source: data.get("source") || "other",
      interest: data.getAll("interest"),
      ageConfirmed: data.get("ageConfirmed"),
      website: data.get("website"),
      notes: data.get("notes") || "",
    };

    try {
      const response = await fetch(form.getAttribute("action") || "/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(function () {
        return {};
      });
      if (!response.ok || !result.ok) {
        setStatus(result.error || "Could not join the waitlist. Your email was not saved.", "error");
        return;
      }
      setStatus(result.message || "You are on the list.", "ok");
      form.reset();
    } catch (error) {
      setStatus("Network error. Your email was not saved. Try again.", "error");
    } finally {
      if (submit) submit.disabled = false;
    }
  });
})();
