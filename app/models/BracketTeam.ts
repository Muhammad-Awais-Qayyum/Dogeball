import mongoose, { Schema, Document } from 'mongoose';

// Tournament stage enum
export enum TournamentStage {
  QUARTER_FINALS = 'Quarter-finals',
  SEMI_FINALS = 'Semi-finals',
  FINALS = 'Finals'
}

// Match status enum
export enum MatchStatus {
  COMPLETED = 'completed',
  INCOMPLETE = 'incomplete'
}

export interface IBracketTeam extends Document {
  teamName: string;
  position: number;
  originalTeamId: mongoose.Types.ObjectId;
  tournamentId: mongoose.Types.ObjectId;
  round: number;
  stage: TournamentStage;
  status: MatchStatus;  // Added status field
  isEliminated: boolean;
  nextMatchId?: string;
  score: number;
  matchHistory?: {
    round: number;
    stage: TournamentStage;
    opponent: mongoose.Types.ObjectId;
    opponentPosition: number;
    position: number;
    score: number;
    opponentScore: number;
    won: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const BracketTeamSchema: Schema = new Schema(
  {
    teamName: {
      type: String,
      required: [true, 'Team name is required'],
    },
    position: {
      type: Number,
      required: [true, 'Position is required'],
      min: [1, 'Position must be at least 1'],
      max: [8, 'Position cannot exceed 8']
    },
    originalTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Original team ID is required'],
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'Tournament ID is required'],
    },
    round: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      max: 3
    },
    stage: {
      type: String,
      enum: Object.values(TournamentStage),
      default: TournamentStage.QUARTER_FINALS,
      required: true
    },
    status: {  // Added status field
      type: String,
      enum: Object.values(MatchStatus),
      default: MatchStatus.INCOMPLETE,
      required: true
    },
    isEliminated: {
      type: Boolean,
      default: false
    },
    nextMatchId: {
      type: String
    },
    score: {
      type: Number,
      default: 0
    },
    matchHistory: [{
      round: Number,
      stage: {
        type: String,
        enum: Object.values(TournamentStage),
        required: true
      },
      opponent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BracketTeam'
      },
      opponentPosition: {
        type: Number,
        required: true,
        min: 1,
        max: 8
      },
      position: {
        type: Number,
        required: true,
        min: 1,
        max: 8
      },
      score: {
        type: Number,
        default: 0
      },
      opponentScore: {
        type: Number,
        default: 0
      },
      won: {
        type: Boolean,
        default: false
      }
    }]
  },
  {
    timestamps: true,
  }
);

// Updated middleware to handle stages and initial status
BracketTeamSchema.pre('save', function(next) {
  if (this.isNew) {
    // Set initial status for new teams
    this.status = MatchStatus.INCOMPLETE;
  }

  // Set stage based on round
  if (this.round === 1) this.stage = TournamentStage.QUARTER_FINALS;
  else if (this.round === 2) this.stage = TournamentStage.SEMI_FINALS;
  else if (this.round === 3) this.stage = TournamentStage.FINALS;
  
  next();
});

const BracketTeamModel = mongoose.models.BracketTeam || mongoose.model<IBracketTeam>('BracketTeam', BracketTeamSchema);

export default BracketTeamModel;