import { useEffect, useState } from "react";
import { getOrgChartData, saveOrgChartData, subscribeOrgChartData, validateEdges } from "../stores/orgChartStore";

export function useOrgChartStore() {
  const [orgChartData, setOrgChartData] = useState(() => getOrgChartData());

  useEffect(() => {
    return subscribeOrgChartData(() => {
      setOrgChartData(getOrgChartData());
    });
  }, []);

  function updateOrgChartData(nextData) {
    const validatedData = validateEdges(nextData);
    setOrgChartData(validatedData);
    saveOrgChartData(validatedData);
  }

  return [orgChartData, updateOrgChartData];
}
