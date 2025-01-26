import dbConnect from "@/lib/dbConnect";
import TournamentModel from "@/app/models/Tournament";
import TeamModel from "@/app/models/Team";
import MatchModel from "@/app/models/Match";

export async function POST(req: Request) {
  await dbConnect();

  try {
    const { tournamentName, numberOfTeams, numberOfRounds, teams } = await req.json();

    const tournament = await TournamentModel.create({
      tournamentName,
      numberOfTeams,
      numberOfRounds
    });

    const createdTeams = await TeamModel.create(
      teams.map((teamName: string) => ({
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
        substitutePlayers: []
      }))
    );

    const teamsArray = Array.isArray(createdTeams) ? createdTeams : [createdTeams];

    const matches = [];
    for (let i = 0; i < teamsArray.length; i++) {
      for (let j = i + 1; j < teamsArray.length; j++) {
        for (let round = 1; round <= numberOfRounds; round++) {
          const matchData = {
            tournamentId: tournament._id,
            round,
            homeTeam: teamsArray[i].teamName,
            awayTeam: teamsArray[j].teamName,
            homeTeamId: teamsArray[i]._id,
            awayTeamId: teamsArray[j]._id,
            status: 'unscheduled'
          };
          matches.push(matchData);
        }
      }
    }

    const createdMatches = await MatchModel.create(matches);

    return Response.json({ 
      success: true, 
      data: { tournament, teams: teamsArray, matches: createdMatches }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      success: false, 
      message: "Error creating tournament data",
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}