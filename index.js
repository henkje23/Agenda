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

function parseIcalendarEvents(content) {
  const lines = content
    .replace(/\r\n[ \t]/g, "")
    .replace(/\n[ \t]/g, "")
    .split(/\r?\n/);
  const events = [];
  const skippedUids = new Set();
  const cancelledUids = new Set();
  let currentEvent = null;
  let skippedCount = 0;

  function parseDate(value, isAllDay) {
    const match = value.match(
      /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z|[+-]\d{4})?)?$/,
    );
    if (!match) {
      return null;
    }

    const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone] =
      match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText || 0);
    const minute = Number(minuteText || 0);
    const second = Number(secondText || 0);
    const dateCheck = new Date(Date.UTC(year, month - 1, day));
    if (
      dateCheck.getUTCFullYear() !== year ||
      dateCheck.getUTCMonth() !== month - 1 ||
      dateCheck.getUTCDate() !== day ||
      hour > 23 ||
      minute > 59 ||
      second > 59
    ) {
      return null;
    }
    let date;

    if (isAllDay) {
      date = new Date(year, month - 1, day, 12);
    } else {
      const dateText = `${yearText}-${monthText}-${dayText}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
      const normalizedZone =
        zone && zone !== "Z"
          ? `${zone.slice(0, 3)}:${zone.slice(3)}`
          : zone || "";
      date = new Date(`${dateText}${normalizedZone}`);
    }

    if (!Number.isFinite(date.getTime())) {
      return null;
    }
    if (
      isAllDay &&
      (date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day)
    ) {
      return null;
    }
    return date;
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function getRecurrenceDates(ruleText, startDate) {
    const parts = Object.fromEntries(
      ruleText.split(";").map((part) => {
        const separator = part.indexOf("=");
        return separator < 0
          ? [part.toUpperCase(), ""]
          : [
              part.slice(0, separator).toUpperCase(),
              part.slice(separator + 1),
            ];
      }),
    );
    const supportedParts = new Set([
      "FREQ",
      "INTERVAL",
      "COUNT",
      "UNTIL",
      "BYDAY",
      "BYMONTHDAY",
      "BYMONTH",
      "WKST",
    ]);
    if (Object.keys(parts).some((part) => !supportedParts.has(part))) {
      return null;
    }

    const frequency = parts.FREQ;
    const interval = Number(parts.INTERVAL || 1);
    const count = parts.COUNT ? Number(parts.COUNT) : null;
    const dayNumbers = {
      SU: 0,
      MO: 1,
      TU: 2,
      WE: 3,
      TH: 4,
      FR: 5,
      SA: 6,
    };
    const byDays = parts.BYDAY
      ? parts.BYDAY.split(",").map((day) => dayNumbers[day])
      : null;
    const byMonthDays = parts.BYMONTHDAY
      ? parts.BYMONTHDAY.split(",").map(Number)
      : null;
    const byMonths = parts.BYMONTH
      ? parts.BYMONTH.split(",").map(Number)
      : null;
    const allowedPartsByFrequency = {
      DAILY: new Set(["FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY", "WKST"]),
      WEEKLY: new Set(["FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY", "WKST"]),
      MONTHLY: new Set([
        "FREQ",
        "INTERVAL",
        "COUNT",
        "UNTIL",
        "BYDAY",
        "BYMONTHDAY",
        "WKST",
      ]),
      YEARLY: new Set([
        "FREQ",
        "INTERVAL",
        "COUNT",
        "UNTIL",
        "BYDAY",
        "BYMONTHDAY",
        "BYMONTH",
        "WKST",
      ]),
    };
    const allowedParts = allowedPartsByFrequency[frequency];
    if (
      !allowedParts ||
      Object.keys(parts).some((part) => !allowedParts.has(part)) ||
      !Number.isInteger(interval) ||
      interval < 1 ||
      (count !== null && (!Number.isInteger(count) || count < 1)) ||
      (byDays && byDays.some((day) => day === undefined)) ||
      (byMonthDays &&
        byMonthDays.some(
          (day) =>
            !Number.isInteger(day) ||
            day === 0 ||
            day < -31 ||
            day > 31,
        )) ||
      (byMonths &&
        byMonths.some(
          (month) => !Number.isInteger(month) || month < 1 || month > 12,
        )) ||
      (parts.WKST && dayNumbers[parts.WKST] === undefined)
    ) {
      return null;
    }

    const until = parts.UNTIL
      ? parseDate(parts.UNTIL, !parts.UNTIL.includes("T"))
      : null;
    if (parts.UNTIL && !until) {
      return null;
    }
    const recurrenceEnd = addDays(startDate, 366 * 3);
    const endDate =
      until && formatLocalDate(until) < formatLocalDate(recurrenceEnd)
        ? until
        : recurrenceEnd;
    const weekStart = parts.WKST
      ? dayNumbers[parts.WKST]
      : 1;
    const startWeek = new Date(startDate);
    startWeek.setDate(
      startWeek.getDate() - ((startWeek.getDay() - weekStart + 7) % 7),
    );
    const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
    const dateOrdinal = (date) =>
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) /
      86_400_000;
    const dates = [];
    let matchedCount = 0;

    for (
      let date = startDate;
      date <= endDate;
      date = addDays(date, 1)
    ) {
      const daysSinceStart = dateOrdinal(date) - dateOrdinal(startDate);
      const weeksSinceStart = Math.floor(
        (dateOrdinal(date) - dateOrdinal(startWeek)) / 7,
      );
      const monthsSinceStart =
        date.getFullYear() * 12 + date.getMonth() - startMonth;
      let matchesFrequency = false;
      if (frequency === "DAILY") {
        matchesFrequency = daysSinceStart % interval === 0;
      } else if (frequency === "WEEKLY") {
        matchesFrequency =
          weeksSinceStart % interval === 0 &&
          (byDays || [startDate.getDay()]).includes(date.getDay());
      } else if (frequency === "MONTHLY") {
        matchesFrequency =
          monthsSinceStart % interval === 0 &&
          (!byMonthDays ||
            byMonthDays.some((day) =>
              day > 0
                ? date.getDate() === day
                : date.getDate() ===
                  new Date(date.getFullYear(), date.getMonth() + 1, 0)
                    .getDate() +
                    day +
                    1,
            )) &&
          (!byDays || byDays.includes(date.getDay()));
        if (!byMonthDays && !byDays) {
          matchesFrequency = matchesFrequency &&
            date.getDate() === startDate.getDate();
        }
      } else if (frequency === "YEARLY") {
        matchesFrequency =
          (date.getFullYear() - startDate.getFullYear()) % interval === 0 &&
          (byMonths || [startDate.getMonth() + 1]).includes(
            date.getMonth() + 1,
          ) &&
          (!byMonthDays ||
            byMonthDays.some((day) =>
              day > 0
                ? date.getDate() === day
                : date.getDate() ===
                  new Date(date.getFullYear(), date.getMonth() + 1, 0)
                    .getDate() +
                    day +
                    1,
            )) &&
          (!byDays || byDays.includes(date.getDay()));
        if (!byMonthDays && !byDays) {
          matchesFrequency = matchesFrequency &&
            date.getDate() === startDate.getDate();
        }
      }

      if (formatLocalDate(date) === formatLocalDate(startDate)) {
        matchesFrequency = true;
      }
      if (!matchesFrequency) {
        continue;
      }
      if (until && dateOrdinal(date) > dateOrdinal(until)) {
        break;
      }
      matchedCount += 1;
      if (count !== null && matchedCount > count) {
        break;
      }
      dates.push(new Date(date));
    }
    return dates;
  }

  lines.forEach((line) => {
    if (line === "BEGIN:VEVENT") {
      currentEvent = {};
      return;
    }
    if (line === "END:VEVENT") {
      if (!currentEvent) {
        return;
      }

      const start = currentEvent.dtstart;
      const end = currentEvent.dtend;
      const title = currentEvent.summary?.trim();
      const description = currentEvent.description || "";
      const uid = currentEvent.uid || "";
      if (currentEvent.status === "CANCELLED" && uid) {
        cancelledUids.add(uid);
        currentEvent = null;
        return;
      }
      if (
        !start ||
        !title ||
        (end && start.isAllDay !== end.isAllDay)
      ) {
        skippedCount += 1;
        if (uid) {
          skippedUids.add(uid);
        }
        currentEvent = null;
        return;
      }

      const startDate = parseDate(start.value, start.isAllDay);
      const endDate = end
        ? parseDate(end.value, end.isAllDay)
        : startDate
          ? start.isAllDay
            ? addDays(startDate, 1)
            : new Date(startDate.getTime() + 30 * 60 * 1000)
          : null;
      if (!startDate || !endDate || endDate <= startDate) {
        skippedCount += 1;
        if (uid) {
          skippedUids.add(uid);
        }
        currentEvent = null;
        return;
      }

      const recurrenceDates = currentEvent.rrule
        ? getRecurrenceDates(currentEvent.rrule, startDate)
        : [startDate];
      if (!recurrenceDates) {
        skippedCount += 1;
        if (uid) {
          skippedUids.add(uid);
        }
        currentEvent = null;
        return;
      }

      const eventDurationDays = Math.round(
        (Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) -
          Date.UTC(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(),
          )) /
          86_400_000,
      );
      if (start.isAllDay && eventDurationDays > 366) {
        skippedCount += 1;
        if (uid) {
          skippedUids.add(uid);
        }
        currentEvent = null;
        return;
      }

      for (const occurrenceDate of recurrenceDates) {
        const occurrenceOffset = Math.round(
          (Date.UTC(
            occurrenceDate.getFullYear(),
            occurrenceDate.getMonth(),
            occurrenceDate.getDate(),
          ) -
            Date.UTC(
              startDate.getFullYear(),
              startDate.getMonth(),
              startDate.getDate(),
            )) /
            86_400_000,
        );
        const occurrenceStart = addDays(startDate, occurrenceOffset);
        const occurrenceEnd = addDays(endDate, occurrenceOffset);
        if (start.isAllDay) {
          for (
            let date = occurrenceStart;
            date < occurrenceEnd;
            date = addDays(date, 1)
          ) {
            const occurrenceKey = formatLocalDate(occurrenceStart);
            const dayKey = formatLocalDate(date);
            events.push({
              day: weekdayNames[date.getDay()],
              start_time: "00:00",
              end_time: "23:59",
              title,
              description,
              week_start: formatLocalDate(getWeekStart(date)),
              repeat_pattern: "once",
              color: null,
              import_uid:
                uid ||
                `${title}|${formatLocalDate(startDate)}|all-day`,
              import_instance:
                currentEvent.rrule
                  ? `${occurrenceKey}:${dayKey}`
                  : dayKey,
            });
          }
        } else if (
          formatLocalDate(occurrenceStart) ===
          formatLocalDate(occurrenceEnd)
        ) {
          const startTime = `${String(occurrenceStart.getHours()).padStart(2, "0")}:${String(occurrenceStart.getMinutes()).padStart(2, "0")}`;
          const endTime = `${String(occurrenceEnd.getHours()).padStart(2, "0")}:${String(occurrenceEnd.getMinutes()).padStart(2, "0")}`;
          if (endTime <= startTime) {
            skippedCount += 1;
            if (uid) {
              skippedUids.add(uid);
            }
          } else {
            events.push({
              day: weekdayNames[occurrenceStart.getDay()],
              start_time: startTime,
              end_time: endTime,
              title,
              description,
              week_start: formatLocalDate(getWeekStart(occurrenceStart)),
              repeat_pattern: "once",
              color: null,
              import_uid:
                uid ||
                `${title}|${formatLocalDate(startDate)}|${startTime}`,
              import_instance: currentEvent.rrule
                ? formatLocalDate(occurrenceStart)
                : "",
            });
          }
        } else {
          skippedCount += 1;
          if (uid) {
            skippedUids.add(uid);
          }
        }
      }

      currentEvent = null;
      return;
    }
    if (!currentEvent) {
      return;
    }

    const separator = line.indexOf(":");
    if (separator < 0) {
      return;
    }
    const [propertyName, ...parameters] = line
      .slice(0, separator)
      .split(";");
    const property = propertyName.toUpperCase();
    const value = line.slice(separator + 1);
    const parameterValues = Object.fromEntries(
      parameters.map((parameter) => {
        const parameterSeparator = parameter.indexOf("=");
        return parameterSeparator < 0
          ? [parameter.toUpperCase(), ""]
          : [
              parameter.slice(0, parameterSeparator).toUpperCase(),
              parameter.slice(parameterSeparator + 1).replace(/^"|"$/g, ""),
            ];
      }),
    );

    if (property === "DTSTART" || property === "DTEND") {
      currentEvent[property.toLowerCase()] = {
        value,
        isAllDay:
          parameterValues.VALUE === "DATE" || !value.includes("T"),
      };
    } else if (property === "SUMMARY") {
      currentEvent.summary = value.replace(/\\([nN,;\\])/g, (_, escaped) =>
        escaped.toLowerCase() === "n" ? " " : escaped,
      );
    } else if (property === "DESCRIPTION") {
      currentEvent.description = value.replace(
        /\\([nN,;\\])/g,
        (_, escaped) => (escaped.toLowerCase() === "n" ? "\n" : escaped),
      );
    } else if (property === "UID") {
      currentEvent.uid = value;
    } else if (property === "RRULE") {
      currentEvent.rrule = value;
    } else if (property === "STATUS") {
      currentEvent.status = value.toUpperCase();
    }
  });

  if (currentEvent) {
    skippedCount += 1;
  }
  return {
    events,
    skippedCount,
    skippedUids: [...skippedUids],
    cancelledUids: [...cancelledUids],
  };
}

function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
}

function getHolidayEntries(
  country,
  region,
  focusYears,
  { schoolHolidaysEnabled = true } = {},
) {
  const years = new Set(
    focusYears.flatMap((year) =>
      [year - 1, year, year + 1, year + 2],
    ),
  );
  const entries = [];
  const addHoliday = (title, startDate, endDate = startDate, category = "Feestdag") => {
    const start = new Date(`${startDate}T12:00:00`);
    entries.push({
      id: `holiday-${country}-${region}-${startDate}-${title}`,
      title,
      day: weekdayNames[start.getDay()],
      time: { start: 0, end: 1439 },
      endTime: 1439,
      startText: "00:00",
      category,
      isHoliday: true,
      holidayStartDate: startDate,
      holidayEndDate: endDate,
      rowNumber: -entries.length - 1,
    });
  };
  const addRange = (title, startDate, endDate) =>
    addHoliday(title, startDate, endDate, "Schoolvakantie");

  years.forEach((year) => {
    const easter = getEasterSunday(year);
    const easterDate = formatLocalDate(easter);
    const offsetDate = (offset) => {
      const date = new Date(easter);
      date.setDate(date.getDate() + offset);
      return formatLocalDate(date);
    };

    if (country === "NL") {
      addHoliday("Nieuwjaarsdag", `${year}-01-01`);
      addHoliday("Goede Vrijdag", offsetDate(-2));
      addHoliday("Eerste paasdag", easterDate);
      addHoliday("Tweede paasdag", offsetDate(1));
      const kingsDay = new Date(year, 3, 27, 12);
      if (kingsDay.getDay() === 0) {
        kingsDay.setDate(kingsDay.getDate() - 1);
      }
      addHoliday("Koningsdag", formatLocalDate(kingsDay));
      addHoliday("Bevrijdingsdag", `${year}-05-05`);
      addHoliday("Hemelvaartsdag", offsetDate(39));
      addHoliday("Eerste pinksterdag", offsetDate(49));
      addHoliday("Tweede pinksterdag", offsetDate(50));
      addHoliday("Eerste kerstdag", `${year}-12-25`);
      addHoliday("Tweede kerstdag", `${year}-12-26`);
    } else {
      addHoliday("Nieuwjaar", `${year}-01-01`);
      addHoliday("Paasmaandag", offsetDate(1));
      addHoliday("Dag van de Arbeid", `${year}-05-01`);
      addHoliday("Hemelvaart", offsetDate(39));
      addHoliday("Pinkstermaandag", offsetDate(50));
      addHoliday("Nationale feestdag", `${year}-07-21`);
      addHoliday("Onze-Lieve-Vrouw Hemelvaart", `${year}-08-15`);
      addHoliday("Allerheiligen", `${year}-11-01`);
      addHoliday("Wapenstilstand", `${year}-11-11`);
      addHoliday("Kerstmis", `${year}-12-25`);
    }
  });

  const schoolYear2026 = {
    BE: {
      vlaanderen: [
        ["Herfstvakantie", "2026-11-02", "2026-11-08"],
        ["Kerstvakantie", "2026-12-21", "2027-01-03"],
        ["Krokusvakantie", "2027-02-08", "2027-02-14"],
        ["Paasvakantie", "2027-03-29", "2027-04-11"],
        ["Zomervakantie", "2027-07-01", "2027-08-31"],
      ],
      wallonie: [
        ["Herfstvakantie", "2026-10-19", "2026-11-01"],
        ["Kerstvakantie", "2026-12-21", "2027-01-03"],
        ["Krokusvakantie", "2027-02-22", "2027-03-07"],
        ["Lentevakantie", "2027-04-26", "2027-05-09"],
        ["Zomervakantie", "2027-07-03", "2027-08-22"],
      ],
      duitstalig: [
        ["Herfstvakantie", "2026-11-02", "2026-11-08"],
        ["Kerstvakantie", "2026-12-21", "2027-01-03"],
        ["Krokusvakantie", "2027-02-08", "2027-02-14"],
        ["Paasvakantie", "2027-03-29", "2027-04-11"],
        ["Zomervakantie", "2027-07-01", "2027-08-31"],
      ],
    },
    NL: {
      noord: [
        ["Herfstvakantie", "2026-10-10", "2026-10-18"],
        ["Kerstvakantie", "2026-12-19", "2027-01-03"],
        ["Voorjaarsvakantie", "2027-02-20", "2027-02-28"],
        ["Meivakantie", "2027-04-24", "2027-05-02"],
        ["Zomervakantie", "2027-07-10", "2027-08-22"],
      ],
      midden: [
        ["Herfstvakantie", "2026-10-17", "2026-10-25"],
        ["Kerstvakantie", "2026-12-19", "2027-01-03"],
        ["Voorjaarsvakantie", "2027-02-20", "2027-02-28"],
        ["Meivakantie", "2027-04-24", "2027-05-02"],
        ["Zomervakantie", "2027-07-17", "2027-08-29"],
      ],
      zuid: [
        ["Herfstvakantie", "2026-10-17", "2026-10-25"],
        ["Kerstvakantie", "2026-12-19", "2027-01-03"],
        ["Voorjaarsvakantie", "2027-02-13", "2027-02-21"],
        ["Meivakantie", "2027-04-24", "2027-05-02"],
        ["Zomervakantie", "2027-07-24", "2027-09-05"],
      ],
    },
  };
  if (schoolHolidaysEnabled) {
    const schoolBreaks = schoolYear2026[country]?.[region] || [];
    for (const [title, startDate, endDate] of schoolBreaks) {
      addRange(title, startDate, endDate);
    }
  }
  return entries;
}

function getHolidayPreferences(user) {
  const metadata = user?.user_metadata || {};
  const country = ["BE", "NL"].includes(metadata.country)
    ? metadata.country
    : navigator.language.toLowerCase().includes("nl-nl")
      ? "NL"
      : "BE";
  const validRegions =
    country === "NL"
      ? ["noord", "midden", "zuid"]
      : ["vlaanderen", "wallonie", "duitstalig"];
  return {
    country,
    region: validRegions.includes(metadata.region)
      ? metadata.region
      : country === "NL"
        ? "midden"
        : "vlaanderen",
    schoolHolidaysEnabled: metadata.school_holidays_enabled !== false,
  };
}

function getAppLocale() {
  return {
    nl: "nl-BE",
    en: "en-GB",
    fr: "fr-FR",
    de: "de-DE",
  }[window.agendaI18n?.getLanguage() || "nl"];
}

function applyUserLanguage(user) {
  const language = user?.user_metadata?.language;
  if (["nl", "en", "fr", "de"].includes(language)) {
    window.agendaI18n.setLanguage(language);
  }
}

const holidayRegionOptions = {
  BE: [
    ["vlaanderen", "Vlaanderen"],
    ["wallonie", "Wallonië en Franstalig Brussel"],
    ["duitstalig", "Duitstalige Gemeenschap"],
  ],
  NL: [
    ["noord", "Noord-Nederland"],
    ["midden", "Midden-Nederland"],
    ["zuid", "Zuid-Nederland"],
  ],
};

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
  const countrySelect = document.querySelector("#profiel-land");
  const regionSelect = document.querySelector("#profiel-regio");
  const locationForm = document.querySelector("#profiel-locatie-form");
  const locationStatus = document.querySelector("#profiel-locatie-status");
  const schoolHolidaysToggle = document.querySelector(
    "#profiel-schoolvakanties-toggle",
  );
  const schoolHolidaysStatus = document.querySelector(
    "#profiel-schoolvakanties-status",
  );
  const languageSelect = document.querySelector("#profiel-taal");
  const languageForm = document.querySelector("#profiel-taal-form");
  const languageStatus = document.querySelector("#profiel-taal-status");
  const usernameForm = document.querySelector("#profiel-gebruikersnaam-form");
  const usernameInput = document.querySelector("#profiel-gebruikersnaam");
  const usernameStatus = document.querySelector(
    "#profiel-gebruikersnaam-status",
  );
  const shareCodeButton = document.querySelector("#profiel-deelcode-maken");
  const shareCodeOutput = document.querySelector("#profiel-deelcode-uitvoer");
  const shareCodeStatus = document.querySelector("#profiel-deelcode-status");
  const shareForm = document.querySelector("#agenda-share-form");
  const shareStatus = document.querySelector("#agenda-share-status");
  const shareView = document.querySelector("#agenda-share-view");
  const shareHeading = document.querySelector("#agenda-share-heading");
  const shareExpiry = document.querySelector("#agenda-share-expiry");
  const shareWeekLabel = document.querySelector("#agenda-share-week-label");
  const shareWeek = document.querySelector("#agenda-share-week");
  const shareWeekButtons = {
    previous: document.querySelector("#agenda-share-prev"),
    next: document.querySelector("#agenda-share-next"),
    today: document.querySelector("#agenda-share-today"),
  };
  let shareViewerToken = "";
  let shareUsername = "";
  let shareItems = [];
  let shareWeekStart = getWeekStart(new Date());
  let shareExpiryTimer = 0;

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
    async function invokeAgendaSharing(body) {
      const { data: responseData, error: responseError } =
        await client.functions.invoke("agenda-sharing", { body });
      if (responseError) {
        let message = responseError.message;
        if (responseError.context instanceof Response) {
          const errorBody = await responseError.context.clone().json().catch(
            () => null,
          );
          if (typeof errorBody?.error === "string") {
            message = errorBody.error;
          }
        }
        throw new Error(message);
      }
      return responseData;
    }

    function clearAgendaShareSession(message = "") {
      window.clearTimeout(shareExpiryTimer);
      shareViewerToken = "";
      shareItems = [];
      window.sessionStorage.removeItem("agenda-share-viewer-token");
      window.sessionStorage.removeItem("agenda-share-viewer-expiry");
      window.sessionStorage.removeItem("agenda-share-viewer-username");
      shareView.hidden = true;
      shareStatus.textContent = message;
    }

    function renderSharedAgendaWeek() {
      shareWeek.replaceChildren();
      const dayLabels = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(shareWeekStart);
        date.setDate(date.getDate() + index);
        return {
          date,
          dateKey: formatLocalDate(date),
          dayName: weekdayNames[date.getDay()],
        };
      });
      shareWeekLabel.textContent = `${new Intl.DateTimeFormat(
        getAppLocale(),
        { day: "numeric", month: "long" },
      ).format(dayLabels[0].date)} – ${new Intl.DateTimeFormat(
        getAppLocale(),
        { day: "numeric", month: "long", year: "numeric" },
      ).format(dayLabels[6].date)}`;

      dayLabels.forEach(({ date, dateKey, dayName }) => {
        const daySection = document.createElement("section");
        daySection.className = "agenda-share-day";
        const heading = document.createElement("h3");
        heading.textContent = new Intl.DateTimeFormat(getAppLocale(), {
          weekday: "long",
          day: "numeric",
          month: "short",
        }).format(date);
        daySection.append(heading);

        const dayItems = shareItems
          .filter((entry) => {
            const entryDay = String(entry.day || "").toLowerCase();
            const weekStart = String(entry.week_start || "").slice(0, 10);
            const repeatStartDate = String(
              entry.repeat_start_date || entry.week_start || "",
            ).slice(0, 10);
            const repeatStart = repeatStartDate
              ? new Date(`${repeatStartDate}T12:00:00`)
              : null;
            const repeatPattern = weekStart
              ? "once"
              : entry.repeat_pattern || "weekly";
            if (
              weekStart &&
              weekStart !== formatLocalDate(getWeekStart(date)) &&
              weekStart !== dateKey
            ) {
              return false;
            }
            if (repeatPattern === "once") {
              return entryDay === dayName;
            }
            if (
              repeatStart &&
              dateKey < formatLocalDate(repeatStart)
            ) {
              return false;
            }
            if (repeatPattern === "daily") {
              return true;
            }
            if (repeatPattern === "monthly") {
              return Boolean(
                repeatStart && date.getDate() === repeatStart.getDate(),
              );
            }
            if (repeatPattern === "yearly") {
              return Boolean(
                repeatStart &&
                  date.getDate() === repeatStart.getDate() &&
                  date.getMonth() === repeatStart.getMonth(),
              );
            }
            const repeatDays = Array.isArray(entry.repeat_days)
              ? entry.repeat_days
              : [entryDay];
            return repeatDays.includes(dayName);
          })
          .sort((first, second) =>
            String(first.start_time || "").localeCompare(
              String(second.start_time || ""),
            )
          );

        if (!dayItems.length) {
          const empty = document.createElement("p");
          empty.className = "profiel-uitleg";
          empty.textContent = "Geen afspraken";
          daySection.append(empty);
        }
        dayItems.forEach((entry) => {
          const event = document.createElement("article");
          event.className = "agenda-share-event";
          if (
            typeof entry.color === "string" &&
            window.CSS?.supports("color", entry.color)
          ) {
            event.style.borderLeftColor = entry.color;
          }
          const title = document.createElement("strong");
          title.textContent = entry.title || "Afspraak";
          if (entry.icon) {
            const icon = document.createElement("span");
            icon.className = "agenda-share-event-icon";
            icon.setAttribute("aria-hidden", "true");
            icon.textContent = entry.icon;
            title.prepend(icon);
          }
          const time = document.createElement("div");
          const startTime = String(entry.start_time || "").slice(0, 5);
          const endTime = String(entry.end_time || "").slice(0, 5);
          time.textContent =
            startTime === "00:00" && endTime === "23:59"
              ? "Hele dag"
              : `${startTime}${endTime ? ` - ${endTime}` : ""}`;
          event.append(time, title);
          if (entry.category) {
            const category = document.createElement("div");
            category.textContent = entry.category;
            event.append(category);
          }
          if (entry.description) {
            const description = document.createElement("p");
            description.textContent = entry.description;
            event.append(description);
          }
          daySection.append(event);
        });
        shareWeek.append(daySection);
      });
    }

    async function loadSharedAgenda() {
      if (!shareViewerToken) {
        return;
      }
      const agendaData = await invokeAgendaSharing({
        action: "view-agenda",
        viewerToken: shareViewerToken,
      });
      shareUsername = agendaData.username;
      shareItems = agendaData.items;
      const expiresAt = new Date(agendaData.expiresAt);
      const remaining = expiresAt.getTime() - Date.now();
      if (!Number.isFinite(remaining) || remaining <= 0) {
        clearAgendaShareSession(
          "De kijktoegang is verlopen. Vraag een nieuwe code aan.",
        );
        return;
      }
      window.sessionStorage.setItem(
        "agenda-share-viewer-expiry",
        expiresAt.toISOString(),
      );
      window.sessionStorage.setItem(
        "agenda-share-viewer-username",
        shareUsername,
      );
      shareHeading.textContent = `Agenda van ${shareUsername}`;
      shareExpiry.textContent = `Alleen-lezen toegang tot ${new Intl.DateTimeFormat(
        getAppLocale(),
        { dateStyle: "long", timeStyle: "short" },
      ).format(expiresAt)}.`;
      shareView.hidden = false;
      shareStatus.textContent = "";
      renderSharedAgendaWeek();
      window.clearTimeout(shareExpiryTimer);
      shareExpiryTimer = window.setTimeout(
        () =>
          clearAgendaShareSession(
            "De kijktoegang is verlopen. Vraag een nieuwe code aan.",
          ),
        remaining,
      );
    }

    shareForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = shareForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      shareStatus.textContent = "Code controleren...";
      try {
        const formData = new FormData(shareForm);
        const result = await invokeAgendaSharing({
          action: "redeem-code",
          username: String(formData.get("username")),
          code: String(formData.get("code")),
        });
        shareViewerToken = result.viewerToken;
        shareWeekStart = getWeekStart(new Date());
        window.sessionStorage.setItem(
          "agenda-share-viewer-token",
          shareViewerToken,
        );
        window.sessionStorage.setItem(
          "agenda-share-viewer-username",
          result.username,
        );
        await loadSharedAgenda();
        shareForm.reset();
      } catch (shareError) {
        shareStatus.textContent =
          `De agenda kon niet worden geopend: ${shareError.message}`;
      } finally {
        submitButton.disabled = false;
      }
    });

    shareWeekButtons.previous?.addEventListener("click", async () => {
      shareWeekStart.setDate(shareWeekStart.getDate() - 7);
      await reloadSharedWeek();
    });
    shareWeekButtons.next?.addEventListener("click", async () => {
      shareWeekStart.setDate(shareWeekStart.getDate() + 7);
      await reloadSharedWeek();
    });
    shareWeekButtons.today?.addEventListener("click", async () => {
      shareWeekStart = getWeekStart(new Date());
      await reloadSharedWeek();
    });

    async function reloadSharedWeek() {
      try {
        await loadSharedAgenda();
      } catch (shareError) {
        clearAgendaShareSession(
          `De gedeelde agenda kan niet worden geladen: ${shareError.message}`,
        );
      }
    }

    shareViewerToken = window.sessionStorage.getItem(
      "agenda-share-viewer-token",
    ) || "";
    if (shareViewerToken) {
      const savedExpiry = window.sessionStorage.getItem(
        "agenda-share-viewer-expiry",
      );
      const savedUsername = window.sessionStorage.getItem(
        "agenda-share-viewer-username",
      ) || "";
      if (savedExpiry && new Date(savedExpiry).getTime() <= Date.now()) {
        clearAgendaShareSession(
          "De kijktoegang is verlopen. Vraag een nieuwe code aan.",
        );
      } else {
        shareUsername = savedUsername;
        loadSharedAgenda().catch((shareError) => {
          clearAgendaShareSession(
            `De gedeelde agenda kan niet worden geladen: ${shareError.message}`,
          );
        });
      }
    }

    usernameForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const saveButton = usernameForm.querySelector('button[type="submit"]');
      saveButton.disabled = true;
      usernameStatus.textContent = "Gebruikersnaam opslaan...";
      try {
        const result = await invokeAgendaSharing({
          action: "set-username",
          username: usernameInput.value,
        });
        usernameInput.value = result.username;
        shareCodeOutput.hidden = true;
        usernameStatus.textContent = `Je gebruikersnaam is opgeslagen als ${result.username}.`;
      } catch (usernameError) {
        usernameStatus.textContent =
          `Gebruikersnaam opslaan is niet gelukt: ${usernameError.message}`;
      } finally {
        saveButton.disabled = false;
      }
    });

    shareCodeButton?.addEventListener("click", async () => {
      shareCodeButton.disabled = true;
      shareCodeOutput.hidden = true;
      shareCodeStatus.textContent = "Eenmalige code maken...";
      try {
        const result = await invokeAgendaSharing({ action: "create-code" });
        shareCodeOutput.textContent =
          `Eenmalige code: ${result.code} — geldig tot ${new Intl.DateTimeFormat(
            getAppLocale(),
            { dateStyle: "long", timeStyle: "short" },
          ).format(new Date(result.expiresAt))}. Deel deze code veilig; hij wordt niet opnieuw getoond.`;
        shareCodeOutput.hidden = false;
        shareCodeStatus.textContent =
          "Eerdere codes en kijktoegang zijn beëindigd.";
      } catch (codeError) {
        shareCodeStatus.textContent =
          `Eenmalige code maken is niet gelukt: ${codeError.message}`;
      } finally {
        shareCodeButton.disabled = false;
      }
    });

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
    if (usernameInput) {
      try {
        const usernameData = await invokeAgendaSharing({
          action: "get-username",
        });
        usernameInput.value = usernameData.username;
      } catch (usernameError) {
        usernameStatus.textContent =
          `Je gebruikersnaam kon niet worden geladen: ${usernameError.message}`;
      }
    }
    if (languageSelect && languageForm && languageStatus) {
      const savedLanguage = ["nl", "en", "fr", "de"].includes(
        user.user_metadata?.language,
      )
        ? user.user_metadata.language
        : window.agendaI18n.getLanguage();
      languageSelect.value = savedLanguage;
      window.agendaI18n.setLanguage(savedLanguage);
      languageSelect.addEventListener("change", () => {
        window.agendaI18n.setLanguage(languageSelect.value);
      });
      languageForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const saveButton = languageForm.querySelector('button[type="submit"]');
        saveButton.disabled = true;
        languageStatus.textContent = "Taal opslaan...";
        try {
          const { data: updatedData, error: updateError } =
            await client.auth.updateUser({
              data: {
                ...user.user_metadata,
                language: languageSelect.value,
              },
            });
          if (updateError) {
            throw updateError;
          }
          user = updatedData.user;
          window.agendaI18n.setLanguage(languageSelect.value);
          languageStatus.textContent = "Taal opgeslagen.";
        } catch (updateError) {
          console.error("De taalvoorkeur opslaan is mislukt.", updateError);
          languageStatus.textContent =
            `De taalvoorkeur opslaan is mislukt: ${updateError.message}`;
        } finally {
          saveButton.disabled = false;
        }
      });
    }

    if (recoverySection) {
      recoverySection.hidden = true;
    }
    document.querySelector("#profiel-email").textContent =
      user.email || "E-mailadres niet beschikbaar";
    updateProfileAvatar(avatar, user);
    updateProfileAvatar(profileLink, user);
    accountDetails.hidden = false;
    status.textContent = "Je accountgegevens.";

    if (countrySelect && regionSelect && locationForm && locationStatus) {
      const { country, region, schoolHolidaysEnabled } =
        getHolidayPreferences(user);
      const updateProfileRegions = (selectedRegion) => {
        regionSelect.replaceChildren(
          ...holidayRegionOptions[countrySelect.value].map(
            ([value, label]) => {
              const option = document.createElement("option");
              option.value = value;
              option.textContent = label;
              return option;
            },
          ),
        );
        regionSelect.value = holidayRegionOptions[countrySelect.value].some(
          ([value]) => value === selectedRegion,
        )
          ? selectedRegion
          : holidayRegionOptions[countrySelect.value][0][0];
      };
      countrySelect.value = country;
      updateProfileRegions(region);
      countrySelect.addEventListener("change", () => updateProfileRegions(""));
      locationForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const saveButton = locationForm.querySelector('button[type="submit"]');
        saveButton.disabled = true;
        locationStatus.textContent = "Land en regio opslaan...";
        try {
          const { data: updatedData, error: updateError } =
            await client.auth.updateUser({
              data: {
                ...user.user_metadata,
                country: countrySelect.value,
                region: regionSelect.value,
              },
            });
          if (updateError) {
            throw updateError;
          }
          user = updatedData.user;
          locationStatus.textContent =
            "Land en regio opgeslagen. De agenda gebruikt deze keuze voor de feestdagen.";
        } catch (updateError) {
          console.error("Land en regio opslaan is mislukt.", updateError);
          locationStatus.textContent =
            `Land en regio opslaan is mislukt: ${updateError.message}`;
        } finally {
          saveButton.disabled = false;
        }
      });

      if (schoolHolidaysToggle && schoolHolidaysStatus) {
        let isSchoolHolidaysEnabled = schoolHolidaysEnabled;
        const updateToggleLabel = () => {
          schoolHolidaysToggle.textContent = isSchoolHolidaysEnabled
            ? "Schoolvakanties uitschakelen"
            : "Schoolvakanties inschakelen";
        };
        updateToggleLabel();
        schoolHolidaysToggle.addEventListener("click", async () => {
          const nextEnabled = !isSchoolHolidaysEnabled;
          schoolHolidaysToggle.disabled = true;
          schoolHolidaysStatus.textContent = "Instellingen opslaan...";
          try {
            const { data: updatedData, error: updateError } =
              await client.auth.updateUser({
                data: {
                  ...user.user_metadata,
                  school_holidays_enabled: nextEnabled,
                },
              });
            if (updateError) {
              throw updateError;
            }
            user = updatedData.user;
            isSchoolHolidaysEnabled = nextEnabled;
            updateToggleLabel();
            schoolHolidaysStatus.textContent = nextEnabled
              ? "Schoolvakanties ingeschakeld."
              : "Schoolvakanties uitgeschakeld.";
          } catch (updateError) {
            console.error("Schoolvakanties wijzigen is mislukt.", updateError);
            schoolHolidaysStatus.textContent =
              `Schoolvakanties wijzigen is mislukt: ${updateError.message}`;
          } finally {
            schoolHolidaysToggle.disabled = false;
          }
        });
      }
    }

    if (exportButton && exportStatus) {
      let agendaItems = [];
      let agendaHolidayEntries = [];
      let supportsRepeatDays = true;
      let supportsRepeatStartDate = true;
      exportButton.disabled = true;
      exportStatus.textContent = "Je agenda laden voor export...";
      try {
        let result;
        while (true) {
          const columns = [
            "id",
            "day",
            "start_time",
            "end_time",
            "title",
            "week_start",
            "repeat_pattern",
          ];
          if (supportsRepeatDays) {
            columns.push("repeat_days");
          }
          if (supportsRepeatStartDate) {
            columns.push("repeat_start_date");
          }
          result = await client
            .from("agenda_items")
            .select(columns.join(", "))
            .eq("user_id", user.id)
            .order("start_time", { ascending: true });
          if (!["42703", "PGRST204"].includes(String(result.error?.code))) {
            break;
          }
          const errorMessage = String(result.error.message);
          if (errorMessage.includes("repeat_days") && supportsRepeatDays) {
            supportsRepeatDays = false;
          } else if (
            errorMessage.includes("repeat_start_date") &&
            supportsRepeatStartDate
          ) {
            supportsRepeatStartDate = false;
          } else {
            break;
          }
        }
        if (result.error) {
          throw result.error;
        }
        agendaItems = result.data || [];
        const { country, region, schoolHolidaysEnabled } =
          getHolidayPreferences(user);
        const currentYear = new Date().getFullYear();
        agendaHolidayEntries = getHolidayEntries(
          country,
          region,
          [currentYear, currentYear + 1],
          { schoolHolidaysEnabled },
        );
        exportButton.disabled =
          agendaItems.length + agendaHolidayEntries.length === 0;
        exportStatus.textContent =
          agendaItems.length || agendaHolidayEntries.length
            ? `${agendaItems.length} afspraken en ${agendaHolidayEntries.length} feestdagen klaar om te exporteren.${supportsRepeatDays ? "" : " Meerdaagse herhaling vereist de SQL voor repeat_days."}${supportsRepeatStartDate ? "" : " Maand- en jaarherhaling vereist de SQL voor repeat_start_date."}`
            : "Je hebt nog geen afspraken of feestdagen om te exporteren.";
      } catch (error) {
        console.error("Agenda laden voor exporteren is niet gelukt.", error);
        exportStatus.textContent = `Je agenda kon niet worden klaargezet voor export: ${error.message}`;
      }

      exportButton.addEventListener("click", () => {
        if (!agendaItems.length && !agendaHolidayEntries.length) {
          exportStatus.textContent =
            "Er zijn geen afspraken of feestdagen om te exporteren.";
          return;
        }

        const exportWeekStart = getWeekStart(new Date());
        const exportEntries = [
          ...agendaItems,
          ...agendaHolidayEntries,
        ];
        const events = exportEntries.map((entry) => {
          const escapeText = (value) =>
            String(value)
              .replace(/\\/g, "\\\\")
              .replace(/\n/g, "\\n")
              .replace(/,/g, "\\,")
              .replace(/;/g, "\\;");
          if (entry.isHoliday) {
            const endExclusive = new Date(
              `${entry.holidayEndDate}T12:00:00`,
            );
            endExclusive.setDate(endExclusive.getDate() + 1);
            return [
              "BEGIN:VEVENT",
              `UID:${entry.id}@agenda`,
              `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
              `DTSTART;VALUE=DATE:${entry.holidayStartDate.replace(/-/g, "")}`,
              `DTEND;VALUE=DATE:${formatLocalDate(endExclusive).replace(/-/g, "")}`,
              `SUMMARY:${escapeText(entry.title)}`,
              "END:VEVENT",
            ].join("\r\n");
          }

          const eventDate = entry.week_start
            ? new Date(`${entry.week_start}T12:00:00`)
            : ["monthly", "yearly"].includes(entry.repeat_pattern) &&
                entry.repeat_start_date
              ? new Date(`${entry.repeat_start_date}T12:00:00`)
              : entry.repeat_pattern === "daily"
                ? new Date()
                : new Date(exportWeekStart);
          if (entry.week_start || entry.repeat_pattern === "weekly") {
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
          } else if (
            !entry.week_start &&
            entry.repeat_pattern === "monthly" &&
            entry.repeat_start_date
          ) {
            lines.push(
              `RRULE:FREQ=MONTHLY;BYMONTHDAY=${Number(entry.repeat_start_date.slice(8, 10))}`,
            );
          } else if (
            !entry.week_start &&
            entry.repeat_pattern === "yearly" &&
            entry.repeat_start_date
          ) {
            const month = Number(entry.repeat_start_date.slice(5, 7));
            const day = Number(entry.repeat_start_date.slice(8, 10));
            lines.push(`RRULE:FREQ=YEARLY;BYMONTH=${month};BYMONTHDAY=${day}`);
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

    const importForm = document.querySelector("#profiel-import-form");
    const importInput = document.querySelector("#profiel-import-bestand");
    const importUrlInput = document.querySelector("#profiel-import-url");
    const importButton = document.querySelector("#profiel-importeren");
    const updateButton = document.querySelector("#profiel-agenda-bijwerken");
    const deleteCalendarButton = document.querySelector(
      "#profiel-agenda-verwijderen",
    );
    const importStatus = document.querySelector("#profiel-import-status");
    const savedCalendarUrlKey = `agenda-calendar-url-${user.id}`;
    const importSourceKey = `calendar-url-${user.id}`;
    if (
      importForm &&
      importInput &&
      importUrlInput &&
      importButton &&
      updateButton &&
      deleteCalendarButton &&
      importStatus
    ) {
      importButton.disabled = true;
      let savedCalendarUrl = "";
      try {
        savedCalendarUrl = window.localStorage.getItem(savedCalendarUrlKey) || "";
        if (savedCalendarUrl) {
          importUrlInput.value = savedCalendarUrl;
          updateButton.hidden = false;
        }
      } catch (error) {
        console.error("De opgeslagen agenda-URL kon niet worden gelezen.", error);
        importStatus.textContent =
          "De opgeslagen agenda-URL kon niet worden gelezen. Vul de URL opnieuw in.";
      }

      async function importCalendar(file, calendarUrl) {
        if (Boolean(file) === Boolean(calendarUrl)) {
          importStatus.textContent =
            "Kies een .ics-bestand of vul een URL in, niet allebei.";
          return;
        }

        if (file && file.size > 5 * 1024 * 1024) {
          importStatus.textContent =
            "Dit .ics-bestand is groter dan 5 MB. Kies een kleiner bestand.";
          return;
        }

        importButton.disabled = true;
        updateButton.disabled = true;
        importStatus.textContent = "Agenda importeren...";
        let importedCount = 0;
        let updatedCount = 0;
        let deletedCount = 0;
        let calendarUrlSaved = true;
        let timeoutId;
        try {
          let calendarContent;
          if (file) {
            calendarContent = await file.text();
          } else {
            let url;
            try {
              url = new URL(calendarUrl);
            } catch {
              throw new Error("Vul een geldige agenda-URL in.");
            }
            if (url.protocol !== "https:" || url.username || url.password) {
              throw new Error(
                "Gebruik een openbare https://-URL zonder gebruikersnaam of wachtwoord.",
              );
            }

            if (url.hostname.endsWith(".smartschool.be")) {
              const { data: calendarData, error: calendarError } =
                await client.functions.invoke("smartschool-calendar", {
                  body: { url: url.href },
                });
              if (calendarError) {
                let errorMessage = calendarError.message;
                if (calendarError.context instanceof Response) {
                  try {
                    const errorBody = await calendarError.context
                      .clone()
                      .json();
                    if (typeof errorBody?.error === "string") {
                      errorMessage = errorBody.error;
                    }
                  } catch (error) {
                    console.error(
                      "Smartschool-importfout kon niet worden gelezen.",
                      error,
                    );
                  }
                }
                throw new Error(
                  `Smartschool-agenda ophalen is mislukt: ${errorMessage}`,
                );
              }
              if (typeof calendarData?.calendarContent !== "string") {
                throw new Error(
                  "Smartschool heeft geen geldige agenda-inhoud teruggestuurd.",
                );
              }
              calendarContent = calendarData.calendarContent;
            } else {
              const controller = new AbortController();
              timeoutId = window.setTimeout(() => controller.abort(), 20_000);
              try {
                let response;
                try {
                  response = await fetch(url, {
                    credentials: "omit",
                    signal: controller.signal,
                  });
                } catch (error) {
                  if (error.name === "AbortError") {
                    throw new Error("De URL reageerde niet binnen 20 seconden.");
                  }
                  throw new Error(
                    "De URL kon niet worden opgehaald. Controleer of de link openbaar is en CORS-toegang toestaat.",
                  );
                }

                if (!response.ok) {
                  throw new Error(
                    `De server gaf HTTP ${response.status} terug.`,
                  );
                }
                const contentLength = Number(
                  response.headers.get("content-length"),
                );
                if (contentLength > 5 * 1024 * 1024) {
                  throw new Error(
                    "Dit .ics-bestand is groter dan 5 MB. Kies een kleiner bestand.",
                  );
                }
                if (!response.body) {
                  throw new Error("De URL heeft geen agenda-inhoud teruggestuurd.");
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                const chunks = [];
                let byteLength = 0;
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    break;
                  }
                  byteLength += value.byteLength;
                  if (byteLength > 5 * 1024 * 1024) {
                    await reader.cancel();
                    throw new Error(
                      "Dit .ics-bestand is groter dan 5 MB. Kies een kleiner bestand.",
                    );
                  }
                  chunks.push(decoder.decode(value, { stream: true }));
                }
                chunks.push(decoder.decode());
                calendarContent = chunks.join("");
              } catch (error) {
                if (error.name === "AbortError") {
                  throw new Error("De URL reageerde niet binnen 20 seconden.");
                }
                throw error;
              } finally {
                window.clearTimeout(timeoutId);
                timeoutId = undefined;
              }
            }
          }

          const {
            events,
            skippedCount,
            skippedUids,
            cancelledUids,
          } = parseIcalendarEvents(calendarContent);
          if (!events.length && (!calendarUrl || !cancelledUids.length)) {
            importStatus.textContent =
              "Geen importeerbare afspraken gevonden. Terugkerende, ongeldige of meerdaagse afspraken met tijden zijn overgeslagen.";
            return;
          }

          if (!calendarUrl) {
            for (let index = 0; index < events.length; index += 100) {
              const batch = events.slice(index, index + 100).map((item) => {
                const { import_uid, import_instance, ...agendaItem } = item;
                return { ...agendaItem, user_id: user.id };
              });
              const { error: importError } = await client
                .from("agenda_items")
                .insert(batch);
              if (importError) {
                throw new Error(
                  importedCount
                    ? `${importedCount} afspraken zijn al toegevoegd. ${importError.message}`
                    : importError.message,
                );
              }
              importedCount += batch.length;
            }
          } else {
            const { data: sourceRows, error: sourceError } = await client
              .from("agenda_items")
              .select(
                "id, import_uid, import_instance, day, start_time, end_time, title, week_start",
              )
              .eq("user_id", user.id)
              .eq("import_source_key", importSourceKey);
            if (sourceError) {
              throw sourceError;
            }

            const { data: legacyRows, error: legacyError } = await client
              .from("agenda_items")
              .select(
                "id, day, start_time, end_time, title, week_start",
              )
              .eq("user_id", user.id)
              .is("import_source_key", null)
              .is("import_uid", null);
            if (legacyError) {
              throw legacyError;
            }

            const makeFingerprint = (item) =>
              JSON.stringify([
                item.week_start,
                item.day,
                String(item.start_time).slice(0, 5),
                item.end_time ? String(item.end_time).slice(0, 5) : "",
                item.title,
              ]);
            const legacyByFingerprint = new Map();
            legacyRows.forEach((row) => {
              const fingerprint = makeFingerprint(row);
              const matches = legacyByFingerprint.get(fingerprint) || [];
              matches.push(row);
              legacyByFingerprint.set(fingerprint, matches);
            });

            const activeKeys = new Set();
            const pendingUpserts = [];
            for (const item of events) {
              const key = `${item.import_uid}\u0000${item.import_instance}`;
              activeKeys.add(key);
              const legacyMatches =
                legacyByFingerprint.get(makeFingerprint(item)) || [];
              const legacyMatch = legacyMatches.shift();
              if (legacyMatch) {
                const { data: adoptedRow, error: adoptError } = await client
                  .from("agenda_items")
                  .update({
                    import_source_key: importSourceKey,
                    import_uid: item.import_uid,
                    import_instance: item.import_instance,
                    description: item.description || null,
                  })
                  .eq("id", legacyMatch.id)
                  .eq("user_id", user.id)
                  .is("import_source_key", null)
                  .is("import_uid", null)
                  .select("id")
                  .maybeSingle();
                if (adoptError) {
                  throw adoptError;
                }
                if (adoptedRow) {
                  updatedCount += 1;
                  continue;
                }
              }
              pendingUpserts.push({
                ...item,
                user_id: user.id,
                import_source_key: importSourceKey,
              });
            }

            for (
              let index = 0;
              index < pendingUpserts.length;
              index += 100
            ) {
              const batch = pendingUpserts.slice(index, index + 100);
              const { data: upsertedRows, error: upsertError } = await client
                .from("agenda_items")
                .upsert(batch, {
                  onConflict:
                    "user_id,import_source_key,import_uid,import_instance",
                })
                .select("id");
              if (upsertError) {
                throw new Error(
                  importedCount || updatedCount
                    ? `${importedCount + updatedCount} afspraken zijn al bijgewerkt. ${upsertError.message}`
                    : upsertError.message,
                );
              }
              importedCount += upsertedRows?.length || batch.length;
            }

            const skippedUidSet = new Set(skippedUids);
            const cancelledUidSet = new Set(cancelledUids);
            const staleIds = sourceRows
              .filter((row) => {
                const key = `${row.import_uid}\u0000${row.import_instance}`;
                return (
                  !activeKeys.has(key) &&
                  (cancelledUidSet.has(row.import_uid) ||
                    !skippedUidSet.has(row.import_uid))
                );
              })
              .map((row) => row.id);
            for (let index = 0; index < staleIds.length; index += 100) {
              const batch = staleIds.slice(index, index + 100);
              const { error: deleteError } = await client
                .from("agenda_items")
                .delete()
                .eq("user_id", user.id)
                .eq("import_source_key", importSourceKey)
                .in("id", batch);
              if (deleteError) {
                throw new Error(
                  `De afspraken zijn bijgewerkt, maar ${staleIds.length - deletedCount} oude afspraken konden niet worden verwijderd: ${deleteError.message}`,
                );
              }
              deletedCount += batch.length;
            }

            savedCalendarUrl = calendarUrl;
            importUrlInput.value = calendarUrl;
            updateButton.hidden = false;
            try {
              window.localStorage.setItem(
                savedCalendarUrlKey,
                savedCalendarUrl,
              );
            } catch (error) {
              console.error("De agenda-URL kon niet worden opgeslagen.", error);
              calendarUrlSaved = false;
            }
          }

          importStatus.textContent = calendarUrl
            ? `Agenda bijgewerkt: ${importedCount} nieuwe of gewijzigde afspraken, ${updatedCount} bestaande afspraken gekoppeld, ${deletedCount} verwijderde afspraken opgeruimd en ${skippedCount} niet-ondersteunde afspraken overgeslagen.${calendarUrlSaved ? "" : " De URL kon niet worden bewaard; plak hem volgende keer opnieuw."}`
            : `Importeren is gelukt: ${importedCount} afspraken toegevoegd, ${skippedCount} afspraken overgeslagen (terugkerend of niet ondersteund).`;
          if (file) {
            importForm.reset();
          }
        } catch (error) {
          console.error("Agenda importeren is mislukt.", error);
          importStatus.textContent = `Agenda importeren is mislukt: ${error.message}`;
        } finally {
          importButton.disabled = false;
          updateButton.disabled = false;
        }
      }

      importForm.addEventListener("submit", (event) => {
        event.preventDefault();
        importCalendar(
          importInput.files?.[0],
          importUrlInput.value.trim(),
        );
      });
      importInput.addEventListener("change", () => {
        if (importInput.files?.length) {
          importUrlInput.value = "";
        }
      });
      importUrlInput.addEventListener("input", () => {
        if (importUrlInput.value.trim()) {
          importInput.value = "";
        }
      });
      updateButton.addEventListener("click", () => {
        if (savedCalendarUrl) {
          importCalendar(null, savedCalendarUrl);
        }
      });
      deleteCalendarButton.addEventListener("click", async () => {
        importButton.disabled = true;
        updateButton.disabled = true;
        deleteCalendarButton.disabled = true;
        importStatus.textContent = "Geïmporteerde afspraken zoeken...";
        let deletedCount = 0;
        try {
          const calendarFile = importInput.files?.[0];
          const calendarFingerprints = new Set();
          if (calendarFile) {
            if (calendarFile.size > 5 * 1024 * 1024) {
              throw new Error(
                "Dit .ics-bestand is groter dan 5 MB. Kies een kleiner bestand.",
              );
            }
            const parsedCalendar = parseIcalendarEvents(
              await calendarFile.text(),
            );
            if (!parsedCalendar.events.length) {
              throw new Error(
                "In dit .ics-bestand zijn geen afspraken gevonden om te verwijderen.",
              );
            }
            const makeFingerprint = (item) =>
              JSON.stringify([
                item.week_start,
                item.day,
                String(item.start_time).slice(0, 5),
                item.end_time ? String(item.end_time).slice(0, 5) : "",
                item.title,
              ]);
            parsedCalendar.events.forEach((item) => {
              calendarFingerprints.add(makeFingerprint(item));
              const date = new Date(`${item.week_start}T12:00:00`);
              const dayOffset =
                (weekdayNames.indexOf(item.day) + 6) % 7;
              date.setDate(date.getDate() + dayOffset);
              calendarFingerprints.add(
                makeFingerprint({
                  ...item,
                  week_start: formatLocalDate(date),
                }),
              );
            });
          }

          const { count: taggedCount, error: countError } = await client
            .from("agenda_items")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("import_source_key", importSourceKey);
          if (countError) {
            throw countError;
          }

          const matchingFileIds = [];
          if (calendarFingerprints.size) {
            const pageSize = 500;
            let offset = 0;
            while (true) {
              const { data: rows, error: rowsError } = await client
                .from("agenda_items")
                .select(
                  "id, day, start_time, end_time, title, week_start",
                )
                .eq("user_id", user.id)
                .is("import_source_key", null)
                .is("import_uid", null)
                .order("id", { ascending: true })
                .range(offset, offset + pageSize - 1);
              if (rowsError) {
                throw rowsError;
              }
              (rows || []).forEach((row) => {
                const fingerprint = JSON.stringify([
                  row.week_start,
                  row.day,
                  String(row.start_time).slice(0, 5),
                  row.end_time ? String(row.end_time).slice(0, 5) : "",
                  row.title,
                ]);
                if (calendarFingerprints.has(fingerprint)) {
                  matchingFileIds.push(row.id);
                }
              });
              if (!rows || rows.length < pageSize) {
                break;
              }
              offset += rows.length;
            }
          }

          const matchedCount = matchingFileIds.length;
          const totalCount = (taggedCount || 0) + matchedCount;
          if (!totalCount) {
            importStatus.textContent = calendarFile
              ? "Er zijn geen afspraken gevonden die overeenkomen met dit bestand. Controleer of je hetzelfde .ics-bestand hebt gekozen."
              : "Geen gekoppelde agenda-afspraken gevonden. Kies hierboven hetzelfde .ics-bestand als je de agenda als bestand had geïmporteerd.";
            return;
          }
          const confirmation = calendarFile
            ? `${totalCount} afspraken verwijderen: afspraken die bij deze .ics-inhoud passen${taggedCount ? ` en ${taggedCount} gekoppelde URL-afspraken` : ""}? Eigen afspraken met exact dezelfde titel, datum en tijden kunnen ook worden verwijderd. Dit kan niet ongedaan worden gemaakt.`
            : `${taggedCount} afspraken van de gekoppelde agenda-URL verwijderen? Eigen afspraken blijven staan. Dit kan niet ongedaan worden gemaakt.`;
          if (!window.confirm(confirmation)) {
            importStatus.textContent = "Verwijderen geannuleerd.";
            return;
          }

          importStatus.textContent = "Geïmporteerde afspraken verwijderen...";
          if (taggedCount) {
            const { error: deleteError } = await client
              .from("agenda_items")
              .delete()
              .eq("user_id", user.id)
              .eq("import_source_key", importSourceKey);
            if (deleteError) {
              throw deleteError;
            }
            deletedCount += taggedCount;
          }
          for (
            let index = 0;
            index < matchingFileIds.length;
            index += 100
          ) {
            const { error: deleteError } = await client
              .from("agenda_items")
              .delete()
              .eq("user_id", user.id)
              .in("id", matchingFileIds.slice(index, index + 100));
            if (deleteError) {
              throw deleteError;
            }
            deletedCount += matchingFileIds.slice(index, index + 100).length;
          }

          savedCalendarUrl = "";
          importUrlInput.value = "";
          importInput.value = "";
          updateButton.hidden = true;
          let savedUrlRemoved = true;
          try {
            window.localStorage.removeItem(savedCalendarUrlKey);
          } catch (error) {
            console.error(
              "De opgeslagen agenda-URL kon niet worden verwijderd.",
              error,
            );
            savedUrlRemoved = false;
          }
          importStatus.textContent =
            `${totalCount} afspraken van de geïmporteerde agenda verwijderd.${savedUrlRemoved ? "" : " De URL kon niet uit deze browser worden verwijderd."}`;
        } catch (error) {
          console.error("Geïmporteerde afspraken verwijderen is mislukt.", error);
          importStatus.textContent =
            `${deletedCount ? `${deletedCount} afspraken zijn al verwijderd. ` : ""}De geïmporteerde agenda kon niet volledig worden verwijderd: ${error.message}`;
        } finally {
          importButton.disabled = false;
          updateButton.disabled = false;
          deleteCalendarButton.disabled = false;
        }
      });
      importButton.disabled = false;
      updateButton.disabled = false;
      deleteCalendarButton.disabled = false;
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
      body.dark-mode h1, body.dark-mode h2, body.dark-mode .agenda-day-heading, body.dark-mode .notities-balk h2, body.dark-mode .notitie-editor h2, body.dark-mode .notitie-kaart h2, body.dark-mode .links-header h2, body.dark-mode .todo-balk h2 { color: #e5e7eb !important; }
      body.dark-mode p, body.dark-mode .pagina-intro, body.dark-mode .profiel-uitleg, body.dark-mode #profiel-status, body.dark-mode #profiel-import-status, body.dark-mode .notitie-tekst, body.dark-mode .notitie-datum, body.dark-mode .notities-status, body.dark-mode .todo-status, body.dark-mode .todo-teller { color: #cbd5e1 !important; }
      body.dark-mode .agenda-container, body.dark-mode .agenda-day-panel, body.dark-mode .agenda-account, body.dark-mode .agenda-item-form, body.dark-mode .profiel-container, body.dark-mode .notitie-editor, body.dark-mode .notitie-kaart, body.dark-mode .notities-aanmelden, body.dark-mode .links-kaart, body.dark-mode .links-formulier, body.dark-mode .todo-paneel, body.dark-mode .todo-formulier, body.dark-mode .todo-aanmelden, body.dark-mode .agenda-share-day { border-color: #374151 !important; background: #1f2937 !important; color: #e5e7eb !important; }
      body.dark-mode .agenda-day-panel li, body.dark-mode .agenda-item { border-color: #475569; background: #273449 !important; color: #f3f4f6; }
      body.dark-mode input, body.dark-mode select, body.dark-mode textarea, body.dark-mode .agenda-item-actions button, body.dark-mode #profiel-foto-knop, body.dark-mode #profiel-exporteren, body.dark-mode #profiel-importeren, body.dark-mode #profiel-agenda-bijwerken, body.dark-mode .notitie-knop-secundair, body.dark-mode .notitie-knop-verwijderen, body.dark-mode .links-knop-secundair, body.dark-mode .links-knop-verwijderen, body.dark-mode .todo-invoer input, body.dark-mode .todo-knop-secundair, body.dark-mode .todo-knop-verwijderen, body.dark-mode .todo-filter, body.dark-mode .profiel-delen button, body.dark-mode .profiel-deel-navigatie button { border-color: #4b5563 !important; background: #111827 !important; color: #f3f4f6 !important; }
      body.dark-mode .dagen-navigatie a, body.dark-mode .functies-menu summary, body.dark-mode .functies-menu-link, body.dark-mode .agenda-week-navigation button { border-color: #4b5563 !important; background: #1f2937 !important; color: #e5e7eb !important; }
      body.dark-mode .dagen-navigatie a:hover, body.dark-mode .dagen-navigatie a:focus-visible, body.dark-mode .functies-menu[open] summary, body.dark-mode .functies-menu-link:hover, body.dark-mode .functies-menu-link:focus-visible, body.dark-mode .agenda-week-navigation button:hover, body.dark-mode .agenda-week-navigation button:focus-visible { background: #374151 !important; }
      body.dark-mode .functies-menu-link[aria-current="page"] { background: #374151 !important; }
      body.dark-mode .agenda-week-label, body.dark-mode .agenda-account-message, body.dark-mode .notitie-veld, body.dark-mode .links-status, body.dark-mode .links-login { color: #d1d5db !important; }
      body.dark-mode .agenda-item-actions button { color: #e5e7eb !important; }
      body.dark-mode .todo-item { border-color: #475569; background: #273449; color: #f3f4f6; }
      body.dark-mode .todo-item.is-voltooid .todo-tekst { color: #94a3b8 !important; }
      body.dark-mode .todo-leeg { border-color: #475569; color: #cbd5e1 !important; }
      body.dark-mode .todo-filter[aria-pressed="true"] { border-color: #64748b !important; background: #374151 !important; }
      body.dark-mode .agenda-share-event { background: #273449; }
      body.dark-mode .agenda-share-event p { color: #cbd5e1 !important; }
      body.dark-mode .profiel-code-uitvoer { border-color: #475569; background: #111827; color: #e5e7eb; }
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
  if (!menu.querySelector('a[href="todo.html"]')) {
    const todoLink = document.createElement("a");
    todoLink.className = "functies-menu-link";
    todoLink.href = "todo.html";
    todoLink.textContent = "Todo";
    menu.append(todoLink);
  }
  menu.querySelectorAll(".functies-menu-link").forEach((link) => {
    if (link.getAttribute("href") === currentPage.toLowerCase()) {
      link.setAttribute("aria-current", "page");
    }
  });
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
      .functies-menu-link:nth-child(2) { top: calc(100% + 4px); }
      .functies-menu-link:nth-child(3) { top: calc(100% + 46px); }
      .functies-menu-link:nth-child(4) { top: calc(100% + 88px); }
      .functies-thema-knop { top: calc(100% + 130px) !important; width: 100%; text-align: left; cursor: pointer; font-family: inherit; }
      .functies-menu-link:hover, .functies-menu-link:focus-visible, .functies-menu-link[aria-current="page"] { background: #e8f1ff; }
    `;
    document.head.append(style);
  }
}

async function initializeTodoPage() {
  const form = document.querySelector("#todo-formulier");
  const formTitle = document.querySelector("#todo-formulier-titel");
  const newTaskButton = document.querySelector("#todo-nieuw");
  const input = document.querySelector("#todo-invoer");
  const saveButton = document.querySelector("#todo-bewaren");
  const cancelButton = document.querySelector("#todo-annuleren");
  const list = document.querySelector("#todo-lijst");
  const emptyMessage = document.querySelector("#todo-leeg");
  const count = document.querySelector("#todo-teller");
  const progress = document.querySelector("#todo-progress");
  const status = document.querySelector("#todo-status");
  const loginPrompt = document.querySelector("#todo-aanmelden");
  const todoPanel = document.querySelector("#todo-paneel");
  const filterButtons = [...document.querySelectorAll(".todo-filter")];
  let tasks = [];
  let user = null;
  let editingId = null;
  let formOpen = false;
  let activeFilter = "alle";
  let requestNumber = 0;

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.dataset.state = isError ? "error" : "info";
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

    function renderTasks() {
      const visibleTasks = tasks.filter((task) => {
        if (activeFilter === "open") {
          return !task.completed;
        }
        if (activeFilter === "voltooid") {
          return task.completed;
        }
        return true;
      });

      list.replaceChildren();
      visibleTasks.forEach((task) => {
        const item = document.createElement("li");
        item.className = "todo-item";
        item.classList.toggle("is-voltooid", task.completed);

        const checkbox = document.createElement("input");
        checkbox.className = "todo-checkbox";
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute(
          "aria-label",
          `Markeer "${task.task}" als voltooid`,
        );
        checkbox.addEventListener("change", async () => {
          checkbox.disabled = true;
          try {
            await updateTask(task.id, { completed: checkbox.checked });
          } catch (error) {
            console.error("Taakstatus opslaan is mislukt.", error);
            showStatus(`Taakstatus opslaan is mislukt: ${error.message}`, true);
            checkbox.checked = task.completed;
          } finally {
            checkbox.disabled = false;
          }
        });

        const text = document.createElement("span");
        text.className = "todo-tekst";
        text.textContent = task.task;

        const actions = document.createElement("div");
        actions.className = "todo-acties";
        const editButton = document.createElement("button");
        editButton.className = "todo-knop todo-knop-secundair";
        editButton.type = "button";
        editButton.textContent = "Bewerken";
        editButton.setAttribute("aria-label", `Bewerk taak: ${task.task}`);
        editButton.addEventListener("click", () => startEditing(task));

        const deleteButton = document.createElement("button");
        deleteButton.className = "todo-knop todo-knop-verwijderen";
        deleteButton.type = "button";
        deleteButton.textContent = "Verwijderen";
        deleteButton.setAttribute("aria-label", `Verwijder taak: ${task.task}`);
        deleteButton.addEventListener("click", async () => {
          deleteButton.disabled = true;
          try {
            const { data, error } = await client
              .from("todo_tasks")
              .delete()
              .eq("id", task.id)
              .eq("user_id", user.id)
              .select("id")
              .maybeSingle();
            if (error) {
              throw error;
            }
            if (!data) {
              throw new Error(
                "De taak is niet verwijderd. Controleer je account en de RLS-beveiligingsregels.",
              );
            }
            if (editingId === task.id) {
              stopEditing();
            }
            showStatus("Taak verwijderd.");
            await loadTasks();
          } catch (error) {
            deleteButton.disabled = false;
            console.error("Taak verwijderen is mislukt.", error);
            showStatus(`Taak verwijderen is mislukt: ${error.message}`, true);
          }
        });

        actions.append(editButton, deleteButton);
        item.append(checkbox, text, actions);
        list.append(item);
      });

      const completedCount = tasks.filter((task) => task.completed).length;
      count.textContent = `${completedCount} van ${tasks.length} voltooid`;
      progress.setAttribute("aria-valuemax", tasks.length);
      progress.setAttribute("aria-valuenow", completedCount);
      progress.querySelector(".todo-voortgang-vulling").style.width =
        `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%`;
      emptyMessage.hidden = visibleTasks.length > 0;
      emptyMessage.textContent =
        tasks.length === 0
          ? "Nog geen taken. Voeg hierboven je eerste taak toe."
          : "Geen taken in deze selectie.";
    }

    async function loadTasks() {
      if (!user) {
        return;
      }

      const currentRequest = ++requestNumber;
      showStatus("Je taken laden...");
      const { data, error } = await client
        .from("todo_tasks")
        .select("id, user_id, task, completed, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) {
        throw error;
      }
      if (currentRequest !== requestNumber) {
        return;
      }

      tasks = data || [];
      renderTasks();
      showStatus(
        tasks.length
          ? `${tasks.length} ${tasks.length === 1 ? "taak" : "taken"} geladen.`
          : "Je taken zijn geladen.",
      );
    }

    async function updateTask(id, changes) {
      const { data, error } = await client
        .from("todo_tasks")
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        throw new Error(
          "De taak is niet bijgewerkt. Controleer je account en de RLS-beveiligingsregels.",
        );
      }
      await loadTasks();
    }

    function startEditing(task) {
      editingId = task.id;
      input.value = task.task;
      formTitle.textContent = "Taak bewerken";
      saveButton.textContent = "Wijziging opslaan";
      cancelButton.hidden = false;
      formOpen = true;
      form.hidden = false;
      newTaskButton.setAttribute("aria-expanded", "true");
      input.focus();
    }

    function startNewTask() {
      editingId = null;
      form.reset();
      formTitle.textContent = "Nieuwe taak";
      saveButton.textContent = "Taak toevoegen";
      cancelButton.hidden = false;
      formOpen = true;
      form.hidden = false;
      newTaskButton.setAttribute("aria-expanded", "true");
      input.focus();
    }

    function stopEditing() {
      editingId = null;
      form.reset();
      formTitle.textContent = "Nieuwe taak";
      saveButton.textContent = "Taak toevoegen";
      cancelButton.hidden = true;
      formOpen = false;
      form.hidden = true;
      newTaskButton.setAttribute("aria-expanded", "false");
    }

    function updateSignedInState(signedInUser) {
      user = signedInUser;
      applyUserLanguage(user);
      loginPrompt.hidden = Boolean(user);
      form.hidden = !user || !formOpen;
      todoPanel.hidden = !user;

      if (user) {
        loadTasks().catch((error) => {
          console.error("Taken konden niet worden geladen.", error);
          showStatus(
            `Taken konden niet worden geladen: ${error.message}. Controleer of de tabel todo_tasks en de beveiligingsregels in Supabase zijn aangemaakt.`,
            true,
          );
        });
      } else {
        requestNumber += 1;
        tasks = [];
        list.replaceChildren();
        count.textContent = "";
        emptyMessage.hidden = true;
        stopEditing();
        showStatus("Log in via je agenda-account om je taken te bekijken.");
      }
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!user) {
        showStatus("Log eerst in om een taak op te slaan.", true);
        return;
      }

      const taskText = input.value.trim();
      if (!taskText) {
        input.focus();
        return;
      }

      saveButton.disabled = true;
      try {
        if (editingId) {
          const taskId = editingId;
          await updateTask(taskId, { task: taskText });
          stopEditing();
          showStatus("Taak bijgewerkt.");
        } else {
          const { error } = await client.from("todo_tasks").insert({
            user_id: user.id,
            task: taskText,
          });
          if (error) {
            throw error;
          }
          form.reset();
          showStatus("Taak opgeslagen.");
          await loadTasks();
          stopEditing();
        }
      } catch (error) {
        console.error("Taak opslaan is mislukt.", error);
        showStatus(
          `Taak opslaan is mislukt: ${error.message}. Controleer of de tabel todo_tasks en de beveiligingsregels in Supabase zijn aangemaakt.`,
          true,
        );
      } finally {
        saveButton.disabled = false;
      }
    });

    newTaskButton.addEventListener("click", startNewTask);
    cancelButton.addEventListener("click", stopEditing);
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        filterButtons.forEach((filterButton) => {
          filterButton.setAttribute(
            "aria-pressed",
            String(filterButton === button),
          );
        });
        renderTasks();
      });
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
    console.error("De todo-pagina kon niet worden gestart.", error);
    showStatus(`De todo-pagina kon niet worden gestart: ${error.message}`, true);
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
          editor.hidden = false;
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
      applyUserLanguage(user);
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
      applyUserLanguage(user);
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
} else if (currentPage.toLowerCase() === "todo.html") {
  initializeTodoPage();
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
    let supportsRepeatStartDate = true;
    let supportsCategories = true;
    let supportsDescriptions = true;
    let supportsIcons = true;
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

      const dayHeader = document.createElement("div");
      dayHeader.className = "agenda-day-header";
      dayHeader.append(heading);

      const indicator = document.createElement("div");
      indicator.className = "agenda-time-indicators";
      indicator.setAttribute("aria-hidden", "true");

      const dayList =
        day === weekdayNames[currentPageWeekday]
          ? list
          : document.createElement("ul");
      panel.append(dayHeader, indicator, dayList);
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
      .agenda-day-header { display: flex; min-width: 0; flex-direction: column; align-items: stretch; gap: 5px; margin-bottom: 12px; }
      .agenda-day-heading { order: 1; min-width: 0; margin: 0; color: #183153; font-size: 16px; }
      .agenda-day-panel ul.agenda-all-day-list { order: 0; display: flex; min-width: 0; margin: 0; padding: 0; }
      .agenda-day-panel li.agenda-all-day-item { min-width: 0; padding: 5px 7px; font-size: 11px; }
      .agenda-all-day-item .agenda-item-time { display: none; }
      .agenda-all-day-item .agenda-item-title { display: block; overflow: hidden; font-size: 11px; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
      .agenda-all-day-item .agenda-category-badge { display: none; }
      .agenda-day-panel ul { min-width: 0; }
      .agenda-day-panel li { overflow-wrap: anywhere; padding: 10px; font-size: 13px; }
      .agenda-day-panel li.agenda-overlap-group { position: static; min-width: 0; padding: 0; border: 0; border-left: 0; border-radius: 0; background: transparent; box-shadow: none; }
      .agenda-day-panel ul.agenda-overlap-items { display: grid; grid-template-columns: repeat(var(--agenda-overlap-columns), minmax(0, 1fr)); gap: 10px; }
      .agenda-day-panel ul.agenda-overlap-items > li { min-width: 0; padding: 6px 4px; font-size: 10px; }
      .agenda-overlap-items .agenda-item-time { display: block; margin-bottom: 3px; color: #183153; font-size: 10px; font-weight: 800; line-height: 1.15; overflow-wrap: anywhere; }
      .agenda-overlap-items .agenda-item-title { display: -webkit-box; overflow: hidden; font-size: 10px; line-height: 1.25; text-overflow: ellipsis; -webkit-box-orient: vertical; -webkit-line-clamp: 1; }
      .agenda-overlap-items .agenda-category-badge { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .agenda-day-panel li.agenda-item.planning-actief { position: relative; z-index: 12; order: -1; }
      .agenda-day-panel li.agenda-item.is-overlap-expanded { position: absolute; z-index: 20; right: 0; left: 0; width: auto; padding: 10px; font-size: 13px; box-shadow: 0 6px 18px rgb(24 49 83 / 28%); }
      .agenda-overlap-items .agenda-item.is-overlap-expanded .agenda-item-time { display: inline; margin: 0; font-size: inherit; }
      .agenda-overlap-items .agenda-item.is-overlap-expanded .agenda-item-title { display: inline; overflow: visible; font-size: inherit; line-height: inherit; text-overflow: clip; -webkit-line-clamp: unset; }
      body.dark-mode .agenda-day-panel li.agenda-overlap-group { border-color: transparent !important; border-left-color: transparent !important; background: transparent !important; box-shadow: none !important; }
      body.dark-mode .agenda-overlap-items .agenda-item-time { color: #e5e7eb; }
      .agenda-detail-dialog { width: min(940px, calc(100vw - 32px)); max-width: none; max-height: min(780px, calc(100dvh - 32px)); padding: 0; overflow: hidden; border: 0; border-radius: 16px; background: #fff; color: #1f2937; box-shadow: 0 24px 80px rgb(15 23 42 / 35%); }
      .agenda-detail-dialog::backdrop { background: rgb(15 23 42 / 48%); backdrop-filter: blur(2px); }
      .agenda-detail-shell { display: grid; max-height: inherit; grid-template-rows: auto minmax(0, 1fr) auto; }
      .agenda-detail-header { display: flex; align-items: center; gap: 14px; padding: 20px 24px; background: #ffd8d2; }
      .agenda-detail-icon { display: grid; width: 42px; height: 42px; flex: 0 0 auto; place-items: center; border-radius: 12px; background: #fff; color: #c1442e; font-size: 22px; }
      .agenda-detail-heading { min-width: 0; flex: 1; }
      .agenda-detail-heading p { margin: 0 0 3px; color: #895b54; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      .agenda-detail-heading h2 { margin: 0; color: #53342f; font-size: clamp(18px, 3vw, 25px); line-height: 1.25; overflow-wrap: anywhere; }
      .agenda-detail-close { display: grid; width: 38px; height: 38px; flex: 0 0 auto; place-items: center; border: 0; border-radius: 50%; background: transparent; color: #68443e; cursor: pointer; font: inherit; font-size: 25px; }
      .agenda-detail-close:hover, .agenda-detail-close:focus-visible { background: rgb(255 255 255 / 65%); }
      .agenda-detail-main { display: grid; min-height: 0; grid-template-columns: minmax(0, 1fr) 260px; gap: 24px; padding: 24px; overflow-y: auto; }
      .agenda-detail-description h3 { margin: 0 0 10px; color: #183153; font-size: 16px; }
      .agenda-detail-description p { margin: 0; color: #344256; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
      .agenda-detail-empty { color: #64748b !important; }
      .agenda-detail-info { align-self: start; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; box-shadow: 0 4px 14px rgb(24 49 83 / 8%); }
      .agenda-detail-info h3 { margin: 0 0 12px; color: #183153; font-size: 15px; }
      .agenda-detail-info dl { display: grid; gap: 12px; margin: 0; }
      .agenda-detail-info dt { margin-bottom: 3px; color: #64748b; font-size: 12px; }
      .agenda-detail-info dd { margin: 0; color: #26364a; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
      .agenda-detail-footer { display: flex; justify-content: flex-end; padding: 12px 24px; border-top: 1px solid #e2e8f0; }
      .agenda-detail-footer button { min-height: 40px; padding: 8px 18px; border: 0; border-radius: 8px; background: #183153; color: #fff; cursor: pointer; font: inherit; font-weight: 600; }
      .agenda-detail-footer button:hover, .agenda-detail-footer button:focus-visible { background: #25466f; }
      body.dark-mode .agenda-detail-dialog { background: #1f2937; color: #e5e7eb; }
      body.dark-mode .agenda-detail-heading h2, body.dark-mode .agenda-detail-description h3, body.dark-mode .agenda-detail-info h3 { color: #f3f4f6; }
      body.dark-mode .agenda-detail-description p, body.dark-mode .agenda-detail-info dd { color: #d1d5db; }
      body.dark-mode .agenda-detail-info { border-color: #374151; background: #111827; }
      body.dark-mode .agenda-detail-footer { border-color: #374151; }
      @media (max-width: 600px) {
        .agenda-detail-dialog { width: calc(100vw - 20px); max-height: calc(100dvh - 20px); border-radius: 12px; }
        .agenda-detail-header { gap: 10px; padding: 16px; }
        .agenda-detail-main { grid-template-columns: 1fr; gap: 18px; padding: 18px; }
        .agenda-detail-footer { padding: 10px 18px; }
      }
      .agenda-filters { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 16px; }
      .agenda-filter-field { display: grid; min-width: 160px; flex: 1; gap: 5px; color: #334155; font-size: 13px; font-weight: 600; }
      .agenda-filter-field input, .agenda-filter-field select { width: 100%; min-height: 42px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #1f2937; font: inherit; font-size: 16px; }
      .agenda-search-field { flex-basis: 240px; }
      .agenda-category-badge { display: inline-block; margin: 5px 5px 0 0; padding: 2px 6px; border-radius: 999px; background: #e8f1ff; color: #183153; font-size: 11px; }
      .agenda-time-indicators { position: absolute; z-index: 30; inset: 0; pointer-events: none; }
      .agenda-time-indicator { position: absolute; height: 2px; background: #e5484d; }
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

    const detailDialog = document.createElement("dialog");
    detailDialog.className = "agenda-detail-dialog";
    detailDialog.setAttribute("aria-labelledby", "agenda-detail-title");
    detailDialog.innerHTML = `
      <div class="agenda-detail-shell">
        <header class="agenda-detail-header">
          <span class="agenda-detail-icon" aria-hidden="true"></span>
          <div class="agenda-detail-heading">
            <p>Afspraak bekijken</p>
            <h2 id="agenda-detail-title"></h2>
          </div>
          <button class="agenda-detail-close" type="button" aria-label="Sluiten">×</button>
        </header>
        <main class="agenda-detail-main">
          <section class="agenda-detail-description">
            <h3>Wat moet je doen?</h3>
            <p></p>
          </section>
          <aside class="agenda-detail-info">
            <h3>Afspraakgegevens</h3>
            <dl>
              <div><dt>Datum</dt><dd data-detail-date></dd></div>
              <div><dt>Tijd</dt><dd data-detail-time></dd></div>
              <div data-detail-category-row><dt>Categorie</dt><dd data-detail-category></dd></div>
            </dl>
          </aside>
        </main>
        <footer class="agenda-detail-footer">
          <button type="button" data-detail-close>Sluiten</button>
        </footer>
      </div>
    `;
    document.body.append(detailDialog);
    const closeDetailButton = detailDialog.querySelector(".agenda-detail-close");
    const closeDetailFooterButton = detailDialog.querySelector("[data-detail-close]");
    const closeDetails = () => detailDialog.close();
    closeDetailButton.addEventListener("click", closeDetails);
    closeDetailFooterButton.addEventListener("click", closeDetails);
    detailDialog.addEventListener("click", (event) => {
      if (event.target === detailDialog) {
        closeDetails();
      }
    });

    function showAgendaDetails(entry, day, endTime) {
      detailDialog.querySelector(".agenda-detail-icon").textContent =
        entry.icon || "▦";
      detailDialog.querySelector("#agenda-detail-title").textContent =
        entry.title || "Afspraak";
      const description = detailDialog.querySelector(
        ".agenda-detail-description p",
      );
      description.textContent =
        entry.description?.trim() || "Er is geen extra beschrijving toegevoegd.";
      description.classList.toggle("agenda-detail-empty", !entry.description?.trim());
      detailDialog.querySelector("[data-detail-date]").textContent =
        new Intl.DateTimeFormat(getAppLocale(), {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(getDateForDay(day));
      detailDialog.querySelector("[data-detail-time]").textContent =
        entry.isHoliday || !entry.startText
          ? "Hele dag"
          : `${entry.startText} - ${endTime}`;
      const categoryRow = detailDialog.querySelector(
        "[data-detail-category-row]",
      );
      categoryRow.hidden = !entry.category;
      detailDialog.querySelector("[data-detail-category]").textContent =
        entry.category || "";
      detailDialog.showModal();
    }

    function addAgendaItemDetailsAction(item, entry, day, endTime) {
      item.classList.add("agenda-item");
      item.tabIndex = 0;
      item.setAttribute("aria-expanded", "false");
      const actions = document.createElement("div");
      actions.className = "agenda-item-actions";
      actions.hidden = true;
      const viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.textContent = "Bekijken";
      viewButton.addEventListener("click", () =>
        showAgendaDetails(entry, day, endTime),
      );
      actions.append(viewButton);
      item.append(actions);

      function toggleActions() {
        const isExpanded = actions.hidden;
        const overlapGroup = item.closest(".agenda-overlap-group");
        const isGroupedEvent =
          overlapGroup || item.closest(".agenda-all-day-list");
        if (isGroupedEvent && isExpanded) {
          const panel = item.closest(".agenda-day-panel");
          const top =
            item.getBoundingClientRect().top -
            panel.getBoundingClientRect().top +
            panel.scrollTop;
          item.style.top = `${top}px`;
          item.classList.add("is-overlap-expanded");
        } else if (isGroupedEvent) {
          item.classList.remove("is-overlap-expanded");
          item.style.removeProperty("top");
        }
        actions.hidden = !isExpanded;
        item.setAttribute("aria-expanded", String(isExpanded));
        if (isGroupedEvent) {
          updateTimeIndicator();
        }
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
    }

    dayLists.forEach((dayList, day) => {
      Array.from(dayList.children).forEach((item) => {
        const match = /^\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*:\s*(.*)$/.exec(
          item.textContent,
        );
        const entry = {
          title: match ? match[3].trim() : item.textContent.trim(),
          description: "",
          startText: match?.[1] || "",
        };
        if (match) {
          const toMinutes = (time) => {
            const [hours, minutes] = time.split(":").map(Number);
            return hours * 60 + minutes;
          };
          item.dataset.start = String(toMinutes(match[1]));
          item.dataset.end = String(toMinutes(match[2]));
        }
        addAgendaItemDetailsAction(item, entry, day, match?.[2] || "");
      });
    });

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
      const dateFormatter = new Intl.DateTimeFormat(getAppLocale(), {
        day: "numeric",
        month: "long",
      });
      const weekdayFormatter = new Intl.DateTimeFormat(getAppLocale(), {
        weekday: "long",
      });
      weekLabel.textContent = `${dateFormatter.format(displayedWeekStart)} – ${dateFormatter.format(endDate)}`;
      dayPanels.forEach((panel, day) => {
        const heading = panel.querySelector(".agenda-day-heading");
        const dayDate = dateFormatter.format(getDateForDay(day));
        heading.textContent = `${weekdayFormatter.format(getDateForDay(day))} ${dayDate}`;
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

    function itemOccursOnDate(entry, date) {
      if (entry.isHoliday) {
        const dateKey = formatLocalDate(date);
        return (
          dateKey >= entry.holidayStartDate &&
          dateKey <= entry.holidayEndDate
        );
      }

      const dayName = weekdayNames[date.getDay()];
      const repeatPattern = entry.weekStart
        ? "once"
        : entry.repeatPattern || "weekly";
      if (
        entry.weekStart &&
        entry.weekStart !== formatLocalDate(getWeekStart(date)) &&
        entry.weekStart !== formatLocalDate(date)
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
      if (repeatPattern === "monthly" || repeatPattern === "yearly") {
        if (!entry.repeatStartDate) {
          return false;
        }
        const startDate = new Date(`${entry.repeatStartDate}T12:00:00`);
        if (formatLocalDate(date) < entry.repeatStartDate) {
          return false;
        }
        return repeatPattern === "monthly"
          ? date.getDate() === startDate.getDate()
          : date.getMonth() === startDate.getMonth() &&
              date.getDate() === startDate.getDate();
      }
      return entry.day === dayName;
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
      const referenceMonday = new Date(2024, 0, 1, 12);
      const shortWeekdays = Array.from({ length: 7 }, (_, index) => {
        const day = new Date(referenceMonday);
        day.setDate(day.getDate() + index);
        return new Intl.DateTimeFormat(getAppLocale(), {
          weekday: "short",
        }).format(day);
      });
      shortWeekdays.forEach((weekday) => {
        const label = document.createElement("span");
        label.className = "agenda-month-weekday";
        label.textContent = weekday;
        label.setAttribute("aria-hidden", "true");
        monthOverview.append(label);
      });

      const year = displayedMonthStart.getFullYear();
      const month = displayedMonthStart.getMonth();
      monthLabel.textContent = new Intl.DateTimeFormat(getAppLocale(), {
        month: "long",
        year: "numeric",
      }).format(displayedMonthStart);
      const firstDate = new Date(year, month, 1);
      const leadingDays = (firstDate.getDay() + 6) % 7;
      const dayCount = new Date(year, month + 1, 0).getDate();
      const cellCount = Math.ceil((leadingDays + dayCount) / 7) * 7;
      const today = formatLocalDate(new Date());
      const dateLabel = new Intl.DateTimeFormat(getAppLocale(), {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const monthStartLabel = new Intl.DateTimeFormat(getAppLocale(), {
        month: "long",
        year: "numeric",
      }).format(displayedMonthStart);

      for (let index = 0; index < cellCount; index += 1) {
        const date = new Date(year, month, index - leadingDays + 1);
        const dateKey = formatLocalDate(date);
        const dayName = weekdayNames[date.getDay()];
        const dayItems = filteredEntries
          .filter((entry) => {
            return itemOccursOnDate(entry, date);
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
          const startText = entry.isHoliday
            ? "Hele dag"
            : entry.startText ||
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

    document.addEventListener("agenda-language-change", () => {
      updateWeekDates();
      renderMonthOverview();
      rerenderCurrentWeek();
    });

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
      const iconIndex = columnIndex(["icoon", "icon", "emoji"]);
      const descriptionIndex = columnIndex([
        "beschrijving",
        "omschrijving",
        "details",
        "description",
        "toelichting",
      ]);
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
            description: String(readCell(row, descriptionIndex)).trim(),
            icon: String(readCell(row, iconIndex)).trim(),
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

    function groupOverlappingItems(dayList) {
      const dayPanel = dayList.closest(".agenda-day-panel");
      dayPanel.querySelector(".agenda-all-day-list")?.remove();

      const allDayItems = [];
      const groups = [];
      let currentGroup = [];
      let currentGroupEnd = -Infinity;

      Array.from(dayList.children).forEach((item) => {
        const start = Number(item.dataset.start);
        const end = Number(item.dataset.end);
        if (start === 0 && end >= 23 * 60) {
          allDayItems.push(item);
          return;
        }
        if (!Number.isFinite(start) || !Number.isFinite(end)) {
          groups.push([item]);
          currentGroup = [];
          currentGroupEnd = -Infinity;
          return;
        }

        if (start >= currentGroupEnd) {
          currentGroup = [item];
          groups.push(currentGroup);
          currentGroupEnd = end;
          return;
        }

        currentGroup.push(item);
        currentGroupEnd = Math.max(currentGroupEnd, end);
      });

      if (allDayItems.length) {
        const allDayList = document.createElement("ul");
        allDayList.className = "agenda-all-day-list";
        allDayItems.forEach((item) => {
          item.classList.add("agenda-all-day-item");
          allDayList.append(item);
        });
        dayPanel.querySelector(".agenda-day-header").prepend(allDayList);
      }

      dayList.replaceChildren();
      groups.forEach((group) => {
        if (group.length === 1) {
          dayList.append(group[0]);
          return;
        }

        const wrapper = document.createElement("li");
        wrapper.className = "agenda-overlap-group";
        const overlapList = document.createElement("ul");
        overlapList.className = "agenda-overlap-items";
        overlapList.style.setProperty(
          "--agenda-overlap-columns",
          String(group.length),
        );
        overlapList.append(...group);
        wrapper.append(overlapList);
        dayList.append(wrapper);
      });
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
              itemOccursOnDate(entry, getDateForDay(day)),
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
          item.setAttribute(
            "aria-label",
            `${formatTime(entry.time.start)}, ${entry.title}. Selecteer om opties te bekijken.`,
          );
          const dayName = day;
          entry.startText = formatTime(entry.time.start);
          const timeText = document.createElement("span");
          timeText.className = "agenda-item-time";
          timeText.textContent = `${formatTime(entry.time.start)} - ${formatTime(end)}: `;
          const titleText = document.createElement("span");
          titleText.className = "agenda-item-title";
          titleText.textContent = `${entry.category ? `[${entry.category}] ` : ""}${entry.title}`;
          item.append(timeText, titleText);
          item.dataset.start = String(entry.time.start);
          item.dataset.end = String(end);
          addAgendaItemDetailsAction(item, entry, dayName, formatTime(end));
          if (entry.color && !applyColor(item, entry.color)) {
            console.warn(`Ongeldige kleur in de agenda-sheet: ${entry.color}`);
          }
          dayList.append(item);
        });
        groupOverlappingItems(dayList);
      });

      const skippedMessage = skippedRows.length
        ? ` ${skippedRows.length} ongeldige regel(s) overgeslagen; eerste probleem op rij ${skippedRows[0].rowNumber}: ${skippedRows[0].reason} (${skippedRows[0].time || "leeg"}).`
        : "";
      const totalEntries = entries.filter(
        (entry) =>
          matchesCalendarFilters(entry) &&
          orderedWeekdays.some((day) =>
            itemOccursOnDate(entry, getDateForDay(day)),
          ),
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
        .agenda-account input, .agenda-account select, .agenda-item-form input, .agenda-item-form select, .agenda-account button, .agenda-item-form button { min-height: 40px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font: inherit; }
        .agenda-item-form textarea { width: 100%; min-height: 92px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font: inherit; resize: vertical; }
        .agenda-signup-location[hidden] { display: none; }
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
        .agenda-repeat-start-date[hidden] { display: none; }
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
        .agenda-item.agenda-holiday { border-left-color: #d8872f; background: #fff0df; cursor: default; }
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
      const holidayNotice = document.createElement("p");
      holidayNotice.className = "agenda-account-message";
      holidayNotice.textContent =
        "Nationale feestdagen worden automatisch berekend. Schoolvakanties zijn opgenomen voor schooljaar 2026-2027.";

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
        <div class="agenda-form-grid agenda-signup-location" hidden>
          <label class="agenda-form-field">Land
            <select name="country">
              <option value="BE">België</option>
              <option value="NL">Nederland</option>
            </select>
          </label>
          <label class="agenda-form-field">Regio voor schoolvakanties
            <select name="region" required></select>
          </label>
        </div>
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

      const signupLocation = authForm.querySelector(".agenda-signup-location");
      const countrySelect = authForm.elements.namedItem("country");
      const regionSelect = authForm.elements.namedItem("region");
      const updateRegionOptions = () => {
        regionSelect.replaceChildren(
          ...holidayRegionOptions[countrySelect.value].map(([value, label]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            return option;
          }),
        );
      };
      countrySelect.addEventListener("change", updateRegionOptions);
      updateRegionOptions();

      authForm
        .querySelector('button[value="signup"]')
        .addEventListener("click", () => {
          signupLocation.hidden = false;
          regionSelect.required = true;
        });
      authForm
        .querySelector('button[value="login"]')
        .addEventListener("click", () => {
          signupLocation.hidden = true;
          regionSelect.required = false;
        });

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
        holidayNotice,
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
        <label class="agenda-form-field">Icoontje (emoji)
          <input name="icon" type="text" maxlength="12" placeholder="Bijvoorbeeld 📚 of ⚽" autocomplete="off">
        </label>
        <label class="agenda-form-field">Wat moet je doen?
          <textarea name="description" rows="4" maxlength="5000" placeholder="Voeg extra uitleg, materiaal of stappen toe."></textarea>
        </label>
        <label class="agenda-form-field">Herhaling
          <select name="repeat_pattern">
            <option value="weekly">Elke week op geselecteerde dagen</option>
            <option value="daily">Elke dag</option>
            <option value="monthly">Elke maand op dezelfde dag van de maand</option>
            <option value="yearly">Elk jaar op dezelfde dag en maand</option>
            <option value="once">Alleen deze week</option>
          </select>
        </label>
        <label class="agenda-form-field agenda-repeat-start-date" hidden>Eerste datum van herhaling
          <input name="repeat_start_date" type="date">
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
      const repeatStartDateField = itemForm.querySelector(
        ".agenda-repeat-start-date",
      );
      const repeatStartDateInput = itemForm.elements.namedItem(
        "repeat_start_date",
      );
      const updateRepeatControls = () => {
        const isOnce = repeatPatternSelect.value === "once";
        const isWeekly = repeatPatternSelect.value === "weekly";
        const isDateBased = ["monthly", "yearly"].includes(
          repeatPatternSelect.value,
        );
        onceDayField.hidden = !isOnce;
        daySelect.required = isOnce;
        repeatDaysField.hidden = !isWeekly;
        repeatStartDateField.hidden = !isDateBased;
        repeatStartDateInput.required = isDateBased;
        if (isDateBased && !repeatStartDateInput.value) {
          repeatStartDateInput.value = formatLocalDate(
            getDateForDay(daySelect.value),
          );
        }
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
        countrySelect,
        holidayNotice,
        itemForm,
        profileLink,
        recoveryForm,
        regionSelect,
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
        applyUserLanguage(user);
        ui.holidayNotice.textContent =
          user && !getHolidayPreferences(user).schoolHolidaysEnabled
            ? "Nationale feestdagen worden automatisch berekend. Schoolvakanties zijn uitgeschakeld."
            : "Nationale feestdagen worden automatisch berekend. Schoolvakanties zijn opgenomen voor schooljaar 2026-2027.";
        updateWeekDates();
        renderMonthOverview(currentItems);
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
          ui.itemForm.hidden = true;
          renderUserItems([]);
          dayIndicators.forEach((indicator) => indicator.replaceChildren());
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
            ["42703", "PGRST204"].includes(String(error.code)) &&
              (String(error.message).includes("week_start") ||
                String(error.message).includes("repeat_pattern") ||
                String(error.message).includes("repeat_days") ||
                String(error.message).includes("repeat_start_date"))
              ? "De database mist een herhalingskolom. Voer de SQL uit supabase-setup.sql uit."
              : `Je agenda kon niet worden geladen: ${error.message}`,
          );
        });
      }

      function renderUserItems(records) {
        rerenderCurrentWeek = () => {
          updateWeekDates();
          renderUserItems(records);
        };
        const userItems = records.map((record, rowNumber) => {
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
            repeatStartDate: record.repeat_start_date,
            repeatPattern: record.repeat_pattern || "weekly",
            repeatDays:
              Array.isArray(record.repeat_days) && record.repeat_days.length
                ? record.repeat_days
                : [record.day],
            category: record.category || "",
            description: record.description || "",
            icon: record.icon || "",
            rowNumber,
            startText,
          };
        });
        const { country, region, schoolHolidaysEnabled } =
          getHolidayPreferences(currentUser);
        currentItems = [
          ...userItems,
          ...getHolidayEntries(
            country,
            region,
            [
              displayedWeekStart.getFullYear(),
              displayedMonthStart.getFullYear(),
            ],
            { schoolHolidaysEnabled },
          ),
        ];
        updateCategoryOptions(currentItems);
        renderMonthOverview(currentItems);
        let visibleCount = 0;
        orderedWeekdays.forEach((day) => {
          const dayItems = currentItems
            .filter(
              (entry) =>
                matchesCalendarFilters(entry) &&
                itemOccursOnDate(entry, getDateForDay(day)),
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
            text.className = "agenda-item-time";
            text.textContent = `${entry.startText} - ${formatTime(end)}: `;
            const title = document.createElement("span");
            title.className = "agenda-item-title";
            title.textContent = entry.isHoliday
              ? window.agendaI18n.translate(entry.title)
              : entry.title;
            item.append(text, title);
            if (entry.category) {
              const badge = document.createElement("span");
              badge.className = "agenda-category-badge";
              badge.textContent = entry.category;
              item.append(badge);
            }
            if (entry.color && !applyColor(item, entry.color)) {
              console.warn(`Ongeldige kleur in de agenda: ${entry.color}`);
            }

            if (entry.isHoliday) {
              item.classList.add("agenda-holiday");
              item.tabIndex = -1;
              item.setAttribute(
                "aria-label",
                `${window.agendaI18n.translate(entry.title)}, ${window.agendaI18n
                  .translate("Hele dag")
                  .toLowerCase()}`,
              );
              dayList.append(item);
              return;
            }

            const actions = document.createElement("div");
            actions.className = "agenda-item-actions";
            actions.hidden = true;
            const viewButton = document.createElement("button");
            viewButton.type = "button";
            viewButton.textContent = "Bekijken";
            viewButton.addEventListener("click", () =>
              showAgendaDetails(entry, day, formatTime(end)),
            );
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
              ui.itemForm.elements.namedItem("description").value =
                entry.description || "";
              ui.itemForm.elements.namedItem("icon").value = entry.icon || "";
              ui.itemForm.elements.namedItem("color").value = entry.color;
              ui.itemForm.elements.namedItem("category").value =
                entry.category;
              ui.itemForm.elements.namedItem("repeat_pattern").value =
                entry.weekStart ? "once" : entry.repeatPattern;
              ui.itemForm.elements.namedItem("repeat_start_date").value =
                entry.repeatStartDate || "";
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
              const isExpanded = actions.hidden;
              const overlapGroup = item.closest(".agenda-overlap-group");
              const isGroupedEvent =
                overlapGroup || item.closest(".agenda-all-day-list");
              if (isGroupedEvent && isExpanded) {
                const panel = item.closest(".agenda-day-panel");
                const top =
                  item.getBoundingClientRect().top -
                  panel.getBoundingClientRect().top +
                  panel.scrollTop;
                item.style.top = `${top}px`;
                item.classList.add("is-overlap-expanded");
              } else if (isGroupedEvent) {
                item.classList.remove("is-overlap-expanded");
                item.style.removeProperty("top");
              }
              actions.hidden = !isExpanded;
              item.setAttribute("aria-expanded", String(isExpanded));
              if (isGroupedEvent) {
                updateTimeIndicator();
              }
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

            actions.append(viewButton, editButton, deleteButton);
            item.append(actions);
            dayList.append(item);
          });
          groupOverlappingItems(dayList);
        });

        const repeatDaysNotice = supportsRepeatDays
          ? ""
          : " Voor herhaling op meerdere weekdagen moet je eerst de SQL voor repeat_days uitvoeren.";
        const schemaNotice = [
          !supportsCategories
            ? " Categorieën opslaan vereist de kolom category in Supabase."
            : "",
          !supportsRepeatStartDate
            ? " Maand- en jaarherhaling vereist de kolom repeat_start_date in Supabase."
            : "",
        ].join("");
        const filterNotice =
          (calendarFilters.search || calendarFilters.category) && !visibleCount
            ? " Geen afspraken gevonden met deze zoekopdracht of categorie."
            : "";
        status.textContent = currentItems.length
          ? `${records.length} opgeslagen afspraken geladen; ${visibleCount} afspraken zichtbaar deze week. Per dag gesorteerd op begintijd.${repeatDaysNotice}${schemaNotice}${filterNotice}`
          : `Je hebt nog geen afspraken voor ${selectedDay.value}.${repeatDaysNotice}${schemaNotice}`;
        updateTimeIndicator();
      }

      async function loadUserItems() {
        if (!currentUser) {
          return;
        }

        status.textContent = "Je planning laden...";
        const records = [];
        const pageSize = 500;
        let offset = 0;
        while (true) {
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
            if (supportsRepeatStartDate) {
              columns.push("repeat_start_date");
            }
            if (supportsCategories) {
              columns.push("category");
            }
            if (supportsDescriptions) {
              columns.push("description");
            }
            if (supportsIcons) {
              columns.push("icon");
            }
            result = await client
              .from("agenda_items")
              .select(columns.join(", "))
              .eq("user_id", currentUser.id)
              .order("start_time", { ascending: true })
              .order("id", { ascending: true })
              .range(offset, offset + pageSize - 1);
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
            } else if (missingColumn === "repeat_start_date") {
              supportsRepeatStartDate = false;
            } else if (missingColumn === "category") {
              supportsCategories = false;
            } else if (missingColumn === "description") {
              supportsDescriptions = false;
            } else if (missingColumn === "icon") {
              supportsIcons = false;
            } else {
              throw result.error;
            }
          }

          if (result.error) {
            throw result.error;
          }
          const page = result.data || [];
          records.push(...page);
          if (page.length < pageSize) {
            break;
          }
          offset += page.length;
        }
        renderUserItems(records);
      }

      function resetItemForm() {
        ui.itemForm.reset();
        ui.itemForm.elements.namedItem("id").value = "";
        ui.itemForm.elements.namedItem("day").value = selectedDay.value;
        ui.itemForm.elements.namedItem("repeat_pattern").value = "weekly";
        ui.itemForm.elements.namedItem("repeat_start_date").value =
          formatLocalDate(getDateForDay(selectedDay.value));
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
              ? await client.auth.signUp({
                  ...credentials,
                  options: {
                    data: {
                      country: ui.countrySelect.value,
                      region: ui.regionSelect.value,
                      language: window.agendaI18n.getLanguage(),
                    },
                  },
                })
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
        const repeatStartDate = String(
          formData.get("repeat_start_date") || "",
        );
        const category = String(formData.get("category") || "");
        const description = String(formData.get("description") || "").trim();
        const icon = String(formData.get("icon") || "").trim().slice(0, 12);
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
          ["monthly", "yearly"].includes(repeatPattern) &&
          !repeatStartDate
        ) {
          showAccountMessage("Kies de datum waarop de herhaling begint.");
          return;
        }
        if (
          !supportsRepeatStartDate &&
          ["monthly", "yearly"].includes(repeatPattern)
        ) {
          showAccountMessage(
            "Maand- en jaarherhaling opslaan kan pas nadat je supabase-setup.sql hebt uitgevoerd.",
          );
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
        if (!supportsDescriptions && description) {
          showAccountMessage(
            "Een beschrijving opslaan kan pas nadat je supabase-setup.sql hebt uitgevoerd.",
          );
          return;
        }
        if (!supportsIcons && icon) {
          showAccountMessage(
            "Een icoontje opslaan kan pas nadat je supabase-setup.sql hebt uitgevoerd.",
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
              : ["monthly", "yearly"].includes(repeatPattern)
                ? weekdayNames[
                    new Date(`${repeatStartDate}T12:00:00`).getDay()
                  ]
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
            ["daily", "monthly", "yearly"].includes(repeatPattern)
              ? repeatPattern
              : "weekly",
        };
        if (supportsRepeatStartDate) {
          values.repeat_start_date = ["monthly", "yearly"].includes(
            repeatPattern,
          )
            ? repeatStartDate
            : null;
        }
        if (supportsCategories) {
          values.category = category || null;
        }
        if (supportsDescriptions) {
          values.description = description || null;
        }
        if (supportsIcons) {
          values.icon = icon || null;
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
        indicator.replaceChildren();
        const items = Array.from(
          panel.querySelectorAll("li[data-start][data-end]"),
        );
        const activeItems = [];
        if (isCurrentWeek && day === currentDay) {
          items.forEach((item) => {
            if (item.classList.contains("agenda-holiday")) {
              return;
            }
            const start = Number(item.dataset.start);
            let end = Number(item.dataset.end);
            if (!Number.isFinite(start) || !Number.isFinite(end)) {
              return;
            }
            if (end <= start) {
              end += 24 * 60;
            }
            if (currentMinutes >= start && currentMinutes < end) {
              activeItems.push({ item, start, end });
            }
          });
        }

        items.forEach((item) => {
          item.classList.remove("planning-actief");
        });
        const timedItems = activeItems.filter(
          ({ item }) => !item.classList.contains("agenda-all-day-item"),
        );
        const indicatorItems = timedItems.length ? timedItems : activeItems;
        indicatorItems.forEach(({ item }) =>
          item.classList.add("planning-actief"),
        );
        const panelRect = panel.getBoundingClientRect();
        indicatorItems.forEach(({ item, start, end }) => {
          const elapsedFraction = (currentMinutes - start) / (end - start);
          const itemRect = item.getBoundingClientRect();
          const timeIndicator = document.createElement("div");
          timeIndicator.className = "agenda-time-indicator";
          timeIndicator.style.left = `${itemRect.left - panelRect.left - panel.clientLeft + panel.scrollLeft}px`;
          timeIndicator.style.width = `${itemRect.width}px`;
          timeIndicator.style.top = `${itemRect.top - panelRect.top + panel.scrollTop + itemRect.height * elapsedFraction}px`;
          indicator.append(timeIndicator);
        });
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
