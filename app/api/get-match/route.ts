export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const matches: Match[] = await MatchModel.find({ 
            status: "unscheduled" 
        })
        .populate("tournamentId")
        .sort({ round: 1 })
        .exec();

        if (!matches || matches.length === 0) {
            return NextResponse.json(
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

        return NextResponse.json(
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
        return NextResponse.json(
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