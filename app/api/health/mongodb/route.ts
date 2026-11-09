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
  } catch (error) {
    console.error("MongoDB connection failed:", error);

    return NextResponse.json(
      { status: "error", message: "MongoDB connection failed" },
      { status: 500 }
    );
  }
}