    import { Schema, model, models, Document, Model } from "mongoose";

    interface IPhoto {
      url: string | null;
      publicId: string | null;
    }

    interface ITeamMember {
      name: string;
      photo: IPhoto;
    }

    interface ISubstitutePlayer {
      name: string;
      photo: IPhoto;
    }

    export interface ITeam extends Document {
      teamName: string;
      teamPhoto: IPhoto;
      tournamentId: Schema.Types.ObjectId;
      teamMembers: ITeamMember[];
      substitutePlayers: ISubstitutePlayer[];
      wins: number;
      ties: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
      pins: number;
      roundsPlayed: number;
      createdAt?: Date;
      updatedAt?: Date;
    }

    const TeamSchema = new Schema<ITeam>(
      {
        teamName: {
          type: String,
          required: true,
          trim: true,
        },
        teamPhoto: {
          url: { type: String, default: null },
          publicId: { type: String, default: null },
        },
        tournamentId: {
          type: Schema.Types.ObjectId,
          ref: "Tournament",
          required: true,
        },
        teamMembers: [
          {
            name: { type: String, required: true },
            photo: {
              url: { type: String, default: null },
              publicId: { type: String, default: null },
            },
          },
        ],
        substitutePlayers: [
          {
            name: { type: String, required: true },
            photo: {
              url: { type: String, default: null },
              publicId: { type: String, default: null },
            },
          },
        ],
        wins: {
          type: Number,
          default: 0,
          min: 0,
        },
        ties: {
          type: Number,
          default: 0,
          min: 0,
        },
        losses: {
          type: Number,
          default: 0,
          min: 0,
        },
        goalsFor: {
          type: Number,
          default: 0,
          min: 0,
        },
        goalsAgainst: {
          type: Number,
          default: 0,
          min: 0,
        },
        pins: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      { timestamps: true }
    );

    const TeamModel: Model<ITeam> = models.Team || model<ITeam>("Team", TeamSchema);

    export default TeamModel;