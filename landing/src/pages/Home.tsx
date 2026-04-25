import { useEffect, useState, type ReactNode } from "react";
import {
  AppleStoreIcon,
  GooglePlayIcon,
  StoreButton,
  TESTFLIGHT_URL,
} from "../components/StoreButton";
import {
  supabase,
  type PublicAuthor,
  type PublicBone,
  type RestaurantInfo,
} from "../supabase";

const SUPPORT_EMAIL = "bonibuddyapp@gmail.com";
const INSTAGRAM_URL = "https://instagram.com/boni_buddy";
const TIKTOK_URL = "https://www.tiktok.com/@boni.buddy";

const ASSETS = {
  logoFace: "/figma-assets/logo-face.svg",
  boniLogo: "/invite-logo-circle.png",
  speechBubble: "/figma-assets/speech-bubble.png",
  heroImage: "/hero-image.png",
};

type FeedItem = PublicBone & { author?: PublicAuthor };

const DAYS = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-black">
      <section
        style={{
          backgroundImage:
            "linear-gradient(187.3901238927963deg, rgba(75, 194, 244, 0.4) 8.6486%, rgba(146, 220, 243, 0.4) 52.783%, #f5fcff 91.351%)",
        }}
      >
        <div className="mx-auto flex min-h-[760px] max-w-[1440px] flex-col gap-16 px-5 py-6 sm:px-10 lg:min-h-[893px] lg:gap-[130px] lg:px-20 lg:py-10">
          <Header />

          <div className="grid items-center gap-12 lg:grid-cols-[655px_1fr] lg:gap-10">
            <div>
              <p className="text-[26px] font-medium leading-tight text-[#0191d7] sm:text-[36px]">
                🎓 Za študente
              </p>
              <h1 className="mt-2 max-w-[560px] font-['Poppins'] text-[54px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[72px] sm:leading-[100px]">
                Najdi družbo za bone.
                <img
                  src={ASSETS.speechBubble}
                  alt=""
                  className="ml-3 inline h-[0.95em] w-[0.95em] translate-y-2 object-contain"
                />
              </h1>
              <p className="mt-3 max-w-[655px] text-[28px] leading-[1.42] sm:text-[36px] sm:leading-[57px]">
                Spoznaj študente v tvoji bližini in pojdi na bone skupaj.
              </p>

              <div className="mt-6 lg:hidden">
                <HeroCards />
              </div>

              <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
                <StoreButton
                  href={TESTFLIGHT_URL}
                  icon={<AppleStoreIcon />}
                  label="Naloži beta verzijo"
                  fixed
                />
                <StoreButton
                  icon={<GooglePlayIcon />}
                  label="Naloži na google play"
                  fixed
                />
              </div>
            </div>

            <div className="hidden lg:block">
              <HeroCards />
            </div>
          </div>
        </div>
      </section>

      <section
        id="kako"
        className="bg-[#f5fcff] px-5 pb-20 pt-14 sm:px-10 lg:px-20"
      >
        <div className="mx-auto max-w-[887px] text-center">
          <h2 className="font-['Poppins'] text-[42px] font-semibold leading-tight sm:text-[56px]">
            Kako deluje?
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-10">
            <HowCard
              emoji="💬"
              title="Poišči svoje Boni Buddyje"
              subtitle="Objavi bon ali swipe-aj"
            />
            <HowCard
              emoji="🔥️"
              title="Matchaj se z nekom"
              subtitle="ki bi šel na bone isto kot ti"
            />
            <HowCard
              emoji="🍔"
              title="Pejta na bone"
              subtitle="Dogovorita se v chatu in se dobita"
            />
          </div>
        </div>
      </section>

      <LiveFeedSection />

      <section
        className="relative h-[581px] overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(245, 252, 255, 0.2) 0%, rgba(29, 176, 246, 0.2) 100%), linear-gradient(90deg, #f5fcff 0%, #f5fcff 100%)",
        }}
      >
        <div className="absolute left-1/2 top-[42px] flex w-[min(605.56px,calc(100%-40px))] -translate-x-1/2 flex-col items-center gap-11 text-center lg:top-[64.72px]">
          <h2 className="w-full font-['Poppins'] text-[42px] font-semibold leading-[1.18] sm:text-[56px] sm:leading-[76px]">
            Prenesi app in najdi svojega buddyja.
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <StoreButton
              href={TESTFLIGHT_URL}
              icon={<AppleStoreIcon />}
              label="Naloži beta verzijo"
            />
            <StoreButton icon={<GooglePlayIcon />} label="Naloži na google play" />
          </div>
        </div>

        <img
          src={ASSETS.logoFace}
          alt=""
          className="absolute bottom-[-210.53px] left-[calc(50%-0.27px)] h-[421.813px] w-[717.463px] max-w-none -translate-x-1/2"
        />
      </section>

      <section className="bg-[#f5fcff] px-5 pb-8 sm:px-10 lg:px-20">
        <Footer />
      </section>
    </div>
  );
}

function LiveFeedSection() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setError("Live feed trenutno ni dosegljiv.");
      setItems([]);
      return;
    }

    (async () => {
      const { data: bones, error: bonesErr } = await client
        .from("meal_invites")
        .select(
          "id, user_id, restaurant, restaurant_info, scheduled_at, note, created_at"
        )
        .eq("visibility", "public")
        .eq("status", "open")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(3);

      if (bonesErr) {
        setError(bonesErr.message);
        setItems([]);
        return;
      }

      const list = (bones ?? []) as PublicBone[];
      const ids = Array.from(new Set(list.map((bone) => bone.user_id)));
      const { data: authors } = ids.length
        ? await client
            .from("public_profiles")
            .select("id, name, faculty, photos")
            .in("id", ids)
        : { data: [] as PublicAuthor[] };
      const authorMap = new Map(
        (authors ?? []).map((author) => [author.id, author as PublicAuthor])
      );

      const needLookup = list.filter((bone) => !bone.restaurant_info);
      const lookupNames = Array.from(
        new Set(needLookup.map((bone) => bone.restaurant))
      );
      const restLookup = new Map<string, RestaurantInfo>();
      if (lookupNames.length > 0) {
        const { data: rests } = await client
          .from("restaurants")
          .select("name, address, city, supplement_price, meal_price, rating")
          .in("name", lookupNames);
        for (const rest of rests ?? []) {
          restLookup.set(rest.name, {
            address: rest.address,
            city: rest.city,
            rating: rest.rating,
            supplement_price: rest.supplement_price,
            meal_price: rest.meal_price,
          });
        }
      }

      setItems(
        list.map((bone) => ({
          ...bone,
          restaurant_info:
            bone.restaurant_info ?? restLookup.get(bone.restaurant) ?? null,
          author: authorMap.get(bone.user_id),
        }))
      );
    })();
  }, []);

  return (
    <section className="bg-[#f5fcff] px-5 pb-24 pt-24 sm:px-10 lg:px-20">
      <div className="mx-auto grid max-w-[1080px] items-center gap-10 lg:grid-cols-[0.88fr_1.12fr]">
        <div>
          <p className="text-[22px] font-medium leading-tight text-[#0191d7] sm:text-[30px]">
            🍽️ Live feed
          </p>
          <h2 className="mt-3 font-['Poppins'] text-[42px] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[56px]">
            Poglej, kdo gre danes na bone.
          </h2>
          <p className="mt-5 max-w-[480px] text-[22px] leading-[1.45] sm:text-[28px]">
            Javni boni so odprte objave študentov, ki iščejo družbo za kosilo.
          </p>
        </div>

        <div className="grid gap-4">
          {items === null &&
            Array.from({ length: 3 }).map((_, index) => (
              <LiveFeedSkeleton key={index} />
            ))}

          {error && items?.length === 0 && (
            <LiveFeedMessage>{error}</LiveFeedMessage>
          )}

          {items?.length === 0 && !error && (
            <LiveFeedMessage>
              Trenutno ni odprtih javnih bonov. Objavi prvega v aplikaciji.
            </LiveFeedMessage>
          )}

          {items?.map((item, index) => (
            <LiveFeedCard key={item.id} item={item} accent={accentFor(index)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveFeedCard({
  item,
  accent,
}: {
  item: FeedItem;
  accent: string;
}) {
  const authorName = item.author?.name?.trim() || "Študent";
  const initial = authorName[0]?.toUpperCase() ?? "B";
  const faculty = item.author?.faculty || "Boni Buddy";
  const info = item.restaurant_info;
  const supplement =
    typeof info?.supplement_price === "number"
      ? `${info.supplement_price.toFixed(2)} EUR doplačilo`
      : null;
  const placeMeta = [info?.address, info?.city].filter(Boolean).join(", ");

  return (
    <article className="rounded-[20px] border border-[rgba(71,189,239,0.2)] bg-white p-5 shadow-[0_0_24px_rgba(71,189,239,0.25)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-[16px] text-[22px] font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            {initial}
          </div>
          <div>
            <h3 className="text-[22px] font-bold leading-tight">{authorName}</h3>
            <p className="text-[14px] leading-5 text-black/55">{faculty}</p>
          </div>
        </div>
        <span className="rounded-full bg-[#f5fcff] px-3 py-1 text-[14px] shadow-[0_2px_4px_rgba(71,189,239,0.25)]">
          odprto
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[15px]">
        <span className="rounded-full bg-[#f5fcff] px-3 py-1">
          {item.restaurant}
        </span>
        <span className="rounded-full bg-[#f5fcff] px-3 py-1">
          {formatScheduledDate(item.scheduled_at)}
        </span>
        {supplement && (
          <span className="rounded-full bg-[#f5fcff] px-3 py-1">
            {supplement}
          </span>
        )}
      </div>
      {placeMeta && (
        <p className="mt-3 text-[14px] leading-5 text-black/45">{placeMeta}</p>
      )}
      {item.note && (
        <p className="mt-4 text-[18px] leading-[1.35]">{item.note}</p>
      )}
    </article>
  );
}

function LiveFeedSkeleton() {
  return (
    <article className="rounded-[20px] border border-[rgba(71,189,239,0.2)] bg-white p-5 shadow-[0_0_24px_rgba(71,189,239,0.25)]">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 animate-pulse rounded-[16px] bg-[#e8f7fd]" />
        <div className="space-y-2">
          <div className="h-5 w-28 animate-pulse rounded bg-[#e8f7fd]" />
          <div className="h-4 w-20 animate-pulse rounded bg-[#e8f7fd]" />
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <div className="h-7 w-32 animate-pulse rounded-full bg-[#e8f7fd]" />
        <div className="h-7 w-28 animate-pulse rounded-full bg-[#e8f7fd]" />
      </div>
    </article>
  );
}

function LiveFeedMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-[rgba(71,189,239,0.2)] bg-white p-6 text-[18px] leading-7 shadow-[0_0_24px_rgba(71,189,239,0.25)]">
      {children}
    </div>
  );
}

function accentFor(index: number) {
  return ["#47bdef", "#7bdcf8", "#0191d7"][index % 3];
}

function formatScheduledDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round(
    (dateDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
  if (diff === 0) return `Danes ob ${time}`;
  if (diff === 1) return `Jutri ob ${time}`;
  return `${DAYS[date.getDay()]}, ${date.getDate()}.${
    date.getMonth() + 1
  }. ob ${time}`;
}

function Header() {
  return (
    <header className="flex h-[58px] items-center justify-between rounded-[20px] bg-white px-4 shadow-[0_1px_4px_rgba(71,189,239,0.25)] sm:px-8">
      <a href="/" className="flex items-center gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
          <img
            src={ASSETS.boniLogo}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        </span>
        <span className="text-[20px] font-bold sm:text-[23px]">BoniBuddy</span>
      </a>
    </header>
  );
}

function HeroCards() {
  return (
    <div className="relative mx-auto flex w-full max-w-[620px] items-center justify-center sm:min-h-[473px]">
      <img
        src={ASSETS.heroImage}
        alt="Boni Buddy profile cards"
        className="relative z-10 w-full max-w-[590px] object-contain"
      />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mx-auto max-w-[1280px] rounded-[32px] bg-white px-6 pb-6 pt-10 sm:px-10 sm:pb-7 sm:pt-12 lg:px-[58px] lg:pb-[23px] lg:pt-[58px]">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <h2 className="font-['Poppins'] text-[42px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[56px] sm:leading-[76px]">
          Pridruži se BoniBuddy
        </h2>

        <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 lg:shrink-0 lg:gap-10">
          <FooterColumn
            title="Company"
            links={[
              { label: "kako deluje?", href: "#kako" },
              {
                label: "Vprašanja",
                href: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Vprašanje za BoniBuddy")}`,
              },
              { label: "Zasebnostna politika" },
            ]}
          />
          <FooterColumn
            title="Social"
            links={[
              { label: "Instagram", href: INSTAGRAM_URL },
              { label: "Tiktok", href: TIKTOK_URL },
            ]}
          />
        </div>
      </div>

      <p className="mt-8 text-[15px] leading-[1.6] tracking-[0.02em] text-[#47bdef] lg:mt-[43px]">
        © 2026 BoniBuddy
      </p>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href?: string }>;
}) {
  return (
    <div className="min-w-[140px]">
      <h3 className="font-['Poppins'] text-[15px] font-medium leading-[1.6] tracking-[0.02em] text-[#47bdef]">
        {title}
      </h3>
      <ul className="mt-2 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            {link.href ? (
              <a
                href={link.href}
                className="text-[15px] leading-[1.6] tracking-[0.02em] text-black transition hover:text-[#0191d7]"
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  link.href.startsWith("http")
                    ? "noreferrer"
                    : undefined
                }
              >
                {link.label}
              </a>
            ) : (
              <span className="text-[15px] leading-[1.6] tracking-[0.02em] text-black">
                {link.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HowCard({
  emoji,
  title,
  subtitle,
}: {
  emoji: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <article className="flex min-h-[182px] flex-col items-center justify-center rounded-[20px] border border-[rgba(71,189,239,0.2)] bg-white p-5 text-center shadow-[0_0_24px_rgba(71,189,239,0.25)]">
      <div className="text-[48px] leading-none">{emoji}</div>
      <h3 className="mt-4 text-[18px] font-bold leading-[28px]">{title}</h3>
      <p className="text-[14px] leading-[22px]">{subtitle}</p>
    </article>
  );
}
