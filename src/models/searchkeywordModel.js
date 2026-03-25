import db from "../db.js";
import moment from "moment";

export const getiOSKeywords = (callback) => {
  db.query(
    "SELECT * FROM snap_tech_modsforminecraft_modsSearchKeyword",
    callback,
  );
};

export const getAndroidKeywords = (callback) => {
  db.query(
    "SELECT * FROM snap_tech_modsforminecraft_android_modssearchkeyword",
    callback,
  );
};

export const getKeywordWordCountByPlatform = (
  platform,
  page,
  limit = 300,
  search = "",
  callback,
) => {
  const normalizedPlatform = platform.toLowerCase(); // ✅ normalize

  let tableName = "";

  if (normalizedPlatform === "android") {
    tableName = "snap_tech_modsforminecraft_android_modssearchkeyword";
  } else if (normalizedPlatform === "ios") {
    tableName = "snap_tech_modsforminecraft_modsSearchKeyword";
  } else {
    return callback(new Error("Invalid Platform"));
  }
  const offset = (page - 1) * limit;

  const searchString = String(search || "").trim();
  const params = [];
  let sql = `
    SELECT search_keyword, COUNT(*) AS total
    FROM ${tableName}
    
  `;

  // ✅ Add search filter
  if (searchString !== "") {
    sql += ` WHERE LOWER(search_keyword) LIKE ? `;
    params.push(`%${searchString.toLowerCase()}%`);
  }

  sql += `
    GROUP BY search_keyword
    ORDER BY total DESC
    LIMIT ? OFFSET ?
  `;

  params.push(parseInt(limit), parseInt(offset));
  db.query(sql, params, callback);
};

export const getDistinctKeywordCountByPlatform = (
  platform,
  search = "",
  callback,
) => {
  if (!platform) {
    return callback(new Error("Platform is required"));
  }

  const normalizedPlatform = platform.toLowerCase().trim();

  let tableName = "";

  if (normalizedPlatform === "android") {
    tableName = "snap_tech_modsforminecraft_android_modssearchkeyword";
  } else if (normalizedPlatform === "ios") {
    tableName = "snap_tech_modsforminecraft_modsSearchKeyword";
  } else {
    return callback(new Error("Invalid Platform"));
  }
  const searchString = String(search || "").trim();

  let sql = `
    SELECT COUNT(DISTINCT search_keyword) AS total
    FROM ${tableName}
  `;

  const params = [];

  if (searchString !== "") {
    sql += ` WHERE LOWER(search_keyword)LIKE ? `;
    params.push(`%${searchString.toLowerCase()}%`);
  }

  db.query(sql, params, callback);
};

export const getTotalKeywordCountByPlatform = (
  platform,
  search = "",
  callback,
) => {
  const normalizedPlatform = platform.toLowerCase().trim();

  let tableName = "";

  if (normalizedPlatform === "android") {
    tableName = "snap_tech_modsforminecraft_android_modssearchkeyword";
  } else if (normalizedPlatform === "ios") {
    tableName = "snap_tech_modsforminecraft_modsSearchKeyword";
  } else {
    return callback(new Error("Invalid Platform"));
  }

  const searchString = String(search || "").trim();

  let sql = `
    SELECT COUNT(*) AS total
    FROM ${tableName}
  `;

  const params = [];

  if (searchString !== "") {
    sql += ` WHERE LOWER(search_keyword) LIKE ? `;
    params.push(`%${searchString.toLowerCase()}%`);
  }

  db.query(sql, params, callback);
};

export const getTopKeywordByPlatform = (platform, search = "", callback) => {
  const normalizedPlatform = platform.toLowerCase().trim();

  let tableName = "";

  if (normalizedPlatform === "android") {
    tableName = "snap_tech_modsforminecraft_android_modssearchkeyword";
  } else if (normalizedPlatform === "ios") {
    tableName = "snap_tech_modsforminecraft_modsSearchKeyword";
  } else {
    return callback(new Error("Invalid Platform"));
  }

  const searchString = String(search || "").trim();

  let sql = `
    SELECT search_keyword, COUNT(*) AS total
    FROM ${tableName}
  `;

  const params = [];

  if (searchString !== "") {
    sql += ` WHERE LOWER(search_keyword) LIKE ? `;
    params.push(`%${searchString.toLowerCase()}%`);
  }

  sql += `
    GROUP BY search_keyword
    ORDER BY total DESC
    LIMIT 1
  `;

  db.query(sql, params, callback);
};

//final
export const getKeywordsByDateRange = (
  platform,
  dateRange,
  startDate,
  endDate,
  page = 1,
  limit = 200,
  search = "",
  country = "",
  searchKeyword = "",
  callback,
) => {
  const normalizedPlatform = platform.toLowerCase().trim();

  let tableName =
    normalizedPlatform === "android"
      ? "snap_tech_modsforminecraft_android_modssearchkeyword"
      : "snap_tech_modsforminecraft_modsSearchKeyword";

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
      start = moment(startDate);
      end = moment(endDate);
      break;
    case "alltime":
      start = null;
      end = null;
      break;
  }

  const offset = (page - 1) * limit;
  const params = [];
  let where = "WHERE 1=1";

  if (start && end) {
    where += " AND DATE(search_date) BETWEEN ? AND ?";
    params.push(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
  }

  if (search) {
    where += " AND LOWER(search_keyword) LIKE ?";
    params.push(`%${search.toLowerCase()}%`);
  }

  if (country && country !== "") {
    where += " AND country = ?";
    params.push(country);

    if (searchKeyword) {
      where += " AND search_keyword = ?";
      params.push(searchKeyword);
    }
  }

  // 1️⃣ Total DISTINCT keywords
  const distinctSql = `
    SELECT COUNT(DISTINCT search_keyword) AS totalDistinct
    FROM ${tableName} ${where}
  `;

  db.query(distinctSql, params, (err, distinctResult) => {
    if (err) return callback(err);

    const totalDistinct = distinctResult[0]?.totalDistinct || 0;

    // 2️⃣ Total searches (all rows)
    const totalSql = `
      SELECT COUNT(*) AS totalSearches
      FROM ${tableName} ${where}
    `;

    db.query(totalSql, params, (err, totalResult) => {
      if (err) return callback(err);

      const totalSearches = totalResult[0]?.totalSearches || 0;

      // 3️⃣ Top search keyword
      const topSql = `
        SELECT search_keyword, COUNT(*) AS total
        FROM ${tableName} ${where}
        GROUP BY search_keyword
        ORDER BY total DESC
        LIMIT 1
      `;

      db.query(topSql, params, (err, topResult) => {
        if (err) return callback(err);

        const topSearch = topResult[0] || null;

        // 4️⃣ Paginated keyword list
        const dataSql = `
          SELECT search_keyword, COUNT(*) AS total
          FROM ${tableName} ${where}
          GROUP BY search_keyword
          ORDER BY total DESC
          LIMIT ? OFFSET ?
        `;

        db.query(dataSql, [...params, limit, offset], (err, results) => {
          if (err) return callback(err);

          const countrySql = `
            SELECT 
            country,
            COUNT(DISTINCT search_keyword) AS total,
            ROUND(
              (
                COUNT(DISTINCT search_keyword) * 100.0 /
                (
                  SELECT COUNT(DISTINCT search_keyword)
                  FROM ${tableName} ${where}
                )
              ),
              0
            ) AS percentage
          FROM ${tableName}
          ${where}
          GROUP BY country
          ORDER BY total DESC
          LIMIT 5
          `;

          db.query(
            countrySql,
            [...params, ...params],
            (err2, countryResult) => {
              if (err2) return callback(err2);

              callback(null, {
                totalDistinct,
                totalSearches,
                topSearch,
                topKeywordCountries: countryResult, // ✅ NEW
                data: results,
              });
            },
          );
        });
      });
    });
  });
};

export const getAllCountries = (
  platform,
  dateRange,
  startDate,
  endDate,
  search = "",
  callback,
) => {
  const normalizedPlatform = platform?.toLowerCase().trim();

  let tableName =
    normalizedPlatform === "android"
      ? "snap_tech_modsforminecraft_android_modssearchkeyword"
      : "snap_tech_modsforminecraft_modsSearchKeyword";

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
      start = moment(startDate);
      end = moment(endDate);
      break;
    case "alltime":
      start = null;
      end = null;
      break;
  }

  let where = "WHERE 1=1";
  const params = [];

  if (start && end) {
    where += " AND DATE(search_date) BETWEEN ? AND ?";
    params.push(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
  }

  if (search) {
    where += " AND LOWER(search_keyword) LIKE ?";
    params.push(`%${search.toLowerCase()}%`);
  }

  const sql = `
    SELECT country, COUNT(DISTINCT search_keyword) AS total
    FROM ${tableName}
    ${where}
    GROUP BY country
    ORDER BY total DESC
  `;

  db.query(sql, params, callback);
};

export const getCountriesByKeyword = ({
  platform,
  dateRange,
  startDate,
  endDate,
  searchKeyword,
}) => {
  return new Promise((resolve, reject) => {
    const normalizedPlatform = platform.toLowerCase().trim();
    const tableName =
      normalizedPlatform === "android"
        ? "snap_tech_modsforminecraft_android_modssearchkeyword"
        : "snap_tech_modsforminecraft_modsSearchKeyword";

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
        start = moment(startDate);
        end = moment(endDate);
        break;
      case "alltime":
        start = null;
        end = null;
        break;
    }

    const params = [];
    let where = "WHERE 1=1";

    if (start && end) {
      where += " AND DATE(search_date) BETWEEN ? AND ?";
      params.push(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
    }

    if (searchKeyword) {
      where += " AND search_keyword = ?";
      params.push(searchKeyword);
    }

    const sql = `
      SELECT country, COUNT(*) AS total
      FROM ${tableName}
      ${where}
      GROUP BY country
      ORDER BY total DESC
    `;

    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const getSearchKeyword = (platform, keyword, callback) => {
  const table =
    platform.toLowerCase() === "android"
      ? "snap_tech_modsforminecraft_android_modssearchkeyword"
      : "snap_tech_modsforminecraft_modsSearchKeyword";

  // Word-boundary regex to match exact words
  const regexPattern = `(^|[[:space:][:punct:]])(${keyword})([[:space:][:punct:]]|$)`;

  const sql = `
    SELECT search_keyword
    FROM ${table}
    WHERE search_keyword LIKE ?
       OR LOWER(search_keyword) REGEXP LOWER(?)
  `;

  db.query(sql, [`%${keyword}%`, regexPattern], (err, rows) => {
    if (err) {
      console.error("getSearchKeyword Error:", err);
      return callback(err);
    }
    callback(
      null,
      rows.map((r) => r.search_keyword),
    );
  });
};

// export const getModsByKeywords = (keywords, callback) => {
//   if (!keywords || keywords.length === 0) return callback(null, []);

//   const MAX_KEYWORDS = 25;

//   const uniqueKeywords = [
//     ...new Set(keywords.map((k) => k.toLowerCase().trim()).filter(Boolean)),
//   ].slice(0, MAX_KEYWORDS);

//   if (uniqueKeywords.length === 0) return callback(null, []);

//   // Escape regex characters
//   const safeKeywords = uniqueKeywords.map((k) =>
//     k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
//   );

//   // Add optional plural support (s?)
//   const pluralPatterns = safeKeywords.map((k) => `${k}(s?)`);

//   const combinedPattern = pluralPatterns.join("|");

//   const wordBoundaryPattern = `(^|[[:space:][:punct:]])(${combinedPattern})([[:space:][:punct:]]|$)`;

//   const firstKeyword = safeKeywords[0];

//   const sql = `
//     SELECT *
//     FROM snap_tech_modsforminecraft_modsData
//     WHERE 
//       LOWER(name) REGEXP LOWER(?)
//       OR LOWER(description) REGEXP LOWER(?)

//     ORDER BY
//       CASE
//         WHEN LOWER(name) = LOWER(?) THEN 1
//         WHEN LOWER(name) = LOWER(CONCAT(?, 's')) THEN 2
//         WHEN LOWER(name) LIKE LOWER(CONCAT(?, '%')) THEN 3
//         WHEN LOWER(name) REGEXP LOWER(?) THEN 4
//         ELSE 5
//       END,
//       download DESC,
//       LENGTH(name) ASC,
//       name ASC
//   `;

//   const params = [
//     wordBoundaryPattern,
//     wordBoundaryPattern,
//     firstKeyword,
//     firstKeyword,
//     firstKeyword,
//     wordBoundaryPattern,
//   ];

//   db.query(sql, params, (err, results) => {
//     if (err) {
//       console.error("getModsByKeywords Error:", err);
//       return callback(err);
//     }
//     callback(null, results);
//   });
// };


// export const getModsByKeywords = (keywords, callback) => {
//   if (!keywords || keywords.length === 0) return callback(null, []);

//   const MAX_KEYWORDS = 25;

//   const stopwords = [
    
//   ];

//   // 🔹 Step 1: Normalize keywords
//   let words = [
//     ...new Set(
//       keywords
//         .join(" ")
//         .toLowerCase()
//         .split(/\s+/)
//         .map(w => w.trim())
//         .filter(Boolean)
//     ),
//   ].slice(0, MAX_KEYWORDS);

//   // 🔹 Step 2: Remove stopwords
//   words = words.filter(w => !stopwords.includes(w));

//   if (words.length === 0) return callback(null, []);

//   // 🔹 Step 3: Remove plural 's'
//   words = words.map(w => (w.endsWith("s") ? w.slice(0, -1) : w));

//   // 🔹 Step 4: Validate words exist in DB (like PHP iOS)
//   const checkQueries = words.map(
//     () => `
//       SELECT 1
//       FROM snap_tech_modsforminecraft_modsData
//       WHERE isActive = 1
//       AND (
//         name REGEXP ? OR description REGEXP ?
//       )
//       LIMIT 1
//     `
//   );

//   const validWords = [];

//   const runValidation = (index = 0) => {
//     if (index >= words.length) return buildFinalQuery(validWords);

//     const word = words[index];
//     const regex = `(^|[[:space:]])${word}([[:space:]]|$)`;

//     db.query(
//       checkQueries[index],
//       [regex, regex],
//       (err, result) => {
//         if (err) return callback(err);

//         if (result.length > 0) validWords.push(word);

//         runValidation(index + 1);
//       }
//     );
//   };

//   const buildFinalQuery = (validWords) => {
//     if (validWords.length === 0) return callback(null, []);

//     // 🔹 Step 5: Build WHERE clause
//     const conditions = validWords.map(
//       word => `
//         (
//           name = ?
//           OR name REGEXP ?
//           OR name LIKE ?
//           OR description = ?
//           OR description REGEXP ?
//           OR description LIKE ?
//         )
//       `
//     );

//     const whereClause = conditions.join(" OR ");

//     // 🔹 Step 6: Params
//     const params = [];

//     validWords.forEach(word => {
//       const regex = `(^|[[:space:]])${word}([[:space:]]|$)`;
//       params.push(
//         word,
//         regex,
//         `%${word}%`,
//         word,
//         regex,
//         `%${word}%`
//       );
//     });

//     const keyword = validWords[0];

//     // 🔹 Step 7: Final SQL (matching PHP ranking)
//     const sql = `
//       SELECT *
//       FROM snap_tech_modsforminecraft_modsData
//       WHERE isActive = 1
//       AND (${whereClause})

//     ORDER BY
//       CASE
//         WHEN name = ? THEN 1
//         WHEN name LIKE CONCAT(?, ' %') THEN 2
//         WHEN name LIKE CONCAT('% ', ?, ' %') THEN 3
//         WHEN name LIKE CONCAT('%', ?, '%') THEN 4
//         ELSE 5
//       END,
//       download DESC,
//       LENGTH(name) ASC,
//       name ASC
//     `;

//     db.query(
//       sql,
//       [...params, keyword, keyword, keyword, keyword],
//       (err, results) => {
//         if (err) {
//           console.error("getModsByKeywords Error:", err);
//           return callback(err);
//         }

//         callback(null, results);
//       }
//     );
//   };

//   runValidation();
// };

export const getModsByKeywords = (keywords, version = "", callback) => {
  if (!keywords || keywords.length === 0) return callback(null, []);

  const MAX_KEYWORDS = 25;

  const stopwords = [
    "in","on","under","and","but","or","for","with","to","of","from","as",
    "as if","if","nor","equal","so that","than","that","though","unless","until",
    "when","where","whether","and while","i","the","else","it","be","am","is","are",
    "not","was","were","being","been","has","have","had","do","does","did","can",
    "will","shall","should","could","would","may","might","must","about","above",
    "across","after","against","along","among","around","at","before","doing",
    "behind","below","beside","besides","between","beyond","by","down","during",
    "except","inside","into","like","near","next","off","onto","also","only","out",
    "outside","over","past","since","through","toward","unlike","up","without",
    "me","you","she","her","mine","your","yours","hers","his","its","our","ours",
    "their","theirs","my","who","whom","whose","which","already","all","another",
    "any","anybody","anyone","both","each","either","everybody","everyone",
    "everything","few","many","neither","nobody","none","no one","nothing",
    "some","somebody","someone","something"
  ];

  // 🔹 STEP 1: normalize
  let words = [
    ...new Set(
      keywords
        .join(" ")
        .toLowerCase()
        .split(/\s+/)
        .map(w => w.trim())
        .filter(Boolean)
    ),
  ].slice(0, MAX_KEYWORDS);

  // 🔹 STEP 2: remove stopwords
  words = words.filter(w => !stopwords.includes(w));

  // 🔹 STEP 3: remove plural
  words = words.map(w =>
    w.length > 1 && w.endsWith("s") ? w.slice(0, -1) : w
  );

  if (words.length === 0) return callback(null, []);

  const validWords = [];

  // 🔹 STEP 4: validate words exist in DB (same as PHP)
  const runValidation = (index = 0) => {
    if (index >= words.length) return buildFinalQuery(validWords);

    const word = words[index];
    const regex = `(^|[[:space:]])${word}([[:space:]]|$)`;

    const checkSql = `
      SELECT 1
      FROM snap_tech_modsforminecraft_modsData
      WHERE isActive = 1
      AND (
        name REGEXP ?
        OR description REGEXP ?
      )
      LIMIT 1
    `;

    db.query(checkSql, [regex, regex], (err, result) => {
      if (err) return callback(err);

      if (result.length > 0) validWords.push(word);

      runValidation(index + 1);
    });
  };

  const buildFinalQuery = (validWords) => {
    if (validWords.length === 0) return callback(null, []);

    // 🔹 FULL SEARCH STRING (IMPORTANT FIX)
    const fullSearch = validWords.join(" ");
    const searchRegex = validWords.join("|");

    // 🔹 WHERE conditions (same as PHP)
    const conditions = validWords.map(
      word => `(
        name = ?
        OR name REGEXP ?
        OR name LIKE ?
        OR description = ?
        OR description REGEXP ?
        OR description LIKE ?
      )`
    );

    const whereClause = conditions.join(" OR ");

    const params = [];

    validWords.forEach(word => {
      const regex = `(^|[[:space:]])${word}([[:space:]]|$)`;

      params.push(
        word,
        regex,
        `%${word}%`,
        word,
        regex,
        `%${word}%`
      );
    });

    const versionParam = `%${version}%`;

    // 🔥 FINAL SQL (MATCH PHP EXACTLY)
    const sql = `
      SELECT *
      FROM snap_tech_modsforminecraft_modsData
      WHERE isActive = 1
      AND ios_version LIKE ?
      AND (${whereClause})

      ORDER BY
        CASE
          WHEN name = ? THEN 1
          WHEN name LIKE CONCAT(?, ' %') THEN 2
          WHEN name LIKE CONCAT('%', ?, '%') THEN 3
          ELSE 4
        END,
        CASE
          WHEN name REGEXP CONCAT('^(', ?, ')') THEN 5
          WHEN name REGEXP CONCAT('(', ?, ')$') THEN 6
          WHEN name REGEXP CONCAT('(^|[[:space:]])(', ?, ')([[:space:]]|$)') THEN 7
          ELSE 8
        END,
        LENGTH(name) ASC,
        name ASC
    `;

    const finalParams = [
      versionParam,
      ...params,

      // 🔹 ORDER BY params
      fullSearch,
      fullSearch,
      fullSearch,

      searchRegex,
      searchRegex,
      searchRegex
    ];

    db.query(sql, finalParams, (err, results) => {
      if (err) {
        console.error("getModsByKeywords Error:", err);
        return callback(err);
      }

      callback(null, results);
    });
  };

  runValidation();
};