(function () {
  const preorder = document.getElementById("safeshot-preorder");
  const waitlist = document.getElementById("safeshot-waitlist");
  if (!preorder || !waitlist) return;

  fetch("/api/config", { headers: { Accept: "application/json" } })
    .then(function (response) {
      return response.ok ? response.json() : null;
    })
    .then(function (config) {
      if (!config || !config.preorderUrl) return;
      preorder.href = config.preorderUrl;
      preorder.hidden = false;
      waitlist.querySelector(".cta-note").textContent =
        "Pre-order is open. Waitlist still captures launch emails if you are not ready to buy.";
    })
    .catch(function () {
      // Leave waitlist as the only CTA. Do not invent a buy button.
    });
})();
