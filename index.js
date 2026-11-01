const pagesByWeekday = [
  "zondag.html",
  "index.html",
  "dinsdag.html",
  "woensdag.html",
  "donderdag.html",
  "vrijdag.html",
  "zaterdag.html",
];
const weekdayNames = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
];
const weekdayByPage = Object.fromEntries(
  pagesByWeekday.map((page, weekday) => [page, weekday]),
);
const currentPage = window.location.pathname.split("/").pop() || "index.html";
const currentPageWeekday = weekdayByPage[currentPage.toLowerCase()];
const isIndexPage =
  /(?:^|\/)index\.html$/i.test(window.location.pathname) ||
  window.location.pathname.endsWith("/");
const isManualMondaySelection =
  new URLSearchParams(window.location.search).get("dag") === "maandag";
const hasManualWeekSelection =
  new URLSearchParams(window.location.search).has("week");
const hasManualViewSelection =
  new URLSearchParams(window.location.search).has("weergave");
const todaysPage = pagesByWeekday[new Date().getDay()];
function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStart(date) {
  const weekStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const mondayOffset = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - mondayOffset);
  return weekStart;
}

function parseWeekStart(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return formatLocalDate(parsed) === value && parsed.getDay() === 1
    ? parsed
    : null;
}

const requestedWeek = parseWeekStart(
  new URLSearchParams(window.location.search).get("week"),
);
let displayedWeekStart = requestedWeek || getWeekStart(new Date());
const spreadsheetId = "1ozamYCdHTEOPEha8VP59euSa6Iw49dBj5eRE62CRKiU";
// Use only the publishable key here, never a secret or service-role key.
const supabaseConfig = {
  url: "https://pjboyzgzdreqegeghfal.supabase.co",
  publishableKey: "sb_publishable_cuNCmjiBVEVZHkHscbKtnw_8u_bwTMU",
};
const dutchColors = {
  beige: "beige",
  blauw: "blue",
  bruin: "brown",
  geel: "yellow",
  grijs: "gray",
  groen: "green",
  lichtblauw: "lightblue",
  lichtgroen: "lightgreen",
  oranje: "orange",
  paars: "purple",
  rood: "red",
  roze: "pink",
  wit: "white",
  zwart: "black",
};

function updateProfileAvatar(element, user) {
  const imageUrl = user?.user_metadata?.avatar_url;
  const label = user?.email
    ? `Profiel van ${user.email}`
    : "Naar profiel";

  element.replaceChildren();
  element.setAttribute("aria-label", label);
  element.title = label;

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    element.append(image);
    return;
  }

  const initials = user?.email?.trim().charAt(0).toLocaleUpperCase("nl");
  element.textContent = initials || "👤";
}

async function initializeProfilePage() {
  const accountDetails = document.querySelector("#profiel-account");
  const status = document.querySelector("#profiel-status");
  const logoutButton = document.querySelector("#profiel-uitloggen");
  const avatar = document.querySelector("#profiel-foto");
  const profileLink = document.querySelector(".profiel-avatar-link");
  const avatarInput = document.querySelector("#profiel-foto-kiezen");
  const avatarButton = document.querySelector("#profiel-foto-knop");
  const exportButton = document.querySelector("#profiel-exporteren");
  const exportStatus = document.querySelector("#profiel-export-status");
  const recoveryCodeButton = document.querySelector(
    "#profiel-herstelcode-maken",
  );
  const recoveryCodeOutput = document.querySelector(
    "#profiel-herstelcode-uitvoer",
  );
  const recoverySection = document.querySelector(
    "#profiel-wachtwoord-herstellen",
  );
  const recoveryForm = document.querySelector("#profiel-herstel-form");
  const recoveryStatus = document.querySelector("#profiel-herstel-status");

  if (!accountDetails || !status || !logoutButton) {
    return;
  }

  try {
    if (!window.supabase?.createClient) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.onload = resolve;
        script.onerror = () =>
          reject(new Error("De Supabase-bibliotheek kon niet worden geladen."));
        document.head.append(script);
      });
    }

    if (!window.supabase?.createClient) {
      throw new Error("De Supabase-bibliotheek kon niet worden gestart.");
    }

    const client = window.supabase.createClient(
      supabaseConfig.url,
      supabaseConfig.publishableKey,
    );
    recoveryForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(recoveryForm);
      const password = String(formData.get("password"));
      if (password !== String(formData.get("password_confirmation"))) {
        recoveryStatus.textContent = "De nieuwe wachtwoorden zijn niet hetzelfde.";
        return;
      }

      const submitButton = recoveryForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      recoveryStatus.textContent = "Wachtwoord herstellen...";
      try {
        const { data: recoveryData, error: recoveryError } =
          await client.functions.invoke("password-recovery", {
            body: {
              action: "reset",
              email: String(formData.get("email")).trim(),
              recoveryCode: String(formData.get("recovery_code")),
              password,
            },
          });
        if (recoveryError) {
          throw recoveryError;
        }

        recoveryForm.reset();
        recoveryStatus.textContent =
          recoveryData?.message ||
          "Je wachtwoord is hersteld. Je kunt nu inloggen.";
      } catch (recoveryError) {
        recoveryStatus.textContent =
          `Wachtwoord herstellen is niet gelukt: ${recoveryError.message}`;
      } finally {
        submitButton.disabled = false;
      }
    });

    recoveryCodeButton?.addEventListener("click", async () => {
      if (
        !window.confirm(
          "De nieuwe herstelcode vervangt een eventuele vorige code. Bewaar hem veilig; zonder code kun je je wachtwoord niet herstellen. Doorgaan?",
        )
      ) {
        return;
      }

      recoveryCodeButton.disabled = true;
      recoveryCodeOutput.hidden = true;
      try {
        const { data: recoveryData, error: recoveryError } =
          await client.functions.invoke("password-recovery", {
            body: { action: "create" },
          });
        if (recoveryError) {
          throw recoveryError;
        }
        if (typeof recoveryData?.recoveryCode !== "string") {
          throw new Error("De server heeft geen herstelcode teruggestuurd.");
        }

        recoveryCodeOutput.textContent =
          `Bewaar deze code nu. Hij wordt niet opnieuw getoond: ${recoveryData.recoveryCode}`;
        recoveryCodeOutput.hidden = false;
        status.textContent =
          "Herstelcode gemaakt. Bewaar hem veilig; de vorige code werkt niet meer.";
      } catch (recoveryError) {
        status.textContent =
          `Herstelcode maken is niet gelukt: ${recoveryError.message}`;
      } finally {
        recoveryCodeButton.disabled = false;
      }
    });

    const { data, error } = await client.auth.getSession();
    if (error) {
      throw error;
    }

    if (!data.session?.user) {
      status.textContent = "Je bent niet ingelogd.";
      accountDetails.hidden = true;
      if (recoverySection) {
        recoverySection.hidden = false;
      }
      return;
    }

    let user = data.session.user;
    if (recoverySection) {
      recoverySection.hidden = true;
    }
    document.querySelector("#profiel-email").textContent =
      user.email || "E-mailadres niet beschikbaar";
    updateProfileAvatar(avatar, user);
    updateProfileAvatar(profileLink, user);
    accountDetails.hidden = false;
    status.textContent = "Je accountgegevens.";

    if (exportButton && exportStatus) {
      let agendaItems = [];
      let supportsRepeatDays = true;
      exportButton.disabled = true;
      exportStatus.textContent = "Je agenda laden voor export...";
      try {
        let result = await client
          .from("agenda_items")
          .select(
            "id, day, start_time, end_time, title, week_start, repeat_pattern, repeat_days",
          )
          .eq("user_id", user.id)
          .order("start_time", { ascending: true });
        if (
          result.error?.code === "42703" &&
          String(result.error.message).includes("repeat_days")
        ) {
          supportsRepeatDays = false;
          result = await client
            .from("agenda_items")
            .select(
              "id, day, start_time, end_time, title, week_start, repeat_pattern",
            )
            .eq("user_id", user.id)
            .order("start_time", { ascending: true });
        }
        if (result.error) {
          throw result.error;
        }
        agendaItems = result.data || [];
        exportButton.disabled = agendaItems.length === 0;
        exportStatus.textContent = agendaItems.length
          ? `${agendaItems.length} afspraken klaar om te exporteren.${supportsRepeatDays ? "" : " Meerdaagse herhaling vereist de SQL voor repeat_days."}`
          : "Je hebt nog geen afspraken om te exporteren.";
      } catch (error) {
        console.error("Agenda laden voor exporteren is niet gelukt.", error);
        exportStatus.textContent = `Je agenda kon niet worden klaargezet voor export: ${error.message}`;
      }

      exportButton.addEventListener("click", () => {
        if (!agendaItems.length) {
          exportStatus.textContent = "Er zijn geen afspraken om te exporteren.";
          return;
        }

        const exportWeekStart = getWeekStart(new Date());
        const events = agendaItems.map((entry) => {
          const eventDate = entry.week_start
            ? new Date(`${entry.week_start}T12:00:00`)
            : entry.repeat_pattern === "daily"
              ? new Date()
              : new Date(exportWeekStart);
          if (entry.week_start || entry.repeat_pattern !== "daily") {
            const weekdayOffset =
              (weekdayNames.indexOf(entry.day) + 6) % 7;
            eventDate.setDate(eventDate.getDate() + weekdayOffset);
          }

          const [hourText, minuteText] = String(entry.start_time)
            .slice(0, 5)
            .split(":");
          const startMinutes = Number(hourText) * 60 + Number(minuteText);
          const endMinutes = entry.end_time
            ? Number(String(entry.end_time).slice(0, 2)) * 60 +
              Number(String(entry.end_time).slice(3, 5))
            : startMinutes + 30;
          const formatDateTime = (minutes) => {
            const date = new Date(eventDate);
            date.setHours(0, 0, 0, 0);
            date.setMinutes(date.getMinutes() + minutes);
            return `${formatLocalDate(date).replace(/-/g, "")}T${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}00`;
          };
          const escapeText = (value) =>
            String(value)
              .replace(/\\/g, "\\\\")
              .replace(/\n/g, "\\n")
              .replace(/,/g, "\\,")
              .replace(/;/g, "\\;");
          const lines = [
            "BEGIN:VEVENT",
            `UID:${entry.id}@agenda`,
            `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
            `DTSTART;TZID=Europe/Brussels:${formatDateTime(startMinutes)}`,
            `DTEND;TZID=Europe/Brussels:${formatDateTime(endMinutes)}`,
            `SUMMARY:${escapeText(entry.title)}`,
          ];

          if (!entry.week_start && entry.repeat_pattern === "daily") {
            lines.push("RRULE:FREQ=DAILY");
          } else if (!entry.week_start) {
            const dayCodes = {
              zondag: "SU",
              maandag: "MO",
              dinsdag: "TU",
              woensdag: "WE",
              donderdag: "TH",
              vrijdag: "FR",
              zaterdag: "SA",
            };
            const repeatDays =
              Array.isArray(entry.repeat_days) && entry.repeat_days.length
                ? entry.repeat_days
                : [entry.day];
            lines.push(
              `RRULE:FREQ=WEEKLY;BYDAY=${repeatDays.map((day) => dayCodes[day]).filter(Boolean).join(",")}`,
            );
          }

          lines.push("END:VEVENT");
          return lines.join("\r\n");
        });
        const calendar = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//Agenda//Weekplanner//NL",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          ...events,
          "END:VCALENDAR",
          "",
        ].join("\r\n");
        const blob = new Blob([calendar], {
          type: "text/calendar;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "mijn-agenda.ics";
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
        exportStatus.textContent =
          "Je volledige agenda is geëxporteerd als .ics-bestand.";
      });
    }

    avatarButton.addEventListener("click", () => avatarInput.click());
    avatarInput.addEventListener("change", async () => {
      const file = avatarInput.files?.[0];
      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        status.textContent = "Kies een afbeeldingsbestand.";
        avatarInput.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        status.textContent =
          "Deze foto is groter dan 5 MB. Kies een kleinere afbeelding.";
        avatarInput.value = "";
        return;
      }

      avatarButton.disabled = true;
      status.textContent = "Je profielfoto wordt opgeslagen...";

      try {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        try {
          await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () =>
              reject(new Error("Deze afbeelding kan niet worden geopend."));
            image.src = objectUrl;
          });
        } finally {
          URL.revokeObjectURL(objectUrl);
        }

        const canvas = document.createElement("canvas");
        const size = 256;
        const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
        const cropX = (image.naturalWidth - cropSize) / 2;
        const cropY = (image.naturalHeight - cropSize) / 2;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("De foto kan niet worden verwerkt.");
        }
        context.drawImage(
          image,
          cropX,
          cropY,
          cropSize,
          cropSize,
          0,
          0,
          size,
          size,
        );

        const photo = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("De foto kan niet worden verwerkt."));
              }
            },
            "image/jpeg",
            0.85,
          );
        });
        const imagePath = `${user.id}/profile.jpg`;
        const { error: uploadError } = await client.storage
          .from("avatars")
          .upload(imagePath, photo, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: true,
          });
        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = client.storage
          .from("avatars")
          .getPublicUrl(imagePath);
        const avatarUrl = `${publicUrlData.publicUrl}?updated=${Date.now()}`;
        const { data: updateData, error: updateError } =
          await client.auth.updateUser({
            data: { avatar_url: avatarUrl },
          });
        if (updateError) {
          throw updateError;
        }

        user = updateData.user;
        updateProfileAvatar(avatar, user);
        updateProfileAvatar(profileLink, user);
        status.textContent = "Je profielfoto is opgeslagen.";
      } catch (error) {
        console.error("De profielfoto kon niet worden opgeslagen.", error);
        status.textContent = `De profielfoto kon niet worden opgeslagen: ${error.message}`;
      } finally {
        avatarButton.disabled = false;
        avatarInput.value = "";
      }
    });

    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      try {
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) {
          throw signOutError;
        }
        window.location.replace("index.html?dag=maandag");
      } catch (signOutError) {
        status.textContent = `Uitloggen is niet gelukt: ${signOutError.message}`;
        logoutButton.disabled = false;
      }
    });
  } catch (error) {
    console.error("De profielpagina kon niet worden geladen.", error);
    status.textContent = `De profielpagina kon niet worden geladen: ${error.message}`;
  }
}

function setupFunctionsNavigation() {
  const navigation = document.querySelector(".dagen-navigatie");
  if (!navigation) {
    return;
  }

  const darkModeStyleId = "agenda-dark-mode-styles";
  if (!document.getElementById(darkModeStyleId)) {
    const darkModeStyle = document.createElement("style");
    darkModeStyle.id = darkModeStyleId;
    darkModeStyle.textContent = `
      body.dark-mode { color: #e5e7eb !important; background: #111827 !important; color-scheme: dark; }
      body.dark-mode h1, body.dark-mode h2, body.dark-mode .agenda-day-heading, body.dark-mode .notities-balk h2, body.dark-mode .notitie-editor h2, body.dark-mode .notitie-kaart h2, body.dark-mode .links-header h2 { color: #e5e7eb !important; }
      body.dark-mode p, body.dark-mode .pagina-intro, body.dark-mode .profiel-uitleg, body.dark-mode #profiel-status, body.dark-mode .notitie-tekst, body.dark-mode .notitie-datum, body.dark-mode .notities-status { color: #cbd5e1 !important; }
      body.dark-mode .agenda-container, body.dark-mode .agenda-day-panel, body.dark-mode .agenda-account, body.dark-mode .agenda-item-form, body.dark-mode .profiel-container, body.dark-mode .notitie-editor, body.dark-mode .notitie-kaart, body.dark-mode .notities-aanmelden, body.dark-mode .links-kaart, body.dark-mode .links-formulier { border-color: #374151 !important; background: #1f2937 !important; color: #e5e7eb !important; }
      body.dark-mode .agenda-day-panel li, body.dark-mode .agenda-item { border-color: #475569; background: #273449 !important; color: #f3f4f6; }
      body.dark-mode input, body.dark-mode select, body.dark-mode textarea, body.dark-mode .agenda-item-actions button, body.dark-mode #profiel-foto-knop, body.dark-mode #profiel-exporteren, body.dark-mode .notitie-knop-secundair, body.dark-mode .notitie-knop-verwijderen, body.dark-mode .links-knop-secundair, body.dark-mode .links-knop-verwijderen { border-color: #4b5563 !important; background: #111827 !important; color: #f3f4f6 !important; }
      body.dark-mode .dagen-navigatie a, body.dark-mode .functies-menu summary, body.dark-mode .functies-menu-link, body.dark-mode .agenda-week-navigation button { border-color: #4b5563 !important; background: #1f2937 !important; color: #e5e7eb !important; }
      body.dark-mode .dagen-navigatie a:hover, body.dark-mode .dagen-navigatie a:focus-visible, body.dark-mode .functies-menu[open] summary, body.dark-mode .functies-menu-link:hover, body.dark-mode .functies-menu-link:focus-visible, body.dark-mode .agenda-week-navigation button:hover, body.dark-mode .agenda-week-navigation button:focus-visible { background: #374151 !important; }
      body.dark-mode .functies-menu-link[aria-current="page"] { background: #374151 !important; }
      body.dark-mode .agenda-week-label, body.dark-mode .agenda-account-message, body.dark-mode .notitie-veld, body.dark-mode .links-status, body.dark-mode .links-login { color: #d1d5db !important; }
      body.dark-mode .agenda-item-actions button { color: #e5e7eb !important; }
    `;
    document.head.append(darkModeStyle);
  }

  const themeToggle = () => {
    const enabled = document.body.classList.toggle("dark-mode");
    const button = document.querySelector(".functies-thema-knop");
    if (button) {
      button.textContent = enabled ? "Lichte modus" : "Donkere modus";
      button.setAttribute(
        "aria-pressed",
        String(enabled),
      );
    }
    try {
      window.localStorage.setItem("agenda-dark-mode", String(enabled));
    } catch (error) {
      console.warn("De thema-instelling kon niet worden opgeslagen.", error);
    }
  };

  try {
    document.body.classList.toggle(
      "dark-mode",
      window.localStorage.getItem("agenda-dark-mode") === "true",
    );
  } catch (error) {
    console.warn("De thema-instelling kon niet worden geladen.", error);
  }

  if (!navigation.querySelector(".functies-menu")) {
    const notesLink = navigation.querySelector('a[href="notities.html"]');
    const menu = document.createElement("details");
    menu.className = "functies-menu";
    const summary = document.createElement("summary");
    summary.textContent = "Functies";
    const menuLink = document.createElement("a");
    menuLink.className = "functies-menu-link";
    menuLink.href = "notities.html";
    menuLink.textContent = "Notities";
    if (notesLink?.getAttribute("aria-current") === "page") {
      menuLink.setAttribute("aria-current", "page");
    }

    const linksLink = document.createElement("a");
    linksLink.className = "functies-menu-link";
    linksLink.href = "links.html";
    linksLink.textContent = "Links";
    menu.append(summary, menuLink, linksLink);
    if (notesLink) {
      notesLink.replaceWith(menu);
    } else {
      navigation.append(menu);
    }

    document.addEventListener("click", (event) => {
      if (!menu.contains(event.target)) {
        menu.open = false;
      }
    });
  }

  const menu = navigation.querySelector(".functies-menu");
  if (!menu.querySelector('a[href="links.html"]')) {
    const linksLink = document.createElement("a");
    linksLink.className = "functies-menu-link";
    linksLink.href = "links.html";
    linksLink.textContent = "Links";
    menu.append(linksLink);
  }
  if (!menu.querySelector(".functies-thema-knop")) {
    const themeButton = document.createElement("button");
    themeButton.type = "button";
    themeButton.className = "functies-menu-link functies-thema-knop";
    themeButton.textContent = document.body.classList.contains("dark-mode")
      ? "Lichte modus"
      : "Donkere modus";
    themeButton.setAttribute(
      "aria-pressed",
      String(document.body.classList.contains("dark-mode")),
    );
    themeButton.addEventListener("click", themeToggle);
    menu.append(themeButton);
  }

  if (!document.querySelector("#functies-menu-styles")) {
    const style = document.createElement("style");
    style.id = "functies-menu-styles";
    style.textContent = `
      .dagen-navigatie { align-items: flex-start; }
      .functies-menu { position: relative; }
      .functies-menu summary { display: block; padding: 10px 14px; border: 1px solid #d6deea; border-radius: 8px; background: #fff; color: #183153; cursor: pointer; font-size: 14px; font-weight: 600; list-style: none; }
      .functies-menu summary::-webkit-details-marker { display: none; }
      .functies-menu summary::after { content: " ▾"; }
      .functies-menu[open] summary { background: #183153; color: #fff; }
      .functies-menu-link { position: absolute; top: calc(100% + 4px); left: 0; z-index: 30; display: block; min-width: 150px; padding: 10px 14px; border: 1px solid #d6deea; border-radius: 8px; background: #fff; color: #183153; box-shadow: 0 8px 24px rgb(24 49 83 / 14%); font-size: 14px; font-weight: 600; text-decoration: none; }
      .functies-menu-link + .functies-menu-link { top: calc(100% + 46px); }
      .functies-thema-knop { top: calc(100% + 88px) !important; width: 100%; text-align: left; cursor: pointer; font-family: inherit; }
      .functies-menu-link:hover, .functies-menu-link:focus-visible, .functies-menu-link[aria-current="page"] { background: #e8f1ff; }
    `;
    document.head.append(style);
  }
}

async function initializeNotesPage() {
  const status = document.querySelector("#notities-status");
  const loginPrompt = document.querySelector("#notities-aanmelden");
  const editor = document.querySelector("#notitie-form");
  const titleInput = document.querySelector("#notitie-titel");
  const contentInput = document.querySelector("#notitie-inhoud");
  const notesList = document.querySelector("#notities-lijst");
  const emptyState = document.querySelector("#notities-leeg");
  const newNoteButton = document.querySelector("#notitie-nieuw");
  const cancelButton = document.querySelector("#notitie-annuleren");
  const profileLink = document.querySelector(".notities-profiel-link");

  if (
    !status ||
    !loginPrompt ||
    !editor ||
    !titleInput ||
    !contentInput ||
    !notesList ||
    !emptyState ||
    !newNoteButton ||
    !cancelButton ||
    !profileLink
  ) {
    return;
  }

  try {
    if (!window.supabase?.createClient) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.onload = resolve;
        script.onerror = () =>
          reject(new Error("De Supabase-bibliotheek kon niet worden geladen."));
        document.head.append(script);
      });
    }
    if (!window.supabase?.createClient) {
      throw new Error("De Supabase-bibliotheek kon niet worden gestart.");
    }

    const client = window.supabase.createClient(
      supabaseConfig.url,
      supabaseConfig.publishableKey,
    );
    let user = null;
    let editingNoteId = null;
    let requestNumber = 0;

    function showStatus(message, isError = false) {
      status.textContent = message;
      status.dataset.state = isError ? "error" : "info";
    }

    function resetEditor() {
      editor.reset();
      editingNoteId = null;
      editor.querySelector("h2").textContent = "Nieuwe notitie";
      editor.querySelector('button[type="submit"]').textContent = "Notitie opslaan";
      cancelButton.hidden = true;
    }

    function renderNotes(notes) {
      notesList.replaceChildren();
      emptyState.hidden = notes.length > 0;

      notes.forEach((note) => {
        const card = document.createElement("article");
        card.className = "notitie-kaart";

        const title = document.createElement("h2");
        title.textContent = note.title;
        const content = document.createElement("p");
        content.className = "notitie-tekst";
        content.textContent = note.content;
        const date = document.createElement("time");
        date.className = "notitie-datum";
        date.dateTime = note.updated_at;
        date.textContent = `Laatst gewijzigd: ${new Date(
          note.updated_at,
        ).toLocaleString("nl-NL", {
          dateStyle: "medium",
          timeStyle: "short",
        })}`;

        const actions = document.createElement("div");
        actions.className = "notitie-acties";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "notitie-knop notitie-knop-secundair";
        editButton.textContent = "Bewerken";
        editButton.addEventListener("click", () => {
          editingNoteId = note.id;
          titleInput.value = note.title;
          contentInput.value = note.content;
          editor.querySelector("h2").textContent = "Notitie bewerken";
          editor.querySelector('button[type="submit"]').textContent =
            "Wijzigingen opslaan";
          cancelButton.hidden = false;
          editor.scrollIntoView({ behavior: "smooth", block: "start" });
          titleInput.focus();
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "notitie-knop notitie-knop-verwijderen";
        deleteButton.textContent = "Verwijderen";
        deleteButton.addEventListener("click", async () => {
          if (!window.confirm(`Notitie "${note.title}" verwijderen?`)) {
            return;
          }

          deleteButton.disabled = true;
          try {
            const result = await client
              .from("notes")
              .delete()
              .eq("id", note.id)
              .eq("user_id", user.id)
              .select("id")
              .maybeSingle();
            if (result.error) {
              throw result.error;
            }
            if (!result.data) {
              throw new Error(
                "De notitie is niet verwijderd. Controleer je account en de RLS-beveiligingsregels.",
              );
            }
            showStatus("Notitie verwijderd.");
            await loadNotes();
          } catch (error) {
            deleteButton.disabled = false;
            console.error("Notitie verwijderen is mislukt.", error);
            showStatus(`Notitie verwijderen is mislukt: ${error.message}`, true);
          }
        });

        actions.append(editButton, deleteButton);
        card.append(title, content, date, actions);
        notesList.append(card);
      });
    }

    async function loadNotes() {
      if (!user) {
        return;
      }

      const currentRequest = ++requestNumber;
      showStatus("Je notities laden...");
      const { data, error } = await client
        .from("notes")
        .select("id, user_id, title, content, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) {
        throw error;
      }
      if (currentRequest !== requestNumber) {
        return;
      }

      renderNotes(data || []);
      showStatus(
        data?.length
          ? `${data.length} ${data.length === 1 ? "notitie" : "notities"} geladen.`
          : "Je notities zijn geladen.",
      );
    }

    function updateSignedInState(signedInUser) {
      user = signedInUser;
      loginPrompt.hidden = Boolean(user);
      newNoteButton.hidden = !user;
      editor.hidden = true;
      notesList.hidden = !user;
      profileLink.hidden = !user;

      if (user) {
        updateProfileAvatar(profileLink, user);
        loadNotes().catch((error) => {
          console.error("Notities konden niet worden geladen.", error);
          showStatus(
            `Notities konden niet worden geladen: ${error.message}. Controleer of de tabel notes en de beveiligingsregels zijn aangemaakt.`,
            true,
          );
        });
      } else {
        requestNumber += 1;
        notesList.replaceChildren();
        emptyState.hidden = true;
        editor.hidden = true;
        showStatus("Log in via je agenda-account om je notities te bekijken.");
      }
    }

    newNoteButton.addEventListener("click", () => {
      resetEditor();
      editor.hidden = false;
      editor.scrollIntoView({ behavior: "smooth", block: "start" });
      titleInput.focus();
    });

    cancelButton.addEventListener("click", () => {
      resetEditor();
      editor.hidden = true;
    });

    editor.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!user) {
        showStatus("Log eerst in om een notitie op te slaan.", true);
        return;
      }

      const title = titleInput.value.trim();
      const content = contentInput.value.trim();
      if (!title) {
        titleInput.focus();
        showStatus("Geef je notitie een titel.", true);
        return;
      }

      const saveButton = editor.querySelector('button[type="submit"]');
      saveButton.disabled = true;
      const wasEditing = Boolean(editingNoteId);
      try {
        const noteValues = {
          user_id: user.id,
          title,
          content,
          updated_at: new Date().toISOString(),
        };
        const result = editingNoteId
          ? await client
              .from("notes")
              .update(noteValues)
              .eq("id", editingNoteId)
              .eq("user_id", user.id)
              .select("id")
              .maybeSingle()
          : await client.from("notes").insert(noteValues).select("id").single();
        if (result.error) {
          throw result.error;
        }
        if (editingNoteId && !result.data) {
          throw new Error(
            "De notitie is niet bijgewerkt. Controleer je account en de RLS-beveiligingsregels.",
          );
        }

        resetEditor();
        editor.hidden = true;
        showStatus(wasEditing ? "Notitie bijgewerkt." : "Notitie opgeslagen.");
        await loadNotes();
      } catch (error) {
        console.error("Notitie opslaan is mislukt.", error);
        showStatus(
          `Notitie opslaan is mislukt: ${error.message}. Controleer of de tabel notes en de beveiligingsregels zijn aangemaakt.`,
          true,
        );
      } finally {
        saveButton.disabled = false;
      }
    });

    client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(
        () => updateSignedInState(session?.user || null),
        0,
      );
    });
    const { data, error } = await client.auth.getSession();
    if (error) {
      throw error;
    }
    updateSignedInState(data.session?.user || null);
  } catch (error) {
    console.error("De notitiepagina kon niet worden gestart.", error);
    showStatus(`De notitiepagina kon niet worden gestart: ${error.message}`, true);
  }
}

async function initializeLinksPage() {
  const status = document.querySelector("#links-status");
  const loginPrompt = document.querySelector("#links-aanmelden");
  const editor = document.querySelector("#links-form");
  const titleInput = document.querySelector("#link-titel");
  const urlInput = document.querySelector("#link-url");
  const linksList = document.querySelector("#links-lijst");
  const emptyState = document.querySelector("#links-leeg");
  const newLinkButton = document.querySelector("#link-nieuw");
  const cancelButton = document.querySelector("#link-annuleren");
  const profileLink = document.querySelector(".links-profiel-link");

  if (
    !status ||
    !loginPrompt ||
    !editor ||
    !titleInput ||
    !urlInput ||
    !linksList ||
    !emptyState ||
    !newLinkButton ||
    !cancelButton ||
    !profileLink
  ) {
    return;
  }

  try {
    if (!window.supabase?.createClient) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.onload = resolve;
        script.onerror = () =>
          reject(new Error("De Supabase-bibliotheek kon niet worden geladen."));
        document.head.append(script);
      });
    }
    if (!window.supabase?.createClient) {
      throw new Error("De Supabase-bibliotheek kon niet worden gestart.");
    }

    const client = window.supabase.createClient(
      supabaseConfig.url,
      supabaseConfig.publishableKey,
    );
    let user = null;
    let editingLinkId = null;
    let requestNumber = 0;

    function showStatus(message, isError = false) {
      status.textContent = message;
      status.dataset.state = isError ? "error" : "info";
    }

    function resetEditor() {
      editor.reset();
      editingLinkId = null;
      editor.querySelector("h2").textContent = "Nieuwe link";
      editor.querySelector('button[type="submit"]').textContent =
        "Link opslaan";
      cancelButton.hidden = true;
    }

    function renderLinks(links) {
      linksList.replaceChildren();
      emptyState.hidden = links.length > 0;

      links.forEach((savedLink) => {
        const card = document.createElement("article");
        card.className = "links-kaart";
        const title = document.createElement("h2");
        title.textContent = savedLink.title;
        let safeUrl = "";
        try {
          const parsedUrl = new URL(savedLink.url);
          if (["http:", "https:"].includes(parsedUrl.protocol)) {
            safeUrl = parsedUrl.toString();
          }
        } catch {
          safeUrl = "";
        }
        const openLink = document.createElement("a");
        openLink.className = "links-adres";
        if (safeUrl) {
          openLink.href = safeUrl;
          openLink.target = "_blank";
          openLink.rel = "noopener noreferrer";
          openLink.textContent = safeUrl;
        } else {
          openLink.textContent = "Geen geldige website opgeslagen. Bewerk deze link om het adres aan te vullen.";
          openLink.setAttribute("aria-disabled", "true");
        }

        const actions = document.createElement("div");
        actions.className = "links-acties";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "links-knop links-knop-secundair";
        editButton.textContent = "Bewerken";
        editButton.addEventListener("click", () => {
          editingLinkId = savedLink.id;
          titleInput.value = savedLink.title;
          urlInput.value = safeUrl;
          editor.querySelector("h2").textContent = "Link bewerken";
          editor.querySelector('button[type="submit"]').textContent =
            "Wijzigingen opslaan";
          cancelButton.hidden = false;
          editor.hidden = false;
          editor.scrollIntoView({ behavior: "smooth", block: "start" });
          titleInput.focus();
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "links-knop links-knop-verwijderen";
        deleteButton.textContent = "Verwijderen";
        deleteButton.addEventListener("click", async () => {
          if (!window.confirm(`Link "${savedLink.title}" verwijderen?`)) {
            return;
          }

          deleteButton.disabled = true;
          try {
            const result = await client
              .from("user_links")
              .delete()
              .eq("id", savedLink.id)
              .eq("user_id", user.id)
              .select("id")
              .maybeSingle();
            if (result.error) {
              throw result.error;
            }
            if (!result.data) {
              throw new Error(
                "De link is niet verwijderd. Controleer je account en de RLS-beveiligingsregels.",
              );
            }
            showStatus("Link verwijderd.");
            await loadLinks();
          } catch (error) {
            deleteButton.disabled = false;
            console.error("Link verwijderen is mislukt.", error);
            showStatus(`Link verwijderen is mislukt: ${error.message}`, true);
          }
        });

        actions.append(editButton, deleteButton);
        card.append(title, openLink, actions);
        linksList.append(card);
      });
    }

    async function loadLinks() {
      if (!user) {
        return;
      }

      const currentRequest = ++requestNumber;
      showStatus("Je links laden...");
      const { data, error } = await client
        .from("user_links")
        .select("id, user_id, title, url, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        throw error;
      }
      if (currentRequest !== requestNumber) {
        return;
      }

      const savedLinks = data || [];
      renderLinks(savedLinks);
      const invalidUrls = savedLinks.filter((savedLink) => {
        try {
          return !["http:", "https:"].includes(new URL(savedLink.url).protocol);
        } catch {
          return true;
        }
      }).length;
      showStatus(
        invalidUrls
          ? `${savedLinks.length} ${savedLinks.length === 1 ? "link geladen" : "links geladen"}. ${invalidUrls} link(s) heeft geen geldig webadres; bewerk die link om het adres aan te vullen.`
          : savedLinks.length
            ? `${savedLinks.length} ${savedLinks.length === 1 ? "link" : "links"} geladen.`
            : "Je links zijn geladen.",
        invalidUrls > 0,
      );
    }

    function updateSignedInState(signedInUser) {
      user = signedInUser;
      loginPrompt.hidden = Boolean(user);
      newLinkButton.hidden = !user;
      linksList.hidden = !user;
      profileLink.hidden = !user;
      editor.hidden = true;

      if (user) {
        updateProfileAvatar(profileLink, user);
        loadLinks().catch((error) => {
          console.error("Links konden niet worden geladen.", error);
          showStatus(
            `Links konden niet worden geladen: ${error.message}. Controleer of de tabel user_links en de beveiligingsregels zijn aangemaakt.`,
            true,
          );
        });
      } else {
        requestNumber += 1;
        linksList.replaceChildren();
        emptyState.hidden = true;
        showStatus("Log in via je agenda-account om je links te bekijken.");
      }
    }

    newLinkButton.addEventListener("click", () => {
      resetEditor();
      editor.hidden = false;
      editor.scrollIntoView({ behavior: "smooth", block: "start" });
      titleInput.focus();
    });

    cancelButton.addEventListener("click", () => {
      resetEditor();
      editor.hidden = true;
    });

    editor.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!user) {
        showStatus("Log eerst in om een link op te slaan.", true);
        return;
      }

      const title = titleInput.value.trim();
      let parsedUrl;
      try {
        parsedUrl = new URL(urlInput.value.trim());
      } catch {
        showStatus("Vul een geldige volledige link in.", true);
        urlInput.focus();
        return;
      }

      if (!title) {
        showStatus("Geef je link een naam.", true);
        titleInput.focus();
        return;
      }
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        showStatus("Gebruik een link die begint met http:// of https://.", true);
        urlInput.focus();
        return;
      }

      const saveButton = editor.querySelector('button[type="submit"]');
      saveButton.disabled = true;
      try {
        const values = {
          user_id: user.id,
          title,
          url: parsedUrl.toString(),
        };
        const result = editingLinkId
          ? await client
              .from("user_links")
              .update(values)
              .eq("id", editingLinkId)
              .eq("user_id", user.id)
              .select("id")
              .maybeSingle()
          : await client
              .from("user_links")
              .insert(values)
              .select("id")
              .single();
        if (result.error) {
          throw result.error;
        }
        if (editingLinkId && !result.data) {
          throw new Error(
            "De link is niet bijgewerkt. Controleer je account en de RLS-beveiligingsregels.",
          );
        }

        const wasEditing = Boolean(editingLinkId);
        resetEditor();
        editor.hidden = true;
        showStatus(wasEditing ? "Link bijgewerkt." : "Link opgeslagen.");
        await loadLinks();
      } catch (error) {
        console.error("Link opslaan is mislukt.", error);
        showStatus(
          `Link opslaan is mislukt: ${error.message}. Controleer of de tabel user_links en de beveiligingsregels zijn aangemaakt.`,
          true,
        );
      } finally {
        saveButton.disabled = false;
      }
    });

    client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(
        () => updateSignedInState(session?.user || null),
        0,
      );
    });
    const { data, error } = await client.auth.getSession();
    if (error) {
      throw error;
    }
    updateSignedInState(data.session?.user || null);
  } catch (error) {
    console.error("De linkpagina kon niet worden gestart.", error);
    showStatus(`De linkpagina kon niet worden gestart: ${error.message}`, true);
  }
}

setupFunctionsNavigation();

if (
  isIndexPage &&
  !isManualMondaySelection &&
  !hasManualWeekSelection &&
  !hasManualViewSelection &&
  todaysPage !== "index.html"
) {
  window.location.replace(todaysPage);
} else if (currentPage.toLowerCase() === "profiel.html") {
  initializeProfilePage();
} else if (currentPage.toLowerCase() === "notities.html") {
  initializeNotesPage();
} else if (currentPage.toLowerCase() === "links.html") {
  initializeLinksPage();
} else {
  const agenda = document.querySelector(".agenda-container");
  const timeIndicator = document.querySelector("#tijdswijzer");

  if (agenda && timeIndicator) {
    const list = agenda.querySelector("ul");
    const status = document.createElement("p");
    const weekdayFiles = pagesByWeekday;
    const dayLists = new Map();
    const dayPanels = new Map();
    const dayIndicators = new Map();
    const orderedWeekdays = weekdayNames.slice(1).concat(weekdayNames[0]);
    const selectedDay = { value: weekdayNames[currentPageWeekday] };
    const calendarFilters = { search: "", category: "" };
    let supportsRepeatDays = true;
    let supportsCategories = true;
    const requestedMonth = /^(\d{4})-(\d{2})$/.exec(
      new URLSearchParams(window.location.search).get("maand") || "",
    );
    const parsedMonth = requestedMonth
      ? new Date(Number(requestedMonth[1]), Number(requestedMonth[2]) - 1, 1)
      : null;
    let displayedMonthStart =
      parsedMonth &&
      parsedMonth.getFullYear() === Number(requestedMonth[1]) &&
      parsedMonth.getMonth() === Number(requestedMonth[2]) - 1
        ? parsedMonth
        : new Date(displayedWeekStart.getFullYear(), displayedWeekStart.getMonth(), 1);
    let isMonthView =
      new URLSearchParams(window.location.search).get("weergave") === "maand";
    let monthEntries = [];
    let rerenderCurrentWeek = updateWeekDates;
    let rerenderMonth = () => {};
    const weekOverview = document.createElement("div");
    weekOverview.className = "agenda-week-overview";
    weekOverview.id = "agenda-week-overview";
    weekOverview.setAttribute("aria-label", "Weekplanning");
    const filterToolbar = document.createElement("div");
    filterToolbar.className = "agenda-filters";
    const searchLabel = document.createElement("label");
    searchLabel.className = "agenda-filter-field agenda-search-field";
    searchLabel.textContent = "Zoeken";
    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = "Zoek een afspraak...";
    searchInput.setAttribute("aria-label", "Zoek in afspraken");
    searchLabel.append(searchInput);
    const categoryLabel = document.createElement("label");
    categoryLabel.className = "agenda-filter-field";
    categoryLabel.textContent = "Categorie";
    const categoryFilter = document.createElement("select");
    categoryFilter.setAttribute("aria-label", "Filter op categorie");
    const allCategoriesOption = document.createElement("option");
    allCategoriesOption.value = "";
    allCategoriesOption.textContent = "Alle categorieën";
    categoryFilter.append(allCategoriesOption);
    categoryLabel.append(categoryFilter);
    filterToolbar.append(searchLabel, categoryLabel);
    const weekNavigation = document.createElement("div");
    weekNavigation.className = "agenda-week-navigation";
    const previousWeekButton = document.createElement("button");
    previousWeekButton.type = "button";
    previousWeekButton.textContent = "← Vorige week";
    previousWeekButton.setAttribute("aria-label", "Vorige week");
    const weekLabel = document.createElement("strong");
    weekLabel.className = "agenda-week-label";
    const currentWeekButton = document.createElement("button");
    currentWeekButton.type = "button";
    currentWeekButton.textContent = "Vandaag";
    currentWeekButton.setAttribute("aria-label", "Ga naar vandaag");
    const nextWeekButton = document.createElement("button");
    nextWeekButton.type = "button";
    nextWeekButton.textContent = "Volgende week →";
    nextWeekButton.setAttribute("aria-label", "Volgende week");
    weekNavigation.append(
      previousWeekButton,
      weekLabel,
      currentWeekButton,
      nextWeekButton,
    );
    const monthToggleButton = document.createElement("button");
    monthToggleButton.type = "button";
    const monthNavigation = document.createElement("div");
    monthNavigation.className = "agenda-month-navigation";
    const previousMonthButton = document.createElement("button");
    previousMonthButton.type = "button";
    previousMonthButton.textContent = "← Vorige maand";
    previousMonthButton.setAttribute("aria-label", "Vorige maand");
    const monthLabel = document.createElement("strong");
    monthLabel.className = "agenda-month-label";
    const currentMonthButton = document.createElement("button");
    currentMonthButton.type = "button";
    currentMonthButton.textContent = "Deze maand";
    currentMonthButton.setAttribute("aria-label", "Ga naar deze maand");
    const nextMonthButton = document.createElement("button");
    nextMonthButton.type = "button";
    nextMonthButton.textContent = "Volgende maand →";
    nextMonthButton.setAttribute("aria-label", "Volgende maand");
    const weekToggleButton = document.createElement("button");
    weekToggleButton.type = "button";
    monthNavigation.append(
      previousMonthButton,
      monthLabel,
      currentMonthButton,
      nextMonthButton,
      weekToggleButton,
    );
    weekNavigation.append(monthToggleButton);
    const monthOverview = document.createElement("div");
    monthOverview.className = "agenda-month-overview";
    monthOverview.id = "agenda-month-overview";
    monthOverview.setAttribute("aria-label", "Maandoverzicht");
    monthOverview.setAttribute("aria-live", "polite");
    monthOverview.setAttribute("aria-busy", "false");
    monthToggleButton.setAttribute("aria-controls", monthOverview.id);
    weekToggleButton.setAttribute("aria-controls", weekOverview.id);

    const dayNavigation = document.querySelector(".dagen-navigatie");
    if (dayNavigation) {
      Array.from(dayNavigation.querySelectorAll("a")).forEach((link) => {
        const url = new URL(link.href, window.location.href);
        const fileName = url.pathname.split("/").pop().toLowerCase();
        if (weekdayFiles.includes(fileName)) {
          link.remove();
        }
      });
    }

    orderedWeekdays.forEach((day) => {
      const panel = document.createElement("section");
      panel.className = "agenda-day-panel";
      panel.id = `agenda-panel-${day}`;
      panel.dataset.day = day;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute(
        "aria-label",
        day.charAt(0).toLocaleUpperCase("nl") + day.slice(1),
      );

      const heading = document.createElement("h2");
      heading.className = "agenda-day-heading";
      heading.textContent = day.charAt(0).toLocaleUpperCase("nl") + day.slice(1);

      const indicator = document.createElement("div");
      indicator.className = "agenda-time-indicator";
      indicator.setAttribute("aria-hidden", "true");

      const dayList =
        day === weekdayNames[currentPageWeekday]
          ? list
          : document.createElement("ul");
      panel.append(heading, indicator, dayList);
      weekOverview.append(panel);
      dayLists.set(day, dayList);
      dayPanels.set(day, panel);
      dayIndicators.set(day, indicator);
    });

    const weekStyle = document.createElement("style");
    weekStyle.textContent = `
      body { width: min(100% - 32px, 1600px); max-width: none; }
      .dagen-navigatie { align-items: center; }
      .agenda-week-navigation { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px; margin: 0 0 16px; }
      .agenda-week-navigation button { min-height: 40px; padding: 8px 12px; border: 1px solid #d6deea; border-radius: 8px; background: #fff; color: #183153; cursor: pointer; font: inherit; font-weight: 600; }
      .agenda-week-navigation button:hover, .agenda-week-navigation button:focus-visible { background: #183153; color: #fff; }
      .agenda-week-navigation button:disabled { cursor: not-allowed; opacity: .55; }
      .agenda-week-label { min-width: 190px; color: #183153; text-align: center; }
      .agenda-week-overview { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 12px; }
      .agenda-day-panel { position: relative; min-width: 0; padding: 12px; border: 1px solid #d6deea; border-radius: 10px; background: #fff; }
      .agenda-day-heading { margin: 0 0 12px; color: #183153; font-size: 16px; }
      .agenda-day-panel ul { min-width: 0; }
      .agenda-day-panel li { overflow-wrap: anywhere; padding: 10px; font-size: 13px; }
      .agenda-filters { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 16px; }
      .agenda-filter-field { display: grid; min-width: 160px; flex: 1; gap: 5px; color: #334155; font-size: 13px; font-weight: 600; }
      .agenda-filter-field input, .agenda-filter-field select { width: 100%; min-height: 42px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #1f2937; font: inherit; font-size: 16px; }
      .agenda-search-field { flex-basis: 240px; }
      .agenda-category-badge { display: inline-block; margin: 5px 5px 0 0; padding: 2px 6px; border-radius: 999px; background: #e8f1ff; color: #183153; font-size: 11px; }
      .agenda-time-indicator { position: absolute; z-index: 10; top: 0; right: 8px; left: 8px; height: 2px; background: #e5484d; visibility: hidden; pointer-events: none; }
      .agenda-time-indicator.is-visible { visibility: visible; }
      .agenda-month-navigation { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px; margin: 0 0 16px; }
      .agenda-month-navigation button { min-height: 40px; padding: 8px 12px; border: 1px solid #d6deea; border-radius: 8px; background: #fff; color: #183153; cursor: pointer; font: inherit; font-weight: 600; }
      .agenda-month-navigation button:hover, .agenda-month-navigation button:focus-visible { background: #183153; color: #fff; }
      .agenda-month-label { min-width: 190px; color: #183153; text-align: center; }
      .agenda-month-overview { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
      .agenda-month-weekday { padding: 8px 4px; color: #526174; font-size: 13px; font-weight: 700; text-align: center; }
      .agenda-month-cell { display: flex; min-width: 0; min-height: 108px; flex-direction: column; align-items: stretch; gap: 5px; padding: 8px; border: 1px solid #d6deea; border-radius: 8px; background: #fff; color: #1f2937; cursor: pointer; font: inherit; text-align: left; }
      .agenda-month-cell:hover, .agenda-month-cell:focus-visible { border-color: #3978c5; outline: 2px solid rgb(57 120 197 / 25%); }
      .agenda-month-cell.is-outside-month { background: #f5f8fc; color: #64748b; }
      .agenda-month-cell.is-today { border-color: #3978c5; box-shadow: inset 0 0 0 1px #3978c5; }
      .agenda-month-date { font-size: 14px; font-weight: 700; }
      .agenda-month-events { display: grid; min-width: 0; gap: 3px; }
      .agenda-month-event { overflow: hidden; padding: 3px 4px; border-radius: 4px; background: #e8f1ff; color: #183153; font-size: 11px; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
      .agenda-month-more { color: #526174; font-size: 11px; }
      .agenda-month-navigation[hidden], .agenda-week-navigation[hidden], .agenda-week-overview[hidden], .agenda-month-overview[hidden] { display: none; }
      body.dark-mode .agenda-month-cell { border-color: #374151; background: #1f2937; color: #e5e7eb; }
      body.dark-mode .agenda-month-cell.is-outside-month { background: #111827; color: #9ca3af; }
      body.dark-mode .agenda-month-weekday, body.dark-mode .agenda-month-more { color: #cbd5e1; }
      body.dark-mode .agenda-month-event { background: #273449; color: #e5e7eb; }
      body.dark-mode .agenda-filter-field { color: #d1d5db; }
      body.dark-mode .agenda-filter-field input, body.dark-mode .agenda-filter-field select { border-color: #4b5563; background: #111827; color: #f3f4f6; }
      body.dark-mode .agenda-category-badge { background: #273449; color: #e5e7eb; }
      @media (max-width: 900px) {
        body { width: 100%; padding: 16px; }
        .agenda-week-navigation { gap: 6px; }
        .agenda-week-navigation button { padding: 8px; font-size: 13px; }
        .agenda-filters { gap: 8px; }
        .agenda-filter-field { min-width: 120px; }
        .agenda-month-navigation { gap: 6px; }
        .agenda-month-navigation button { padding: 8px; font-size: 13px; }
        .agenda-week-label { order: -1; flex-basis: 100%; }
        .agenda-month-label { order: -1; flex-basis: 100%; }
        .agenda-week-overview { grid-auto-columns: 100%; grid-auto-flow: column; grid-template-columns: none; gap: 0; overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x mandatory; scrollbar-width: none; }
        .agenda-week-overview::-webkit-scrollbar { display: none; }
        .agenda-day-panel { scroll-snap-align: start; }
        .agenda-day-panel li { font-size: 15px; }
      }
      @media (max-width: 520px) {
        .agenda-month-overview { gap: 3px; }
        .agenda-month-weekday { padding: 6px 1px; font-size: 11px; }
        .agenda-month-cell { min-height: 64px; gap: 3px; padding: 4px; border-radius: 6px; }
        .agenda-month-date { font-size: 12px; }
        .agenda-month-events { gap: 2px; }
        .agenda-month-event { padding: 2px; font-size: 9px; }
        .agenda-month-more { font-size: 9px; }
      }
    `;
    document.head.append(weekStyle);

    agenda.insertBefore(weekNavigation, timeIndicator);
    agenda.insertBefore(monthNavigation, timeIndicator);
    agenda.insertBefore(status, timeIndicator);
    agenda.insertBefore(filterToolbar, timeIndicator);
    agenda.insertBefore(monthOverview, timeIndicator);
    agenda.insertBefore(weekOverview, timeIndicator);
    timeIndicator.remove();
    selectDay(selectedDay.value);
    updateWeekDates();
    if (window.matchMedia("(max-width: 900px)").matches) {
      weekOverview.scrollLeft = dayPanels.get(selectedDay.value).offsetLeft;
    }

    function getDateForDay(day) {
      const date = new Date(displayedWeekStart);
      date.setDate(
        date.getDate() + orderedWeekdays.indexOf(day),
      );
      return date;
    }

    function updateWeekDates() {
      const endDate = new Date(displayedWeekStart);
      endDate.setDate(endDate.getDate() + 6);
      const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
        day: "numeric",
        month: "long",
      });
      weekLabel.textContent = `${dateFormatter.format(displayedWeekStart)} – ${dateFormatter.format(endDate)}`;
      dayPanels.forEach((panel, day) => {
        const heading = panel.querySelector(".agenda-day-heading");
        const dayDate = dateFormatter.format(getDateForDay(day));
        heading.textContent =
          `${day.charAt(0).toLocaleUpperCase("nl") + day.slice(1)} ${dayDate}`;
      });
    }

    function matchesCalendarFilters(entry) {
      const search = calendarFilters.search.toLocaleLowerCase("nl");
      const matchesSearch =
        !search ||
        `${entry.title} ${entry.category || ""}`
          .toLocaleLowerCase("nl")
          .includes(search);
      return (
        matchesSearch &&
        (!calendarFilters.category ||
          entry.category === calendarFilters.category)
      );
    }

    function updateCategoryOptions(entries) {
      const previousValue = categoryFilter.value;
      const categories = [
        ...new Set(
          entries
            .map((entry) => entry.category)
            .filter((category) => typeof category === "string" && category),
        ),
      ].sort((first, second) => first.localeCompare(second, "nl"));
      categoryFilter.replaceChildren(allCategoriesOption);
      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.append(option);
      });
      if (categories.includes(previousValue)) {
        categoryFilter.value = previousValue;
      } else {
        categoryFilter.value = "";
        calendarFilters.category = "";
      }
    }

    function updateCalendarFilters() {
      calendarFilters.search = searchInput.value.trim();
      calendarFilters.category = categoryFilter.value;
      rerenderCurrentWeek();
    }

    searchInput.addEventListener("input", updateCalendarFilters);
    categoryFilter.addEventListener("change", updateCalendarFilters);

    function renderMonthOverview(entries = monthEntries) {
      monthEntries = entries;
      const filteredEntries = entries.filter(matchesCalendarFilters);
      monthOverview.replaceChildren();
      const shortWeekdays = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
      shortWeekdays.forEach((weekday) => {
        const label = document.createElement("span");
        label.className = "agenda-month-weekday";
        label.textContent = weekday;
        label.setAttribute("aria-hidden", "true");
        monthOverview.append(label);
      });

      const year = displayedMonthStart.getFullYear();
      const month = displayedMonthStart.getMonth();
      monthLabel.textContent = new Intl.DateTimeFormat("nl-BE", {
        month: "long",
        year: "numeric",
      }).format(displayedMonthStart);
      const firstDate = new Date(year, month, 1);
      const leadingDays = (firstDate.getDay() + 6) % 7;
      const dayCount = new Date(year, month + 1, 0).getDate();
      const cellCount = Math.ceil((leadingDays + dayCount) / 7) * 7;
      const today = formatLocalDate(new Date());
      const dateLabel = new Intl.DateTimeFormat("nl-BE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const monthStartLabel = new Intl.DateTimeFormat("nl-BE", {
        month: "long",
        year: "numeric",
      }).format(displayedMonthStart);

      for (let index = 0; index < cellCount; index += 1) {
        const date = new Date(year, month, index - leadingDays + 1);
        const dateKey = formatLocalDate(date);
        const dayName = weekdayNames[date.getDay()];
        const weekStart = formatLocalDate(getWeekStart(date));
        const dayItems = filteredEntries
          .filter((entry) => {
            const repeatPattern = entry.repeatPattern || "weekly";
            if (
              entry.weekStart &&
              entry.weekStart !== weekStart
            ) {
              return false;
            }
            if (repeatPattern === "daily") {
              return true;
            }
            if (repeatPattern === "weekly") {
              const repeatDays =
                Array.isArray(entry.repeatDays) && entry.repeatDays.length
                  ? entry.repeatDays
                  : [entry.day];
              return repeatDays.includes(dayName);
            }
            return entry.day === dayName;
          })
          .sort(
            (first, second) =>
              (first.time?.start ?? 0) - (second.time?.start ?? 0) ||
              (first.rowNumber ?? 0) - (second.rowNumber ?? 0),
          );
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "agenda-month-cell";
        cell.dataset.date = dateKey;
        if (date.getMonth() !== month) {
          cell.classList.add("is-outside-month");
        }
        if (dateKey === today) {
          cell.classList.add("is-today");
        }

        const number = document.createElement("span");
        number.className = "agenda-month-date";
        number.textContent = String(date.getDate());
        const eventContainer = document.createElement("span");
        eventContainer.className = "agenda-month-events";
        dayItems.slice(0, 2).forEach((entry) => {
          const eventLabel = document.createElement("span");
          eventLabel.className = "agenda-month-event";
          const startText =
            entry.startText ||
            (entry.time ? formatTime(entry.time.start) : "");
          eventLabel.textContent = [
            startText,
            entry.category ? `[${entry.category}]` : "",
            entry.title,
          ]
            .filter(Boolean)
            .join(" ");
          eventContainer.append(eventLabel);
        });
        if (dayItems.length > 2) {
          const more = document.createElement("span");
          more.className = "agenda-month-more";
          more.textContent = `+${dayItems.length - 2} meer`;
          eventContainer.append(more);
        }
        const eventSummary = dayItems.length
          ? `: ${dayItems.map((entry) => entry.title).join(", ")}`
          : ": geen afspraken";
        cell.setAttribute(
          "aria-label",
          `${dateLabel.format(date)}${eventSummary}. Toon deze week.`,
        );
        cell.append(number, eventContainer);
        cell.addEventListener("click", () => {
          displayedWeekStart = getWeekStart(date);
          selectedDay.value = dayName;
          updateWeekDates();
          selectDay(dayName);
          setCalendarView(false);
          rerenderCurrentWeek();
          weekOverview.scrollLeft =
            dayPanels.get(dayName).offsetLeft;
        });
        monthOverview.append(cell);
      }

      monthOverview.setAttribute(
        "aria-label",
        `Maandoverzicht ${monthStartLabel}`,
      );
      monthOverview.setAttribute("aria-busy", "false");
    }

    function setCalendarView(showMonth, updateUrl = true) {
      isMonthView = showMonth;
      weekNavigation.hidden = showMonth;
      weekOverview.hidden = showMonth;
      monthNavigation.hidden = !showMonth;
      monthOverview.hidden = !showMonth;
      monthToggleButton.textContent = "Maandoverzicht";
      weekToggleButton.textContent = "Weekoverzicht";
      if (updateUrl) {
        const url = new URL(window.location.href);
        if (showMonth) {
          url.searchParams.set("weergave", "maand");
          url.searchParams.set(
            "maand",
            `${displayedMonthStart.getFullYear()}-${String(displayedMonthStart.getMonth() + 1).padStart(2, "0")}`,
          );
        } else {
          url.searchParams.delete("weergave");
          url.searchParams.delete("maand");
          url.searchParams.set("week", formatLocalDate(displayedWeekStart));
        }
        window.history.replaceState({}, "", url);
      }
      if (showMonth) {
        renderMonthOverview();
      } else {
        selectDay(selectedDay.value);
        if (window.matchMedia("(max-width: 900px)").matches) {
          weekOverview.scrollLeft =
            dayPanels.get(selectedDay.value).offsetLeft;
        }
      }
    }

    function changeMonth(offset) {
      displayedMonthStart = new Date(
        displayedMonthStart.getFullYear(),
        displayedMonthStart.getMonth() + offset,
        1,
      );
      const url = new URL(window.location.href);
      url.searchParams.set("weergave", "maand");
      url.searchParams.set(
        "maand",
        `${displayedMonthStart.getFullYear()}-${String(displayedMonthStart.getMonth() + 1).padStart(2, "0")}`,
      );
      window.history.replaceState({}, "", url);
      renderMonthOverview();
    }

    monthToggleButton.addEventListener("click", () => {
      displayedMonthStart = new Date(
        displayedWeekStart.getFullYear(),
        displayedWeekStart.getMonth(),
        1,
      );
      setCalendarView(true);
    });
    weekToggleButton.addEventListener("click", () => setCalendarView(false));
    previousMonthButton.addEventListener("click", () => changeMonth(-1));
    nextMonthButton.addEventListener("click", () => changeMonth(1));
    currentMonthButton.addEventListener("click", () => {
      const now = new Date();
      displayedMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const url = new URL(window.location.href);
      url.searchParams.delete("maand");
      url.searchParams.set("weergave", "maand");
      window.history.replaceState({}, "", url);
      renderMonthOverview();
    });

    renderMonthOverview([]);
    setCalendarView(isMonthView, false);

    function changeWeek(offset) {
      displayedWeekStart = new Date(displayedWeekStart);
      displayedWeekStart.setDate(displayedWeekStart.getDate() + offset * 7);
      const url = new URL(window.location.href);
      url.searchParams.set("week", formatLocalDate(displayedWeekStart));
      window.history.replaceState({}, "", url);
      updateWeekDates();
      rerenderCurrentWeek();
    }

    previousWeekButton.addEventListener("click", () => changeWeek(-1));
    nextWeekButton.addEventListener("click", () => changeWeek(1));
    currentWeekButton.addEventListener("click", () => {
      const today = new Date();
      displayedWeekStart = getWeekStart(today);
      selectedDay.value = weekdayNames[today.getDay()];
      const url = new URL(window.location.href);
      url.searchParams.delete("week");
      url.searchParams.set("dag", selectedDay.value);
      window.history.replaceState({}, "", url);
      updateWeekDates();
      selectDay(selectedDay.value);
      rerenderCurrentWeek();
      if (window.matchMedia("(max-width: 900px)").matches) {
        weekOverview.scrollLeft =
          dayPanels.get(selectedDay.value).offsetLeft;
      }
    });

    function selectDay(day) {
      selectedDay.value = day;
      dayPanels.forEach((panel, panelDay) => {
        panel.setAttribute(
          "aria-hidden",
          String(
            window.matchMedia("(max-width: 900px)").matches &&
              panelDay !== day,
          ),
        );
      });
      const daySelect = document.querySelector(
        '.agenda-item-form select[name="day"]',
      );
      const itemId = document.querySelector(
        '.agenda-item-form input[name="id"]',
      );
      if (daySelect && !itemId?.value) {
        daySelect.value = day;
      }
    }

    let scrollUpdateTimeout;
    weekOverview.addEventListener("scroll", () => {
      window.clearTimeout(scrollUpdateTimeout);
      scrollUpdateTimeout = window.setTimeout(() => {
        if (!window.matchMedia("(max-width: 900px)").matches) {
          return;
        }
        const overviewLeft = weekOverview.getBoundingClientRect().left;
        const closestPanel = Array.from(dayPanels.entries()).reduce(
          (closest, [day, panel]) => {
            const distance = Math.abs(
              panel.getBoundingClientRect().left - overviewLeft,
            );
            return distance < closest.distance
              ? { day, distance }
              : closest;
          },
          { day: selectedDay.value, distance: Number.POSITIVE_INFINITY },
        );
        selectDay(closestPanel.day);
      }, 80);
    });

    const timeRangePattern =
      /^(\d{1,2})[:.-](\d{2})(?:\s*(am|pm))?(?:\s*[-–—]\s*(\d{1,2})[:.-](\d{2})(?:\s*(am|pm))?)?$/i;
    const statusStyles = {
      margin: "0 0 12px",
      color: "#526174",
      fontSize: "14px",
    };

    status.id = "agenda-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    Object.assign(status.style, statusStyles);
    function parseTime(value) {
      const match = String(value ?? "")
        .trim()
        .match(timeRangePattern);
      if (!match) {
        return null;
      }

      function toMinutes(hourText, minuteText, meridiem) {
        let hour = Number(hourText);
        const minute = Number(minuteText);

        if (minute > 59) {
          return null;
        }

        if (meridiem) {
          if (hour < 1 || hour > 12) {
            return null;
          }
          hour = (hour % 12) + (meridiem.toLowerCase() === "pm" ? 12 : 0);
        } else if (hour > 23) {
          return null;
        }

        return hour * 60 + minute;
      }

      const start = toMinutes(match[1], match[2], match[3]);
      const end =
        match[4] === undefined ? null : toMinutes(match[4], match[5], match[6]);

      if (start === null || (match[4] !== undefined && end === null)) {
        return null;
      }

      let normalizedEnd = end;
      if (normalizedEnd !== null && normalizedEnd <= start) {
        normalizedEnd += 24 * 60;
      }

      return { start, end: normalizedEnd };
    }

    function normalizeDay(value) {
      const day = String(value ?? "")
        .trim()
        .toLocaleLowerCase("nl")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const englishDays = {
        sunday: "zondag",
        monday: "maandag",
        tuesday: "dinsdag",
        wednesday: "woensdag",
        thursday: "donderdag",
        friday: "vrijdag",
        saturday: "zaterdag",
      };

      return englishDays[day] || day;
    }

    function readCell(row, index) {
      const cell = row?.c?.[index];
      return cell?.f !== undefined && cell.f !== "" ? cell.f : (cell?.v ?? "");
    }

    function extractEntries(response) {
      if (response.status !== "ok" || !response.table?.rows) {
        throw new Error(
          response.errors?.[0]?.detailed_message || "Ongeldige sheet-respons.",
        );
      }

      const rows = response.table.rows;
      const firstRow = rows[0];
      const labels = response.table.cols.map((column) =>
        String(column.label || "")
          .trim()
          .toLocaleLowerCase("nl"),
      );
      const hasColumnLabels = labels.some(Boolean);
      const headers = hasColumnLabels
        ? labels
        : (firstRow?.c || []).map((cell) =>
            String(cell?.v ?? "")
              .trim()
              .toLocaleLowerCase("nl"),
          );
      const dataRows = hasColumnLabels ? rows : rows.slice(1);
      const columnIndex = (names) =>
        headers.findIndex((header) => names.includes(header));
      const timeIndex = columnIndex(["uur", "tijd"]);
      const titleIndex = columnIndex(["titel", "tittel", "activiteit"]);
      const colorIndex = columnIndex(["kleur", "color"]);
      const categoryIndex = columnIndex(["categorie", "category"]);
      const dayIndex = columnIndex(["dag", "day"]);
      const endTimeIndex = columnIndex(["eindtijd", "einduur", "end time"]);

      if ([timeIndex, titleIndex, dayIndex].some((index) => index < 0)) {
        throw new Error(
          "De sheet moet kolommen `uur`, `titel` (of `tittel`) en `dag` bevatten.",
        );
      }

      const skippedRows = [];
      const entries = dataRows
        .map((row, index) => {
          const rawTime = readCell(row, timeIndex);
          const entry = {
            time: parseTime(rawTime),
            endTime: parseTime(readCell(row, endTimeIndex))?.start ?? null,
            title: String(readCell(row, titleIndex)).trim(),
            color: String(readCell(row, colorIndex)).trim(),
            category: String(readCell(row, categoryIndex)).trim(),
            day: normalizeDay(readCell(row, dayIndex)),
            rowNumber: index + 2,
          };

          if (
            !entry.time ||
            !entry.title ||
            !weekdayNames.includes(entry.day)
          ) {
            skippedRows.push({
              rowNumber: entry.rowNumber,
              time: String(rawTime).trim(),
              reason: !entry.time
                ? "ongeldige begintijd"
                : !entry.title
                  ? "titel ontbreekt"
                  : "onbekende dag",
            });
            return null;
          }

          return entry;
        })
        .filter(Boolean)
        .sort(
          (first, second) =>
            first.time.start - second.time.start ||
            first.rowNumber - second.rowNumber,
        );

      return { entries, skippedRows };
    }

    function getEndTime(entry, nextEntry) {
      if (entry.endTime !== null) {
        return entry.endTime <= entry.time.start
          ? entry.endTime + 24 * 60
          : entry.endTime;
      }

      if (entry.time.end !== null) {
        return entry.time.end;
      }

      if (nextEntry && nextEntry.time.start > entry.time.start) {
        return nextEntry.time.start;
      }

      return entry.time.start < 22 * 60 ? 22 * 60 : entry.time.start + 30;
    }

    function formatTime(minutes) {
      const normalizedMinutes = minutes % (24 * 60);
      const hours = Math.floor(normalizedMinutes / 60);
      const remainder = normalizedMinutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
    }

    function applyColor(item, value) {
      const normalized = value.toLocaleLowerCase("nl");
      const color = dutchColors[normalized] || value;

      if (!window.CSS?.supports("color", color)) {
        return false;
      }

      item.style.borderLeftColor = color;
      item.style.backgroundColor = window.CSS.supports(
        "background-color",
        `color-mix(in srgb, ${color} 15%, white)`,
      )
        ? `color-mix(in srgb, ${color} 15%, white)`
        : color;
      return true;
    }

    function showSheetEntries({ entries, skippedRows }) {
      rerenderCurrentWeek = () => {
        updateWeekDates();
        showSheetEntries({ entries, skippedRows });
      };
      updateCategoryOptions(entries);
      renderMonthOverview(entries);
      if (!entries.length) {
        status.textContent = skippedRows.length
          ? `Geen geldige planningsregels gevonden. Rij ${skippedRows[0].rowNumber}: ${skippedRows[0].reason} (${skippedRows[0].time || "leeg"}). Gebruik bijvoorbeeld 08:00.`
          : "Er staan nog geen planningsregels in de spreadsheet.";
        return;
      }

      orderedWeekdays.forEach((day) => {
        const dayEntries = entries
          .filter(
            (entry) =>
              matchesCalendarFilters(entry) &&
              entry.day === day &&
              (!entry.weekStart ||
                entry.weekStart === formatLocalDate(displayedWeekStart)),
          )
          .sort(
          (first, second) =>
            first.time.start - second.time.start ||
            first.rowNumber - second.rowNumber,
          );
        const dayList = dayLists.get(day);
        dayList.replaceChildren();

        dayEntries.forEach((entry, index) => {
          const nextEntry = dayEntries[index + 1];
          const end = getEndTime(entry, nextEntry);
          const item = document.createElement("li");

          item.textContent = `${formatTime(entry.time.start)} - ${formatTime(end)}: ${entry.category ? `[${entry.category}] ` : ""}${entry.title}`;
          item.dataset.start = String(entry.time.start);
          item.dataset.end = String(end);
          if (entry.color && !applyColor(item, entry.color)) {
            console.warn(`Ongeldige kleur in de agenda-sheet: ${entry.color}`);
          }
          dayList.append(item);
        });
      });

      const skippedMessage = skippedRows.length
        ? ` ${skippedRows.length} ongeldige regel(s) overgeslagen; eerste probleem op rij ${skippedRows[0].rowNumber}: ${skippedRows[0].reason} (${skippedRows[0].time || "leeg"}).`
        : "";
      const totalEntries = entries.filter(
        (entry) =>
          matchesCalendarFilters(entry) &&
          (!entry.weekStart ||
            entry.weekStart === formatLocalDate(displayedWeekStart)),
      ).length;
      status.textContent = totalEntries
        ? `Planning geladen voor de hele week (${totalEntries} afspraken)${calendarFilters.search || calendarFilters.category ? " (gefilterd)" : ""}${skippedMessage}`
        : `Geen planning gevonden voor deze week.${skippedMessage}`;
      updateTimeIndicator();
    }

    function loadSheet() {
      return new Promise((resolve, reject) => {
        const callbackName = `agendaSheetCallback_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}`;
        const script = document.createElement("script");
        const query = new URLSearchParams({
          tqx: `out:json;responseHandler:${callbackName}`,
          _: String(Date.now()),
        });
        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error("Google Sheets reageerde niet op tijd."));
        }, 15_000);

        function cleanup() {
          window.clearTimeout(timeout);
          script.remove();
          delete window[callbackName];
        }

        window[callbackName] = (response) => {
          cleanup();
          resolve(response);
        };
        script.onerror = () => {
          cleanup();
          reject(new Error("De agenda kon niet worden geladen."));
        };
        script.src = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?${query}`;
        document.head.append(script);
      });
    }

    function loadSupabaseSdk() {
      if (window.supabase?.createClient) {
        return Promise.resolve(window.supabase);
      }

      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.onload = () => {
          if (window.supabase?.createClient) {
            resolve(window.supabase);
          } else {
            reject(
              new Error("De Supabase-bibliotheek kon niet worden gestart."),
            );
          }
        };
        script.onerror = () =>
          reject(new Error("De Supabase-bibliotheek kon niet worden geladen."));
        document.head.append(script);
      });
    }

    function buildSupabaseInterface() {
      const style = document.createElement("style");
      style.textContent = `
        .agenda-account { margin: 0 0 16px; padding: 16px; border: 1px solid #d6deea; border-radius: 8px; background: #fff; }
        .agenda-account form, .agenda-item-form { display: grid; gap: 10px; }
        .agenda-account input, .agenda-item-form input, .agenda-item-form select, .agenda-account button, .agenda-item-form button { min-height: 40px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font: inherit; }
        .agenda-account button, .agenda-item-form button { cursor: pointer; background: #183153; color: #fff; border-color: #183153; }
        .agenda-account button[type="button"], .agenda-item-form button[type="button"] { background: #fff; color: #183153; }
        .agenda-account-actions, .agenda-item-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .agenda-item-form { margin: 0 0 16px; padding: 16px; border: 1px solid #d6deea; border-radius: 8px; background: #fff; }
        .agenda-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
        .agenda-form-field { display: grid; gap: 5px; font-size: 14px; font-weight: 600; }
        .agenda-repeat-field { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
        .agenda-repeat-field input { width: 18px; min-height: 18px; height: 18px; margin: 0; accent-color: #183153; }
        .agenda-repeat-days { display: grid; gap: 8px; margin: 0; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; }
        .agenda-repeat-days[hidden], .agenda-once-day[hidden] { display: none; }
        .agenda-repeat-days legend { padding: 0 4px; font-size: 14px; font-weight: 600; }
        .agenda-repeat-days-options { display: flex; flex-wrap: wrap; gap: 8px 14px; }
        .agenda-repeat-day { display: inline-flex; align-items: center; gap: 5px; font-size: 14px; }
        .agenda-repeat-day input { width: 18px; min-height: 18px; height: 18px; margin: 0; accent-color: #183153; }
        .agenda-account [hidden], .agenda-item-form[hidden] { display: none; }
        .agenda-account-message { margin: 10px 0 0; color: #526174; font-size: 14px; }
        .agenda-item-actions { margin-top: 10px; }
        .agenda-item-actions button { padding: 5px 9px; border: 1px solid #cbd5e1; border-radius: 5px; background: #fff; color: #183153; cursor: pointer; font: inherit; }
        .agenda-item-actions[hidden] { display: none; }
        .agenda-item { cursor: pointer; }
        .agenda-item:focus-visible { outline: 3px solid #3978c5; outline-offset: 3px; }
        .agenda-add-button { position: fixed; right: 24px; bottom: 24px; z-index: 20; display: grid; width: 58px; height: 58px; place-items: center; border: 0; border-radius: 50%; background: #183153; color: white; box-shadow: 0 4px 14px rgb(24 49 83 / 28%); cursor: pointer; font: inherit; font-size: 32px; line-height: 1; }
        .agenda-add-button[hidden] { display: none; }
        .agenda-profile-link { position: fixed; top: 18px; right: max(40px, calc((100vw - 1600px) / 2 + 24px)); z-index: 20; display: grid; width: 48px; height: 48px; place-items: center; overflow: hidden; border: 2px solid #fff; border-radius: 50%; background: #183153; color: #fff; box-shadow: 0 2px 8px rgb(24 49 83 / 20%); font-size: 18px; font-weight: 700; text-decoration: none; }
        .agenda-profile-link[hidden] { display: none; }
        .agenda-profile-link img { width: 100%; height: 100%; object-fit: cover; }
        @media (max-width: 520px) { .agenda-add-button { right: 16px; bottom: 16px; } }
      `;
      document.head.append(style);

      const profileLink = document.createElement("a");
      profileLink.href = "profiel.html";
      profileLink.className = "agenda-profile-link";
      profileLink.textContent = "👤";
      profileLink.hidden = true;
      profileLink.setAttribute("aria-label", "Naar profiel");
      document.body.append(profileLink);

      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "agenda-add-button";
      addButton.textContent = "+";
      addButton.setAttribute("aria-label", "Afspraak toevoegen");
      addButton.title = "Afspraak toevoegen";
      addButton.hidden = true;
      document.body.append(addButton);

      const accountPanel = document.createElement("section");
      accountPanel.className = "agenda-account";
      const heading = document.createElement("h2");
      heading.textContent = "Mijn agenda";
      heading.style.margin = "0 0 12px";

      const signedOutView = document.createElement("div");
      const intro = document.createElement("p");
      intro.textContent =
        "Log in of maak een account aan om je eigen planning te beheren.";
      const authForm = document.createElement("form");
      authForm.innerHTML = `
        <label class="agenda-form-field">E-mailadres
          <input name="email" type="email" autocomplete="email" required>
        </label>
        <label class="agenda-form-field">Wachtwoord
          <input name="password" type="password" autocomplete="current-password" minlength="6" required>
        </label>
        <div class="agenda-account-actions">
          <button type="submit" value="login">Inloggen</button>
          <button type="submit" value="signup">Account aanmaken</button>
          <button type="button" data-profile-recovery>Wachtwoord herstellen</button>
        </div>
      `;
      signedOutView.append(intro, authForm);

      const recoveryForm = document.createElement("form");
      recoveryForm.className = "agenda-item-form";
      recoveryForm.hidden = true;
      recoveryForm.innerHTML = `
        <strong>Nieuw wachtwoord instellen</strong>
        <label class="agenda-form-field">Nieuw wachtwoord
          <input name="password" type="password" autocomplete="new-password" minlength="6" required>
        </label>
        <label class="agenda-form-field">Herhaal nieuw wachtwoord
          <input name="password_confirmation" type="password" autocomplete="new-password" minlength="6" required>
        </label>
        <button type="submit">Wachtwoord opslaan</button>
      `;

      const signedInView = document.createElement("div");
      signedInView.hidden = true;
      const signedInLabel = document.createElement("p");
      const signOutButton = document.createElement("button");
      signOutButton.type = "button";
      signOutButton.textContent = "Uitloggen";
      signedInView.append(signedInLabel, signOutButton);

      const accountMessage = document.createElement("p");
      accountMessage.className = "agenda-account-message";
      accountMessage.setAttribute("role", "status");
      accountMessage.setAttribute("aria-live", "polite");
      accountPanel.append(
        heading,
        signedOutView,
        recoveryForm,
        signedInView,
        accountMessage,
      );

      const itemForm = document.createElement("form");
      itemForm.className = "agenda-item-form";
      itemForm.hidden = true;
      itemForm.innerHTML = `
        <strong class="agenda-item-form-heading">Afspraak toevoegen</strong>
        <input name="id" type="hidden">
        <div class="agenda-form-grid">
          <label class="agenda-form-field agenda-once-day">Dag
            <select name="day" required></select>
          </label>
          <label class="agenda-form-field">Begintijd
            <input name="start_time" type="time" required>
          </label>
          <label class="agenda-form-field">Eindtijd
            <input name="end_time" type="time">
          </label>
          <label class="agenda-form-field">Kleur
            <select name="color">
              <option value="">Standaard</option>
              <option value="blauw">Blauw</option>
              <option value="groen">Groen</option>
              <option value="geel">Geel</option>
              <option value="oranje">Oranje</option>
              <option value="rood">Rood</option>
              <option value="paars">Paars</option>
              <option value="roze">Roze</option>
              <option value="grijs">Grijs</option>
            </select>
          </label>
        </div>
        <label class="agenda-form-field">Activiteit
          <input name="title" type="text" maxlength="200" required>
        </label>
        <label class="agenda-form-field">Herhaling
          <select name="repeat_pattern">
            <option value="weekly">Elke week op geselecteerde dagen</option>
            <option value="daily">Elke dag</option>
            <option value="once">Alleen deze week</option>
          </select>
        </label>
        <label class="agenda-form-field">Categorie
          <select name="category">
            <option value="">Geen categorie</option>
            <option value="School">School</option>
            <option value="Werk">Werk</option>
            <option value="Sport">Sport</option>
            <option value="Thuis">Thuis</option>
            <option value="Overig">Overig</option>
          </select>
        </label>
        <fieldset class="agenda-repeat-days">
          <legend>Dagen van de week</legend>
          <div class="agenda-repeat-days-options"></div>
        </fieldset>
        <div class="agenda-item-actions">
          <button type="submit">Opslaan</button>
          <button type="button" data-cancel-edit hidden>Annuleren</button>
        </div>
      `;

      const daySelect = itemForm.elements.namedItem("day");
      const recurrenceDayOptions = itemForm.querySelector(
        ".agenda-repeat-days-options",
      );
      orderedWeekdays.forEach((day) => {
        const option = document.createElement("option");
        option.value = day;
        option.textContent =
          day.charAt(0).toLocaleUpperCase("nl") + day.slice(1);
        daySelect.append(option);
        const label = document.createElement("label");
        label.className = "agenda-repeat-day";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "repeat_days";
        checkbox.value = day;
        checkbox.checked = day === selectedDay.value;
        label.append(checkbox, document.createTextNode(option.textContent));
        recurrenceDayOptions.append(label);
      });
      daySelect.value = selectedDay.value;
      const repeatPatternSelect = itemForm.elements.namedItem("repeat_pattern");
      const onceDayField = itemForm.querySelector(".agenda-once-day");
      const repeatDaysField = itemForm.querySelector(".agenda-repeat-days");
      const updateRepeatControls = () => {
        const isOnce = repeatPatternSelect.value === "once";
        const isWeekly = repeatPatternSelect.value === "weekly";
        onceDayField.hidden = !isOnce;
        daySelect.required = isOnce;
        repeatDaysField.hidden = !isWeekly;
      };
      repeatPatternSelect.addEventListener("change", updateRepeatControls);
      daySelect.addEventListener("change", () => {
        if (repeatPatternSelect.value !== "weekly") {
          return;
        }
        const selectedDays = Array.from(
          itemForm.querySelectorAll('input[name="repeat_days"]:checked'),
        );
        if (selectedDays.length === 1) {
          selectedDays[0].checked = false;
        }
        const selectedDayCheckbox = itemForm.querySelector(
          `input[name="repeat_days"][value="${daySelect.value}"]`,
        );
        if (selectedDayCheckbox) {
          selectedDayCheckbox.checked = true;
        }
      });
      updateRepeatControls();

      agenda.insertBefore(accountPanel, status);
      agenda.insertBefore(itemForm, weekOverview);

      return {
        accountPanel,
        addButton,
        accountMessage,
        authForm,
        itemForm,
        profileLink,
        recoveryForm,
        updateRepeatControls,
        signedInLabel,
        signedInView,
        signedOutView,
        signOutButton,
      };
    }

    async function initializeSupabaseAgenda() {
      const ui = buildSupabaseInterface();
      const { createClient } = await loadSupabaseSdk();
      const client = createClient(
        supabaseConfig.url,
        supabaseConfig.publishableKey,
      );
      let currentUser = null;
      let currentItems = [];

      list.replaceChildren();
      status.textContent = "Verbinding maken met de agenda...";

      function showAccountMessage(message) {
        ui.accountMessage.textContent = message;
        status.textContent = message;
      }

      const callbackParams = new URLSearchParams(
        window.location.hash.slice(1) || window.location.search.slice(1),
      );
      const recoveryError = callbackParams.get("error_code");
      const recoveryDescription = callbackParams.get("error_description");
      const isRecoveryCallback = callbackParams.get("type") === "recovery";

      function setSignedIn(user) {
        currentUser = user;
        ui.accountPanel.hidden = false;
        ui.signedOutView.hidden = Boolean(user);
        ui.signedInView.hidden = !user;
        ui.addButton.hidden = !user;
        ui.profileLink.hidden = !user;
        if (user) {
          updateProfileAvatar(ui.profileLink, user);
        }
        ui.signedInLabel.textContent = user ? `Ingelogd als ${user.email}` : "";

        if (!user) {
          currentItems = [];
          ui.itemForm.hidden = true;
          dayLists.forEach((dayList) => dayList.replaceChildren());
          dayIndicators.forEach((indicator) =>
            indicator.classList.remove("is-visible"),
          );
          if (recoveryError) {
            showAccountMessage(
              recoveryError === "otp_expired"
                ? "Deze herstel-link is verlopen of al gebruikt. Vraag een nieuwe resetmail aan."
                : `De herstel-link is ongeldig: ${recoveryDescription || recoveryError}.`,
            );
          } else if (isRecoveryCallback || !ui.recoveryForm.hidden) {
            showAccountMessage("Kies een nieuw wachtwoord voor je account.");
          } else {
            showAccountMessage(
              "Log in of maak een account aan om je planning te zien.",
            );
          }
          return;
        }

        loadUserItems().catch((error) => {
          console.error("Je agenda kon niet worden geladen.", error);
          showAccountMessage(
            error.code === "42703" &&
              (String(error.message).includes("week_start") ||
                String(error.message).includes("repeat_pattern") ||
                String(error.message).includes("repeat_days"))
              ? "De database mist een herhalingskolom. Voer de SQL uit die week_start, repeat_pattern en repeat_days toevoegt."
              : `Je agenda kon niet worden geladen: ${error.message}`,
          );
        });
      }

      function renderUserItems(records) {
        rerenderCurrentWeek = () => {
          updateWeekDates();
          renderUserItems(records);
        };
        currentItems = records.map((record, rowNumber) => {
          const startText = String(record.start_time).slice(0, 5);
          const endText = record.end_time
            ? String(record.end_time).slice(0, 5)
            : "";
          return {
            id: record.id,
            day: record.day,
            title: record.title,
            color: record.color || "",
            time: parseTime(startText),
            endTime: endText ? (parseTime(endText)?.start ?? null) : null,
            weekStart: record.week_start,
            repeatPattern: record.repeat_pattern || "weekly",
            repeatDays:
              Array.isArray(record.repeat_days) && record.repeat_days.length
                ? record.repeat_days
                : [record.day],
            category: record.category || "",
            rowNumber,
            startText,
          };
        });
        updateCategoryOptions(currentItems);
        renderMonthOverview(currentItems);
        let visibleCount = 0;
        orderedWeekdays.forEach((day) => {
          const dayItems = currentItems
            .filter(
              (entry) =>
                matchesCalendarFilters(entry) &&
                (entry.repeatPattern === "daily" ||
                  (entry.repeatPattern === "weekly"
                    ? entry.repeatDays.includes(day)
                    : entry.day === day)) &&
                (!entry.weekStart ||
                  entry.weekStart === formatLocalDate(displayedWeekStart)),
            )
            .sort(
              (first, second) =>
                first.time.start - second.time.start ||
                first.rowNumber - second.rowNumber,
            );
          const dayList = dayLists.get(day);
          dayList.replaceChildren();

          dayItems.forEach((entry, index) => {
            visibleCount += 1;
            const item = document.createElement("li");
            item.classList.add("agenda-item");
            item.tabIndex = 0;
            item.setAttribute("aria-expanded", "false");
            item.setAttribute(
              "aria-label",
              `${entry.startText}, ${entry.title}. Selecteer voor bewerken of verwijderen.`,
            );
            const end = getEndTime(entry, dayItems[index + 1]);
            item.dataset.start = String(entry.time.start);
            item.dataset.end = String(end);
            const text = document.createElement("span");
            text.className = "agenda-item-text";
            text.textContent = `${entry.startText} - ${formatTime(end)}: ${entry.title}`;
            item.append(text);
            if (entry.category) {
              const badge = document.createElement("span");
              badge.className = "agenda-category-badge";
              badge.textContent = entry.category;
              item.append(badge);
            }
            if (entry.color && !applyColor(item, entry.color)) {
              console.warn(`Ongeldige kleur in de agenda: ${entry.color}`);
            }

            const actions = document.createElement("div");
            actions.className = "agenda-item-actions";
            actions.hidden = true;
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "Bewerken";
            editButton.addEventListener("click", () => {
              ui.itemForm.elements.namedItem("id").value = entry.id;
              ui.itemForm.elements.namedItem("day").value = entry.day;
              ui.itemForm.elements.namedItem("start_time").value =
                entry.startText;
              ui.itemForm.elements.namedItem("end_time").value =
                entry.endTime === null ? "" : formatTime(entry.endTime);
              ui.itemForm.elements.namedItem("title").value = entry.title;
              ui.itemForm.elements.namedItem("color").value = entry.color;
              ui.itemForm.elements.namedItem("category").value =
                entry.category;
              ui.itemForm.elements.namedItem("repeat_pattern").value =
                entry.weekStart ? "once" : entry.repeatPattern;
              ui.itemForm
                .querySelectorAll('input[name="repeat_days"]')
                .forEach((checkbox) => {
                  checkbox.checked = entry.repeatDays.includes(checkbox.value);
                });
              ui.updateRepeatControls();
              ui.itemForm.querySelector(
                ".agenda-item-form-heading",
              ).textContent = "Afspraak bewerken";
              ui.itemForm.querySelector("[data-cancel-edit]").hidden = false;
              ui.itemForm.hidden = false;
              ui.itemForm.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Verwijderen";
            deleteButton.addEventListener("click", async () => {
              if (!window.confirm(`Afspraak "${entry.title}" verwijderen?`)) {
                return;
              }

              deleteButton.disabled = true;
              try {
                const result = await client
                  .from("agenda_items")
                  .delete()
                  .eq("id", entry.id)
                  .eq("user_id", currentUser.id)
                  .select("id")
                  .maybeSingle();
                if (result.error) {
                  deleteButton.disabled = false;
                  showAccountMessage(
                    `Verwijderen is niet gelukt: ${result.error.message}`,
                  );
                  return;
                }
                if (!result.data) {
                  deleteButton.disabled = false;
                  showAccountMessage(
                    "De afspraak is niet verwijderd. Controleer je account en de RLS-beveiligingsregels.",
                  );
                  return;
                }
              } catch (error) {
                deleteButton.disabled = false;
                showAccountMessage(
                  `Verwijderen is niet gelukt: ${error.message}`,
                );
                return;
              }
              showAccountMessage("Afspraak verwijderd.");
              await loadUserItems();
            });

            function toggleActions() {
              actions.hidden = !actions.hidden;
              item.setAttribute("aria-expanded", String(!actions.hidden));
            }

            item.addEventListener("click", (event) => {
              if (event.target.closest("button, input, label")) {
                return;
              }
              toggleActions();
            });
            item.addEventListener("keydown", (event) => {
              if (event.target !== item || !["Enter", " "].includes(event.key)) {
                return;
              }
              event.preventDefault();
              toggleActions();
            });

            actions.append(editButton, deleteButton);
            item.append(actions);
            dayList.append(item);
          });
        });

        const repeatDaysNotice = supportsRepeatDays
          ? ""
          : " Voor herhaling op meerdere weekdagen moet je eerst de SQL voor repeat_days uitvoeren.";
        const schemaNotice = [
          !supportsCategories
            ? " Categorieën opslaan vereist de kolom category in Supabase."
            : "",
        ].join("");
        const filterNotice =
          (calendarFilters.search || calendarFilters.category) && !visibleCount
            ? " Geen afspraken gevonden met deze zoekopdracht of categorie."
            : "";
        status.textContent = currentItems.length
          ? `Je weekplanning is geladen en per dag op begintijd gesorteerd.${repeatDaysNotice}${schemaNotice}${filterNotice}`
          : `Je hebt nog geen afspraken voor ${selectedDay.value}.${repeatDaysNotice}${schemaNotice}`;
        updateTimeIndicator();
      }

      async function loadUserItems() {
        if (!currentUser) {
          return;
        }

        status.textContent = "Je planning laden...";
        let result;
        while (true) {
          const columns = [
            "id",
            "user_id",
            "day",
            "start_time",
            "end_time",
            "title",
            "color",
            "week_start",
            "repeat_pattern",
          ];
          if (supportsRepeatDays) {
            columns.push("repeat_days");
          }
          if (supportsCategories) {
            columns.push("category");
          }
          result = await client
            .from("agenda_items")
            .select(columns.join(", "))
            .eq("user_id", currentUser.id)
            .order("start_time", { ascending: true })
            .order("id", { ascending: true });
          if (!["42703", "PGRST204"].includes(String(result.error?.code))) {
            break;
          }

          const errorMessage = String(result.error.message);
          const missingColumn =
            errorMessage.match(
              /column\s+(?:[\w"]+\.)?"?([a-z_]+)"?\s+does not exist/i,
            )?.[1] ||
            errorMessage.match(
              /could not find the ['"]([a-z_]+)['"] column of ['"]agenda_items['"]/i,
            )?.[1];
          if (missingColumn === "repeat_days") {
            supportsRepeatDays = false;
          } else if (missingColumn === "category") {
            supportsCategories = false;
          } else {
            throw result.error;
          }
        }

        if (result.error) {
          throw result.error;
        }
        renderUserItems(result.data || []);
      }

      function resetItemForm() {
        ui.itemForm.reset();
        ui.itemForm.elements.namedItem("id").value = "";
        ui.itemForm.elements.namedItem("day").value = selectedDay.value;
        ui.itemForm.elements.namedItem("repeat_pattern").value = "weekly";
        ui.itemForm
          .querySelectorAll('input[name="repeat_days"]')
          .forEach((checkbox) => {
            checkbox.checked = checkbox.value === selectedDay.value;
          });
        ui.updateRepeatControls();
        ui.itemForm.querySelector(".agenda-item-form-heading").textContent =
          "Afspraak toevoegen";
        ui.itemForm.querySelector("[data-cancel-edit]").hidden = true;
      }

      ui.addButton.addEventListener("click", () => {
        resetItemForm();
        ui.itemForm.hidden = false;
        ui.itemForm.scrollIntoView({ behavior: "smooth", block: "center" });
        ui.itemForm.elements.namedItem("title").focus();
      });

      ui.authForm
        .querySelector("[data-profile-recovery]")
        .addEventListener("click", () => {
          window.location.assign("profiel.html?herstel=1");
        });

      ui.authForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitter = event.submitter;
        if (!(submitter instanceof HTMLButtonElement)) {
          return;
        }

        submitter.disabled = true;
        const formData = new FormData(ui.authForm);
        const credentials = {
          email: String(formData.get("email")).trim(),
          password: String(formData.get("password")),
        };
        let result;
        try {
          result =
            submitter.value === "signup"
              ? await client.auth.signUp(credentials)
              : await client.auth.signInWithPassword(credentials);
        } catch (error) {
          submitter.disabled = false;
          showAccountMessage(`Inloggen is niet gelukt: ${error.message}`);
          return;
        }
        submitter.disabled = false;

        if (result.error) {
          showAccountMessage(
            `${submitter.value === "signup" ? "Account aanmaken" : "Inloggen"} is niet gelukt: ${result.error.message}`,
          );
        } else if (submitter.value === "signup" && !result.data.session) {
          showAccountMessage(
            "Account aangemaakt. Log in en maak daarna een herstelcode op je profielpagina.",
          );
        } else {
          showAccountMessage("Je bent ingelogd.");
        }
      });

      if (recoveryError) {
        const message =
          recoveryError === "otp_expired"
            ? "Deze herstel-link is verlopen of al gebruikt. Vraag een nieuwe resetmail aan."
            : `De herstel-link is ongeldig: ${recoveryDescription || recoveryError}.`;
        showAccountMessage(message);
      } else if (isRecoveryCallback) {
        ui.recoveryForm.hidden = false;
        showAccountMessage("Kies een nieuw wachtwoord voor je account.");
      }

      ui.recoveryForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(ui.recoveryForm);
        const password = String(formData.get("password"));
        const confirmation = String(formData.get("password_confirmation"));

        if (password !== confirmation) {
          showAccountMessage("De nieuwe wachtwoorden zijn niet hetzelfde.");
          return;
        }

        const saveButton = ui.recoveryForm.querySelector(
          'button[type="submit"]',
        );
        saveButton.disabled = true;
        try {
          const { error } = await client.auth.updateUser({ password });
          if (error) {
            showAccountMessage(
              `Het nieuwe wachtwoord kon niet worden opgeslagen: ${error.message}`,
            );
            return;
          }

          ui.recoveryForm.reset();
          ui.recoveryForm.hidden = true;
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + window.location.search,
          );
          showAccountMessage(
            "Je wachtwoord is gewijzigd. Je bent nu ingelogd.",
          );
        } catch (error) {
          showAccountMessage(
            `Het nieuwe wachtwoord kon niet worden opgeslagen: ${error.message}`,
          );
        } finally {
          saveButton.disabled = false;
        }
      });

      ui.itemForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!currentUser) {
          showAccountMessage("Log eerst in om afspraken op te slaan.");
          return;
        }

        const formData = new FormData(ui.itemForm);
        const startTime = String(formData.get("start_time"));
        const endTime = String(formData.get("end_time"));
        const title = String(formData.get("title")).trim();
        const itemId = String(formData.get("id"));
        const repeatPattern = String(formData.get("repeat_pattern"));
        const category = String(formData.get("category") || "");
        const repeatDays = formData
          .getAll("repeat_days")
          .map(String);

        if (!title) {
          showAccountMessage("Vul een naam voor de activiteit in.");
          return;
        }
        if (endTime && endTime <= startTime) {
          showAccountMessage("De eindtijd moet na de begintijd liggen.");
          return;
        }
        if (repeatPattern === "weekly" && repeatDays.length === 0) {
          showAccountMessage("Kies minstens één dag voor de herhaling.");
          return;
        }
        if (
          !supportsRepeatDays &&
          repeatPattern === "weekly" &&
          repeatDays.length > 1
        ) {
          showAccountMessage(
            "Herhalen op meerdere dagen kan pas nadat de SQL voor repeat_days is uitgevoerd.",
          );
          return;
        }
        if (!supportsCategories && category) {
          showAccountMessage(
            "Categorieën opslaan kan pas nadat de SQL voor category is uitgevoerd.",
          );
          return;
        }

        const saveButton = ui.itemForm.querySelector('button[type="submit"]');
        saveButton.disabled = true;
        showAccountMessage("Afspraak opslaan...");
        const values = {
          user_id: currentUser.id,
          day:
            repeatPattern === "weekly"
              ? repeatDays[0]
              : String(formData.get("day") || selectedDay.value),
          start_time: startTime,
          end_time: endTime || null,
          title,
          color: String(formData.get("color")) || null,
          week_start:
            repeatPattern === "once"
              ? formatLocalDate(displayedWeekStart)
              : null,
          repeat_pattern:
            repeatPattern === "daily" ? "daily" : "weekly",
        };
        if (supportsCategories) {
          values.category = category || null;
        }
        if (supportsRepeatDays) {
          values.repeat_days =
            repeatPattern === "weekly" ? repeatDays : null;
        }
        let result;
        try {
          result = itemId
            ? await client
                .from("agenda_items")
                .update(values)
                .eq("id", itemId)
                .eq("user_id", currentUser.id)
                .select("id")
                .maybeSingle()
            : await client.from("agenda_items").insert(values).select("id").single();
        } catch (error) {
          saveButton.disabled = false;
          showAccountMessage(`Opslaan is niet gelukt: ${error.message}`);
          return;
        }
        saveButton.disabled = false;

        if (result.error) {
          showAccountMessage(`Opslaan is niet gelukt: ${result.error.message}`);
          return;
        }
        if (itemId && !result.data) {
          showAccountMessage(
            "De afspraak is niet bijgewerkt. Controleer je account en de RLS-beveiligingsregels.",
          );
          return;
        }

        resetItemForm();
        ui.itemForm.hidden = true;
        showAccountMessage("Afspraak opgeslagen.");
        await loadUserItems();
      });

      ui.itemForm
        .querySelector("[data-cancel-edit]")
        .addEventListener("click", () => {
          resetItemForm();
          ui.itemForm.hidden = true;
        });
      ui.signOutButton.addEventListener("click", async () => {
        try {
          const { error } = await client.auth.signOut();
          if (error) {
            showAccountMessage(`Uitloggen is niet gelukt: ${error.message}`);
          }
        } catch (error) {
          showAccountMessage(`Uitloggen is niet gelukt: ${error.message}`);
        }
      });

      client.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          ui.recoveryForm.hidden = false;
          ui.recoveryForm.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          showAccountMessage("Kies een nieuw wachtwoord voor je account.");
        }
        window.setTimeout(() => setSignedIn(session?.user || null), 0);
      });
      const { data, error } = await client.auth.getSession();
      if (error) {
        throw error;
      }
      setSignedIn(data.session?.user || null);
    }

    function updateTimeIndicator() {
      const now = new Date();
      const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes() +
        now.getSeconds() / 60 +
        now.getMilliseconds() / 60_000;
      const currentDay = weekdayNames[now.getDay()];
      const isCurrentWeek =
        formatLocalDate(getWeekStart(now)) ===
        formatLocalDate(displayedWeekStart);

      orderedWeekdays.forEach((day) => {
        const dayList = dayLists.get(day);
        const panel = dayPanels.get(day);
        const indicator = dayIndicators.get(day);
        const items = Array.from(dayList.querySelectorAll("li"));
        let currentStart;
        let currentEnd;
        const currentItem =
          isCurrentWeek && day === currentDay
            ? items.find((item) => {
                const start = Number(item.dataset.start);
                let end = Number(item.dataset.end);
                if (!Number.isFinite(start) || !Number.isFinite(end)) {
                  return false;
                }
                if (end <= start) {
                  end += 24 * 60;
                }
                if (currentMinutes >= start && currentMinutes < end) {
                  currentStart = start;
                  currentEnd = end;
                  return true;
                }
                return false;
              })
            : null;

        items.forEach((item) => {
          item.classList.toggle("planning-actief", item === currentItem);
        });
        indicator.classList.remove("is-visible");

        if (!currentItem) {
          return;
        }

        const elapsedFraction =
          (currentMinutes - currentStart) / (currentEnd - currentStart);
        const top =
          currentItem.getBoundingClientRect().top -
          panel.getBoundingClientRect().top +
          panel.scrollTop +
          currentItem.getBoundingClientRect().height * elapsedFraction;

        indicator.style.top = `${top}px`;
        indicator.classList.add("is-visible");
      });
    }

    window.addEventListener("resize", () => {
      selectDay(selectedDay.value);
      if (window.matchMedia("(max-width: 900px)").matches) {
        weekOverview.scrollLeft = dayPanels.get(selectedDay.value).offsetLeft;
      }
      updateTimeIndicator();
    });

    const hasSupabaseConfig =
      supabaseConfig.url.startsWith("https://") &&
      !supabaseConfig.url.includes("VUL_HIER") &&
      supabaseConfig.publishableKey &&
      !supabaseConfig.publishableKey.includes("VUL_HIER");

    if (hasSupabaseConfig) {
      dayLists.forEach((dayList) => dayList.replaceChildren());
      status.textContent = "Verbinden met je database...";
      initializeSupabaseAgenda().catch((error) => {
        console.error("Supabase kon niet worden gestart.", error);
        status.textContent = `De database kon niet worden gestart: ${error.message}`;
      });
    } else {
      loadSheet()
        .then(extractEntries)
        .then(showSheetEntries)
        .catch((error) => {
          console.error("Agenda kon niet worden geladen.", error);
          status.textContent =
            "De agenda kon niet worden geladen. De bestaande planning blijft staan.";
        });

      window.setInterval(() => {
        loadSheet()
          .then(extractEntries)
          .then(showSheetEntries)
          .catch((error) => {
            console.error("Agenda kon niet worden vernieuwd.", error);
            status.textContent =
              "De agenda kon niet worden vernieuwd. De laatst geladen planning blijft staan.";
          });
      }, 60_000);
    }
    updateTimeIndicator();
    window.setInterval(updateTimeIndicator, 1_000);
    window.addEventListener("resize", updateTimeIndicator);
  }
}
