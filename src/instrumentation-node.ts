const globalForCron = globalThis as unknown as { __cronStarted?: boolean };

if (!globalForCron.__cronStarted) {
  globalForCron.__cronStarted = true;

  const TWO_HOURS = 2 * 60 * 60 * 1000;

  (async () => {
    const { generateExportFiles } = await import("@/lib/excelExport");

    const runExport = async () => {
      try {
        const result = await generateExportFiles({ notify: true });
        console.log(`[cron] Scheduled export complete: ${result.xlsx} / ${result.csv} (${result.recordCount} records)`);
      } catch (err) {
        console.error("[cron] Scheduled export failed", err);
      }
    };

    setInterval(runExport, TWO_HOURS);
    console.log("[cron] Attendance export scheduler started — runs every 2 hours");
  })();
}

export {};
