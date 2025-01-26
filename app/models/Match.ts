import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({
  tournamentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Tournament", 
    required: true 
  },
  round: { 
    type: Number, 
    required: true 
  },
  homeTeam: { 
    type: String, 
    required: true 
  },
  awayTeam: { 
    type: String, 
    required: true 
  },
  homeTeamId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Team", 
    required: true,
    strict: true
  },
  awayTeamId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Team", 
    required: true,
    strict: true
  },
  status: { 
    type: String, 
    default: "unscheduled" 
  },
  roundType: {
    type: String,
    enum: ['quarterFinal', 'semiFinal', 'final'],
  }
}, { 
  timestamps: true,
  strict: true 
});

const Match = mongoose.models.Match || mongoose.model("Match", matchSchema);
export default Match;