import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.BONHOMME_EMAIL?.trim().toLowerCase();

if (!url || !serviceRoleKey || !adminEmail) {
  throw new Error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and BONHOMME_EMAIL before running the seed.");
}

const artists = JSON.parse(await readFile(new URL("../data/artists.json", import.meta.url), "utf8"));
const bonhomme = artists.find((artist) => artist.slug === "bonhomme");
if (!bonhomme) {
  throw new Error("data/artists.json must contain the artist with slug 'bonhomme'.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let user = null;
for (let page = 1; !user; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  user = data.users.find((candidate) => candidate.email?.toLowerCase() === adminEmail) ?? null;
  if (data.users.length < 1000) break;
}

if (!user) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    email_confirm: true,
  });
  if (error) throw error;
  user = data.user;
}

const { error: profileError } = await supabase.from("profiles").upsert({
  id: user.id,
  slug: "bonhomme",
  name: bonhomme.name,
  roles: bonhomme.roles ?? [],
  location: bonhomme.based ?? bonhomme.location ?? "",
  bio: bonhomme.bio ?? "",
  looking_for: bonhomme.looking_for ?? "",
  links: bonhomme.links ?? [],
  contact: bonhomme.contact ?? "",
  photo_path: bonhomme.photo_path ?? bonhomme.photo ?? null,
  status: "live",
}, { onConflict: "id" });
if (profileError) throw profileError;

const { error: adminError } = await supabase.from("roles_admin").upsert(
  { user_id: user.id },
  { onConflict: "user_id" },
);
if (adminError) throw adminError;

console.info(`Seeded live BONHOMME profile and admin membership for ${adminEmail}.`);
