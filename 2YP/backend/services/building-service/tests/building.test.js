// Import controller functions to be tested
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
// Jest mock for the database module (db.js). Instead of actually connecting
// to the database, we simulate query results using jest.fn()
jest.mock("../../../db/db.js", () => ({
  query: jest.fn() // Mock the `query` method
}));
const pool = require("../../../db/db.js");

// ==========================
// Helper function for mocking Express `res` object
// ==========================
// Creates a mock response object with `status` and `json` functions
// that can be tracked using Jest's mock functions
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res); // allows chaining: res.status(...).json(...)
  res.json = jest.fn().mockReturnValue(res);   // captures JSON output
  return res;
};

// ==========================
// Test Suite for Building Controller
// ==========================
describe("Building Controller (Unit Tests)", () => {
  // Clear all mocks after each test to prevent test interference
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ================= GET ALL BUILDINGS =================
  it("should return all buildings", async () => {
    const req = {};            // empty request object
    const res = mockResponse(); 
    const fakeRows = [{ building_id: 1, building_name: "Library" }];

    // Simulate the database returning some rows
    pool.query.mockResolvedValueOnce({ rows: fakeRows });

    // Call the controller function
    await getBuildings(req, res);

    // Assertions
    expect(pool.query).toHaveBeenCalledTimes(1);   // Ensure query was called once
    expect(res.json).toHaveBeenCalledWith(fakeRows); // Ensure correct JSON returned
  });

  // ================= GET BUILDING BY ID =================
  it("should return building by ID", async () => {
    const req = { params: { id: 1 } };
    const res = mockResponse();
    pool.query.mockResolvedValueOnce({ rows: [{ building_id: 1, building_name: "Library" }] });

    await getBuildingById(req, res);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1]); // Check query SQL and parameter
    expect(res.json).toHaveBeenCalledWith({ building_id: 1, building_name: "Library" });
  });

  it("should return 404 if building not found", async () => {
    const req = { params: { id: 99 } };
    const res = mockResponse();
    pool.query.mockResolvedValueOnce({ rows: [] }); // simulate empty result

    await getBuildingById(req, res);

    expect(res.status).toHaveBeenCalledWith(404); // Check that 404 status is returned
    expect(res.json).toHaveBeenCalledWith({ message: "Building not found" });
  });

  // ================= CREATE NEW BUILDING =================
  it("should create a new building", async () => {
    const req = {
      body: { building_id: 10, zone_id: 2, building_name: "Lab", description: "Test" }
    };
    const res = mockResponse();
    const fakeRow = { building_id: 10, zone_id: 2, building_name: "Lab", description: "Test" };
    pool.query.mockResolvedValueOnce({ rows: [fakeRow] }); // simulate DB insertion result

    await createBuilding(req, res);

    expect(res.status).toHaveBeenCalledWith(201); // Check that 201 Created is returned
    expect(res.json).toHaveBeenCalledWith({
      message: "Building created successfully",
      building: fakeRow
    });
  });

  it("should return 400 if required fields missing", async () => {
    const req = { body: { zone_id: 2 } }; // missing building_id and building_name
    const res = mockResponse();

    await createBuilding(req, res);

    expect(res.status).toHaveBeenCalledWith(400); // Check 400 Bad Request
    expect(res.json).toHaveBeenCalledWith({
      message: "building_id, zone_id and building_name are required"
    });
  });

  // ================= UPDATE BUILDING =================
  it("should update a building", async () => {
    const req = { params: { id: 1 }, body: { building_name: "Updated" } };
    const res = mockResponse();
    const fakeRow = { building_id: 1, building_name: "Updated" };
    pool.query.mockResolvedValueOnce({ rows: [fakeRow] }); // simulate DB update result

    await updateBuilding(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: "Building updated successfully",
      building: fakeRow
    });
  });

  it("should return 404 when updating non-existing building", async () => {
    const req = { params: { id: 99 }, body: { building_name: "DoesNotExist" } };
    const res = mockResponse();
    pool.query.mockResolvedValueOnce({ rows: [] }); // no rows updated

    await updateBuilding(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Building not found" });
  });

  // ================= DELETE BUILDING =================
  it("should delete a building", async () => {
    const req = { params: { id: 1 } };
    const res = mockResponse();
    const fakeRow = { building_id: 1, building_name: "Library" };
    pool.query.mockResolvedValueOnce({ rows: [fakeRow] }); // simulate DB deletion

    await deleteBuilding(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: "Building deleted successfully",
      building: fakeRow
    });
  });

  it("should return 404 if delete target not found", async () => {
    const req = { params: { id: 99 } };
    const res = mockResponse();
    pool.query.mockResolvedValueOnce({ rows: [] }); // nothing to delete

    await deleteBuilding(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Building not found" });
  });
});
