#!/usr/bin/env node
/**
 * Scrapes all restaurant data from studentska-prehrana.si
 * and generates a SQL migration file with INSERT statements.
 *
 * Usage: node scripts/scrape-restaurants.mjs
 */

import * as cheerio from "cheerio";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIST_URL = "https://www.studentska-prehrana.si/sl/restaurant";
const DETAIL_URL = "https://www.studentska-prehrana.si/sl/restaurant/Details";
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 500;

// Feature icon filename -> tag name mapping
const FEATURE_MAP = {
  icnvegetarian: "vegetarian",
  icnwheelchairwc: "wheelchair",
  icndelivery: "delivery",
  icnsaladbar: "salad_bar",
  icncoeliac: "coeliac_friendly",
  icnpizza: "pizza",
  icnlunch: "lunch",
  icnweekend: "open_weekends",
  icnugodnosti: "student_benefits",
};

function parsePrice(str) {
  if (!str) return null;
  // "3,81" -> 3.81
  return parseFloat(str.replace(",", "."));
}

function escapeSQL(str) {
  if (str == null) return "NULL";
  return "'" + str.replace(/'/g, "''") + "'";
}

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; BoniBuddyScraper/1.0; student project)",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function scrapeList() {
  console.log("Fetching restaurant list...");
  const html = await fetchHTML(LIST_URL);
  const $ = cheerio.load(html);

  const restaurants = [];

  $("div.restaurant-row").each((_, el) => {
    const $el = $(el);
    const spId = $el.attr("data-posid");
    const name = $el.attr("data-lokal") || "";
    const city = $el.attr("data-city") || "";
    const address = $el.attr("data-naslov") || "";
    const lat = parseFloat($el.attr("data-lat")) || null;
    const lon = parseFloat($el.attr("data-lon")) || null;
    const mealPrice = parsePrice($el.attr("data-cena"));
    const supplementPrice = parsePrice($el.attr("data-doplacilo"));

    // Extract postal code from the full address line: "Street, 1000 City"
    const fullAddr = $el.find("small i").first().text().trim();
    const postalMatch = fullAddr.match(/,\s*(\d{4})\s/);
    const postalCode = postalMatch ? postalMatch[1] : null;

    // Extract star rating (checked radio button value)
    const checkedVal = $el.find('input[checked="checked"]').attr("value");
    const rating = checkedVal ? parseInt(checkedVal, 10) : null;

    // Extract features from icon images
    const features = [];
    $el.find("img[src*='/Images/icn']").each((_, img) => {
      const src = $(img).attr("src") || "";
      const match = src.match(/icn(\w+)\.png/);
      if (match) {
        const key = "icn" + match[1];
        if (FEATURE_MAP[key]) features.push(FEATURE_MAP[key]);
      }
    });

    // Proper-case the name (data-lokal is uppercase)
    // Use the <a> text which has proper casing
    const displayName =
      $el.find("h2 a").first().text().trim() || name;

    // Normalize city: strip bilingual suffix, proper title case
    const cleanCity = city
      .split("/")[0] // "KOPER/CAPODISTRIA" -> "KOPER"
      .trim()
      .toLowerCase()
      .replace(/(?:^|\s|-)\S/g, (c) => c.toUpperCase()); // title case

    restaurants.push({
      spId,
      name: displayName,
      city: cleanCity,
      address,
      postalCode,
      lat,
      lon,
      mealPrice,
      supplementPrice,
      rating,
      features,
      phone: null, // filled from detail pages
    });
  });

  // Disambiguate duplicate names by appending address
  const nameCount = {};
  for (const r of restaurants) nameCount[r.name] = (nameCount[r.name] || 0) + 1;
  for (const r of restaurants) {
    if (nameCount[r.name] > 1) {
      r.name = `${r.name} (${r.address})`;
    }
  }

  // Drop exact duplicates (same sp_id)
  const seen = new Set();
  const deduped = restaurants.filter((r) => {
    if (seen.has(r.spId)) return false;
    seen.add(r.spId);
    return true;
  });

  console.log(`Found ${deduped.length} unique restaurants on list page.`);
  return deduped;
}

async function scrapePhone(spId) {
  try {
    const html = await fetchHTML(`${DETAIL_URL}/${spId}`);
    const $ = cheerio.load(html);
    // Phone is in the address line: "Street, 1000 City (phone)"
    const addrText = $("small").first().text();
    const phoneMatch = addrText.match(/\(([^)]+)\)/);
    return phoneMatch ? phoneMatch[1].trim() : null;
  } catch {
    return null;
  }
}

async function scrapePhones(restaurants) {
  console.log(
    `Fetching phone numbers from ${restaurants.length} detail pages...`
  );
  for (let i = 0; i < restaurants.length; i += BATCH_SIZE) {
    const batch = restaurants.slice(i, i + BATCH_SIZE);
    const phones = await Promise.all(batch.map((r) => scrapePhone(r.spId)));
    batch.forEach((r, j) => {
      r.phone = phones[j];
    });
    const done = Math.min(i + BATCH_SIZE, restaurants.length);
    console.log(`  ${done}/${restaurants.length} done`);
    if (i + BATCH_SIZE < restaurants.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }
}

function generateSQL(restaurants) {
  const lines = [];

  lines.push("-- Auto-generated by scrape-restaurants.mjs");
  lines.push(`-- Scraped ${restaurants.length} restaurants from studentska-prehrana.si`);
  lines.push(`-- Generated on ${new Date().toISOString()}`);
  lines.push("");

  // 1. Drop unique constraint on name (we use sp_id as the unique key)
  lines.push("-- Drop unique constraint on name (multiple locations can share a name)");
  lines.push("ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_name_key;");
  lines.push("");

  // 2. Alter table to add new columns
  lines.push("-- Add new columns to restaurants table");
  lines.push("ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS sp_id integer UNIQUE;");
  lines.push("ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS address text;");
  lines.push("ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS postal_code text;");
  lines.push("ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS latitude double precision;");
  lines.push("ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS longitude double precision;");
  lines.push("ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS supplement_price numeric(5,2);");
  lines.push("ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS meal_price numeric(5,2);");
  lines.push("ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS rating integer;");
  lines.push("ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS features text[];");
  lines.push("ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS phone text;");
  lines.push("");

  // 2. Delete existing data (fresh import)
  lines.push("-- Clear existing restaurant data for fresh import");
  lines.push("TRUNCATE public.restaurants;");
  lines.push("");

  // 3. Insert all restaurants
  lines.push("-- Insert all restaurants");
  for (const r of restaurants) {
    const featArr =
      r.features.length > 0
        ? `ARRAY[${r.features.map((f) => `'${f}'`).join(",")}]::text[]`
        : "NULL";
    const lat = r.lat != null ? r.lat : "NULL";
    const lon = r.lon != null ? r.lon : "NULL";
    const sup = r.supplementPrice != null ? r.supplementPrice : "NULL";
    const meal = r.mealPrice != null ? r.mealPrice : "NULL";
    const rat = r.rating != null ? r.rating : "NULL";

    lines.push(
      `INSERT INTO public.restaurants (sp_id, name, city, address, postal_code, latitude, longitude, supplement_price, meal_price, rating, features, phone) VALUES (${r.spId}, ${escapeSQL(r.name)}, ${escapeSQL(r.city)}, ${escapeSQL(r.address)}, ${escapeSQL(r.postalCode)}, ${lat}, ${lon}, ${sup}, ${meal}, ${rat}, ${featArr}, ${escapeSQL(r.phone)});`
    );
  }

  lines.push("");

  // 4. Update the base schema reference
  lines.push("-- Create index on sp_id for lookups");
  lines.push(
    "CREATE INDEX IF NOT EXISTS restaurants_sp_id_idx ON public.restaurants (sp_id);"
  );
  lines.push(
    "CREATE INDEX IF NOT EXISTS restaurants_city_idx ON public.restaurants (city);"
  );
  lines.push("");

  return lines.join("\n");
}

async function main() {
  const restaurants = await scrapeList();
  await scrapePhones(restaurants);

  const sql = generateSQL(restaurants);
  const outPath = join(
    __dirname,
    "..",
    "supabase",
    "migrations",
    "20260411_restaurants_data.sql"
  );
  writeFileSync(outPath, sql, "utf-8");
  console.log(`\nWrote migration to: ${outPath}`);
  console.log(`Total restaurants: ${restaurants.length}`);

  // Also write JSON for reference
  const jsonPath = join(__dirname, "restaurants.json");
  writeFileSync(jsonPath, JSON.stringify(restaurants, null, 2), "utf-8");
  console.log(`Wrote JSON to: ${jsonPath}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
