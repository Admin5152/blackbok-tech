import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
function loadEnv() {
  const out = {};
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 0) continue;
      out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  return out;
}
const env = loadEnv();
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const id = "ed50c9a3-10bc-4996-a98a-5d5513853a50";
const { data: p } = await sb.from("products").select("id,name,trade_model,stock,status").eq("id", id).single();
const { data: vs } = await sb.from("product_variants").select("id,color,storage,sim_type,stock,price,price_modifier").eq("product_id", id);
const { data: t } = await sb.from("v_trade_targets").select("*").eq("product_id", id);
console.log(JSON.stringify({ product: p, variants: vs, viewRows: t }, null, 2));
