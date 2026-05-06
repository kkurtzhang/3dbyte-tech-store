const mockGraph = jest.fn();

import { GET } from "../route";

describe("GET /store/orders/lookup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an email-verified order by custom display id", async () => {
    mockGraph.mockResolvedValue({
      data: [
        {
          id: "order_123",
          custom_display_id: "3DB-1777978800123",
          email: "customer@example.com",
        },
      ],
    });

    const req = {
      query: {
        email: " CUSTOMER@example.com ",
        reference: " 3DB-1777978800123 ",
      },
      scope: {
        resolve: jest.fn().mockReturnValue({ graph: mockGraph }),
      },
    };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    await GET(req as never, res as never);

    expect(mockGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "order",
        filters: {
          custom_display_id: "3DB-1777978800123",
        },
      }),
    );
    expect(res.json).toHaveBeenCalledWith({
      order: expect.objectContaining({
        id: "order_123",
        custom_display_id: "3DB-1777978800123",
      }),
    });
  });

  it("rejects lookup when the email does not match", async () => {
    mockGraph.mockResolvedValue({
      data: [
        {
          id: "order_123",
          custom_display_id: "3DB-1777978800123",
          email: "owner@example.com",
        },
      ],
    });

    const req = {
      query: {
        email: "other@example.com",
        reference: "3DB-1777978800123",
      },
      scope: {
        resolve: jest.fn().mockReturnValue({ graph: mockGraph }),
      },
    };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    await GET(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ order: null });
  });

  it("requires both reference and email", async () => {
    const req = {
      query: {
        email: "",
        reference: "",
      },
      scope: {
        resolve: jest.fn().mockReturnValue({ graph: mockGraph }),
      },
    };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    await GET(req as never, res as never);

    expect(mockGraph).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ order: null });
  });
});
