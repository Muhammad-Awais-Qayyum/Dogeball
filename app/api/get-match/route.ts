export const dynamic = 'force-dynamic';


import MatchModel from "@/app/models/Match";
import { Document, ObjectId } from "mongoose";

interface Match extends Document {
    _id: ObjectId;
    tournamentId: ObjectId;
    round: number;
    homeTeam: string;
    awayTeam: string;
    homeTeamId: ObjectId;
    awayTeamId: ObjectId;
    status: "scheduled" | "unscheduled";
    createdAt: Date;
    updatedAt: Date;
}

export async function GET(req:Request): Promise<Response> {
    try {
        const matches: Match[] = await MatchModel.find({ 
            status: "unscheduled" 
        })
        .populate("tournamentId")
        .sort({ round: 1 })
        .exec();

        if (!matches || matches.length === 0) {
            return Response.json(
                { message: "No unscheduled matches found." }, 
                { 
                    status: 404,
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                }
            );
        }

        return Response.json(
            matches, 
            { 
                status: 200,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache'
                }
            }
        );
    } catch (error) {
        console.error("Error fetching matches:", error);
        return Response.json(
            { error: "Error fetching matches" },
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