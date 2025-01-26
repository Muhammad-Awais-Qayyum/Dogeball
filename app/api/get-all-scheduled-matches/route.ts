import dbConnect from "@/lib/dbConnect";
import ScheduledMatch from "@/app/models/ScheduledMatch";
import TeamModel from "@/app/models/Team";

export async function GET() {
  await dbConnect();

  try {
    const matches = await ScheduledMatch.find()
      .populate({
        path: 'homeTeamId',
        model: TeamModel,
        select: 'teamName teamPhoto'
      })
      .populate({
        path: 'awayTeamId',
        model: TeamModel,
        select: 'teamName teamPhoto'
      })
      .sort('scheduledDate');

    return Response.json({
      success: true,
      data: matches
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return Response.json({
      success: false,
      message: "Error fetching matches"
    }, { status: 500 });
  }
}