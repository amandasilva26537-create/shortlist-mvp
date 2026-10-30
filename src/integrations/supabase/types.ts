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
      access_audit_log: {
        Row: {
          action: string
          actor_kind: string
          actor_user_id: string | null
          brand: string | null
          candidate_id: string | null
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
          occurred_at: string
        }
        Insert: {
          action: string
          actor_kind?: string
          actor_user_id?: string | null
          brand?: string | null
          candidate_id?: string | null
          entity_id?: string | null
          entity_type: string
          id?: number
          metadata?: Json
          occurred_at?: string
        }
        Update: {
          action?: string
          actor_kind?: string
          actor_user_id?: string | null
          brand?: string | null
          candidate_id?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: number
          metadata?: Json
          occurred_at?: string
        }
        Relationships: []
      }
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
      ai_processing_log: {
        Row: {
          actor_user_id: string | null
          candidate_id: string | null
          entity_id: string | null
          entity_type: string | null
          function_name: string
          id: number
          injection_signals: string[]
          input_chars: number | null
          input_files: number | null
          model: string
          occurred_at: string
          provider: string
          status: string
        }
        Insert: {
          actor_user_id?: string | null
          candidate_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          function_name: string
          id?: number
          injection_signals?: string[]
          input_chars?: number | null
          input_files?: number | null
          model: string
          occurred_at?: string
          provider: string
          status?: string
        }
        Update: {
          actor_user_id?: string | null
          candidate_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          function_name?: string
          id?: number
          injection_signals?: string[]
          input_chars?: number | null
          input_files?: number | null
          model?: string
          occurred_at?: string
          provider?: string
          status?: string
        }
        Relationships: []
      }
      application_matches: {
        Row: {
          analyzed_at: string
          application_id: string
          assessments: Json
          breakdown: Json
          coverage: number
          job_id: string
          match_version: string
          method: string
          model: string | null
          prescreened: boolean
          profile: Json
          requirements_hash: string
          resume_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          score: number
          score_max: number
          warnings: Json
          weights: Json
        }
        Insert: {
          analyzed_at?: string
          application_id: string
          assessments?: Json
          breakdown?: Json
          coverage: number
          job_id: string
          match_version: string
          method: string
          model?: string | null
          prescreened?: boolean
          profile?: Json
          requirements_hash: string
          resume_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score: number
          score_max: number
          warnings?: Json
          weights?: Json
        }
        Update: {
          analyzed_at?: string
          application_id?: string
          assessments?: Json
          breakdown?: Json
          coverage?: number
          job_id?: string
          match_version?: string
          method?: string
          model?: string | null
          prescreened?: boolean
          profile?: Json
          requirements_hash?: string
          resume_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          score_max?: number
          warnings?: Json
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "application_matches_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      application_stage_history: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          from_stage: string | null
          from_status: string | null
          id: number
          note: string | null
          to_stage: string
          to_status: string
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          from_status?: string | null
          id?: number
          note?: string | null
          to_stage: string
          to_status: string
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          from_status?: string | null
          id?: number
          note?: string | null
          to_stage?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_stage_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string
          brand: string
          candidate_id: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          job_id: string
          last_changed_by: string | null
          rejection_reason: string | null
          responsible_user_id: string | null
          shortlist_id: string | null
          source: string
          stage: string
          status: string
          updated_at: string
        }
        Insert: {
          applied_at?: string
          brand: string
          candidate_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_id: string
          last_changed_by?: string | null
          rejection_reason?: string | null
          responsible_user_id?: string | null
          shortlist_id?: string | null
          source?: string
          stage?: string
          status?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string
          brand?: string
          candidate_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string
          last_changed_by?: string | null
          rejection_reason?: string | null
          responsible_user_id?: string | null
          shortlist_id?: string | null
          source?: string
          stage?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_shortlist_id_fkey"
            columns: ["shortlist_id"]
            isOneToOne: false
            referencedRelation: "shortlists"
            referencedColumns: ["id"]
          },
        ]
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
          job_headline: string | null
          job_id: string
          job_specific_summary: string | null
          key_differentiator: string | null
          main_case: Json | null
          motivational_factor: string | null
          overall_match: number | null
          prompt_version: number
          radar: Json | null
          radar_scores: Json | null
          recruiter_opinion: string | null
          recruiter_scores: Json
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
          job_headline?: string | null
          job_id: string
          job_specific_summary?: string | null
          key_differentiator?: string | null
          main_case?: Json | null
          motivational_factor?: string | null
          overall_match?: number | null
          prompt_version?: number
          radar?: Json | null
          radar_scores?: Json | null
          recruiter_opinion?: string | null
          recruiter_scores?: Json
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
          job_headline?: string | null
          job_id?: string
          job_specific_summary?: string | null
          key_differentiator?: string | null
          main_case?: Json | null
          motivational_factor?: string | null
          overall_match?: number | null
          prompt_version?: number
          radar?: Json | null
          radar_scores?: Json | null
          recruiter_opinion?: string | null
          recruiter_scores?: Json
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
      candidate_resumes: {
        Row: {
          application_id: string | null
          brand: string
          candidate_id: string
          created_at: string
          deleted_at: string | null
          extracted_text_at: string | null
          id: string
          mime_type: string
          original_filename: string | null
          scan_flags: string[]
          scan_status: string
          sha256: string | null
          size_bytes: number
          storage_bucket: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          application_id?: string | null
          brand: string
          candidate_id: string
          created_at?: string
          deleted_at?: string | null
          extracted_text_at?: string | null
          id?: string
          mime_type: string
          original_filename?: string | null
          scan_flags?: string[]
          scan_status?: string
          sha256?: string | null
          size_bytes: number
          storage_bucket?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          application_id?: string | null
          brand?: string
          candidate_id?: string
          created_at?: string
          deleted_at?: string | null
          extracted_text_at?: string | null
          id?: string
          mime_type?: string
          original_filename?: string | null
          scan_flags?: string[]
          scan_status?: string
          sha256?: string | null
          size_bytes?: number
          storage_bucket?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_resumes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_resumes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_retention: {
        Row: {
          candidate_id: string
          last_activity_at: string
          purpose_code: string
          retain_until: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          last_activity_at?: string
          purpose_code?: string
          retain_until?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          last_activity_at?: string
          purpose_code?: string
          retain_until?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_retention_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_retention_purpose_code_fkey"
            columns: ["purpose_code"]
            isOneToOne: false
            referencedRelation: "data_processing_purposes"
            referencedColumns: ["code"]
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
      candidate_test_results: {
        Row: {
          candidate_id: string
          content: string | null
          created_at: string
          created_by: string | null
          format: string
          id: string
          job_id: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          candidate_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          format?: string
          id?: string
          job_id?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          candidate_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          format?: string
          id?: string
          job_id?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_test_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_test_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          achievements: Json | null
          additional_info: Json | null
          age: number | null
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
          salary_max: number | null
          salary_min: number | null
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
          age?: number | null
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
          salary_max?: number | null
          salary_min?: number | null
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
          age?: number | null
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
          salary_max?: number | null
          salary_min?: number | null
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
          brand: string | null
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
          brand?: string | null
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
          brand?: string | null
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
      consent_records: {
        Row: {
          candidate_id: string | null
          channel: string
          created_at: string
          evidence: Json
          granted: boolean
          granted_at: string
          id: string
          policy_version: string
          purpose_code: string
          recorded_by: string | null
          revoked_at: string | null
          subject_email_hash: string | null
        }
        Insert: {
          candidate_id?: string | null
          channel?: string
          created_at?: string
          evidence?: Json
          granted: boolean
          granted_at?: string
          id?: string
          policy_version: string
          purpose_code: string
          recorded_by?: string | null
          revoked_at?: string | null
          subject_email_hash?: string | null
        }
        Update: {
          candidate_id?: string | null
          channel?: string
          created_at?: string
          evidence?: Json
          granted?: boolean
          granted_at?: string
          id?: string
          policy_version?: string
          purpose_code?: string
          recorded_by?: string | null
          revoked_at?: string | null
          subject_email_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_purpose_code_fkey"
            columns: ["purpose_code"]
            isOneToOne: false
            referencedRelation: "data_processing_purposes"
            referencedColumns: ["code"]
          },
        ]
      }
      data_processing_purposes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string
          legal_basis: string | null
          name: string
          requires_consent: boolean
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description: string
          legal_basis?: string | null
          name: string
          requires_consent?: boolean
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string
          legal_basis?: string | null
          name?: string
          requires_consent?: boolean
        }
        Relationships: []
      }
      data_subject_requests: {
        Row: {
          candidate_id: string | null
          completed_at: string | null
          created_at: string
          due_at: string
          handled_by: string | null
          id: string
          received_at: string
          request_type: string
          requester_email: string | null
          requester_name: string | null
          resolution_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string
          handled_by?: string | null
          id?: string
          received_at?: string
          request_type: string
          requester_email?: string | null
          requester_name?: string | null
          resolution_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string
          handled_by?: string | null
          id?: string
          received_at?: string
          request_type?: string
          requester_email?: string | null
          requester_name?: string | null
          resolution_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_subject_requests_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
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
      external_processors: {
        Row: {
          created_at: string
          data_categories: string[]
          dpa_signed: boolean
          id: string
          name: string
          notes: string | null
          processing_country: string | null
          purpose: string | null
          service: string
          status: string
          trains_on_data: string | null
          transfer_mechanism: string | null
        }
        Insert: {
          created_at?: string
          data_categories?: string[]
          dpa_signed?: boolean
          id?: string
          name: string
          notes?: string | null
          processing_country?: string | null
          purpose?: string | null
          service: string
          status?: string
          trains_on_data?: string | null
          transfer_mechanism?: string | null
        }
        Update: {
          created_at?: string
          data_categories?: string[]
          dpa_signed?: boolean
          id?: string
          name?: string
          notes?: string | null
          processing_country?: string | null
          purpose?: string | null
          service?: string
          status?: string
          trains_on_data?: string | null
          transfer_mechanism?: string | null
        }
        Relationships: []
      }
      job_interview_scripts: {
        Row: {
          content: Json
          duration_min: number
          generated_at: string | null
          generated_by_ai: boolean
          job_id: string
          kind: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          duration_min?: number
          generated_at?: string | null
          generated_by_ai?: boolean
          job_id: string
          kind?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          duration_min?: number
          generated_at?: string | null
          generated_by_ai?: boolean
          job_id?: string
          kind?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_interview_scripts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_match_settings: {
        Row: {
          job_id: string
          prescreen_min: number
          updated_at: string
          updated_by: string | null
          weights: Json
        }
        Insert: {
          job_id: string
          prescreen_min?: number
          updated_at?: string
          updated_by?: string | null
          weights?: Json
        }
        Update: {
          job_id?: string
          prescreen_min?: number
          updated_at?: string
          updated_by?: string | null
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "job_match_settings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_snapshot: Json | null
          company_authorized: string
          created_at: string
          created_by: string | null
          draft: Json
          id: string
          is_published: boolean
          job_id: string
          published_at: string | null
          slug: string
          unpublished_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_snapshot?: Json | null
          company_authorized?: string
          created_at?: string
          created_by?: string | null
          draft?: Json
          id?: string
          is_published?: boolean
          job_id: string
          published_at?: string | null
          slug: string
          unpublished_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_snapshot?: Json | null
          company_authorized?: string
          created_at?: string
          created_by?: string | null
          draft?: Json
          id?: string
          is_published?: boolean
          job_id?: string
          published_at?: string | null
          slug?: string
          unpublished_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_stage_history: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          job_id: string
          note: string | null
          stage: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          job_id: string
          note?: string | null
          stage: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string
          note?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_stage_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          ai_structure: Json | null
          area: string | null
          briefing_url: string | null
          client_id: string
          closed_on: string | null
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
          opened_on: string | null
          pasted_text: string | null
          process_stage: string | null
          radar_competencies: Json | null
          recruiter_id: string | null
          recruiter_notes: string | null
          salary_max: number | null
          salary_min: number | null
          seniority: string | null
          shortlist_due_date: string | null
          sl1_date: string | null
          sl2_date: string | null
          sl3_date: string | null
          soft_skills: string[] | null
          status: string
          title: string
          tracking_token: string | null
          updated_at: string
          work_model: string | null
        }
        Insert: {
          ai_structure?: Json | null
          area?: string | null
          briefing_url?: string | null
          client_id: string
          closed_on?: string | null
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
          opened_on?: string | null
          pasted_text?: string | null
          process_stage?: string | null
          radar_competencies?: Json | null
          recruiter_id?: string | null
          recruiter_notes?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          shortlist_due_date?: string | null
          sl1_date?: string | null
          sl2_date?: string | null
          sl3_date?: string | null
          soft_skills?: string[] | null
          status?: string
          title: string
          tracking_token?: string | null
          updated_at?: string
          work_model?: string | null
        }
        Update: {
          ai_structure?: Json | null
          area?: string | null
          briefing_url?: string | null
          client_id?: string
          closed_on?: string | null
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
          opened_on?: string | null
          pasted_text?: string | null
          process_stage?: string | null
          radar_competencies?: Json | null
          recruiter_id?: string | null
          recruiter_notes?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          shortlist_due_date?: string | null
          sl1_date?: string | null
          sl2_date?: string | null
          sl3_date?: string | null
          soft_skills?: string[] | null
          status?: string
          title?: string
          tracking_token?: string | null
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
          {
            foreignKeyName: "jobs_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_feedback: {
        Row: {
          candidate_id: string
          client_identifier: string | null
          client_role: string | null
          comment: string | null
          created_at: string
          decision: string | null
          favorite: boolean | null
          id: string
          rating: number | null
          shortlist_id: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          client_identifier?: string | null
          client_role?: string | null
          comment?: string | null
          created_at?: string
          decision?: string | null
          favorite?: boolean | null
          id?: string
          rating?: number | null
          shortlist_id: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          client_identifier?: string | null
          client_role?: string | null
          comment?: string | null
          created_at?: string
          decision?: string | null
          favorite?: boolean | null
          id?: string
          rating?: number | null
          shortlist_id?: string
          updated_at?: string
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
      public_submission_log: {
        Row: {
          created_at: string
          id: number
          ip_hash: string
          job_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          ip_hash: string
          job_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          ip_hash?: string
          job_id?: string | null
        }
        Relationships: []
      }
      retention_policies: {
        Row: {
          action_after: string
          active: boolean
          data_category: string
          legal_note: string | null
          retention_months: number | null
          updated_at: string
        }
        Insert: {
          action_after?: string
          active?: boolean
          data_category: string
          legal_note?: string | null
          retention_months?: number | null
          updated_at?: string
        }
        Update: {
          action_after?: string
          active?: boolean
          data_category?: string
          legal_note?: string | null
          retention_months?: number | null
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
          brand: string | null
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
          brand?: string | null
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
          brand?: string | null
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
      user_brand_access: {
        Row: {
          brand: string
          created_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          brand: string
          created_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          granted_by?: string | null
          user_id?: string
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
