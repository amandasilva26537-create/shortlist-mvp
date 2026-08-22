export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      candidate_documents: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          kind: string
          label: string | null
          url: string
          visible_to_client: boolean
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          kind: string
          label?: string | null
          url: string
          visible_to_client?: boolean
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          url?: string
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "candidate_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_job_evaluations: {
        Row: {
          ai_generated: Json | null
          candidate_id: string
          checklist: Json | null
          created_at: string
          cultural_fit: Json | null
          dimension_scores: Json | null
          eliminatory_checklist: Json | null
          id: string
          inconsistencies: string[] | null
          interview_questions: string[] | null
          job_id: string
          job_specific_summary: string | null
          key_differentiator: string | null
          main_case: Json | null
          motivational_factor: string | null
          overall_match: number | null
          radar: Json | null
          radar_scores: Json | null
          recruiter_opinion: string | null
          risk_items: Json | null
          risks: string[] | null
          shortlist_id: string | null
          strengths: string[] | null
          top_strengths: Json | null
          updated_at: string
        }
        Insert: {
          ai_generated?: Json | null
          candidate_id: string
          checklist?: Json | null
          created_at?: string
          cultural_fit?: Json | null
          dimension_scores?: Json | null
          eliminatory_checklist?: Json | null
          id?: string
          inconsistencies?: string[] | null
          interview_questions?: string[] | null
          job_id: string
          job_specific_summary?: string | null
          key_differentiator?: string | null
          main_case?: Json | null
          motivational_factor?: string | null
          overall_match?: number | null
          radar?: Json | null
          radar_scores?: Json | null
          recruiter_opinion?: string | null
          risk_items?: Json | null
          risks?: string[] | null
          shortlist_id?: string | null
          strengths?: string[] | null
          top_strengths?: Json | null
          updated_at?: string
        }
        Update: {
          ai_generated?: Json | null
          candidate_id?: string
          checklist?: Json | null
          created_at?: string
          cultural_fit?: Json | null
          dimension_scores?: Json | null
          eliminatory_checklist?: Json | null
          id?: string
          inconsistencies?: string[] | null
          interview_questions?: string[] | null
          job_id?: string
          job_specific_summary?: string | null
          key_differentiator?: string | null
          main_case?: Json | null
          motivational_factor?: string | null
          overall_match?: number | null
          radar?: Json | null
          radar_scores?: Json | null
          recruiter_opinion?: string | null
          risk_items?: Json | null
          risks?: string[] | null
          shortlist_id?: string | null
          strengths?: string[] | null
          top_strengths?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_job_evaluations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_job_evaluations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_job_evaluations_shortlist_id_fkey"
            columns: ["shortlist_id"]
            isOneToOne: false
            referencedRelation: "shortlists"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_tags: {
        Row: {
          candidate_id: string
          created_at: string
          tag_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          tag_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_tags_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          achievements: Json | null
          additional_info: Json | null
          ai_profile: Json | null
          archived_at: string | null
          area: string | null
          city: string | null
          competencies: Json | null
          country: string | null
          courses: Json | null
          created_at: string
          created_by: string | null
          current_company: string | null
          current_position: string | null
          disc_profile: string | null
          disc_raw: string | null
          disc_scores: Json | null
          education: Json | null
          email: string | null
          executive_summary: Json | null
          full_bio: string | null
          full_name: string
          gender: string | null
          headline: string | null
          id: string
          inconsistencies: Json | null
          internal_notes: string | null
          languages: Json | null
          linkedin_url: string | null
          main_case: Json | null
          main_results: Json | null
          mini_bio: string | null
          motivators: Json | null
          phone: string | null
          photo_url: string | null
          professional_moment: Json | null
          recruiter_note: string | null
          resume_url: string | null
          salary_expectation: number | null
          seniority: string | null
          specialties: Json | null
          state: string | null
          status: string
          strengths: Json | null
          trajectory: Json | null
          transcript: string | null
          updated_at: string
          work_model: string | null
          work_style: string | null
        }
        Insert: {
          achievements?: Json | null
          additional_info?: Json | null
          ai_profile?: Json | null
          archived_at?: string | null
          area?: string | null
          city?: string | null
          competencies?: Json | null
          country?: string | null
          courses?: Json | null
          created_at?: string
          created_by?: string | null
          current_company?: string | null
          current_position?: string | null
          disc_profile?: string | null
          disc_raw?: string | null
          disc_scores?: Json | null
          education?: Json | null
          email?: string | null
          executive_summary?: Json | null
          full_bio?: string | null
          full_name: string
          gender?: string | null
          headline?: string | null
          id?: string
          inconsistencies?: Json | null
          internal_notes?: string | null
          languages?: Json | null
          linkedin_url?: string | null
          main_case?: Json | null
          main_results?: Json | null
          mini_bio?: string | null
          motivators?: Json | null
          phone?: string | null
          photo_url?: string | null
          professional_moment?: Json | null
          recruiter_note?: string | null
          resume_url?: string | null
          salary_expectation?: number | null
          seniority?: string | null
          specialties?: Json | null
          state?: string | null
          status?: string
          strengths?: Json | null
          trajectory?: Json | null
          transcript?: string | null
          updated_at?: string
          work_model?: string | null
          work_style?: string | null
        }
        Update: {
          achievements?: Json | null
          additional_info?: Json | null
          ai_profile?: Json | null
          archived_at?: string | null
          area?: string | null
          city?: string | null
          competencies?: Json | null
          country?: string | null
          courses?: Json | null
          created_at?: string
          created_by?: string | null
          current_company?: string | null
          current_position?: string | null
          disc_profile?: string | null
          disc_raw?: string | null
          disc_scores?: Json | null
          education?: Json | null
          email?: string | null
          executive_summary?: Json | null
          full_bio?: string | null
          full_name?: string
          gender?: string | null
          headline?: string | null
          id?: string
          inconsistencies?: Json | null
          internal_notes?: string | null
          languages?: Json | null
          linkedin_url?: string | null
          main_case?: Json | null
          main_results?: Json | null
          mini_bio?: string | null
          motivators?: Json | null
          phone?: string | null
          photo_url?: string | null
          professional_moment?: Json | null
          recruiter_note?: string | null
          resume_url?: string | null
          salary_expectation?: number | null
          seniority?: string | null
          specialties?: Json | null
          state?: string | null
          status?: string
          strengths?: Json | null
          trajectory?: Json | null
          transcript?: string | null
          updated_at?: string
          work_model?: string | null
          work_style?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          city: string | null
          contact: string | null
          contact_name: string | null
          contact_role: string | null
          country: string | null
          created_at: string
          id: string
          instagram: string | null
          internal_notes: string | null
          logo_url: string | null
          name: string
          owner_id: string | null
          segment: string | null
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          city?: string | null
          contact?: string | null
          contact_name?: string | null
          contact_role?: string | null
          country?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          internal_notes?: string | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          segment?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          city?: string | null
          contact?: string | null
          contact_name?: string | null
          contact_role?: string | null
          country?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          internal_notes?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          segment?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      drafts: {
        Row: {
          entity_id: string | null
          id: string
          kind: string
          payload: Json
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          entity_id?: string | null
          id?: string
          kind: string
          payload?: Json
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          entity_id?: string | null
          id?: string
          kind?: string
          payload?: Json
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          ai_structure: Json | null
          area: string | null
          briefing_url: string | null
          client_id: string
          contract_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          documents: Json
          hard_skills: string[] | null
          id: string
          location: string | null
          manager_name: string | null
          meeting_transcript: string | null
          must_have: string[] | null
          nice_to_have: string[] | null
          pasted_text: string | null
          radar_competencies: Json | null
          recruiter_notes: string | null
          salary_max: number | null
          salary_min: number | null
          seniority: string | null
          soft_skills: string[] | null
          status: string
          title: string
          updated_at: string
          work_model: string | null
        }
        Insert: {
          ai_structure?: Json | null
          area?: string | null
          briefing_url?: string | null
          client_id: string
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          documents?: Json
          hard_skills?: string[] | null
          id?: string
          location?: string | null
          manager_name?: string | null
          meeting_transcript?: string | null
          must_have?: string[] | null
          nice_to_have?: string[] | null
          pasted_text?: string | null
          radar_competencies?: Json | null
          recruiter_notes?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          soft_skills?: string[] | null
          status?: string
          title: string
          updated_at?: string
          work_model?: string | null
        }
        Update: {
          ai_structure?: Json | null
          area?: string | null
          briefing_url?: string | null
          client_id?: string
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          documents?: Json
          hard_skills?: string[] | null
          id?: string
          location?: string | null
          manager_name?: string | null
          meeting_transcript?: string | null
          must_have?: string[] | null
          nice_to_have?: string[] | null
          pasted_text?: string | null
          radar_competencies?: Json | null
          recruiter_notes?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          soft_skills?: string[] | null
          status?: string
          title?: string
          updated_at?: string
          work_model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_feedback: {
        Row: {
          candidate_id: string
          client_identifier: string | null
          comment: string | null
          created_at: string
          decision: string | null
          favorite: boolean | null
          id: string
          rating: number | null
          shortlist_id: string
        }
        Insert: {
          candidate_id: string
          client_identifier?: string | null
          comment?: string | null
          created_at?: string
          decision?: string | null
          favorite?: boolean | null
          id?: string
          rating?: number | null
          shortlist_id: string
        }
        Update: {
          candidate_id?: string
          client_identifier?: string | null
          comment?: string | null
          created_at?: string
          decision?: string | null
          favorite?: boolean | null
          id?: string
          rating?: number | null
          shortlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_feedback_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_feedback_shortlist_id_fkey"
            columns: ["shortlist_id"]
            isOneToOne: false
            referencedRelation: "shortlists"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role_title: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role_title?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role_title?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      shortlist_candidates: {
        Row: {
          added_at: string
          candidate_id: string
          position: number
          reviewed: boolean
          shortlist_id: string
          status: string
          visible_documents: string[] | null
        }
        Insert: {
          added_at?: string
          candidate_id: string
          position?: number
          reviewed?: boolean
          shortlist_id: string
          status?: string
          visible_documents?: string[] | null
        }
        Update: {
          added_at?: string
          candidate_id?: string
          position?: number
          reviewed?: boolean
          shortlist_id?: string
          status?: string
          visible_documents?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "shortlist_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_candidates_shortlist_id_fkey"
            columns: ["shortlist_id"]
            isOneToOne: false
            referencedRelation: "shortlists"
            referencedColumns: ["id"]
          },
        ]
      }
      shortlists: {
        Row: {
          client_id: string
          created_at: string
          id: string
          job_id: string
          message: string | null
          number: number
          owner_id: string | null
          published_at: string | null
          responsible: string | null
          send_date: string | null
          share_token: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          job_id: string
          message?: string | null
          number?: number
          owner_id?: string | null
          published_at?: string | null
          responsible?: string | null
          send_date?: string | null
          share_token?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          job_id?: string
          message?: string | null
          number?: number
          owner_id?: string | null
          published_at?: string | null
          responsible?: string | null
          send_date?: string | null
          share_token?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shortlists_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlists_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_share_token: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "recruiter" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "recruiter", "client"],
    },
  },
} as const
