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

interface TeamStats {
  wins: number;
  losses: number;
  ties: number;
  goalsFor: number;
  goalsAgainst: number;
  pins: number;
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
  stats: TeamStats;
  createdAt: Date;
  updatedAt: Date;
}

const matchHistorySchema = new Schema({
  round: { 
    type: Number, 
    required: true 
  },
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
  opponentPosition: { 
    type: Number, 
    required: true 
  },
  position: { 
    type: Number, 
    required: true 
  },
  score: { 
    type: Number, 
    required: true 
  },
  opponentScore: { 
    type: Number, 
    required: true 
  },
  won: { 
    type: Boolean, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: true });

const statsSchema = new Schema({
  wins: { 
    type: Number, 
    default: 0 
  },
  losses: { 
    type: Number, 
    default: 0 
  },
  ties: { 
    type: Number, 
    default: 0 
  },
  goalsFor: { 
    type: Number, 
    default: 0 
  },
  goalsAgainst: { 
    type: Number, 
    default: 0 
  },
  pins: { 
    type: Number, 
    default: 0 
  }
}, { _id: false });

const bracketTeamSchema = new Schema({
  teamName: { 
    type: String, 
    required: true,
    trim: true
  },
  position: { 
    type: Number, 
    required: true,
    min: 1
  },
  originalTeamId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Team', 
    required: true 
  },
  tournamentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Tournament', 
    required: true,
    index: true
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
  isEliminated: { 
    type: Boolean, 
    default: false 
  },
  status: { 
    type: String,
    enum: ['incomplete', 'completed'],
    default: 'incomplete'
  },
  score: { 
    type: Number, 
    default: 0 
  },
  nextMatchId: { 
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^R[2-3]M[1-2]$/.test(v);
      },
      message: 'Next match ID must be in format R2M1, R2M2, or R3M1'
    }
  },
  matchHistory: [matchHistorySchema],
  stats: {
    type: statsSchema,
    default: () => ({})
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for improved query performance
bracketTeamSchema.index({ tournamentId: 1, position: 1 });
bracketTeamSchema.index({ tournamentId: 1, stage: 1 });
bracketTeamSchema.index({ tournamentId: 1, isEliminated: 1 });

// Virtual field for goal difference
bracketTeamSchema.virtual('goalDifference').get(function(this: IBracketTeam) {
  return this.stats.goalsFor - this.stats.goalsAgainst;
});

// Pre-save middleware to update stats with proper typing
bracketTeamSchema.pre('save', function(this: IBracketTeam, next) {
  if (this.isModified('matchHistory')) {
    const stats = this.matchHistory.reduce((acc: TeamStats, match: IMatchHistory) => {
      if (match.won) {
        acc.wins += 1;
      } else {
        acc.losses += 1;
      }
      acc.goalsFor += match.score;
      acc.goalsAgainst += match.opponentScore;
      return acc;
    }, {
      wins: 0,
      losses: 0,
      ties: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      pins: this.stats.pins
    });
    
    this.stats = stats;
  }
  next();
});

// Method to check if team can progress to next round
bracketTeamSchema.methods.canProgressToNextRound = function(): boolean {
  if (this.isEliminated || this.status === 'completed') {
    return false;
  }
  
  if (this.stage === TournamentStage.FINALS) {
    return false;
  }
  
  const currentRoundMatches = this.matchHistory.filter(
    (match: IMatchHistory) => match.round === this.round
  );
  
  return currentRoundMatches.length > 0 && 
         currentRoundMatches.every((match: IMatchHistory) => match.won);
};

// Static method to get teams ready for next round
bracketTeamSchema.statics.getTeamsForNextRound = async function(
  tournamentId: mongoose.Types.ObjectId,
  currentRound: number
): Promise<IBracketTeam[]> {
  return this.find({
    tournamentId,
    round: currentRound,
    isEliminated: false,
    status: 'completed'
  }).sort('position');
};

// Custom method to update team after match
bracketTeamSchema.methods.updateAfterMatch = async function(
  won: boolean,
  score: number,
  opponentScore: number,
  opponentId: mongoose.Types.ObjectId,
  opponentPosition: number
) {
  const matchResult: IMatchHistory = {
    round: this.round,
    stage: this.stage,
    opponent: opponentId,
    opponentPosition,
    position: this.position,
    score,
    opponentScore,
    won,
    timestamp: new Date()
  };

  this.matchHistory.push(matchResult);
  
  if (!won) {
    this.isEliminated = true;
    this.status = 'completed';
  }

  await this.save();
};

// Model creation with type checking
let BracketTeam: mongoose.Model<IBracketTeam>;

try {
  BracketTeam = mongoose.model<IBracketTeam>('BracketTeam');
} catch {
  BracketTeam = mongoose.model<IBracketTeam>('BracketTeam', bracketTeamSchema);
}

export default BracketTeam;