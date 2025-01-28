
import dbConnect from "@/lib/dbConnect";
import TeamModel from "@/app/models/Team";
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface Member {
  name: string;
  photo: {
    url: string | null;
    publicId: string | null;
  };
}

interface TeamPhoto {
  url: string | null;
  publicId: string | null;
}

interface UpdateData {
  teamName?: string;
  teamPhoto?: TeamPhoto;
  teamMembers?: Member[];
  substitutePlayers?: Member[];
}

export async function PUT(req: Request) {
  await dbConnect();

  try {
    const body = await req.json();
    const { teamId, teamName, teamPhoto, teamMembers, substitutePlayers } = body;

    if (!teamId) {
      return new Response(JSON.stringify({ success: false, message: "Team ID is required" }), { status: 400 });
    }

    const team = await TeamModel.findById(teamId);
    if (!team) {
      return new Response(JSON.stringify({ success: false, message: "Team not found" }), { status: 404 });
    }

    const updateData: UpdateData = {};

    if (teamName) {
      updateData.teamName = teamName;
    }

    // Handle team photo
    if (teamPhoto?.url && teamPhoto.url.startsWith('data:')) {
      if (team.teamPhoto?.publicId) {
        await cloudinary.uploader.destroy(team.teamPhoto.publicId);
      }
      const uploadedPhoto = await cloudinary.uploader.upload(teamPhoto.url, { folder: "teams" });
      updateData.teamPhoto = {
        url: uploadedPhoto.secure_url,
        publicId: uploadedPhoto.public_id,
      };
    } else {
      updateData.teamPhoto = team.teamPhoto;
    }

    // Handle team members
    if (teamMembers) {
      // Delete images of removed team members
      const existingMemberIds = team.teamMembers.map((member: Member, index: number) => index);
      const newMemberIds = teamMembers.map((_: any, index: number) => index);
      const removedMemberIds = existingMemberIds.filter(id => !newMemberIds.includes(id));

      // Delete Cloudinary images for removed members
      for (const id of removedMemberIds) {
        const removedMember = team.teamMembers[id];
        if (removedMember?.photo?.publicId) {
          await cloudinary.uploader.destroy(removedMember.photo.publicId);
        }
      }

      // Update remaining members
      const updatedTeamMembers = await Promise.all(
        teamMembers.map(async (member: any, index: number) => {
          const existingMember = team.teamMembers[index];
          const memberUpdate = {
            name: member.name,
            photo: existingMember?.photo || { url: null, publicId: null }
          };

          if (member.photo?.url && typeof member.photo.url === 'string' && member.photo.url.startsWith('data:')) {
            if (existingMember?.photo?.publicId) {
              await cloudinary.uploader.destroy(existingMember.photo.publicId);
            }
            const uploadedPhoto = await cloudinary.uploader.upload(member.photo.url, { folder: "team_members" });
            memberUpdate.photo = {
              url: uploadedPhoto.secure_url,
              publicId: uploadedPhoto.public_id,
            };
          }
          
          return memberUpdate;
        })
      );
      updateData.teamMembers = updatedTeamMembers;
    }

    // Handle substitute players (similar logic as team members)
    if (substitutePlayers) {
      const existingSubIds = team.substitutePlayers.map((sub: Member, index: number) => index);
      const newSubIds = substitutePlayers.map((_: any, index: number) => index);
      const removedSubIds = existingSubIds.filter(id => !newSubIds.includes(id));

      for (const id of removedSubIds) {
        const removedSub = team.substitutePlayers[id];
        if (removedSub?.photo?.publicId) {
          await cloudinary.uploader.destroy(removedSub.photo.publicId);
        }
      }

      const updatedSubstitutePlayers = await Promise.all(
        substitutePlayers.map(async (player: any, index: number) => {
          const existingPlayer = team.substitutePlayers[index];
          const playerUpdate = {
            name: player.name,
            photo: existingPlayer?.photo || { url: null, publicId: null }
          };

          if (player.photo?.url && typeof player.photo.url === 'string' && player.photo.url.startsWith('data:')) {
            if (existingPlayer?.photo?.publicId) {
              await cloudinary.uploader.destroy(existingPlayer.photo.publicId);
            }
            const uploadedPhoto = await cloudinary.uploader.upload(player.photo.url, { folder: "substitute_players" });
            playerUpdate.photo = {
              url: uploadedPhoto.secure_url,
              publicId: uploadedPhoto.public_id,
            };
          }

          return playerUpdate;
        })
      );
      updateData.substitutePlayers = updatedSubstitutePlayers;
    }

    const updatedTeam = await TeamModel.findByIdAndUpdate(
      teamId,
      { $set: updateData },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Team updated successfully",
      data: updatedTeam,
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });


  } catch (error) {
    console.error("Error updating team:", error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Error updating team" 
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }
}