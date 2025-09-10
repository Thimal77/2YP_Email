// controllers/eventController.js
// controllers/eventController.js

// Correct import
const pool = require('../../../../db/db.js');

// ==============================
// GET ALL EVENTS
// ==============================
const getEvents = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT event_id, event_name, start_time, end_time, location, description,
             media_urls, event_category, organizer_id
      FROM Events
      ORDER BY start_time
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// GET EVENT BY ID
// ==============================
const getEventById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT event_id, event_name, start_time, end_time, location, description,
              media_urls, event_category, organizer_id
       FROM Events WHERE event_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// CREATE A NEW EVENT
// ==============================
const createEvent = async (req, res) => {
  const { event_name, start_time, end_time, location, description, media_urls, event_category, organizer_id } = req.body;

  if (!event_name || !start_time || !end_time) {
    return res.status(400).json({ message: 'event_name, start_time, and end_time are required' });
  }

  if (end_time <= start_time) {
    return res.status(400).json({ message: 'End time must be later than start time' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO Events (event_name, start_time, end_time, location, description, media_urls, event_category, organizer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING event_id, event_name, start_time, end_time, location, description, media_urls, event_category, organizer_id`,
      [event_name, start_time, end_time, location || null, description || null, media_urls || null, event_category || null, organizer_id || null]
    );

    res.status(201).json({ message: 'Event created successfully', event: result.rows[0] });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// UPDATE AN EVENT
// ==============================
const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { event_name, start_time, end_time, location, description, media_urls, event_category, organizer_id } = req.body;

  if (start_time && end_time && end_time <= start_time) {
    return res.status(400).json({ message: 'End time must be later than start time' });
  }

  try {
    const result = await pool.query(
      `UPDATE Events
       SET event_name = COALESCE($1, event_name),
           start_time = COALESCE($2, start_time),
           end_time = COALESCE($3, end_time),
           location = COALESCE($4, location),
           description = COALESCE($5, description),
           media_urls = COALESCE($6, media_urls),
           event_category = COALESCE($7, event_category),
           organizer_id = COALESCE($8, organizer_id)
       WHERE event_id = $9
       RETURNING event_id, event_name, start_time, end_time, location, description, media_urls, event_category, organizer_id`,
      [event_name || null, start_time || null, end_time || null, location || null, description || null, media_urls || null, event_category || null, organizer_id || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ message: 'Event updated successfully', event: result.rows[0] });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// DELETE AN EVENT
// ==============================
const deleteEvent = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM Events WHERE event_id = $1
       RETURNING event_id, event_name, start_time, end_time, location`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully', event: result.rows[0] });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
};






/*
// controllers/eventController.js

// Dummy data to simulate events
let events = [
    { id: 1, name: "Robowalk", time: "10:00 a.m.", date: "2025-09-25" },
    { id: 2, name: "TechTalk", time: "2:00 p.m.", date: "2025-09-26" }
];

// Get all events
const getEvents = (req, res) => {
    res.json(events);
};

// Get a single event by ID
const getEventById = (req, res) => {
    console.log('GET /events/:id hit');
    const id = parseInt(req.params.id);
    const event = events.find(e => e.id === id);
    if (event) {
        res.json(event);
    } else {
        res.status(404).json({ message: "Event not found" });
    }
};

// Create a new event
const createEvent = (req, res) => {
    console.log("Access to the function createEvent");
    const { name, time, date } = req.body;

    const newEvent = {
        id: events.length + 1,
        name,
        time,
        date
    };

    events.push(newEvent);

    res.status(201).json({ message: "Event created", New_Event: newEvent });
};

// Update an event
const updateEvent = (req, res) => {
    const id = parseInt(req.params.id);
    const event = events.find(e => e.id === id);

    if (event) {
        const { name, time, date } = req.body;
        event.name = name || event.name;
        event.time = time || event.time;
        event.date = date || event.date;

        res.json({ message: "Event updated", Updated_Event:event });
    } else {
        res.status(404).json({ message: "Event not found" });
    }
};

// Delete an event
const deleteEvent = (req, res) => {
    const id = parseInt(req.params.id);
    const index = events.findIndex(e => e.id === id);

    if (index !== -1) {
        const deleted = events.splice(index, 1);
        res.json({ message: "Event deleted", Deleted_Event: deleted[0] });
    } else {
        res.status(404).json({ message: "Event not found" });
    }
};

module.exports = {
    getEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent
};


*/