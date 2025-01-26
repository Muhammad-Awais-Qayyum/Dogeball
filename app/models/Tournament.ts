import mongoose, { Document, Schema } from "mongoose";

export interface ITournament extends Document {
    tournamentName: string;
    numberOfTeams: number;
    numberOfRounds: number;
    progress: "In Progress" | "Completed";
    roundStatuses: boolean[];  // Array to track completion status of each round
    createdAt?: Date;
    updatedAt?: Date;
}

const TournamentSchema: Schema<ITournament> = new Schema(
    {
        tournamentName: {
            type: String,
            required: [true, "Tournament name is required"],
        },
        numberOfTeams: {
            type: Number,
            required: [true, "Number of teams is required"],
            min: [2, "A tournament must have at least 2 teams"],
        },
        numberOfRounds: {
            type: Number,
            required: [true, "Number of rounds is required"],
            min: [1, "A tournament must have at least 1 round"],
        },
        progress: {
            type: String,
            enum: ["In Progress", "Completed"],
            default: "In Progress",
        },
        roundStatuses: {
            type: [Boolean],  // Array of boolean values
            default: function() {
                // Initialize array with false values based on numberOfRounds
                return new Array((this as any).numberOfRounds).fill(false);
            },
            validate: {
                validator: function(statuses: boolean[]) {
                    // Ensure the array length matches numberOfRounds
                    return statuses.length === (this as any).numberOfRounds;
                },
                message: "Number of round statuses must match number of rounds"
            }
        }
    },
    {
        timestamps: true,
    }
);

const TournamentModel =
    (mongoose.models.Tournament as mongoose.Model<ITournament>) ||
    mongoose.model<ITournament>("Tournament", TournamentSchema);

export default TournamentModel;