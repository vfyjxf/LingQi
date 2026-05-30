import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "PR analysis is not implemented yet."
    },
    { status: 501 }
  );
}
