"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { UserPlus, X, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface IPhoto {
  url: string | null;
  publicId: string | null;
}

interface TeamMember {
  _id: string;
  name: string;
  photo: IPhoto;
}

interface TeamData {
  _id: string;
  teamName: string;
  teamPhoto: IPhoto;
  tournamentId: string;
  teamMembers: TeamMember[];
  substitutePlayers: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

interface TeamEditorProps {
  teamId: string;
  onTeamUpdated?: () => void;
}

export function TeamEditor({ teamId, onTeamUpdated }: TeamEditorProps) {
  const [teamName, setTeamName] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [teamImage, setTeamImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [substitutePlayers, setSubstitutePlayers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTeamData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/get-teams', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: teamId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch team data');
      }

      if (data.success) {
        const teamData: TeamData = data.data;
        setTeamName(teamData.teamName);
        setTeamImage(teamData.teamPhoto?.url || null);
        setTeamMembers(teamData.teamMembers || []);
        setSubstitutePlayers(teamData.substitutePlayers || []);
      } else {
        throw new Error(data.message || 'Failed to fetch team data');
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load team data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [teamId, toast]);

  useEffect(() => {
    if (teamId) {
      fetchTeamData();
    }
  }, [teamId, fetchTeamData]);

  const handleFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const base64Image = await handleFileToBase64(file);
      setTeamImage(base64Image);
      toast({
        title: "Image uploaded",
        description: "Remember to save changes to update the team photo.",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload failed",
        description: "There was a problem uploading the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleMemberPhotoUpload = async (
    memberId: string, 
    type: "regular" | "substitute", 
    file: File
  ) => {
    try {
      const base64Image = await handleFileToBase64(file);
      const members = type === "regular" ? teamMembers : substitutePlayers;
      const setMembers = type === "regular" ? setTeamMembers : setSubstitutePlayers;

      const updatedMembers = members.map(member => 
        member._id === memberId 
          ? { ...member, photo: { url: base64Image, publicId: null } }
          : member
      );

      setMembers(updatedMembers);
      toast({
        title: "Photo uploaded",
        description: "Remember to save changes to update the member photo.",
      });
    } catch (error) {
      console.error("Error uploading member photo:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload member photo.",
        variant: "destructive",
      });
    }
  };

  const handleAddMember = (type: "regular" | "substitute") => {
    if (!newMemberName.trim()) return;

    const newMember = {
      _id: `temp_${Date.now()}`,
      name: newMemberName,
      photo: {
        url: null,
        publicId: null
      }
    };

    if (type === "regular") {
      setTeamMembers(prev => [...prev, newMember]);
    } else {
      setSubstitutePlayers(prev => [...prev, newMember]);
    }

    setNewMemberName("");
    toast({
      title: "Member added",
      description: "Remember to save changes to update the team."
    });
  };

  const handleRemoveMember = (memberId: string, type: "regular" | "substitute") => {
    if (type === "regular") {
      setTeamMembers(prev => prev.filter(member => member._id !== memberId));
    } else {
      setSubstitutePlayers(prev => prev.filter(member => member._id !== memberId));
    }

    toast({
      title: "Member removed",
      description: "Remember to save changes to update the team."
    });
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/update-team`, {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          teamName,
          teamPhoto: teamImage?.startsWith('data:') ? { url: teamImage } : undefined,
          teamMembers: teamMembers.map(member => ({
            name: member.name,
            ...(member._id.startsWith('temp_') ? {} : { _id: member._id }),
            photo: member.photo.url?.startsWith('data:') ? 
              { url: member.photo.url } : 
              member.photo
          })),
          substitutePlayers: substitutePlayers.map(member => ({
            name: member.name,
            ...(member._id.startsWith('temp_') ? {} : { _id: member._id }),
            photo: member.photo.url?.startsWith('data:') ? 
              { url: member.photo.url } : 
              member.photo
          }))
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update team');
      }

      if (data.success) {
        await fetchTeamData();
        
        if (onTeamUpdated) {
          onTeamUpdated();
        }
        
        toast({
          title: "Changes Saved",
          description: "Team information has been updated successfully.",
        });
      } else {
        throw new Error(data.message || 'Failed to update team');
      }
    } catch (error) {
      console.error("Error saving team:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save team changes",
        variant: "destructive",
      });
    }
  };

  
  if (loading) {
    return <div className="text-white">Loading team data...</div>;
  }


  const renderMemberAvatar = (member: TeamMember) => (
    <div className="relative group cursor-pointer">
      <Avatar className="h-8 w-8 bg-white/10">
        {member.photo?.url ? (
          <AvatarImage src={member.photo.url} alt={member.name} />
        ) : (
          <AvatarFallback>{member.name?.charAt(0) || "M"}</AvatarFallback>
        )}
      </Avatar>
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        <label htmlFor={`photo-${member._id}`} className="cursor-pointer">
          <Upload className="h-4 w-4 text-white" />
        </label>
        <input
          type="file"
          id={`photo-${member._id}`}
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const type = teamMembers.find(m => m._id === member._id) 
                ? "regular" 
                : "substitute";
              handleMemberPhotoUpload(member._id, type, file);
            }
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-4 max-w-screen-lg mx-auto">
      {/* Team Info */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div {...getRootProps()} className="relative cursor-pointer">
          <input {...getInputProps()} />
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 bg-white/10 ring-2 ring-offset-2 ring-offset-black ring-white/10 group-hover:ring-blue-500">
            {teamImage ? (
              <AvatarImage src={teamImage} alt={teamName} className="object-cover" />
            ) : (
              <AvatarFallback className="text-lg sm:text-2xl">{teamName?.[0] || "T"}</AvatarFallback>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100">
              <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </Avatar>
        </div>
        
        <div className="w-full sm:flex-1">
          <Label className="text-sm text-gray-400">Team Name</Label>
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="bg-white/5 border-white/10 text-white mt-2"
          />
        </div>
      </div>
 
      {/* Members Lists */}
      <div className="grid gap-6">
        {/* Team Members */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Team Members</h3>
          <div className="grid gap-3">
            {teamMembers.length > 0 ? (
              teamMembers.map((member) => (
                <div key={member._id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3 min-w-0">
                    {renderMemberAvatar(member)}
                    <span className="text-white truncate">{member.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMember(member._id, "regular")}
                    className="shrink-0 ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-lg bg-white/5 text-gray-400 text-center">No team members</div>
            )}
          </div>
        </div>
 
        {/* Substitutes */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Substitute Players</h3>
          <div className="grid gap-3">
            {substitutePlayers.length > 0 ? (
              substitutePlayers.map((member) => (
                <div key={member._id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3 min-w-0">
                    {renderMemberAvatar(member)}
                    <span className="text-white truncate">{member.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon" 
                    onClick={() => handleRemoveMember(member._id, "substitute")}
                    className="shrink-0 ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-lg bg-white/5 text-gray-400 text-center">No substitutes</div>
            )}
          </div>
        </div>
 
        {/* Add Member */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Add Member</h3>
          <div className="grid sm:grid-cols-[1fr,auto,auto] gap-3">
            <Input
              placeholder="Enter member name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
            <Button
              onClick={() => handleAddMember("regular")}
              className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Regular
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAddMember("substitute")}
              className="border-white/10 bg-white/10 text-white hover:bg-white/20 whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Sub
            </Button>
          </div>
        </div>
 
        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
 }