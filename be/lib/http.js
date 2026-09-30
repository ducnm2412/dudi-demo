import { NextResponse } from 'next/server';

function corsHeaders() {
  return {
    // Bỏ dấu "/" cuối nếu có, vì Origin trình duyệt gửi lên không bao giờ có
    'Access-Control-Allow-Origin': (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, ''),
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}

export function preflight() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
