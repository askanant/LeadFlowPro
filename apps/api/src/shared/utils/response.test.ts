import { describe, it, expect, vi } from 'vitest';
import { sendSuccess, sendError } from './response';

function mockResponse() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('sendSuccess', () => {
  it('sends 200 with success envelope', () => {
    const res = mockResponse();
    sendSuccess(res, { id: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1 } });
  });

  it('includes meta when provided', () => {
    const res = mockResponse();
    sendSuccess(res, [1, 2], { total: 10 });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [1, 2],
      meta: { total: 10 },
    });
  });

  it('accepts custom status code', () => {
    const res = mockResponse();
    sendSuccess(res, { created: true }, undefined, 201);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('omits meta key when not provided', () => {
    const res = mockResponse();
    sendSuccess(res, 'ok');
    const body = res.json.mock.calls[0][0];
    expect(body).not.toHaveProperty('meta');
  });
});

describe('sendError', () => {
  it('sends error envelope with default 400 status', () => {
    const res = mockResponse();
    sendError(res, 'BAD_INPUT', 'Missing field');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'BAD_INPUT', message: 'Missing field' },
    });
  });

  it('accepts custom status code', () => {
    const res = mockResponse();
    sendError(res, 'NOT_FOUND', 'Gone', 404);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
