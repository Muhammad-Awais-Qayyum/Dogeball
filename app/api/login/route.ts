export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/app/models/User";
import jwt from "jsonwebtoken";
import { initializeDatabase } from "@/lib/initDb";

export async function POST(req: Request) {
  try {
    // Connect to the database
    await dbConnect();
    
    // Initialize the database
    await initializeDatabase();

    // Parse request body
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    // Find the user
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || user.password !== password) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    // Generate JWT token with 7-day expiration
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    // Create response with the token in a secure cookie
    const response = NextResponse.json(
      {
        success: true,
        user: { id: user._id, email: user.email, role: user.role },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );

    response.cookies.set("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred while processing the login.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  }
}