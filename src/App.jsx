import { useEffect, useMemo, useState } from "react";
import { Layout } from "./components/Layout.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { CategoryPage } from "./pages/CategoryPage.jsx";
import { ManagerPage } from "./pages/ManagerPage.jsx";
import { OrgChartPage } from "./pages/OrgChartPage.jsx";
import { OwnerOrgChartEditorPage } from "./pages/OwnerOrgChartEditorPage.jsx";
import { getPageFromHash } from "./utils/navigation.js";
import { pageResources } from "./data/config.js";

function App() {
  const [currentPage, setCurrentPage] = useState(getPageFromHash());

  useEffect(() => {
    const handleHashChange = () => setCurrentPage(getPageFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const activeCategory = useMemo(() => pageResources[currentPage], [currentPage]);

  return (
    <Layout currentPage={currentPage}>
      {currentPage === "manager" ? (
        <ManagerPage />
      ) : currentPage === "manager/org-chart" ? (
        <OrgChartPage />
      ) : currentPage === "owner/org-chart-editor" ? (
        <OwnerOrgChartEditorPage />
      ) : activeCategory ? (
        <CategoryPage pageId={currentPage} page={activeCategory} />
      ) : (
        <DashboardPage />
      )}
    </Layout>
  );
}

export default App;
