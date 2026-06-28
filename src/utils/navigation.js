export function navigateToPage(pageId) {
  if (!pageId) {
    window.location.hash = "/";
    return;
  }

  window.location.hash = pageId.startsWith("/") ? pageId : `/${pageId}`;
}

export function getPageFromHash() {
  const cleanHash = window.location.hash.replace(/^#\/?/, "");
  return cleanHash || "home";
}
