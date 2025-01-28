export const dynamic = 'force-dynamic';

import dbConnect from "@/lib/dbConnect";
import ScheduledMatch from "@/app/models/ScheduledMatch";
import TeamModel from "@/app/models/Team";
import TournamentModel from "@/app/models/Tournament";
import BracketTeamModel from "@/app/models/BracketTeam";
import Match from "@/app/models/Match";
import { TournamentStage, MatchStatus } from "@/app/models/BracketTeam";

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

async function createBracketTeams(tournamentId: string, session: any) {
  try {
    // Clear existing bracket data
    await BracketTeamModel.deleteMany({ tournamentId }).session(session);
    await Match.deleteMany({ 
      tournamentId,
      roundType: { $in: ['quarterFinal', 'semiFinal', 'final'] }
    }).session(session);

    // Retrieve and rank teams
    const teams = await TeamModel.find({ tournamentId })
      .session(session)
      .lean();

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

    // Determine bracket configuration
    let bracketSize: number;
    let roundType: 'quarterFinal' | 'semiFinal' | 'final';
    let initialStage: TournamentStage;

    if (rankedTeams.length >= 8) {
      bracketSize = 8;
      roundType = 'quarterFinal';
      initialStage = TournamentStage.QUARTER_FINALS;
    } else if (rankedTeams.length >= 4 && rankedTeams.length <= 7) {
      bracketSize = 4;
      roundType = 'semiFinal';
      initialStage = TournamentStage.SEMI_FINALS;
    } else if (rankedTeams.length >= 2 && rankedTeams.length <= 3) {
      bracketSize = 2;
      roundType = 'final';
      initialStage = TournamentStage.FINALS;
    } else {
      throw new Error('Insufficient teams for tournament bracket');
    }

    // Select top teams
    const topTeams = rankedTeams.slice(0, bracketSize);
    console.log(`Selected top ${bracketSize} teams for ${initialStage}`);

    // Create bracket teams
    const bracketTeams = await Promise.all(
      topTeams.map(async (team, index) => {
        const bracketTeam = {
          teamName: team.teamName,
          position: index + 1,
          originalTeamId: team._id,
          tournamentId: tournamentId,
          round: bracketSize > 2 ? 1 : 3,
          stage: initialStage,
          status: MatchStatus.INCOMPLETE,
          isEliminated: false,
          score: 0,
          nextMatchId: bracketSize > 2 ? undefined : 'R2M1' 
        };

        return (await BracketTeamModel.create([bracketTeam], { session }))[0];
      })
    );

    // Create matches
    const matches = [];
    if (bracketSize === 2) {
      // Direct final match for 2 teams
      matches.push({
        tournamentId,
        round: 3,
        roundType: 'final',
        homeTeam: bracketTeams[0].teamName,
        awayTeam: bracketTeams[1].teamName,
        homeTeamId: bracketTeams[0].originalTeamId,
        awayTeamId: bracketTeams[1].originalTeamId,
        status: 'unscheduled'
      });
    } else {
      // Multi-team bracket match creation
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
    }

    await Match.create(matches, { session });
    return bracketTeams;
  } catch (error) {
    console.error('Bracket creation error:', error);
    throw error;
  }
}

async function checkRoundCompletion(tournamentId: string, session: any) {
  const tournament = await TournamentModel.findById(tournamentId).session(session);
  if (!tournament) {
    throw new Error("Tournament not found");
  }

  const allMatches = await ScheduledMatch.find({ tournamentId }).session(session);

  const matchesByRound = new Map();
  for (let round = 1; round <= tournament.numberOfRounds; round++) {
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

    // Update match status and scores
    match.status = 'completed';
    match.scores = {
      homeScore,
      awayScore,
      homePins,
      awayPins
    };
    await match.save({ session });

    // Update team statistics based on match outcome
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

    // Check round and tournament progression
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

    // Fetch and return updated match details
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
      }
    });
  } catch (error) {
    console.error('Match update error:', error);
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