// controllers/buildingController.js

const pool = require('../../../../db/db.js');

// ==============================
// GET ALL BUILDINGS
// ==============================
const getBuildings = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT building_id, zone_id, building_name, description
      FROM Building
      ORDER BY building_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching buildings:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// GET BUILDING BY ID
// ==============================
const getBuildingById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT building_id, zone_id, building_name, description
       FROM Building
       WHERE building_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Building not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching building:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// CREATE A NEW BUILDING
// ==============================
const createBuilding = async (req, res) => {
  const { zone_id, building_name, description } = req.body;

  if (!zone_id || !building_name) {
    return res.status(400).json({ message: 'zone_id and building_name are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO Building (zone_id, building_name, description)
       VALUES ($1, $2, $3)
       RETURNING building_id, zone_id, building_name, description`,
      [zone_id, building_name, description || null]
    );

    res.status(201).json({ message: 'Building created successfully', building: result.rows[0] });
  } catch (err) {
    console.error('Error creating building:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// UPDATE A BUILDING
// ==============================
const updateBuilding = async (req, res) => {
  const { id } = req.params;
  const { zone_id, building_name, description } = req.body;

  try {
    const result = await pool.query(
      `UPDATE Building
       SET zone_id = COALESCE($1, zone_id),
           building_name = COALESCE($2, building_name),
           description = COALESCE($3, description)
       WHERE building_id = $4
       RETURNING building_id, zone_id, building_name, description`,
      [zone_id || null, building_name || null, description || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Building not found' });
    }

    res.json({ message: 'Building updated successfully', building: result.rows[0] });
  } catch (err) {
    console.error('Error updating building:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// DELETE A BUILDING
// ==============================
const deleteBuilding = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM Building
       WHERE building_id = $1
       RETURNING building_id, zone_id, building_name, description`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Building not found' });
    }

    res.json({ message: 'Building deleted successfully', building: result.rows[0] });
  } catch (err) {
    console.error('Error deleting building:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

module.exports = {
  getBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding
};
