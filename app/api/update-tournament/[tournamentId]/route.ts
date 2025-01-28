export const dynamic = 'force-dynamic';

import TournamentModel from '@/app/models/Tournament';
import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/dbConnect';

export async function PUT(
  request: Request,
  { params }: { params: { tournamentId: string } }
) {
  try {
    const { tournamentId } = params;
    const { status } = await request.json();

    // Validate MongoDB ObjectId
    if (!isValidObjectId(tournamentId)) {
      return Response.json({
        success: false,
        message: 'Invalid tournament ID format'
      }, { status: 400 });
    }

    await dbConnect();

    // Find and update tournament
    const tournament = await TournamentModel.findById(tournamentId);

    if (!tournament) {
      return Response.json({
        success: false,
        message: 'Tournament not found'
      }, { status: 404 });
    }

    // Validate status value
    if (status !== 'completed' && status !== 'in progress') {
      return Response.json({
        success: false,
        message: 'Invalid status value'
      }, { status: 400 });
    }

    // Update tournament status
    const updatedTournament = await TournamentModel.findByIdAndUpdate(
      tournamentId,
      { 
        status,
        progress: status === 'completed' ? 'Completed' : 'In Progress'
      },
      { new: true } // Return updated document
    );

    return Response.json({
      success: true,
      data: updatedTournament
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error updating tournament:', error);
    return Response.json({
      success: false,
      message: 'Failed to update tournament'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }
}