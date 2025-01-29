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

async function handleQuarterFinalsCompletion(
  tournamentId: mongoose.Types.ObjectId,
  totalTeams: number
) {
  if (totalTeams <= 4) return;

  const quarterFinalTeams = await BracketTeamModel.find({
    tournamentId,
    stage: TournamentStage.QUARTER_FINALS
  });

  const allQuarterFinalsCompleted = quarterFinalTeams.every(team => 
    team.status === 'completed'
  );

  if (!allQuarterFinalsCompleted) return;

  const semiFinalTeams = await BracketTeamModel.find({
    tournamentId,
    stage: TournamentStage.SEMI_FINALS,
    isEliminated: false,
    status: 'incomplete'
  }).sort({ position: 1 });

  if (semiFinalTeams.length === 4) {
    const existingSemiFinals = await Match.find({
      tournamentId,
      roundType: 'semiFinal'
    });

    if (existingSemiFinals.length === 0) {
      const r2m1Teams = semiFinalTeams.filter(team => team.nextMatchId === 'R2M1');
      const r2m2Teams = semiFinalTeams.filter(team => team.nextMatchId === 'R2M2');

      if (r2m1Teams.length === 2 && r2m2Teams.length === 2) {
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

        await Match.insertMany(semifinals);
      }
    }
  }
}

async function handleSemiFinalsCompletion(
  tournamentId: mongoose.Types.ObjectId,
  totalTeams: number
) {
  if (totalTeams <= 2) return;

  const semiFinalTeams = await BracketTeamModel.find({
    tournamentId,
    stage: TournamentStage.SEMI_FINALS
  });

  const allSemiFinalsCompleted = semiFinalTeams.every(team => 
    team.status === 'completed'
  );

  if (!allSemiFinalsCompleted) return;

  const finalTeams = await BracketTeamModel.find({
    tournamentId,
    stage: TournamentStage.FINALS,
    isEliminated: false,
    status: 'incomplete'
  }).sort({ position: 1 });

  if (finalTeams.length === 2) {
    const existingFinal = await Match.findOne({
      tournamentId,
      roundType: 'final'
    });

    if (!existingFinal) {
      await Match.create({
        tournamentId,
        round: 3,
        roundType: 'final',
        homeTeam: finalTeams[0].teamName,
        awayTeam: finalTeams[1].teamName,
        homeTeamId: finalTeams[0].originalTeamId,
        awayTeamId: finalTeams[1].originalTeamId,
        status: 'unscheduled'
      });
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

    try {
      const totalTeams = await BracketTeamModel.countDocuments({
        tournamentId: homeTeam.tournamentId
      });

      const scheduledMatch = await ScheduledMatch.findOne({
        $and: [
          { homeTeamId: new mongoose.Types.ObjectId(homeTeamData.id) },
          { awayTeamId: new mongoose.Types.ObjectId(awayTeamData.id) },
          { status: "scheduled" }
        ]
      });

      if (scheduledMatch) {
        await ScheduledMatch.findByIdAndUpdate(
          scheduledMatch._id,
          { status: "completed" }
        );
      }

      const isHomeWinner = homeScore > awayScore;
      const winner = isHomeWinner ? homeTeam : awayTeam;
      const loser = isHomeWinner ? awayTeam : homeTeam;
      const currentStage = getStageFromRound(winner.round, totalTeams);

      // Update home team
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
        }
      );

      // Update away team
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
        }
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
        }
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
        }
      );

      // Update loser status
      await BracketTeamModel.findByIdAndUpdate(
        loser._id,
        {
          isEliminated: true,
          status: 'completed'
        }
      );

      let nextRound = winner.round;
      let nextStage = currentStage;
      let nextMatchId = null;

      if (totalTeams <= 2) {
        nextStage = TournamentStage.FINALS;
        nextRound = 3;
      } else if (totalTeams <= 4) {
        if (currentStage === TournamentStage.SEMI_FINALS) {
          nextStage = TournamentStage.FINALS;
          nextRound = winner.round + 1;
          nextMatchId = 'R3M1';
        }
      } else {
        if (currentStage === TournamentStage.QUARTER_FINALS) {
          nextStage = TournamentStage.SEMI_FINALS;
          nextRound = winner.round + 1;
          nextMatchId = calculateNextMatchId(winner.position, nextRound, totalTeams);
        } else if (currentStage === TournamentStage.SEMI_FINALS) {
          nextStage = TournamentStage.FINALS;
          nextRound = winner.round + 1;
          nextMatchId = 'R3M1';
        }
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

      await BracketTeamModel.findByIdAndUpdate(winner._id, winnerUpdate);

      if (totalTeams > 4 && currentStage === TournamentStage.QUARTER_FINALS) {
        await handleQuarterFinalsCompletion(winner.tournamentId, totalTeams);
      }
      if (totalTeams > 2 && currentStage === TournamentStage.SEMI_FINALS) {
        await handleSemiFinalsCompletion(winner.tournamentId, totalTeams);
      }
      if (currentStage === TournamentStage.FINALS) {
        await Tournament.findByIdAndUpdate(winner.tournamentId, { progress: "Completed" });
      }

      return Response.json({
        success: true,
        data: {
          winner: {
            id: winner._id,
            teamName: winner.teamName,
            round: nextRound,
            stage: nextStage,
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
      throw error;
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

function getStageFromRound(round: number, totalTeams: number): TournamentStage {
  if (totalTeams <= 2) return TournamentStage.FINALS;
  if (totalTeams <= 4) {
    return round === 2 ? TournamentStage.FINALS : TournamentStage.SEMI_FINALS;
  }
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

function calculateNextMatchId(position: number, nextRound: number, totalTeams: number): string | null {
  if (totalTeams <= 2) return null;
  if (totalTeams <= 4) {
    return nextRound === 2 ? 'R2M1' : null;
  }

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