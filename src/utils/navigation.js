export function navigateToPage(pageId) {
  if (!pageId) {
    window.location.hash = "/manager/org-chart";
    return;
  }

  window.location.hash = pageId.startsWith("/") ? pageId : `/${pageId}`;
}

export function getPageFromHash() {
  const cleanHash = window.location.hash.replace(/^#\/?/, "");
  if (!cleanHash || cleanHash === "home") return "manager/org-chart";
  return cleanHash;
}
