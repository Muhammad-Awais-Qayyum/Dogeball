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

function determineInitialRound(numberOfTeams: number): {
  roundType: string;
  startingRound: number;
} {
  // For 2-3 teams: Direct to Finals
  if (numberOfTeams <= 3) {
    return { roundType: 'final', startingRound: 3 };
  }
  // For 4-6 teams: Start with Semifinals
  else if (numberOfTeams <= 6) {
    return { roundType: 'semiFinal', startingRound: 2 };
  }
  // For 7+ teams: Start with Quarterfinals
  else {
    return { roundType: 'quarterFinal', startingRound: 1 };
  }
}

async function createBracketTeams(tournamentId: string) {
  try {
    // Clear existing bracket data
    await BracketTeamModel.deleteMany({ tournamentId });
    await Match.deleteMany({ 
      tournamentId,
      roundType: { $in: ['quarterFinal', 'semiFinal', 'final'] }
    });

    // Get and rank teams based on performance
    const teams = await TeamModel.find({ tournamentId }).lean();
    const rankedTeams = teams
      .map(team => ({
        ...team,
        points: (team.wins * 3) + team.ties,
        goalDifference: team.goalsFor - team.goalsAgainst
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) 
          return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });

    // Determine tournament structure
    const { roundType, startingRound } = determineInitialRound(rankedTeams.length);
    let numberOfTeamsForBracket: number;

    // Select number of teams based on tournament size
    if (roundType === 'final') {
      numberOfTeamsForBracket = 2;
    } else if (roundType === 'semiFinal') {
      numberOfTeamsForBracket = 4;
    } else {
      numberOfTeamsForBracket = Math.min(8, rankedTeams.length);
    }

    // Create bracket teams for top performers
    const topTeams = rankedTeams.slice(0, numberOfTeamsForBracket);
    const bracketTeams = await Promise.all(
      topTeams.map(async (team, index) => {
        return await BracketTeamModel.create({
          teamName: team.teamName,
          position: index + 1,
          originalTeamId: team._id,
          tournamentId: tournamentId,
          round: startingRound,
          stage: roundType,
          isEliminated: false,
          status: 'incomplete',
          score: 0
        });
      })
    );

    // Create initial matches based on seeding
    let matchPairings = [];
    if (roundType === 'final') {
      matchPairings = [{ home: 1, away: 2 }];
    } else if (roundType === 'semiFinal') {
      matchPairings = [
        { home: 1, away: 4 },
        { home: 2, away: 3 }
      ];
    } else {
      matchPairings = [
        { home: 1, away: 8 },
        { home: 4, away: 5 },
        { home: 3, away: 6 },
        { home: 2, away: 7 }
      ];
    }

    // Create matches
    await Promise.all(
      matchPairings.map(async (pairing) => {
        const homeTeam = bracketTeams.find(t => t.position === pairing.home);
        const awayTeam = bracketTeams.find(t => t.position === pairing.away);
        if (homeTeam && awayTeam) {
          await Match.create({
            tournamentId,
            round: startingRound,
            roundType,
            homeTeam: homeTeam.teamName,
            awayTeam: awayTeam.teamName,
            homeTeamId: homeTeam.originalTeamId,
            awayTeamId: awayTeam.originalTeamId,
            status: 'unscheduled'
          });
        }
      })
    );

    return bracketTeams;
  } catch (error) {
    console.error('Error creating bracket:', error);
    throw error;
  }
}

async function checkRoundCompletion(tournamentId: string) {
  const tournament = await TournamentModel.findById(tournamentId);
  if (!tournament) {
    throw new Error("Tournament not found");
  }

  const totalRounds = tournament.numberOfRounds;
  const allMatches = await ScheduledMatch.find({ tournamentId });

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

  try {
    const { homeScore, awayScore, homePins, awayPins } = await request.json();

    const match = await ScheduledMatch.findById(params.matchId);
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
    await match.save();

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
        }
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
        }
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
        }
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
        }
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
        }
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
        }
      );
    }

    const { allRoundsCompleted, tournament, matchesByRound } = 
      await checkRoundCompletion(match.tournamentId.toString());

    const roundStatuses = [...tournament.roundStatuses];
    roundStatuses[match.round - 1] = true;
    tournament.roundStatuses = roundStatuses;
    
    if (allRoundsCompleted) {
      await createBracketTeams(match.tournamentId.toString());
    }

    await tournament.save();

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