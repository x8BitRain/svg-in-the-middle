const form = document.querySelector<HTMLFormElement>("#address")!;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const address = new FormData(form).get("url")!.toString().trim();
  location.assign(`/${address}`);
});
