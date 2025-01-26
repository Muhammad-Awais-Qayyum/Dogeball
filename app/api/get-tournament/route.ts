import dbConnect from "@/lib/dbConnect";
import TournamentModel from "@/app/models/Tournament";

export async function GET() {
  await dbConnect();

  try {
    const tournaments = await TournamentModel.find()
      .select("-__v")
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({
      success: true,
      message: "Tournaments fetched successfully",
      data: tournaments,
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching tournaments:", error);

    // Log the full error stack trace for debugging purposes
    if (error instanceof Error) {
      console.error(error.stack);
    }

    if (error instanceof Error && error.name === "MongooseError") {
      return Response.json({
        success: false,
        message: "Database connection error. Please try again later.",
      }, { status: 503 });
    }

    return Response.json({
      success: false,
      message: "Error fetching tournaments. Please try again.",
    }, { status: 500 });
  }
}
