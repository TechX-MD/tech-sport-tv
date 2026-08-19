const filters = document.querySelectorAll(".filter");

filters.forEach(button => {
  button.addEventListener("click", () => {
    filters.forEach(item => item.classList.remove("active"));
    button.classList.add("active");
  });
});

setInterval(() => {
  document.querySelectorAll(".score small").forEach(timer => {
    if (timer.textContent.includes(":")) {
      const parts = timer.textContent.split(":");
      let seconds = parseInt(parts[1]) + 1;

      if (seconds >= 60) {
        seconds = 0;
        parts[0] = parseInt(parts[0]) + 1;
      }

      timer.textContent =
        String(parts[0]).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");
    }
  });
}, 1000);
