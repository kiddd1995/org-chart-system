import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const ORG_CHART_ROW_ID = "main";
const ORG_CHART_TABLE = "org_chart_data";

function getErrorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return error.message || error.details || error.hint || JSON.stringify(error);
}

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
    const message = "Supabase is not configured. Org chart data was kept locally.";
    console.warn(message);
    return { ok: false, error: message };
  }

  try {
    const payload = {
      data,
      updated_at: new Date().toISOString()
    };
    const { data: updatedRows, error } = await supabase
      .from(ORG_CHART_TABLE)
      .update(payload)
      .eq("id", ORG_CHART_ROW_ID)
      .select("id");

    if (error) {
      console.warn("Failed to save org chart data to Supabase.", error);
      return { ok: false, error: getErrorMessage(error) };
    }

    if (!updatedRows?.length) {
      const message = "No org chart data row was updated in Supabase.";
      console.warn(message);
      return { ok: false, error: message };
    }

    return { ok: true, error: "" };
  } catch (error) {
    console.warn("Failed to save org chart data to Supabase.", error);
    return { ok: false, error: getErrorMessage(error) };
  }
}
