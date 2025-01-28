export const dynamic = 'force-dynamic';


import ScheduledMatch from "@/app/models/ScheduledMatch";
import MatchModel from "@/app/models/Match";
import dbConnect from "@/lib/dbConnect";
import TournamentModel from "@/app/models/Tournament";
import TeamModel from "@/app/models/Team";
import BracketTeamModel from "@/app/models/BracketTeam";

export async function DELETE(req: Request) {
  const { id } = await req.json();

  if (!id) {
    return Response.json(
      {
        success: false,
        message: "Tournament ID is required.",
      },
      { 
        status: 400,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  }

  await dbConnect();

  try {
    const deletedTournament = await TournamentModel.findByIdAndDelete(id);

    if (!deletedTournament) {
      return Response.json(
        {
          success: false,
          message: "Tournament not found.",
        },
        { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    // Delete all teams associated with the tournament
    const deletedTeams = await TeamModel.deleteMany({
      tournamentId: id,
    });

    // Delete all bracket teams associated with the tournament
    const deletedBracketTeams = await BracketTeamModel.deleteMany({
      tournamentId: id,
    });

    // Delete all scheduled matches associated with the tournament
    const deletedScheduledMatches = await ScheduledMatch.deleteMany({
      tournamentId: id,
    });

    // Delete all matches associated with the tournament
    const deletedMatches = await MatchModel.deleteMany({
      tournamentId: id,
    });

    return Response.json(
      {
        success: true,
        message: "Tournament deleted successfully.",
        deletedTeams: deletedTeams.deletedCount,
        deletedBracketTeams: deletedBracketTeams.deletedCount,
        deletedScheduledMatches: deletedScheduledMatches.deletedCount,
        deletedMatches: deletedMatches.deletedCount,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  } catch (error) {
    console.error("Error deleting tournament:", error);

    return Response.json(
      {
        success: false,
        message: "Error deleting tournament. Please try again.",
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