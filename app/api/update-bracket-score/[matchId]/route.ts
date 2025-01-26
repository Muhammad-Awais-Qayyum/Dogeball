import { NextResponse } from 'next/server';
import BracketTeamModel, { TournamentStage } from '@/app/models/BracketTeam';
import TeamModel from '@/app/models/Team';
import Match from '@/app/models/Match';
import ScheduledMatch from '@/app/models/ScheduledMatch';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';


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

interface WinnerUpdate {
  isEliminated: boolean;
  score: number;
  status: 'completed' | 'incomplete';
  round?: number;
  stage?: TournamentStage;
  nextMatchId?: string | null;
}

// Helper function to check quarter-finals completion and create semi-final matches
async function handleQuarterFinalsCompletion(tournamentId: mongoose.Types.ObjectId, session: mongoose.ClientSession) {
  // Check if all quarter-final teams are completed
  const quarterFinalTeams = await BracketTeamModel.find({
    tournamentId,
    stage: TournamentStage.QUARTER_FINALS
  }).session(session);

  const allQuarterFinalsCompleted = quarterFinalTeams.every(team => 
    team.status === 'completed'
  );

  if (!allQuarterFinalsCompleted) {
    return;
  }

  // Find semi-final teams that are ready
  const semiFinalTeams = await BracketTeamModel.find({
    tournamentId,
    stage: TournamentStage.SEMI_FINALS,
    isEliminated: false,
    status: 'incomplete'
  }).sort({ position: 1 }).session(session);

  if (semiFinalTeams.length === 4) {
    // Check if semi-final matches already exist
    const existingSemiFinals = await Match.find({
      tournamentId,
      roundType: 'semiFinal'
    }).session(session);

    if (existingSemiFinals.length === 0) {
      // Group teams by their nextMatchId
      const r2m1Teams = semiFinalTeams.filter(team => team.nextMatchId === 'R2M1');
      const r2m2Teams = semiFinalTeams.filter(team => team.nextMatchId === 'R2M2');

      if (r2m1Teams.length === 2 && r2m2Teams.length === 2) {
        // Create semi-final matches
        const semifinals = [
          {
            tournamentId,
            round: 2,
            roundType: 'semiFinal',
            homeTeam: r2m1Teams[0].teamName,
            awayTeam: r2m1Teams[1].teamName,
            homeTeamId: r2m1Teams[0].originalTeamId,
            awayTeamId: r2m1Teams[1].originalTeamId,
            status: 'unscheduled'
          },
          {
            tournamentId,
            round: 2,
            roundType: 'semiFinal',
            homeTeam: r2m2Teams[0].teamName,
            awayTeam: r2m2Teams[1].teamName,
            homeTeamId: r2m2Teams[0].originalTeamId,
            awayTeamId: r2m2Teams[1].originalTeamId,
            status: 'unscheduled'
          }
        ];

        await Match.insertMany(semifinals, { session });
      }
    }
  }
}

// Helper function to check semi-finals completion and create final match
async function handleSemiFinalsCompletion(tournamentId: mongoose.Types.ObjectId, session: mongoose.ClientSession) {
  // Check if all semi-final teams are completed
  const semiFinalTeams = await BracketTeamModel.find({
    tournamentId,
    stage: TournamentStage.SEMI_FINALS
  }).session(session);

  const allSemiFinalsCompleted = semiFinalTeams.every(team => 
    team.status === 'completed'
  );

  if (!allSemiFinalsCompleted) {
    return;
  }

  // Find final teams that are ready
  const finalTeams = await BracketTeamModel.find({
    tournamentId,
    stage: TournamentStage.FINALS,
    isEliminated: false,
    status: 'incomplete'
  }).sort({ position: 1 }).session(session);

  if (finalTeams.length === 2) {
    // Check if final match already exists
    const existingFinal = await Match.findOne({
      tournamentId,
      roundType: 'final'
    }).session(session);

    if (!existingFinal) {
      // Create final match
      const finalMatch = {
        tournamentId,
        round: 3,
        roundType: 'final',
        homeTeam: finalTeams[0].teamName,
        awayTeam: finalTeams[1].teamName,
        homeTeamId: finalTeams[0].originalTeamId,
        awayTeamId: finalTeams[1].originalTeamId,
        status: 'unscheduled'
      };

      await Match.create([finalMatch], { session });
    }
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const {
      homeTeam: homeTeamData,
      awayTeam: awayTeamData,
      homeScore,
      awayScore,
      homePins,
      awayPins
    } = await request.json();

    await dbConnect();

    // Find both bracket teams
    const bracketTeams = await BracketTeamModel.find({
      $or: [
        { originalTeamId: homeTeamData.id },
        { originalTeamId: awayTeamData.id }
      ],
      isEliminated: false
    }).sort({ position: 1 });

    const homeTeam = bracketTeams.find(team => team.originalTeamId.toString() === homeTeamData.id);
    const awayTeam = bracketTeams.find(team => team.originalTeamId.toString() === awayTeamData.id);

    if (!homeTeam || !awayTeam) {
      return NextResponse.json({
        success: false,
        message: 'One or both teams not found'
      }, { status: 404 });
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update scheduled match if exists
      const scheduledMatch = await ScheduledMatch.findOne({
        $and: [
          { homeTeamId: new mongoose.Types.ObjectId(homeTeamData.id) },
          { awayTeamId: new mongoose.Types.ObjectId(awayTeamData.id) },
          { status: "scheduled" }
        ]
      }).session(session);

      if (scheduledMatch) {
        await ScheduledMatch.findByIdAndUpdate(
          scheduledMatch._id,
          { status: "completed" },
          { session }
        );
      }

      // Determine winner and loser
      const isHomeWinner = homeScore > awayScore;
      const winner = isHomeWinner ? homeTeam : awayTeam;
      const loser = isHomeWinner ? awayTeam : homeTeam;
      const currentStage = getStageFromRound(winner.round);

      // Update match history for both teams
      await BracketTeamModel.findByIdAndUpdate(
        homeTeam._id,
        {
          score: homeScore,
          $push: {
            matchHistory: {
              round: homeTeam.round,
              stage: currentStage,
              opponent: awayTeam._id,
              opponentPosition: awayTeam.position,
              position: homeTeam.position,
              score: homeScore,
              opponentScore: awayScore,
              won: isHomeWinner
            }
          }
        },
        { session }
      );

      await BracketTeamModel.findByIdAndUpdate(
        awayTeam._id,
        {
          score: awayScore,
          $push: {
            matchHistory: {
              round: awayTeam.round,
              stage: currentStage,
              opponent: homeTeam._id,
              opponentPosition: homeTeam.position,
              position: awayTeam.position,
              score: awayScore,
              opponentScore: homeScore,
              won: !isHomeWinner
            }
          }
        },
        { session }
      );

      // Update team statistics
      await TeamModel.findByIdAndUpdate(
        homeTeamData.id,
        {
          $inc: {
            goalsFor: homeScore,
            goalsAgainst: awayScore,
            pins: homePins,
            wins: isHomeWinner ? 1 : 0,
            losses: isHomeWinner ? 0 : 1,
          }
        },
        { session }
      );

      await TeamModel.findByIdAndUpdate(
        awayTeamData.id,
        {
          $inc: {
            goalsFor: awayScore,
            goalsAgainst: homeScore,
            pins: awayPins,
            wins: isHomeWinner ? 0 : 1,
            losses: isHomeWinner ? 1 : 0,
          }
        },
        { session }
      );

      // Update loser status
      await BracketTeamModel.findByIdAndUpdate(
        loser._id,
        {
          isEliminated: true,
          status: 'completed'
        },
        { session }
      );

      // Handle winner progression
      const nextRound = winner.round + 1;
      let nextStage = TournamentStage.FINALS;
      let nextMatchId = null;

      if (currentStage === TournamentStage.QUARTER_FINALS) {
        nextStage = TournamentStage.SEMI_FINALS;
        nextMatchId = calculateNextMatchId(winner.position, 2);
      } else if (currentStage === TournamentStage.SEMI_FINALS) {
        nextStage = TournamentStage.FINALS;
        nextMatchId = 'R3M1';
      }

      const winnerUpdate: WinnerUpdate = currentStage === TournamentStage.FINALS
        ? {
          isEliminated: true,
          score: 0,
          status: 'completed'
        }
        : {
          isEliminated: false,
          score: 0,
          status: 'incomplete',
          round: nextRound,
          stage: nextStage,
          nextMatchId: nextMatchId
        };

      await BracketTeamModel.findByIdAndUpdate(
        winner._id,
        winnerUpdate,
        { session }
      );

      // Check and handle tournament progression
      if (currentStage === TournamentStage.QUARTER_FINALS) {
        await handleQuarterFinalsCompletion(winner.tournamentId, session);
      } else if (currentStage === TournamentStage.SEMI_FINALS) {
        await handleSemiFinalsCompletion(winner.tournamentId, session);
      }

      await session.commitTransaction();

      return NextResponse.json({
        success: true,
        data: {
          winner: {
            id: winner._id,
            teamName: winner.teamName,
            round: currentStage === TournamentStage.FINALS ? winner.round : nextRound,
            stage: currentStage === TournamentStage.FINALS ? currentStage : nextStage,
            position: winner.position,
            nextMatchId: nextMatchId,
            matchStats: {
              goalsFor: isHomeWinner ? homeScore : awayScore,
              goalsAgainst: isHomeWinner ? awayScore : homeScore,
              pins: isHomeWinner ? homePins : awayPins
            }
          },
          loser: {
            id: loser._id,
            teamName: loser.teamName,
            position: loser.position,
            stage: currentStage,
            isEliminated: true,
            matchStats: {
              goalsFor: isHomeWinner ? awayScore : homeScore,
              goalsAgainst: isHomeWinner ? homeScore : awayScore,
              pins: isHomeWinner ? awayPins : homePins
            }
          }
        }
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update match'
    }, { status: 500 });
  }
}

// Helper functions remain the same as your original code...
function getStageFromRound(round: number): TournamentStage {
  switch (round) {
    case 1:
      return TournamentStage.QUARTER_FINALS;
    case 2:
      return TournamentStage.SEMI_FINALS;
    case 3:
      return TournamentStage.FINALS;
    default:
      return TournamentStage.FINALS;
  }
}

function calculateNextMatchId(position: number, nextRound: number): string | null {
  if (nextRound === 2) {
    if (position === 1 || position === 8 || position === 4 || position === 5) {
      return 'R2M1';
    }
    if (position === 2 || position === 7 || position === 3 || position === 6) {
      return 'R2M2';
    }
  }

  if (nextRound === 3) {
    return 'R3M1';
  }

  return null;
}