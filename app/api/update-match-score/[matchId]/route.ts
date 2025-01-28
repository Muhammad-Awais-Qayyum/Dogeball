export const dynamic = 'force-dynamic';


import dbConnect from "@/lib/dbConnect";
import ScheduledMatch from "@/app/models/ScheduledMatch";
import TeamModel from "@/app/models/Team";
import TournamentModel from "@/app/models/Tournament";
import BracketTeamModel from "@/app/models/BracketTeam";
import Match from "@/app/models/Match";
import { Document } from "mongoose";

interface ITeam {
  _id: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  goalsFor: number;
  goalsAgainst: number;
  pins: number;
}

interface ITournament extends Document {
  _id: string;
  numberOfRounds: number;
  roundStatuses: boolean[];
  name: string;
  startDate: Date;
  endDate: Date;
}

interface IMatch {
  _id: string;
  tournamentId: string;
  round: number;
  roundType: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string;
  awayTeamId: string;
  status: 'scheduled' | 'unscheduled' | 'completed';
  scheduledDate?: Date;
  scores?: {
    homeScore: number;
    awayScore: number;
    homePins: number;
    awayPins: number;
  };
}

async function createBracketTeams(tournamentId: string, session: any) {
  try {
    await BracketTeamModel.deleteMany({ tournamentId }).session(session);
    await Match.deleteMany({ 
      tournamentId,
      roundType: { $in: ['quarterFinal', 'semiFinal', 'final'] }
    }).session(session);

    // Get all teams and rank them
    const teams = await TeamModel.find({ tournamentId })
      .session(session)
      .lean();

    // Rank teams based on points and goal difference
    const rankedTeams = teams
      .map(team => ({
        ...team,
        points: (team.wins * 3) + team.ties,
        goalDifference: team.goalsFor - team.goalsAgainst
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });

    // Determine bracket size and stage based on number of teams
    let bracketSize;
    let roundType;
    let initialStage;

    // Updated logic for different team numbers
    if (rankedTeams.length >= 8) {
      bracketSize = 8;
      roundType = 'quarterFinal';
      initialStage = 'Quarter-finals';
    } else if (rankedTeams.length >= 4 && rankedTeams.length <= 7) {
      bracketSize = 4;
      roundType = 'semiFinal';
      initialStage = 'Semi-finals';
    } else if (rankedTeams.length >= 2 && rankedTeams.length <= 3) {
      bracketSize = 2;
      roundType = 'final';
      initialStage = 'Final';
    } else {
      throw new Error('Not enough teams for a bracket');
    }

    // Take only the top N teams based on bracket size
    const topTeams = rankedTeams.slice(0, bracketSize);
    console.log(`Selected top ${bracketSize} teams for ${initialStage}`);

    console.log(rankedTeams.length)
    console.log(initialStage)

    // Create bracket teams from selected top teams
    const bracketTeams = await Promise.all(
      topTeams.map(async (team, index) => {
        const bracketTeam = {
          teamName: team.teamName,
          position: index + 1,
          originalTeamId: team._id,
          tournamentId: tournamentId,
          round: 1,
          stage: initialStage,
          status: 'incomplete',
          isEliminated: false,
          score: 0
        };

        return (await BracketTeamModel.create([bracketTeam], { session }))[0];
      })
    );

    console.log(bracketTeams)

    // Create matches based on bracket size
    const matches = [];
    const numberOfMatches = bracketSize / 2;

    for (let i = 0; i < numberOfMatches; i++) {
      const homeTeam = bracketTeams[i];
      const awayTeam = bracketTeams[bracketSize - 1 - i];

      matches.push({
        tournamentId,
        round: 1,
        roundType,
        homeTeam: homeTeam.teamName,
        awayTeam: awayTeam.teamName,
        homeTeamId: homeTeam.originalTeamId,
        awayTeamId: awayTeam.originalTeamId,
        status: 'unscheduled',
        nextMatchId: bracketSize > 2 ? `R2M${Math.ceil((i + 1) / 2)}` : undefined
      });
    }

    await Match.create(matches, { session });
    return bracketTeams;
  } catch (error) {
    console.error('Error creating bracket teams and matches:', error);
    throw error;
  }
}
function getRoundType(numberOfTeams: number): string {
  switch (numberOfTeams) {
    case 8:
      return 'quarterFinal';
    case 4:
      return 'semiFinal';
    case 2:
      return 'final';
    default:
      return 'quarterFinal';
  }
}

async function checkRoundCompletion(tournamentId: string, session: any) {
  const tournament = await TournamentModel.findById(tournamentId).session(session);
  if (!tournament) {
    throw new Error("Tournament not found");
  }

  const totalRounds = tournament.numberOfRounds;
  const allMatches = await ScheduledMatch.find({ tournamentId }).session(session);

  const matchesByRound = new Map();
  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = allMatches.filter(m => m.round === round);
    const completedMatchesInRound = matchesInRound.filter(m => m.status === 'completed');
    
    matchesByRound.set(round, {
      total: matchesInRound.length,
      completed: completedMatchesInRound.length
    });
  }

  const allRoundsCompleted = Array.from(matchesByRound.values()).every(
    roundStats => roundStats.total > 0 && roundStats.total === roundStats.completed
  );

  return {
    allRoundsCompleted,
    tournament,
    matchesByRound
  };
}

export async function PUT(request: Request, { params }: { params: { matchId: string } }) {
  await dbConnect();
  const session = await ScheduledMatch.startSession();
  session.startTransaction();

  try {
    const { homeScore, awayScore, homePins, awayPins } = await request.json();

    const match = await ScheduledMatch.findById(params.matchId).session(session);
    if (!match) {
      throw new Error("Match not found");
    }

    match.status = 'completed';
    match.scores = {
      homeScore,
      awayScore,
      homePins,
      awayPins
    };
    await match.save({ session });

    // Update team statistics
    if (homeScore === awayScore) {
      await TeamModel.findByIdAndUpdate(
        match.homeTeamId,
        {
          $inc: {
            goalsFor: homeScore,
            goalsAgainst: awayScore,
            ties: 1,
            pins: homePins,
          },
        },
        { session }
      );

      await TeamModel.findByIdAndUpdate(
        match.awayTeamId,
        {
          $inc: {
            goalsFor: awayScore,
            goalsAgainst: homeScore,
            ties: 1,
            pins: awayPins,
          },
        },
        { session }
      );
    } else if (homeScore > awayScore) {
      await TeamModel.findByIdAndUpdate(
        match.homeTeamId,
        {
          $inc: {
            goalsFor: homeScore,
            goalsAgainst: awayScore,
            wins: 1,
            pins: homePins,
          },
        },
        { session }
      );

      await TeamModel.findByIdAndUpdate(
        match.awayTeamId,
        {
          $inc: {
            goalsFor: awayScore,
            goalsAgainst: homeScore,
            losses: 1,
            pins: awayPins,
          },
        },
        { session }
      );
    } else {
      await TeamModel.findByIdAndUpdate(
        match.homeTeamId,
        {
          $inc: {
            goalsFor: homeScore,
            goalsAgainst: awayScore,
            losses: 1,
            pins: homePins,
          },
        },
        { session }
      );

      await TeamModel.findByIdAndUpdate(
        match.awayTeamId,
        {
          $inc: {
            goalsFor: awayScore,
            goalsAgainst: homeScore,
            wins: 1,
            pins: awayPins,
          },
        },
        { session }
      );
    }

    const { allRoundsCompleted, tournament, matchesByRound } = 
      await checkRoundCompletion(match.tournamentId.toString(), session);

    const roundStatuses = [...tournament.roundStatuses];
    roundStatuses[match.round - 1] = true;
    tournament.roundStatuses = roundStatuses;
    
    if (allRoundsCompleted) {
      await createBracketTeams(match.tournamentId.toString(), session);
    }

    await tournament.save({ session });
    await session.commitTransaction();
    session.endSession();

    const updatedMatch = await ScheduledMatch.findById(params.matchId)
      .populate('homeTeamId')
      .populate('awayTeamId');

    return Response.json({ 
      success: true, 
      data: updatedMatch,
      allRoundsCompleted
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }});
  } catch (error) {
    console.error('Error updating match score:', error);
    await session.abortTransaction();
    session.endSession();

    return Response.json(
      { success: false, message: "Error updating match score" },
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