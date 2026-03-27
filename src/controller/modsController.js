import { Mods } from "../models/modsModel.js";
import db from "../db.js";
import { uploadBuffer } from "../services/ftpService.js";
import { env } from "../config/env.js";
import { connectSFTP } from "../ftp.js";

// Get all mods
export const getAllMods = (req, res) => {
  const page = parseInt(req.query.page) || 1; // default page 1
  const limit = parseInt(req.query.limit) || 20;
  const category = req.query.category || "";
  const subCategory = req.query.subCategory || "";
  const isActive = req.query.isActive; // default true
  const search = req.query.search ? req.query.search.toLowerCase() : "";
  const oldNameSearch = (req.query.oldNameSearch || "").toLowerCase() ;
  const sortBy = req.query.sortBy ? req.query.sortBy.toLowerCase() : "latest";
  const platform = req.query.platform || "iOS";

  Mods.getAll(
    page,
    limit,
    category,
    subCategory,
    isActive,
    platform,
    search,
    oldNameSearch,
    sortBy,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    },
  );
};

// Get mod by ID
export const getModById = (req, res) => {
  const id = req.params.id;
    const platform = req.query.platform; 

  Mods.getById(id, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!result) return res.status(404).json({ message: "Mod not found" });

       if (platform === "Android") {
      result.coin = result.android_coins;
      result.download = result.android_download;
      result.isActive = result.android_isActive;
    }

    res.json(result);
  });
};

//Get mod by category
export const getModByCategory = (req, res) => {
  const category = req.params.category;
  Mods.getModByCategory(category, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!result || result.length === 0)
      return res
        .status(404)
        .json({ message: "No mods found in this category" });
    res.json(result);
  });
};

// Update mod
export const updateMod = (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const platform = req.query.platform || "iOS";


  Mods.updateMod(id, data, platform, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Mod updated successfully" });
  });
};

//download data file

export const getAllDownload = (req, res) => {
  Mods.getAllModdownloadData((err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
};

export const getDownloadById = (req, res) => {
  const id = req.params.id;

  Mods.getModDownloadById(id, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
};

export const getModDownloadByModId = (req, res) => {
  const mods_id = req.params.mods_id;

  Mods.getModDownloadByModId(mods_id, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
};

// export const updateModDownload = (req, res) => {
//   const id = req.params.id;

//   Mods.updateModDownload(id, req.body, (err, result) => {
//     if (err) {
//       return res.status(500).json({ message: "Update failed" });
//     }

//     return res.json({ message: "Mod Download Updated Successfully" });
//   });
// };

export const createModDownload = async (req, res) => {
  try {
    const { title, size, mods_id, file_format, title_for_path } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "File required" });
    }
    console.log('[UPLOAD] File received:', req.file.originalname, 'Size:', req.file.size, 'SFTP enabled:', env.sftp.enabled);

    // 🔥 Vercel-compatible: pure buffer → SFTP (use file_format as fallback)
    await uploadBuffer({
      fileFormate: file_format,
      category: req.body.category || file_format || "data",
      subCategory: req.body.sub_category || file_format || "data",
      titleForPath: title_for_path,
      fileName: req.file.originalname,
      buffer: req.file.buffer
    });

    const sql = `
      INSERT INTO snap_tech_modsforminecraft_modsDownloadData
      (mods_id, url, title, size)
      VALUES (?, ?, ?, ?)
    `;

    db.query(
      sql,
      [mods_id, req.file.originalname, title, size],
      (err, result) => {
        if (err) return res.status(500).json({ error: "DB insert failed" });

        res.json({
          message: "File added successfully",
          id: result.insertId,
        });
      },
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateModDownload = async (req, res) => {
  try {
    const id = req.params.id;
    const { title, size, url, file_format, title_for_path } = req.body;

    let fileName = url || "";

    // 1️⃣ Fetch old record (important)
    const [rows] = await db
      .promise()
      .query(
        "SELECT * FROM snap_tech_modsforminecraft_modsDownloadData WHERE id = ?",
        [id],
      );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    const oldData = rows[0];

    if (req.file) {
      // 🔥 Vercel-safe: buffer → SFTP (use file_format fallback)
      await uploadBuffer({
        fileFormate: file_format || oldData.file_format,
        category: oldData.category || req.body.category || oldData.file_format || "data",
        subCategory: oldData.sub_category || req.body.sub_category || oldData.file_format || "data",
        titleForPath: oldData.title_for_path,
        fileName: req.file.originalname,
        buffer: req.file.buffer
      });

      fileName = req.file.originalname;
    }

    const sql = `
      UPDATE snap_tech_modsforminecraft_modsDownloadData
      SET url = ?, title = ?, size = ?,  file_format=?, title_for_path=?
      WHERE id = ?
    `;

    await db
      .promise()
      .query(sql, [
        fileName,
        title,
        size,
        file_format || oldData.file_format,
        title_for_path || oldData.title_for_path,
        id,
      ]);

    res.json({ message: "File replaced and updated successfully ✅" });
  } catch (err) {
    console.error("FULL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

export const AddMod = async (req, res) => {
  const modData = req.body;

  Mods.AddMod(modData, (err, result) => {
    if (err) {
      console.error("Error adding mod:", err);
      return res
        .status(500)
        .json({
          sucess: false,
          message: " Failed to add mod",
          error: err.message,
        });
    }

    res.json({
      sucess: true,
      message: " Mod Added Successfully",
      id: result.modId,
    });
  });
};

export const getLastMod = (req, res) => {
  Mods.getLastMod((err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(result);
  });
};

export const getModHistorySummary = (req, res) => {

  const platform = req.query.platform || "iOS";
  const range = req.query.range || "last30";
  const start = req.query.start || null;
  const end = req.query.end || null;

  Mods.getModHistorySummary(platform, range, start, end, (err, result) => {

    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(result);

  });

};

// export const getModChangeTimeline = (req, res) => {

//   const mod_id = req.params.mod_id;
//   const platform = req.query.platform || "iOS";
//   const start = req.query.start || null;
//   const end = req.query.end || null;

//   Mods.getModChangeTimeline(mod_id, platform, start, end, (err, result) => {

//     if (err) {
//       return res.status(500).json({ error: err.message });
//     }

//     res.json(result);

//   });

// };

export const getModChangeTimeline = (req, res) => {

  const mod_id = req.params.mod_id;
  const platform = req.query.platform || "iOS";
  const start = req.query.fromDate || null;
  const end = req.query.toDate || null;

  Mods.getModChangeTimeline(mod_id, platform, start, end, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Optional: Convert date to readable format if needed
    const formattedResult = result.map(r => ({
      ...r,
      changed_at: r.changed_at, // or use dayjs for formatting
    }));

    res.json(formattedResult);
  });
};



// Create new mod
// export const createMod = (req, res) => {
//   const data = req.body;
//   Mods.create(data, (err, result) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.status(201).json({ message: "Mod created successfully", modId: result.insertId });
//   });
// };

// Delete mod
// export const deleteMod = (req, res) => {
//   const id = req.params.id;
//   Mods.delete(id, (err, result) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json({ message: "Mod deleted successfully" });
//   });
// };
