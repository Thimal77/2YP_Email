// 2YP/backend/services/event-service/tests/eventController.test.js

const request = require("supertest");
const express = require("express");
const bodyParser = require("body-parser");

// ===== Mock DB =====
// Must use string literal in jest.mock() because jest hoists mocks
jest.mock("../../../db/db.js", () => ({
  query: jest.fn(),
}));

const pool = require("../../../db/db.js");

const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../src/controllers/eventController");

// ===== Setup Express App for Testing =====
const app = express();
app.use(bodyParser.json());

app.get("/events", getEvents);
app.get("/events/:id", getEventById);
app.post("/events", createEvent);
app.put("/events/:id", updateEvent);
app.delete("/events/:id", deleteEvent);

describe("Event Controller API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==============================
  // GET ALL EVENTS
  // ==============================
  it("should fetch all events", async () => {
    const mockEvents = [
      { event_id: 1, event_name: "TechTalk" },
      { event_id: 2, event_name: "Hackathon" },
    ];
    pool.query.mockResolvedValueOnce({ rows: mockEvents });

    const res = await request(app).get("/events");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockEvents);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("should handle DB error on getEvents", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    pool.query.mockRejectedValueOnce(new Error("DB fail"));

    const res = await request(app).get("/events");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");

    consoleSpy.mockRestore();
  });

  // ==============================
  // GET EVENT BY ID
  // ==============================
  it("should fetch event by id", async () => {
    const mockEvent = { event_id: 1, event_name: "TechTalk" };
    pool.query.mockResolvedValueOnce({ rows: [mockEvent] });

    const res = await request(app).get("/events/1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockEvent);
  });

  it("should return 404 if event not found", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/events/999");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Event not found");
  });

  it("should return 500 if event ID is invalid type", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    pool.query.mockRejectedValueOnce(new Error("Invalid input syntax for integer"));

    const res = await request(app).get("/events/abc");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");

    consoleSpy.mockRestore();
  });

  // Edge case: Empty database
  it("should return empty array if no events exist", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/events");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  // ==============================
  // CREATE EVENT
  // ==============================
  it("should create a new event", async () => {
    const newEvent = {
      event_name: "Hackathon",
      start_time: "2025-09-20 10:00:00",
      end_time: "2025-09-20 18:00:00",
    };

    pool.query.mockResolvedValueOnce({
      rows: [{ event_id: 1, ...newEvent }],
    });

    const res = await request(app).post("/events").send(newEvent);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Event created successfully");
    expect(res.body.event.event_id).toBe(1);
  });

  it("should return 400 if required fields are missing", async () => {
    const res = await request(app).post("/events").send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/required/);
  });

  it("should return 400 if end_time <= start_time", async () => {
    const invalidEvent = {
      event_name: "Hackathon",
      start_time: "2025-09-20 18:00:00",
      end_time: "2025-09-20 10:00:00",
    };

    const res = await request(app).post("/events").send(invalidEvent);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/End time must be later/);
  });

  it("should create event with very long name", async () => {
    const longNameEvent = {
      event_name: "A".repeat(500),
      start_time: "2025-09-21 10:00:00",
      end_time: "2025-09-21 18:00:00",
    };
    pool.query.mockResolvedValueOnce({ rows: [{ event_id: 2, ...longNameEvent }] });

    const res = await request(app).post("/events").send(longNameEvent);

    expect(res.statusCode).toBe(201);
    expect(res.body.event.event_name.length).toBe(500);
  });

  it("should sanitize input to prevent SQL injection", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const maliciousEvent = {
      event_name: "Hackathon'); DROP TABLE Events;--",
      start_time: "2025-09-22 10:00:00",
      end_time: "2025-09-22 18:00:00",
    };
    pool.query.mockResolvedValueOnce({ rows: [{ event_id: 3, ...maliciousEvent }] });

    const res = await request(app).post("/events").send(maliciousEvent);

    expect(res.statusCode).toBe(201);
    expect(res.body.event.event_name).toBe(maliciousEvent.event_name);

    consoleSpy.mockRestore();
  });

  // Edge case: Invalid date format
  it("should return 400 for invalid date format", async () => {
    const invalidDateEvent = {
      event_name: "Invalid Date Event",
      start_time: "2025-13-40 10:00:00",
      end_time: "2025-13-40 18:00:00",
    };

    const res = await request(app).post("/events").send(invalidDateEvent);

    expect(res.statusCode).toBe(400);
  });

  // Edge case: Allow emojis/unicode
  it("should allow emojis and unicode in event_name", async () => {
    const emojiEvent = {
      event_name: "Tech 🎉 Hackathon 🌐",
      start_time: "2025-09-23 10:00:00",
      end_time: "2025-09-23 18:00:00",
    };
    pool.query.mockResolvedValueOnce({ rows: [{ event_id: 4, ...emojiEvent }] });

    const res = await request(app).post("/events").send(emojiEvent);

    expect(res.statusCode).toBe(201);
    expect(res.body.event.event_name).toBe(emojiEvent.event_name);
  });

  // Edge case: Overlapping event times
  it("should handle overlapping events gracefully", async () => {
    const overlapEvent = {
      event_name: "Overlap Event",
      start_time: "2025-09-20 12:00:00",
      end_time: "2025-09-20 14:00:00",
    };
    // Simulate DB rejecting overlapping event
    pool.query.mockRejectedValueOnce(new Error("Overlapping event"));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).post("/events").send(overlapEvent);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");

    consoleSpy.mockRestore();
  });

  // ==============================
  // UPDATE EVENT
  // ==============================
  it("should update an event", async () => {
    const updatedEvent = { event_name: "Updated Event" };

    pool.query.mockResolvedValueOnce({
      rows: [{ event_id: 1, ...updatedEvent }],
    });

    const res = await request(app).put("/events/1").send(updatedEvent);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Event updated successfully");
    expect(res.body.event.event_name).toBe("Updated Event");
  });

  it("should return 404 if event to update not found", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put("/events/999").send({
      event_name: "Does Not Exist",
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Event not found");
  });

  it("should partially update an event without changing other fields", async () => {
    const partialUpdate = { description: "Updated description only" };
    const existingEvent = { event_id: 1, event_name: "TechTalk", description: "Old description" };

    pool.query.mockResolvedValueOnce({
      rows: [{ ...existingEvent, ...partialUpdate }],
    });

    const res = await request(app).put("/events/1").send(partialUpdate);

    expect(res.statusCode).toBe(200);
    expect(res.body.event.description).toBe(partialUpdate.description);
    expect(res.body.event.event_name).toBe(existingEvent.event_name);
  });

  it("should return 400 if partial update sets invalid end_time", async () => {
    const invalidPartial = { start_time: "2025-09-25 18:00:00", end_time: "2025-09-25 10:00:00" };

    const res = await request(app).put("/events/1").send(invalidPartial);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/End time must be later/);
  });

  // ==============================
  // DELETE EVENT
  // ==============================
  it("should delete an event", async () => {
    const deletedEvent = { event_id: 1, event_name: "Deleted" };

    pool.query.mockResolvedValueOnce({ rows: [deletedEvent] });

    const res = await request(app).delete("/events/1");

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Event deleted successfully");
    expect(res.body.event.event_id).toBe(1);
  });

  it("should return 404 if event to delete not found", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete("/events/999");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Event not found");
  });

  it("should return 500 when deleting with invalid ID type", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    pool.query.mockRejectedValueOnce(new Error("Invalid input syntax for integer"));

    const res = await request(app).delete("/events/abc");

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Database error");

    consoleSpy.mockRestore();
  });
});
