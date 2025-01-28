export const dynamic = 'force-dynamic';


import dbConnect from "@/lib/dbConnect";
import TournamentModel from "@/app/models/Tournament";
import TeamModel from "@/app/models/Team";
import MatchModel from "@/app/models/Match";

export async function POST(req: Request) {
  await dbConnect();

  try {
    const { 
      tournamentName, 
      numberOfTeams, 
      numberOfRounds, 
      teams 
    }: {
      tournamentName: string;
      numberOfTeams: number;
      numberOfRounds: number;
      teams: string[];
    } = await req.json();

    // Create tournament
    const tournament = await TournamentModel.create({
      tournamentName,
      numberOfTeams,
      numberOfRounds,
    });

    // Create teams
    const teamData = teams.map((teamName) => ({
      teamName,
      tournamentId: tournament._id,
      teamPhoto: { url: null, publicId: null },
      wins: 0,
      ties: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      pins: 0,
      roundsPlayed: 0,
      teamMembers: [],
      substitutePlayers: [],
    }));

    const createdTeams = await TeamModel.insertMany(teamData);

    // Generate matches
    const matches = [];
    for (let i = 0; i < createdTeams.length; i++) {
      for (let j = i + 1; j < createdTeams.length; j++) {
        for (let round = 1; round <= numberOfRounds; round++) {
          matches.push({
            tournamentId: tournament._id,
            round,
            homeTeam: createdTeams[i].teamName,
            awayTeam: createdTeams[j].teamName,
            homeTeamId: createdTeams[i]._id,
            awayTeamId: createdTeams[j]._id,
            status: "unscheduled",
          });
        }
      }
    }

    const createdMatches = await MatchModel.insertMany(matches);

    return Response.json(
      {
        success: true,
        data: {
          tournament,
          teams: createdTeams,
          matches: createdMatches,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("Error creating tournament data:", error);

    return Response.json(
      {
        success: false,
        message: "Error creating tournament data",
        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  }
}
