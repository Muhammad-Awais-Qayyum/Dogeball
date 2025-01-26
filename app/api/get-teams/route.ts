import dbConnect from "@/lib/dbConnect";
import TeamModel from "@/app/models/Team";

export async function POST(request: Request) {
  await dbConnect();
  
  try {
    const body = await request.json();
    const { tournamentId, teamId } = body;

    // Handle single team fetch if teamId is provided
    if (teamId) {
      const team = await TeamModel.findById(teamId)
        .select("-__v")
        .lean();

      if (!team) {
        return Response.json({
          success: false,
          message: "Team not found",
        }, { status: 404 });
      }

      return Response.json({
        success: true,
        message: "Team fetched successfully",
        data: team,
      }, { status: 200 });
    }

    // Handle tournament teams fetch if tournamentId is provided
    if (tournamentId) {
      const teams = await TeamModel.find({ tournamentId })
        .select("-__v")
        .sort({ createdAt: -1 })
        .lean();

      return Response.json({
        success: true,
        message: "Teams fetched successfully",
        data: teams,
      }, { status: 200 });
    }

    // If neither teamId nor tournamentId is provided
    return Response.json({
      success: false,
      message: "Either Team ID or Tournament ID is required",
    }, { status: 400 });

  } catch (error) {
    console.error("Error fetching team(s):", error);

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
      message: "Error fetching team(s). Please try again.",
    }, { status: 500 });
  }
}