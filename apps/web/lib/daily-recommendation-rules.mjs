export function recommendationDateForTimezone(date = new Date(), timeZone = "Asia/Shanghai") {
  const instant = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(instant.getTime())) throw new TypeError("invalid recommendation date");
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: String(timeZone || "Asia/Shanghai"),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}
