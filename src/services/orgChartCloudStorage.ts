import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const ORG_CHART_ROW_ID = "main";
const ORG_CHART_TABLE = "org_chart_data";

export async function loadOrgChartFromCloud() {
  if (!isSupabaseConfigured || !supabase) {
    console.warn("Supabase is not configured. Falling back to local org chart data.");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from(ORG_CHART_TABLE)
      .select("data")
      .eq("id", ORG_CHART_ROW_ID)
      .maybeSingle();

    if (error) {
      console.warn("Failed to load org chart data from Supabase.", error);
      return null;
    }

    return data?.data || null;
  } catch (error) {
    console.warn("Failed to load org chart data from Supabase.", error);
    return null;
  }
}

export async function saveOrgChartToCloud(data) {
  if (!isSupabaseConfigured || !supabase) {
    console.warn("Supabase is not configured. Org chart data was kept locally.");
    return false;
  }

  try {
    const { error } = await supabase.from(ORG_CHART_TABLE).upsert(
      {
        id: ORG_CHART_ROW_ID,
        data,
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    );

    if (error) {
      console.warn("Failed to save org chart data to Supabase.", error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Failed to save org chart data to Supabase.", error);
    return false;
  }
}
