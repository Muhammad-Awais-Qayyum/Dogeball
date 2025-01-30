export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import dbConnect from "@/lib/dbConnect";
import BracketTeamModel from "@/app/models/BracketTeam";
import { Types } from "mongoose";

interface PopulatedTeam {
 _id: Types.ObjectId;
 teamName: string;
 wins: number;
 losses: number;
 ties: number;
 goalsFor: number;
 goalsAgainst: number;
 pins: number;
}

interface MatchHistory {
 round: number;
 opponent: {
   _id: Types.ObjectId;
   teamName: string;
 } | Types.ObjectId;
 score: number;
 opponentScore: number;
 won: boolean;
 _id: Types.ObjectId;
}

interface PopulatedBracketTeam {
 _id: Types.ObjectId;
 teamName: string;
 position: number;
 originalTeamId: PopulatedTeam;
 tournamentId: Types.ObjectId;
 round?: number;
 isEliminated?: boolean;
 score?: number;
 nextMatchId?: string;
 matchHistory?: MatchHistory[];
}

interface FormattedTeam {
 _id: Types.ObjectId;
 teamName: string;
 position: number;
 originalTeamId: Types.ObjectId;
 tournamentId: Types.ObjectId;
 round: number;
 isEliminated: boolean;
 score: number;
 nextMatchId?: string;
 matchHistory: {
   round: number;
   opponent: Types.ObjectId;
   score: number;
   opponentScore: number;
   won: boolean;
   _id: Types.ObjectId;
 }[];
 stats: {
   wins: number;
   losses: number;
   ties: number;
   goalsFor: number;
   goalsAgainst: number;
   pins: number;
 };
}

export async function GET(request: Request) {
 const retries = 3;
 let lastError = null;

 for(let i = 0; i < retries; i++) {
   try {
     await dbConnect();
     
     const { searchParams } = new URL(request.url);
     const tournamentId = searchParams.get('tournamentId');

     if (!tournamentId) {
       return Response.json({
         success: false,
         message: "Tournament ID is required"
       }, {
         status: 400,
         headers: {
           'Cache-Control': 'no-store, no-cache, must-revalidate',
           'Pragma': 'no-cache'
         }
       });
     }

     const bracketTeams = await BracketTeamModel.find({ tournamentId })
       .populate({
         path: 'originalTeamId',
         select: 'teamName wins losses ties goalsFor goalsAgainst pins'
       })
       .populate({
         path: 'matchHistory.opponent',
         select: 'teamName'
       })
       .sort('position')
       .lean<PopulatedBracketTeam[]>();

     const formattedTeams: FormattedTeam[] = bracketTeams.map(team => ({
       _id: team._id,
       teamName: team.teamName,
       position: team.position,
       originalTeamId: team.originalTeamId._id,
       tournamentId: team.tournamentId,
       round: team.round || 1,
       isEliminated: team.isEliminated || false,
       score: team.score || 0,
       nextMatchId: team.nextMatchId,
       matchHistory: team.matchHistory?.map(match => ({
         round: match.round,
         opponent: (match.opponent as any)._id || match.opponent,
         score: match.score,
         opponentScore: match.opponentScore,
         won: match.won,
         _id: match._id
       })) || [],
       stats: {
         wins: team.originalTeamId.wins,
         losses: team.originalTeamId.losses,
         ties: team.originalTeamId.ties,
         goalsFor: team.originalTeamId.goalsFor,
         goalsAgainst: team.originalTeamId.goalsAgainst,
         pins: team.originalTeamId.pins
       }
     }));

     return Response.json({
       success: true,
       data: formattedTeams
     }, {
       headers: {
         'Cache-Control': 'no-store, no-cache, must-revalidate',
         'Pragma': 'no-cache',
         'Surrogate-Control': 'no-store',
         'Access-Control-Allow-Origin': '*',
         'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
         'Access-Control-Allow-Headers': 'Content-Type, Authorization'
       }
     });

   } catch (error) {
     console.error(`Attempt ${i + 1} failed:`, error);
     lastError = error;
     
     if (i < retries - 1) {
       await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
       continue;
     }
   }
 }

 return Response.json({
   success: false,
   message: "Error fetching bracket teams after retries",
   error: lastError instanceof Error ? lastError.message : "Unknown error"
 }, {
   status: 500,
   headers: {
     'Cache-Control': 'no-store, no-cache, must-revalidate',
     'Pragma': 'no-cache'
   }
 });
}