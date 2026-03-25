import db from "../db.js";
import moment from "moment";

export const getFilteredTableData = (
  tableName,
  platform,
  country,
  dateRange,
  startDate,
  endDate,
  dateColumn, // pass the correct column name
  callback
) => {
  let query = `SELECT COUNT(*) AS total FROM ${tableName} WHERE 1=1`;
  let params = [];

  // Platform filter
  if (platform) {
    query += ` AND LOWER(platform) = ?`;
    params.push(platform.toLowerCase());
  }

  // Country filter
  if (country) {
    query += ` AND country = ?`;
    params.push(country);
  }

  // Date filter only if not alltime
  let start, end;
  const today = moment().startOf("day");

  switch (dateRange) {
    case "today":
      start = today;
      end = today;
      break;
    case "yesterday":
      start = today.clone().subtract(1, "days");
      end = start;
      break;
    case "last7":
      start = today.clone().subtract(6, "days");
      end = today;
      break;
    case "last30":
      start = today.clone().subtract(29, "days");
      end = today;
      break;
    case "last90":
      start = today.clone().subtract(89, "days");
      end = today;
      break;
    case "custom":
      if (startDate) start = moment(startDate);
      if (endDate) end = moment(endDate);
      break;
    case "alltime":
    default:
      start = null;
      end = null;
      break;
  }

  if (start && end && start.isValid() && end.isValid()) {
    const startDateTime = start.startOf("day").format("YYYY-MM-DD HH:mm:ss");
    const endDateTime = end.endOf("day").format("YYYY-MM-DD HH:mm:ss");

    // Use the correct column for filtering
    query += ` AND ${dateColumn} BETWEEN ? AND ?`;
    params.push(startDateTime, endDateTime);
  }

  db.query(query, params, callback);
};

export const getCountriesByPlatformAndDate = (
  platform,
  dateRange,
  startDate,
  endDate,
  callback
) => {

  let query = `
    SELECT country, COUNT(*) AS total_count
    FROM (
      SELECT platform, country, create_date FROM snap_tech_modsforminecraft_category_click
      UNION ALL
      SELECT platform, country, create_date FROM snap_tech_modsforminecraft_impressioncount_store
      UNION ALL
      SELECT platform, country, create_date FROM snap_tech_modsforminecraft_downloadcount_store
      UNION ALL
      SELECT platform, country, search_date FROM snap_tech_modsforminecraft_android_modssearchkeyword
      UNION ALL
      SELECT platform, country, search_date FROM snap_tech_modsforminecraft_modsSearchKeyword
    ) AS all_data
    WHERE country IS NOT NULL AND country != ''
  `;

  let params = [];

  // Platform filter
  if (platform) {
    query += " AND LOWER(platform) = ?";
    params.push(platform.toLowerCase());
  }

  // Date range filter
  let start, end;
  const today = moment().startOf("day");

  switch (dateRange) {
    case "today":
      start = today;
      end = today;
      break;
    case "yesterday":
      start = today.clone().subtract(1, "days");
      end = start;
      break;
    case "last7":
      start = today.clone().subtract(6, "days");
      end = today;
      break;
    case "last30":
      start = today.clone().subtract(29, "days");
      end = today;
      break;
    case "last90":
      start = today.clone().subtract(89, "days");
      end = today;
      break;
    case "custom":
      start = startDate ? moment(startDate) : null;
      end = endDate ? moment(endDate) : null;
      break;
    case "alltime":
    default:
      start = null;
      end = null;
      break;
  }

  if (start && end && start.isValid() && end.isValid()) {
    const startDateTime = start.startOf("day").format("YYYY-MM-DD HH:mm:ss");
    const endDateTime = end.endOf("day").format("YYYY-MM-DD HH:mm:ss");
    query += " AND create_date BETWEEN ? AND ?";
    params.push(startDateTime, endDateTime);
  }

  query += `
    GROUP BY country
    ORDER BY total_count DESC
  `;

  db.query(query, params, callback);

};

export const getModStats = (
  platform,
  dateRange,
  startDate,
  endDate,
  country,
  callback
) => {
  const normalizedPlatform = platform?.toLowerCase().trim();

  let start = null;
  let end = null;

  const today = moment().startOf("day");

  switch (dateRange) {
    case "today":
      start = today;
      end = today;
      break;
    case "yesterday":
      start = today.clone().subtract(1, "day");
      end = start;
      break;
    case "last7":
      start = today.clone().subtract(6, "days");
      end = today;
      break;
    case "last30":
      start = today.clone().subtract(29, "days");
      end = today;
      break;
    case "last90":
      start = today.clone().subtract(89, "days");
      end = today;
      break;
    case "custom":
      if (startDate && endDate) {
        start = moment(startDate);
        end = moment(endDate);
      }
      break;
  }

  // -----------------------
  // FILTERS
  // -----------------------

  let statsFilter = "1=1";
  const statsParams = [];

  if (normalizedPlatform) {
    statsFilter += " AND LOWER(platform) = ?";
    statsParams.push(normalizedPlatform);
  }

  if (country && country !== "all") {
    statsFilter += " AND LOWER(country) = LOWER(?)";
    statsParams.push(country);
  }

  if (start && end) {
    statsFilter += " AND DATE(create_date) BETWEEN ? AND ?";
    statsParams.push(
      start.format("YYYY-MM-DD"),
      end.format("YYYY-MM-DD")
    );
  }

  // -----------------------
  // QUERIES
  // -----------------------

  const topDownloadSql = `
    SELECT m.post_id, m.name AS mod_name, totals.download_total, MAX(d.country) AS country
    FROM snap_tech_modsforminecraft_modsData m
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS download_total
      FROM snap_tech_modsforminecraft_downloadcount_store
      WHERE ${statsFilter}
      GROUP BY post_id
    ) totals ON m.post_id = totals.post_id
    LEFT JOIN snap_tech_modsforminecraft_downloadcount_store d
      ON m.post_id = d.post_id AND ${statsFilter}
    WHERE totals.download_total IS NOT NULL
    GROUP BY m.post_id
    ORDER BY totals.download_total DESC
    LIMIT 5
  `;

  const topImpressionSql = `
    SELECT m.post_id, m.name AS mod_name, totals.impression_total, MAX(i.country) AS country
    FROM snap_tech_modsforminecraft_modsData m
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS impression_total
      FROM snap_tech_modsforminecraft_impressioncount_store
      WHERE ${statsFilter}
      GROUP BY post_id
    ) totals ON m.post_id = totals.post_id
    LEFT JOIN snap_tech_modsforminecraft_impressioncount_store i
      ON m.post_id = i.post_id AND ${statsFilter}
    WHERE totals.impression_total IS NOT NULL
    GROUP BY m.post_id
    ORDER BY totals.impression_total DESC
    LIMIT 5
  `;

  const topConversionSql = `
    SELECT 
      m.post_id,
      m.name AS mod_name,
      IFNULL(i.impression_total,0) AS impressions,
      IFNULL(d.download_total,0) AS downloads,
      MAX(ic.country) AS country,
      CASE 
        WHEN IFNULL(i.impression_total,0) = 0 THEN 0
        ELSE ROUND((d.download_total / i.impression_total) * 100,2)
      END AS conversion_rate
    FROM snap_tech_modsforminecraft_modsData m
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS impression_total
      FROM snap_tech_modsforminecraft_impressioncount_store
      WHERE ${statsFilter}
      GROUP BY post_id
    ) i ON m.post_id = i.post_id
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS download_total
      FROM snap_tech_modsforminecraft_downloadcount_store
      WHERE ${statsFilter}
      GROUP BY post_id
    ) d ON m.post_id = d.post_id
    LEFT JOIN snap_tech_modsforminecraft_impressioncount_store ic
      ON m.post_id = ic.post_id AND ${statsFilter}
    WHERE i.impression_total > 0
    GROUP BY m.post_id
    ORDER BY conversion_rate DESC
    LIMIT 5
  `;

  const topDownloadCountrySql = `
    SELECT country, COUNT(*) AS total,
      ROUND((COUNT(*) * 100.0 / (
        SELECT COUNT(*) FROM snap_tech_modsforminecraft_downloadcount_store
        WHERE ${statsFilter}
      )),0) AS percentage
    FROM snap_tech_modsforminecraft_downloadcount_store
    WHERE ${statsFilter}
    GROUP BY country
    ORDER BY total DESC
    LIMIT 5
  `;

  const topImpressionCountrySql = `
    SELECT country, COUNT(*) AS total,
      ROUND((COUNT(*) * 100.0 / (
        SELECT COUNT(*) FROM snap_tech_modsforminecraft_impressioncount_store
        WHERE ${statsFilter}
      )),0) AS percentage
    FROM snap_tech_modsforminecraft_impressioncount_store
    WHERE ${statsFilter}
    GROUP BY country
    ORDER BY total DESC
    LIMIT 5
  `;

  // const topConversionCountrySql = `
  //   SELECT i.country,
  //     COUNT(*) AS total,
  //     ROUND(
  //       (SUM(CASE WHEN d.post_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*)) * 100,
  //     2) AS conversion_rate
  //   FROM snap_tech_modsforminecraft_impressioncount_store i
  //   LEFT JOIN snap_tech_modsforminecraft_downloadcount_store d
  //     ON i.post_id = d.post_id AND i.country = d.country
  //   WHERE 1=1
  //     ${normalizedPlatform ? "AND LOWER(i.platform) = ?" : ""}
  //     ${country && country !== "all" ? "AND LOWER(i.country) = LOWER(?)" : ""}
  //     ${start && end ? "AND DATE(i.create_date) BETWEEN ? AND ?" : ""}
  //   GROUP BY i.country
  //   ORDER BY conversion_rate DESC
  //   LIMIT 5
  // `;

  const topConversionCountrySql = `
SELECT 
  i.country,

  i.total_impressions,
  IFNULL(d.total_downloads, 0) AS total_downloads,

  ROUND(
    (IFNULL(d.total_downloads, 0) / i.total_impressions) * 100,
    2
  ) AS conversion_rate

FROM (
  -- ✅ FILTERED IMPRESSIONS
  SELECT 
    country,
    COUNT(*) AS total_impressions
  FROM snap_tech_modsforminecraft_impressioncount_store
  WHERE ${statsFilter}
    AND country IS NOT NULL 
    AND country != ''
  GROUP BY country
) i

LEFT JOIN (
  -- ✅ FILTERED DOWNLOADS
  SELECT 
    country,
    COUNT(*) AS total_downloads
  FROM snap_tech_modsforminecraft_downloadcount_store
  WHERE ${statsFilter}
    AND country IS NOT NULL 
    AND country != ''
  GROUP BY country
) d 
ON i.country = d.country

WHERE i.total_impressions > 0

ORDER BY conversion_rate DESC
LIMIT 5
`;
  
  // -----------------------
  // EXECUTION
  // -----------------------

  db.query(topDownloadSql, [...statsParams, ...statsParams], (err, topDownloads) => {
    if (err) return callback(err);

    db.query(topImpressionSql, [...statsParams, ...statsParams], (err2, topImpressions) => {
      if (err2) return callback(err2);

      db.query(topConversionSql, [...statsParams, ...statsParams, ...statsParams], (err3, topConversions) => {
        if (err3) return callback(err3);

        db.query(topDownloadCountrySql, [...statsParams, ...statsParams], (err4, topDownloadCountries) => {
          if (err4) return callback(err4);

          db.query(topImpressionCountrySql, [...statsParams, ...statsParams], (err5, topImpressionCountries) => {
            if (err5) return callback(err5);

            db.query(topConversionCountrySql, [...statsParams, ...statsParams], (err6, topConversionCountries) => {
              if (err6) return callback(err6);

              callback(null, {
                topDownloads,
                topImpressions,
                topConversions,
                topDownloadCountries,
                topImpressionCountries,
                topConversionCountries
              });
            });
          });
        });
      });
    });
  });
};