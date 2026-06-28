import { useEffect, useState } from "react";
import { Layout } from "./components/Layout.jsx";
import { OrgChartPage } from "./pages/OrgChartPage.jsx";
import { OwnerOrgChartEditorPage } from "./pages/OwnerOrgChartEditorPage.jsx";
import { getPageFromHash, navigateToPage } from "./utils/navigation.js";

function App() {
  const [currentPage, setCurrentPage] = useState(getPageFromHash());

  useEffect(() => {
    const handleHashChange = () => setCurrentPage(getPageFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const isOrgChartRoute = currentPage === "manager/org-chart" || currentPage === "owner/org-chart-editor";

  useEffect(() => {
    if (!isOrgChartRoute) navigateToPage("manager/org-chart");
  }, [isOrgChartRoute]);

  return (
    <Layout currentPage={currentPage}>
      {currentPage === "manager/org-chart" || !isOrgChartRoute ? (
        <OrgChartPage />
      ) : currentPage === "owner/org-chart-editor" ? (
        <OwnerOrgChartEditorPage />
      ) : null}
    </Layout>
  );
}

export default App;
