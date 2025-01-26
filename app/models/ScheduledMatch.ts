import { Schema, model, models } from "mongoose";

const ScheduledMatchSchema = new Schema({
  homeTeamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  awayTeamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team', 
    required: true
  },
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  label: {
    type: String,
    required: false
  },
  matchType: {
    type: String,
    enum: ['quarterfinal', 'semifinal', 'final'],
    required: false
  },
  wnum: {
    type: Number,
    required: false
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  round: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed'],
    default: 'scheduled'
  }
}, { timestamps: true });

export default models.ScheduledMatch || model('ScheduledMatch', ScheduledMatchSchema);