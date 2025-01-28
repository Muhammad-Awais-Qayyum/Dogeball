export const dynamic = 'force-dynamic';

import BracketTeamModel, { TournamentStage } from '@/app/models/BracketTeam';
import TeamModel from '@/app/models/Team';
import Match from '@/app/models/Match';
import ScheduledMatch from '@/app/models/ScheduledMatch';
import Tournament from '@/app/models/Tournament';
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

async function getInitialStage(tournamentId: mongoose.Types.ObjectId, session: mongoose.ClientSession) {
  const bracketTeams = await BracketTeamModel.find({ tournamentId }).session(session);
  const teamCount = bracketTeams.length;
  
  if (teamCount >= 8) return TournamentStage.QUARTER_FINALS;
  if (teamCount >= 4) return TournamentStage.SEMI_FINALS;
  return TournamentStage.FINALS;
}

async function handleSemiFinalsSetup(tournamentId: mongoose.Types.ObjectId, session: mongoose.ClientSession) {
  const semiFinalTeams = await BracketTeamModel.find({
    tournamentId,
    stage: TournamentStage.SEMI_FINALS,
    isEliminated: false,
    status: 'incomplete'
  }).sort({ position: 1 }).session(session);

  if (semiFinalTeams.length === 2) {
    const existingSemis = await Match.find({
      tournamentId,
      roundType: 'semiFinal'
    }).session(session);

    if (existingSemis.length === 0) {
      const semifinal = {
        tournamentId,
        round: 1,
        roundType: 'semiFinal',
        homeTeam: semiFinalTeams[0].teamName,
        awayTeam: semiFinalTeams[1].teamName,
        homeTeamId: semiFinalTeams[0].originalTeamId,
        awayTeamId: semiFinalTeams[1].originalTeamId,
        status: 'unscheduled'
      };

      await Match.create([semifinal], { session });
    }
  }
}

async function handleFinalSetup(tournamentId: mongoose.Types.ObjectId, session: mongoose.ClientSession) {
  const finalTeams = await BracketTeamModel.find({
    tournamentId,
    stage: TournamentStage.FINALS,
    isEliminated: false,
    status: 'incomplete'
  }).sort({ position: 1 }).session(session);

  if (finalTeams.length === 2) {
    const existingFinal = await Match.findOne({
      tournamentId,
      roundType: 'final'
    }).session(session);

    if (!existingFinal) {
      const finalMatch = {
        tournamentId,
        round: await getNextRound(tournamentId, session),
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

async function getNextRound(tournamentId: mongoose.Types.ObjectId, session: mongoose.ClientSession): Promise<number> {
  const initialStage = await getInitialStage(tournamentId, session);
  switch (initialStage) {
    case TournamentStage.QUARTER_FINALS:
      return 3;
    case TournamentStage.SEMI_FINALS:
      return 2;
    case TournamentStage.FINALS:
      return 1;
    default:
      return 1;
  }
}

async function handleStageCompletion(
  tournamentId: mongoose.Types.ObjectId,
  currentStage: TournamentStage,
  session: mongoose.ClientSession
) {
  if (currentStage === TournamentStage.QUARTER_FINALS) {
    const allTeams = await BracketTeamModel.find({
      tournamentId,
      stage: currentStage
    }).session(session);
    
    const allCompleted = allTeams.every(team => team.status === 'completed');
    if (allCompleted) {
      await handleSemiFinalsSetup(tournamentId, session);
    }
  } else if (currentStage === TournamentStage.SEMI_FINALS) {
    const allTeams = await BracketTeamModel.find({
      tournamentId,
      stage: currentStage
    }).session(session);
    
    const allCompleted = allTeams.every(team => team.status === 'completed');
    if (allCompleted) {
      await handleFinalSetup(tournamentId, session);
    }
  } else if (currentStage === TournamentStage.FINALS) {
    await Tournament.findByIdAndUpdate(
      tournamentId,
      { progress: "Completed" },
      { session }
    );
  }
}

function calculateNextMatchId(position: number, currentStage: TournamentStage, teamCount: number): string | null {
  if (currentStage === TournamentStage.QUARTER_FINALS) {
    if (position === 1 || position === 8 || position === 4 || position === 5) {
      return 'R2M1';
    }
    if (position === 2 || position === 7 || position === 3 || position === 6) {
      return 'R2M2';
    }
  }

  if (currentStage === TournamentStage.SEMI_FINALS) {
    const isFourTeamTournament = teamCount <= 4;
    return isFourTeamTournament ? 'R2M1' : 'R3M1';
  }

  return null;
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
      return Response.json({
        success: false,
        message: 'One or both teams not found'
      }, { status: 404 });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get total team count for the tournament
      const totalTeams = await BracketTeamModel.countDocuments({
        tournamentId: homeTeam.tournamentId
      }).session(session);

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

      const isHomeWinner = homeScore > awayScore;
      const winner = isHomeWinner ? homeTeam : awayTeam;
      const loser = isHomeWinner ? awayTeam : homeTeam;
      const currentStage = winner.stage || await getInitialStage(winner.tournamentId, session);

      // Update team match histories
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

      // Update loser's status
      await BracketTeamModel.findByIdAndUpdate(
        loser._id,
        {
          isEliminated: true,
          status: 'completed'
        },
        { session }
      );

      // Determine next stage and round for winner
      let nextStage = currentStage;
      let nextRound = winner.round;
      let nextMatchId = null;

      if (currentStage !== TournamentStage.FINALS) {
        nextStage = currentStage === TournamentStage.QUARTER_FINALS 
          ? TournamentStage.SEMI_FINALS 
          : TournamentStage.FINALS;
        
        nextRound = winner.round + 1;
        nextMatchId = calculateNextMatchId(winner.position, currentStage, totalTeams);
      }

      // Update winner's status
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

      // Handle stage completion and next stage setup
      await handleStageCompletion(winner.tournamentId, currentStage, session);

      await session.commitTransaction();

      return Response.json({
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
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
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
    return Response.json({
      success: false,
      message: 'Failed to update match'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }
}