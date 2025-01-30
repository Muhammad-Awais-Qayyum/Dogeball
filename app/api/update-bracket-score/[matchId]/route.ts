export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from "@/lib/dbConnect";
import BracketTeamModel, { TournamentStage } from '@/app/models/BracketTeam';
import TeamModel from '@/app/models/Team';
import Match from '@/app/models/Match';
import ScheduledMatch from '@/app/models/ScheduledMatch';
import Tournament from '@/app/models/Tournament';
import mongoose from 'mongoose';

// Define interfaces for data structures
interface TeamData {
  id: string;
  name: string;
}

interface MatchUpdateData {
  homeTeam: TeamData;
  awayTeam: TeamData;
  homeScore: number;
  awayScore: number;
  homePins: number;
  awayPins: number;
}

interface BracketMatch {
  tournamentId: mongoose.Types.ObjectId;
  round: number;
  roundType: 'quarterFinal' | 'semiFinal' | 'final';
  homeTeam: string;
  awayTeam: string;
  homeTeamId: mongoose.Types.ObjectId;
  awayTeamId: mongoose.Types.ObjectId;
  status: 'scheduled' | 'unscheduled' | 'completed';
}

interface StageProgression {
  currentRound: number;
  nextRound: number | null;
  nextStage: TournamentStage | null;
  teamsNeeded: number | null;
  matchPrefix: string | null;
}

interface MatchHistory {
  round: number;
  stage: TournamentStage;
  opponent: mongoose.Types.ObjectId;
  opponentPosition: number;
  position: number;
  score: number;
  opponentScore: number;
  won: boolean;
}

// Helper function to determine tournament progression for each stage
function getStageProgression(stage: TournamentStage): StageProgression {
  switch (stage) {
    case TournamentStage.QUARTER_FINALS:
      return {
        currentRound: 1,
        nextRound: 2,
        nextStage: TournamentStage.SEMI_FINALS,
        teamsNeeded: 4,
        matchPrefix: 'R2M'
      };
    case TournamentStage.SEMI_FINALS:
      return {
        currentRound: 2,
        nextRound: 3,
        nextStage: TournamentStage.FINALS,
        teamsNeeded: 2,
        matchPrefix: 'R3M'
      };
    case TournamentStage.FINALS:
      return {
        currentRound: 3,
        nextRound: null,
        nextStage: null,
        teamsNeeded: null,
        matchPrefix: null
      };
    default:
      throw new Error('Invalid tournament stage');
  }
}

// Function to update both team statistics and match history
async function updateTeamStats(
  team: any,
  opponent: any,
  score: number,
  opponentScore: number,
  isWinner: boolean,
  pins: number
): Promise<void> {
  // Create match history entry
  const matchHistory: MatchHistory = {
    round: team.round,
    stage: team.stage,
    opponent: opponent._id,
    opponentPosition: opponent.position,
    position: team.position,
    score,
    opponentScore,
    won: isWinner
  };

  // Prepare update data for bracket team
  const updateData = {
    score,
    status: 'completed' as const,
    isEliminated: !isWinner,
    $push: { matchHistory }
  };

  // Update bracket team while preserving in database
  await BracketTeamModel.findByIdAndUpdate(team._id, updateData);

  // Update main team statistics
  await TeamModel.findByIdAndUpdate(
    team.originalTeamId,
    {
      $inc: {
        wins: isWinner ? 1 : 0,
        losses: isWinner ? 0 : 1,
        goalsFor: score,
        goalsAgainst: opponentScore,
        pins
      }
    }
  );
}

// Function to create matches for next tournament stage
async function createNextStageMatches(
  tournamentId: mongoose.Types.ObjectId,
  winners: any[],
  currentStage: TournamentStage
): Promise<void> {
  const progression = getStageProgression(currentStage);
  if (!progression.nextStage) return;

  let matches: BracketMatch[] = [];

  if (currentStage === TournamentStage.QUARTER_FINALS) {
    matches = [
      {
        tournamentId,
        round: progression.nextRound!,
        roundType: 'semiFinal',
        homeTeam: winners[0].teamName,
        awayTeam: winners[3].teamName,
        homeTeamId: winners[0].originalTeamId,
        awayTeamId: winners[3].originalTeamId,
        status: 'unscheduled'
      },
      {
        tournamentId,
        round: progression.nextRound!,
        roundType: 'semiFinal',
        homeTeam: winners[1].teamName,
        awayTeam: winners[2].teamName,
        homeTeamId: winners[1].originalTeamId,
        awayTeamId: winners[2].originalTeamId,
        status: 'unscheduled'
      }
    ];
  } else if (currentStage === TournamentStage.SEMI_FINALS) {
    matches = [{
      tournamentId,
      round: progression.nextRound!,
      roundType: 'final',
      homeTeam: winners[0].teamName,
      awayTeam: winners[1].teamName,
      homeTeamId: winners[0].originalTeamId,
      awayTeamId: winners[1].originalTeamId,
      status: 'unscheduled'
    }];
  }

  // Create matches for next stage
  if (matches.length > 0) {
    await Match.create(matches);
  }

  // Update all advancing teams for next stage
  await Promise.all(winners.map(async (team, index) => {
    const nextMatchId = `${progression.matchPrefix}${Math.ceil((index + 1) / 2)}`;
    await BracketTeamModel.findByIdAndUpdate(team._id, {
      round: progression.nextRound,
      stage: progression.nextStage,
      status: 'incomplete',
      nextMatchId,
      score: 0
    });
  }));
}

// Function to check if all matches in a stage are completed
async function isStageCompleted(
  tournamentId: mongoose.Types.ObjectId,
  stage: TournamentStage
): Promise<boolean> {
  const teamsInStage = await BracketTeamModel.find({
    tournamentId,
    stage
  });
  return teamsInStage.every(team => team.status === 'completed');
}

// Main route handler for updating bracket scores
export async function PUT(
  request: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    await dbConnect();
    const matchData: MatchUpdateData = await request.json();

    // Find all teams involved in this match
    const bracketTeams = await BracketTeamModel.find({
      $or: [
        { originalTeamId: matchData.homeTeam.id },
        { originalTeamId: matchData.awayTeam.id }
      ]
    });

    const homeTeam = bracketTeams.find(
      team => team.originalTeamId.toString() === matchData.homeTeam.id
    );
    const awayTeam = bracketTeams.find(
      team => team.originalTeamId.toString() === matchData.awayTeam.id
    );

    if (!homeTeam || !awayTeam) {
      return NextResponse.json({
        success: false,
        message: 'Teams not found in bracket'
      }, { status: 404 });
    }

    // Update scheduled match status
    const scheduledMatches = await ScheduledMatch.find({
      tournamentId: homeTeam.tournamentId,
      $or: [
        {
          homeTeamId: new mongoose.Types.ObjectId(matchData.homeTeam.id),
          awayTeamId: new mongoose.Types.ObjectId(matchData.awayTeam.id)
        },
        {
          homeTeamId: new mongoose.Types.ObjectId(matchData.awayTeam.id),
          awayTeamId: new mongoose.Types.ObjectId(matchData.homeTeam.id)
        }
      ],
      status: "scheduled"
    });

    // Mark all scheduled matches as completed
    if (scheduledMatches.length > 0) {
      await ScheduledMatch.updateMany(
        { _id: { $in: scheduledMatches.map(match => match._id) } },
        { status: "completed" }
      );
    }

    // Determine winner and loser
    const isHomeWinner = matchData.homeScore > matchData.awayScore;
    const winner = isHomeWinner ? homeTeam : awayTeam;
    const loser = isHomeWinner ? awayTeam : homeTeam;

    // Update both teams while preserving them in database
    await Promise.all([
      updateTeamStats(
        winner,
        loser,
        isHomeWinner ? matchData.homeScore : matchData.awayScore,
        isHomeWinner ? matchData.awayScore : matchData.homeScore,
        true,
        isHomeWinner ? matchData.homePins : matchData.awayPins
      ),
      updateTeamStats(
        loser,
        winner,
        isHomeWinner ? matchData.awayScore : matchData.homeScore,
        isHomeWinner ? matchData.homeScore : matchData.awayScore,
        false,
        isHomeWinner ? matchData.awayPins : matchData.homePins
      )
    ]);

    // Check stage completion and handle progression
    const stageCompleted = await isStageCompleted(winner.tournamentId, winner.stage);

    if (stageCompleted && winner.stage !== TournamentStage.FINALS) {
      // Get all winners from current stage
      const winners = await BracketTeamModel.find({
        tournamentId: winner.tournamentId,
        stage: winner.stage,
        isEliminated: false
      }).sort({ position: 1 });

      // Create next stage matches and update advancing teams
      await createNextStageMatches(winner.tournamentId, winners, winner.stage);
    }

    // Handle tournament completion
    if (winner.stage === TournamentStage.FINALS && stageCompleted) {
      await Tournament.findByIdAndUpdate(
        winner.tournamentId,
        {
          progress: "Completed",
          winner: winner.originalTeamId
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        winner: {
          id: winner._id,
          teamName: winner.teamName,
          round: winner.round,
          stage: winner.stage,
          position: winner.position,
          nextMatchId: winner.nextMatchId
        },
        loser: {
          id: loser._id,
          teamName: loser.teamName,
          position: loser.position,
          stage: loser.stage,
          isEliminated: true
        }
      }
    });

  } catch (error) {
    console.error('Error updating bracket score:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update bracket score'
    }, { status: 500 });
  }
}