import mongoose, { Schema, Document } from 'mongoose';

export enum TournamentStage {
  QUARTER_FINALS = 'quarterFinal',
  SEMI_FINALS = 'semiFinal',
  FINALS = 'final'
}

export interface IMatchHistory {
  round: number;
  stage: TournamentStage;
  opponent: mongoose.Types.ObjectId;
  opponentPosition: number;
  position: number;
  score: number;
  opponentScore: number;
  won: boolean;
  timestamp?: Date;
}

export interface IBracketTeam extends Document {
  teamName: string;
  position: number;
  originalTeamId: mongoose.Types.ObjectId;
  tournamentId: mongoose.Types.ObjectId;
  round: number;
  stage: TournamentStage;
  isEliminated: boolean;
  status: 'incomplete' | 'completed';
  score: number;
  nextMatchId?: string;
  matchHistory: IMatchHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const matchHistorySchema = new Schema({
  round: { type: Number, required: true },
  stage: { 
    type: String, 
    enum: Object.values(TournamentStage),
    required: true
  },
  opponent: { 
    type: Schema.Types.ObjectId, 
    ref: 'BracketTeam', 
    required: true
  },
  opponentPosition: { type: Number, required: true },
  position: { type: Number, required: true },
  score: { type: Number, required: true },
  opponentScore: { type: Number, required: true },
  won: { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const bracketTeamSchema = new Schema({
  teamName: { type: String, required: true, trim: true },
  position: { type: Number, required: true, min: 1 },
  originalTeamId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Team', 
    required: true
  },
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
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
    required: true,
    default: TournamentStage.QUARTER_FINALS
  },
  isEliminated: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['incomplete', 'completed'],
    default: 'incomplete'
  },
  score: { type: Number, default: 0 },
  nextMatchId: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^R[2-3]M[1-2]$/.test(v);
      },
      message: 'Next match ID must be in format R2M1, R2M2, or R3M1'
    }
  },
  matchHistory: [matchHistorySchema]
}, {
  timestamps: true
});



const bracketTeams=  mongoose.models.BracketTeam || mongoose.model('BracketTeam', bracketTeamSchema);

export default bracketTeams;