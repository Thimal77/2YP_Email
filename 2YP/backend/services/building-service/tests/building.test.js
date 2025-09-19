// Import all controller functions for testing
const {
  getBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding
} = require("../src/controllers/buildingController");

// ==========================
// Mock the database pool
// ==========================
// Instead of using a real database, we mock the `query` method of our db.js
// so we can control the responses and test different scenarios
jest.mock("../../../db/db.js", () => ({
  query: jest.fn()
}));
const pool = require("../../../db/db.js");

// ==========================
// Helper function to mock Express `res` object
// ==========================
const mockResponse = () => {
  const res = {};
  // Mock `status` to return `res` for chaining: res.status(...).json(...)
  res.status = jest.fn().mockReturnValue(res);
  // Mock `json` to capture JSON responses
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ==========================
// Test Suite: Building Controller
// ==========================
describe("Building Controller (Unit Tests)", () => {
  // Clear all mock data after each test to avoid interference
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ================= GET ALL BUILDINGS =================
  it("should return all buildings when database has data", async () => {
    const req = {};
    const res = mockResponse();
    const fakeRows = [
      { building_id: 1, building_name: "Library" },
      { building_id: 2, building_name: "Science Lab" }
    ];
    pool.query.mockResolvedValueOnce({ rows: fakeRows });

    await getBuildings(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(fakeRows);
  });

  it("should return empty array when no buildings exist", async () => {
    const req = {};
    const res = mockResponse();
    pool.query.mockResolvedValueOnce({ rows: [] }); // simulate empty DB

    await getBuildings(req, res);

    expect(res.json).toHaveBeenCalledWith([]); // should return empty array
  });

  // ================= GET BUILDING BY ID =================
  it("should return building by valid ID", async () => {
    const req = { params: { id: 1 } };
    const res = mockResponse();
    pool.query.mockResolvedValueOnce({ rows: [{ building_id: 1, building_name: "Library" }] });

    await getBuildingById(req, res);

    expect(res.json).toHaveBeenCalledWith({ building_id: 1, building_name: "Library" });
  });

  it("should return 404 for non-existing building ID", async () => {
    const req = { params: { id: 99 } };
    const res = mockResponse();
    pool.query.mockResolvedValueOnce({ rows: [] });

    await getBuildingById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Building not found" });
  });

  it("should handle invalid ID type", async () => {
    const req = { params: { id: "abc" } }; // invalid string ID
    const res = mockResponse();
    pool.query.mockRejectedValueOnce(new Error("Invalid input syntax for integer")); // simulate DB error

    await getBuildingById(req, res);

    expect(res.status).toHaveBeenCalledWith(500); // internal server error
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Database error" }));
  });

  // ================= CREATE NEW BUILDING =================
  it("should create a new building with all fields", async () => {
    const req = {
      body: { building_id: 10, zone_id: 2, building_name: "Lab", description: "Test", exhibits: "Science" }
    };
    const res = mockResponse();
    const fakeRow = { building_id: 10, zone_id: 2, building_name: "Lab", description: "Test", exhibits: "Science" };
    pool.query.mockResolvedValueOnce({ rows: [fakeRow] });

    await createBuilding(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Building created successfully",
      building: fakeRow
    });
  });

  it("should return 400 if required fields are missing", async () => {
    const req = { body: { zone_id: 2 } }; // missing building_id and building_name
    const res = mockResponse();

    await createBuilding(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "building_id, zone_id and building_name are required"
    });
  });

  it("should return 409 if building ID already exists", async () => {
    const req = { body: { building_id: 1, zone_id: 2, building_name: "Lab" } };
    const res = mockResponse();
    // Simulate DB unique constraint error
    pool.query.mockRejectedValueOnce({ code: '23505', constraint: 'building_pkey' });

    await createBuilding(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "Building ID already exists" });
  });

  it("should return 409 if building name already exists", async () => {
    const req = { body: { building_id: 11, zone_id: 2, building_name: "Library" } };
    const res = mockResponse();
    pool.query.mockRejectedValueOnce({ code: '23505', constraint: 'building_name_unique' });

    await createBuilding(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "Building name must be unique" });
  });

  // ================= UPDATE BUILDING =================
  it("should update a building with partial fields", async () => {
    const req = { params: { id: 1 }, body: { building_name: "Updated Name" } };
    const res = mockResponse();
    const fakeRow = { building_id: 1, building_name: "Updated Name" };
    pool.query.mockResolvedValueOnce({ rows: [fakeRow] });

    await updateBuilding(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: "Building updated successfully",
      building: fakeRow
    });
  });

  it("should return 404 when updating non-existing building", async () => {
    const req = { params: { id: 99 }, body: { building_name: "DoesNotExist" } };
    const res = mockResponse();
    pool.query.mockResolvedValueOnce({ rows: [] });

    await updateBuilding(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Building not found" });
  });

  it("should return 409 if updated name conflicts with existing building", async () => {
    const req = { params: { id: 1 }, body: { building_name: "Library" } };
    const res = mockResponse();
    pool.query.mockRejectedValueOnce({ code: '23505' });

    await updateBuilding(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "Building name must be unique" });
  });

  // ================= DELETE BUILDING =================
  it("should delete an existing building", async () => {
    const req = { params: { id: 1 } };
    const res = mockResponse();
    const fakeRow = { building_id: 1, building_name: "Library" };
    pool.query.mockResolvedValueOnce({ rows: [fakeRow] });

    await deleteBuilding(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: "Building deleted successfully",
      building: fakeRow
    });
  });

  it("should return 404 when deleting non-existing building", async () => {
    const req = { params: { id: 99 } };
    const res = mockResponse();
    pool.query.mockResolvedValueOnce({ rows: [] });

    await deleteBuilding(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Building not found" });
  });

  it("should handle database errors on delete gracefully", async () => {
    const req = { params: { id: 1 } };
    const res = mockResponse();
    pool.query.mockRejectedValueOnce(new Error("Database connection lost"));

    await deleteBuilding(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Database error" }));
  });
});
