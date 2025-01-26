import dbConnect from "@/lib/dbConnect";
import TeamModel from "@/app/models/Team";
import { v2 as cloudinary } from "cloudinary";
import TournamentModel from "@/app/models/Tournament";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  
export async function DELETE(req: Request) {
    await dbConnect();
  
    try {
      const body = await req.json();
      const { teamId } = body;
  
      if (!teamId) {
        return new Response(JSON.stringify({ success: false, message: "Team ID is required" }), { status: 400 });
      }
  
      const team = await TeamModel.findById(teamId);
      if (!team) {
        return new Response(JSON.stringify({ success: false, message: "Team not found" }), { status: 404 });
      }
  
      // Delete Cloudinary images
      if (team.teamPhoto?.publicId) {
        await cloudinary.uploader.destroy(team.teamPhoto.publicId);
      }
  
      for (const member of team.teamMembers) {
        if (member.photo?.publicId) {
          await cloudinary.uploader.destroy(member.photo.publicId);
        }
      }
  
      for (const player of team.substitutePlayers) {
        if (player.photo?.publicId) {
          await cloudinary.uploader.destroy(player.photo.publicId);
        }
      }
  
      // Update tournament's numberOfTeams
      if (team.tournamentId) {
        await TournamentModel.findByIdAndUpdate(
          team.tournamentId,
          { $inc: { numberOfTeams: -1 } }
        );
      }
  
      await TeamModel.findByIdAndDelete(teamId);
  
      return new Response(JSON.stringify({
        success: true,
        message: "Team deleted successfully"
      }), { status: 200 });
  
    } catch (error) {
      console.error("Error deleting team:", error);
      return new Response(JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : "Error deleting team" 
      }), { status: 500 });
    }
  }