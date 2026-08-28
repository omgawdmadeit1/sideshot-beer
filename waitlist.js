(function () {
  var form = document.getElementById("waitlist-form");
  if (!form) return;

  var email = document.getElementById("email");
  var status = document.getElementById("waitlist-status");
  var submit = form.querySelector("[type='submit']");
  var focusBtn = document.getElementById("focus-waitlist");

  if (focusBtn && email) {
    focusBtn.addEventListener("click", function () {
      email.focus();
    });
  }

  function setStatus(message, kind) {
    if (!status) return;
    status.textContent = message;
    status.className = "status" + (kind === "ok" ? " ok" : kind === "err" || kind === "error" ? " err" : "");
    status.dataset.kind = kind === "err" ? "error" : kind || "";
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var address = email ? email.value.trim() : "";
    if (!address || address.indexOf("@") < 1) {
      setStatus("Enter a valid email address.", "err");
      if (email) email.focus();
      return;
    }
    if (!form.ageConfirmed || !form.ageConfirmed.checked) {
      setStatus("Confirm you are 21 or older.", "err");
      return;
    }

    var interest = Array.prototype.slice
      .call(form.querySelectorAll('input[name="interest"]:checked, input[name="interest"][type="hidden"]'))
      .map(function (box) { return box.value; })
      .filter(Boolean);

    if (submit) submit.disabled = true;
    setStatus("Saving your spot…", "pending");

    var sourceInput = form.querySelector('input[name="source"]');
    var websiteInput = form.querySelector('input[name="website"]');

    try {
      var response = await fetch(form.getAttribute("action") || "/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: address,
          source: sourceInput && sourceInput.value ? sourceInput.value : "homepage",
          interest: interest,
          ageConfirmed: true,
          website: websiteInput ? websiteInput.value : "",
        }),
      });
      var data = {};
      try {
        data = await response.json();
      } catch (_err) {
        data = {};
      }
      if (!response.ok || !data.ok) {
        setStatus(data.error || "Could not join the waitlist. Try again.", "err");
        if (submit) submit.disabled = false;
        return;
      }
      setStatus(
        data.alreadyJoined
          ? "You are already on the list. The Side Quest is still coming."
          : "You're on the list. The Side Quest starts soon.",
        "ok",
      );
      form.reset();
      if (submit) submit.disabled = false;
    } catch (_err) {
      setStatus("Could not reach the waitlist. Check your connection and try again.", "err");
      if (submit) submit.disabled = false;
    }
  });
})();
