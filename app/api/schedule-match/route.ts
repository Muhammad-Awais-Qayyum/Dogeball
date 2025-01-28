

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ScheduledMatch from "@/app/models/ScheduledMatch";
import Match from "@/app/models/Match";

export async function POST(req: Request) {
    await dbConnect();

    try {
        const { 
            matchId, 
            homeTeamId, 
            awayTeamId, 
            tournamentId, 
            scheduledDate, 
            round,
            matchType  // Added matchType field
        } = await req.json();

        if (!matchId || !homeTeamId || !awayTeamId || !tournamentId || !scheduledDate || !round) {
            return NextResponse.json(
                {
                    success: false,
                    message: "All fields are required"
                }, 
                { 
                    status: 400,
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                }
            );
        }

        // Validate matchType if provided
        if (matchType && !['quarterfinal', 'semifinal', 'final'].includes(matchType)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid match type"
                }, 
                { 
                    status: 400,
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                }
            );
        }

        // Find and update original match status
        const originalMatch = await Match.findByIdAndUpdate(
            matchId,
            { status: 'scheduled' },
            { new: true }
        );

        if (!originalMatch) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Match not found"
                }, 
                { 
                    status: 404,
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                }
            );
        }

        // Create scheduled match entry with matchType
        const scheduledMatch = await ScheduledMatch.create({
            homeTeamId,
            awayTeamId,
            tournamentId,
            scheduledDate: new Date(scheduledDate),
            endDate: new Date(new Date(scheduledDate).getTime() + 60 * 60 * 1000),
            round,
            matchType  // Added matchType to creation
        });

        const populatedMatch = await scheduledMatch.populate(['homeTeamId', 'awayTeamId']);

        return NextResponse.json(
            {
                success: true,
                message: "Match scheduled successfully",
                data: populatedMatch
            }, 
            { 
                status: 200,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache'
                }
            }
        );

    } catch (error) {
        console.error('Error scheduling match:', error);
        return NextResponse.json(
            {
                success: false,
                message: "Error scheduling match"
            }, 
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