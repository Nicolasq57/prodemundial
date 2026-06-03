export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      participants: {
        Row: { id: string; name: string; code: string; created_at: string }
        Insert: { id?: string; name: string; code: string; created_at?: string }
        Update: { id?: string; name?: string; code?: string; created_at?: string }
      }
      matches: {
        Row: {
          id: number
          match_date: string
          group_name: string
          team_home: string
          team_away: string
          flag_home: string
          flag_away: string
          score_home: number | null
          score_away: number | null
          status: 'scheduled' | 'finished'
        }
        Insert: {
          id: number
          match_date: string
          group_name: string
          team_home: string
          team_away: string
          flag_home?: string
          flag_away?: string
          score_home?: number | null
          score_away?: number | null
          status?: 'scheduled' | 'finished'
        }
        Update: {
          id?: number
          match_date?: string
          group_name?: string
          team_home?: string
          team_away?: string
          flag_home?: string
          flag_away?: string
          score_home?: number | null
          score_away?: number | null
          status?: 'scheduled' | 'finished'
        }
      }
      predictions: {
        Row: {
          id: string
          participant_id: string
          match_id: number
          predicted_home: number
          predicted_away: number
          points: number
        }
        Insert: {
          id?: string
          participant_id: string
          match_id: number
          predicted_home: number
          predicted_away: number
          points?: number
        }
        Update: {
          id?: string
          participant_id?: string
          match_id?: number
          predicted_home?: number
          predicted_away?: number
          points?: number
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Participant = Database['public']['Tables']['participants']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type Prediction = Database['public']['Tables']['predictions']['Row']

export interface RankingEntry {
  id: string
  name: string
  total_points: number
  exact_results: number
  correct_outcomes: number
  predictions_count: number
}
