
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    await client.db("admin").command({ ping: 1 });

    return NextResponse.json({
      status: "connected",
      database: process.env.MONGODB_DB,
    });
  } catch (error: any) {
    console.error("MongoDB detailed error:", error);

    return NextResponse.json(
      {
        status: "error",
        message: error?.message || "Unknown MongoDB error",
        code: error?.code || null,
        codeName: error?.codeName || null,
        syscall: error?.syscall || null,
        hostname: error?.hostname || null,
      },
      { status: 500 }
    );
  }
}
