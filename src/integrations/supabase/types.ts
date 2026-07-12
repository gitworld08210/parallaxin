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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_employee_id: string | null
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          ip: unknown
          module: string
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_employee_id?: string | null
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          ip?: unknown
          module: string
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_employee_id?: string | null
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          ip?: unknown
          module?: string
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_actor_employee_id_fkey"
            columns: ["actor_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          module: string
          name: string
          permission_key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          module: string
          name: string
          permission_key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
          permission_key?: string
        }
        Relationships: []
      }
      admin_role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "admin_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      applications: {
        Row: {
          applied_at: string
          assigned_recruiter: string | null
          candidate_id: string
          created_at: string
          current_stage: Database["public"]["Enums"]["candidate_stage"]
          hiring_request_id: string
          id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applied_at?: string
          assigned_recruiter?: string | null
          candidate_id: string
          created_at?: string
          current_stage?: Database["public"]["Enums"]["candidate_stage"]
          hiring_request_id: string
          id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applied_at?: string
          assigned_recruiter?: string | null
          candidate_id?: string
          created_at?: string
          current_stage?: Database["public"]["Enums"]["candidate_stage"]
          hiring_request_id?: string
          id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["application_status"]
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
            foreignKeyName: "applications_hiring_request_id_fkey"
            columns: ["hiring_request_id"]
            isOneToOne: false
            referencedRelation: "hiring_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_corrections: {
        Row: {
          created_at: string
          current_status:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          employee_id: string
          id: string
          reason: string
          requested_by: string | null
          requested_check_in: string | null
          requested_check_out: string | null
          requested_status: Database["public"]["Enums"]["attendance_status"]
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["correction_status"]
          updated_at: string
          work_date: string
        }
        Insert: {
          created_at?: string
          current_status?:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          employee_id: string
          id?: string
          reason: string
          requested_by?: string | null
          requested_check_in?: string | null
          requested_check_out?: string | null
          requested_status: Database["public"]["Enums"]["attendance_status"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["correction_status"]
          updated_at?: string
          work_date: string
        }
        Update: {
          created_at?: string
          current_status?:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          employee_id?: string
          id?: string
          reason?: string
          requested_by?: string | null
          requested_check_in?: string | null
          requested_check_out?: string | null
          requested_status?: Database["public"]["Enums"]["attendance_status"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["correction_status"]
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in_at: string | null
          check_out_at: string | null
          created_at: string
          employee_id: string
          hours_worked: number | null
          id: string
          notes: string | null
          recorded_by: string | null
          shift_id: string | null
          source: Database["public"]["Enums"]["attendance_source"]
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          work_date: string
        }
        Insert: {
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string
          employee_id: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
          recorded_by?: string | null
          shift_id?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          work_date: string
        }
        Update: {
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string
          employee_id?: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
          recorded_by?: string | null
          shift_id?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      benefits_catalog: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          monthly_cost: number
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_cost?: number
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_cost?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      call_participants: {
        Row: {
          call_id: string
          created_at: string
          id: string
          joined_at: string | null
          left_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_signals: {
        Row: {
          call_id: string
          created_at: string
          from_user: string
          id: string
          kind: string
          payload: Json
          to_user: string
        }
        Insert: {
          call_id: string
          created_at?: string
          from_user: string
          id?: string
          kind: string
          payload: Json
          to_user: string
        }
        Update: {
          call_id?: string
          created_at?: string
          from_user?: string
          id?: string
          kind?: string
          payload?: Json
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_signals_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          accepted_at: string | null
          callee_id: string
          caller_id: string
          conversation_id: string
          created_at: string
          duration_sec: number
          ended_at: string | null
          id: string
          is_group: boolean
          kind: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          callee_id: string
          caller_id: string
          conversation_id: string
          created_at?: string
          duration_sec?: number
          ended_at?: string | null
          id?: string
          is_group?: boolean
          kind: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          callee_id?: string
          caller_id?: string
          conversation_id?: string
          created_at?: string
          duration_sec?: number
          ended_at?: string | null
          id?: string
          is_group?: boolean
          kind?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_timeline: {
        Row: {
          actor_user_id: string | null
          application_id: string | null
          candidate_id: string
          event_at: string
          event_type: Database["public"]["Enums"]["candidate_event_type"]
          id: string
          metadata: Json | null
          notes: string | null
        }
        Insert: {
          actor_user_id?: string | null
          application_id?: string | null
          candidate_id: string
          event_at?: string
          event_type: Database["public"]["Enums"]["candidate_event_type"]
          id?: string
          metadata?: Json | null
          notes?: string | null
        }
        Update: {
          actor_user_id?: string | null
          application_id?: string | null
          candidate_id?: string
          event_at?: string
          event_type?: Database["public"]["Enums"]["candidate_event_type"]
          id?: string
          metadata?: Json | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_timeline_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_timeline_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          candidate_number: string
          created_at: string
          created_by: string | null
          current_stage: Database["public"]["Enums"]["candidate_stage"]
          email: string | null
          full_name: string
          headline: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          notes: string | null
          phone: string | null
          resume_url: string | null
          source: string | null
          status: Database["public"]["Enums"]["candidate_status"]
          updated_at: string
        }
        Insert: {
          candidate_number?: string
          created_at?: string
          created_by?: string | null
          current_stage?: Database["public"]["Enums"]["candidate_stage"]
          email?: string | null
          full_name: string
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string
        }
        Update: {
          candidate_number?: string
          created_at?: string
          created_by?: string | null
          current_stage?: Database["public"]["Enums"]["candidate_stage"]
          email?: string | null
          full_name?: string
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string
        }
        Relationships: []
      }
      career_progress: {
        Row: {
          created_at: string
          current_level: string | null
          employee_id: string
          experience_required_months: number
          id: string
          notes: string | null
          progress: number
          required_skills: string[]
          target_level: string | null
          training_needed: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          current_level?: string | null
          employee_id: string
          experience_required_months?: number
          id?: string
          notes?: string | null
          progress?: number
          required_skills?: string[]
          target_level?: string | null
          training_needed?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          current_level?: string | null
          employee_id?: string
          experience_required_months?: number
          id?: string
          notes?: string | null
          progress?: number
          required_skills?: string[]
          target_level?: string | null
          training_needed?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_progress_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      career_roadmap_requirements: {
        Row: {
          certification_id: string | null
          course_id: string | null
          created_at: string
          id: string
          notes: string | null
          requirement_type: Database["public"]["Enums"]["roadmap_requirement_type"]
          roadmap_id: string
          sequence: number
          skill_id: string | null
        }
        Insert: {
          certification_id?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          requirement_type: Database["public"]["Enums"]["roadmap_requirement_type"]
          roadmap_id: string
          sequence?: number
          skill_id?: string | null
        }
        Update: {
          certification_id?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          requirement_type?: Database["public"]["Enums"]["roadmap_requirement_type"]
          roadmap_id?: string
          sequence?: number
          skill_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_roadmap_requirements_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_roadmap_requirements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_roadmap_requirements_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "career_roadmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_roadmap_requirements_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      career_roadmaps: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          name: string
          target_level: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
          target_level: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
          target_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_roadmaps_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications_catalog: {
        Row: {
          category: Database["public"]["Enums"]["cert_category"]
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_mandatory: boolean
          title: string
          updated_at: string
          validity_months: number | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["cert_category"]
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_mandatory?: boolean
          title: string
          updated_at?: string
          validity_months?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["cert_category"]
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_mandatory?: boolean
          title?: string
          updated_at?: string
          validity_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_catalog_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      close_friends: {
        Row: {
          created_at: string
          friend_id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          owner_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          owner_id?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          environment: string
          id: string
          kind: string
          price_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          environment?: string
          id?: string
          kind: string
          price_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          environment?: string
          id?: string
          kind?: string
          price_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      collection_items: {
        Row: {
          collection_id: string
          created_at: string
          post_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          post_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          organization_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          organization_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      company_brand_assets: {
        Row: {
          asset_type: string
          created_at: string
          id: string
          is_active: boolean
          is_dark_mode: boolean
          metadata: Json
          name: string
          updated_at: string
          updated_by: string | null
          url: string | null
          value: string | null
        }
        Insert: {
          asset_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_dark_mode?: boolean
          metadata?: Json
          name: string
          updated_at?: string
          updated_by?: string | null
          url?: string | null
          value?: string | null
        }
        Update: {
          asset_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_dark_mode?: boolean
          metadata?: Json
          name?: string
          updated_at?: string
          updated_by?: string | null
          url?: string | null
          value?: string | null
        }
        Relationships: []
      }
      company_calendar_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          event_type: string
          id: string
          is_recurring: boolean
          is_working_day: boolean | null
          metadata: Json
          recurrence_pattern: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type: string
          id?: string
          is_recurring?: boolean
          is_working_day?: boolean | null
          metadata?: Json
          recurrence_pattern?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          is_recurring?: boolean
          is_working_day?: boolean | null
          metadata?: Json
          recurrence_pattern?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_configuration_versions: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          config_id: string
          created_at: string
          id: string
          value: Json
          version: number
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          config_id: string
          created_at?: string
          id?: string
          value: Json
          version: number
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          config_id?: string
          created_at?: string
          id?: string
          value?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_configuration_versions_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "company_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_configurations: {
        Row: {
          category: string
          created_at: string
          current_version: number
          description: string | null
          id: string
          is_critical: boolean
          key: string
          requires_dual_approval: boolean
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category: string
          created_at?: string
          current_version?: number
          description?: string | null
          id?: string
          is_critical?: boolean
          key: string
          requires_dual_approval?: boolean
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string
          current_version?: number
          description?: string | null
          id?: string
          is_critical?: boolean
          key?: string
          requires_dual_approval?: boolean
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      company_feature_flags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_beta: boolean
          is_enabled: boolean
          is_internal: boolean
          key: string
          name: string
          rollout_percentage: number
          target_departments: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_beta?: boolean
          is_enabled?: boolean
          is_internal?: boolean
          key: string
          name: string
          rollout_percentage?: number
          target_departments?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_beta?: boolean
          is_enabled?: boolean
          is_internal?: boolean
          key?: string
          name?: string
          rollout_percentage?: number
          target_departments?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      company_localization: {
        Row: {
          created_at: string
          currency: string
          date_format: string
          display_name: string
          id: string
          is_default: boolean
          is_enabled: boolean
          language_code: string
          measurement_units: string
          region_code: string | null
          time_format: string
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          date_format?: string
          display_name: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          language_code: string
          measurement_units?: string
          region_code?: string | null
          time_format?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          date_format?: string
          display_name?: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          language_code?: string
          measurement_units?: string
          region_code?: string | null
          time_format?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      company_metadata: {
        Row: {
          created_at: string
          current_sequence: number
          description: string | null
          format_pattern: string | null
          id: string
          key: string
          metadata: Json
          name: string
          prefix: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          current_sequence?: number
          description?: string | null
          format_pattern?: string | null
          id?: string
          key: string
          metadata?: Json
          name: string
          prefix?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          current_sequence?: number
          description?: string | null
          format_pattern?: string | null
          id?: string
          key?: string
          metadata?: Json
          name?: string
          prefix?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      company_modules: {
        Row: {
          created_at: string
          dependencies: string[]
          description: string | null
          id: string
          is_visible: boolean
          metadata: Json
          module_key: string
          name: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          dependencies?: string[]
          description?: string | null
          id?: string
          is_visible?: boolean
          metadata?: Json
          module_key: string
          name: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          dependencies?: string[]
          description?: string | null
          id?: string
          is_visible?: boolean
          metadata?: Json
          module_key?: string
          name?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      compensation_bonuses: {
        Row: {
          amount: number
          approved_at: string | null
          approver: string | null
          bonus_type: Database["public"]["Enums"]["bonus_type"]
          created_at: string
          currency: string
          employee_id: string
          id: string
          paid_at: string | null
          paid_cycle_id: string | null
          reason: string
          rejection_reason: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["bonus_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approver?: string | null
          bonus_type: Database["public"]["Enums"]["bonus_type"]
          created_at?: string
          currency?: string
          employee_id: string
          id?: string
          paid_at?: string | null
          paid_cycle_id?: string | null
          reason: string
          rejection_reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["bonus_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approver?: string | null
          bonus_type?: Database["public"]["Enums"]["bonus_type"]
          created_at?: string
          currency?: string
          employee_id?: string
          id?: string
          paid_at?: string | null
          paid_cycle_id?: string | null
          reason?: string
          rejection_reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["bonus_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compensation_bonuses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensation_bonuses_paid_cycle_id_fkey"
            columns: ["paid_cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      compensation_plans: {
        Row: {
          comp_type: Database["public"]["Enums"]["compensation_type"]
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          comp_type: Database["public"]["Enums"]["compensation_type"]
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          comp_type?: Database["public"]["Enums"]["compensation_type"]
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conv_participants_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          last_message_at: string
          title: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          title?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          title?: string | null
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          due_date: string | null
          employee_id: string
          id: string
          notes: string | null
          progress: number
          started_at: string | null
          status: Database["public"]["Enums"]["enrollment_status"]
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          due_date?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          progress?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          due_date?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          progress?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_balance: {
        Row: {
          available_cents: number
          currency: string
          environment: string
          lifetime_earned_cents: number
          pending_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_cents?: number
          currency?: string
          environment?: string
          lifetime_earned_cents?: number
          pending_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_cents?: number
          currency?: string
          environment?: string
          lifetime_earned_cents?: number
          pending_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      department_capacity: {
        Row: {
          created_at: string
          department_id: string
          id: string
          max_capacity: number
          notes: string | null
          target_capacity: number
          updated_at: string
          updated_by: string | null
          workload_score: number
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          max_capacity?: number
          notes?: string | null
          target_capacity?: number
          updated_at?: string
          updated_by?: string | null
          workload_score?: number
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          max_capacity?: number
          notes?: string | null
          target_capacity?: number
          updated_at?: string
          updated_by?: string | null
          workload_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "department_capacity_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: true
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      department_periodic_reports: {
        Row: {
          attachments: Json
          cadence: string
          created_at: string
          created_by: string | null
          department_id: string
          due_date: string
          highlights: string | null
          id: string
          metrics: Json
          period_end: string
          period_start: string
          reopen_reason: string | null
          reopened_at: string | null
          reopened_by: string | null
          revision: number
          risks: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          cadence: string
          created_at?: string
          created_by?: string | null
          department_id: string
          due_date: string
          highlights?: string | null
          id?: string
          metrics?: Json
          period_end: string
          period_start: string
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          revision?: number
          risks?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          cadence?: string
          created_at?: string
          created_by?: string | null
          department_id?: string
          due_date?: string
          highlights?: string | null
          id?: string
          metrics?: Json
          period_end?: string
          period_start?: string
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          revision?: number
          risks?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_periodic_reports_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_unlocks: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          environment: string
          id: string
          net_cents: number
          paid_at: string | null
          platform_fee_cents: number
          recipient_id: string
          sender_id: string
          status: string
          stripe_session_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          net_cents?: number
          paid_at?: string | null
          platform_fee_cents?: number
          recipient_id: string
          sender_id: string
          status?: string
          stripe_session_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          net_cents?: number
          paid_at?: string | null
          platform_fee_cents?: number
          recipient_id?: string
          sender_id?: string
          status?: string
          stripe_session_id?: string | null
        }
        Relationships: []
      }
      employee_benefits: {
        Row: {
          benefit_id: string
          created_at: string
          employee_id: string
          enrolled_by: string | null
          enrolled_from: string
          enrolled_to: string | null
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          benefit_id: string
          created_at?: string
          employee_id: string
          enrolled_by?: string | null
          enrolled_from: string
          enrolled_to?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          benefit_id?: string
          created_at?: string
          employee_id?: string
          enrolled_by?: string | null
          enrolled_from?: string
          enrolled_to?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_benefits_benefit_id_fkey"
            columns: ["benefit_id"]
            isOneToOne: false
            referencedRelation: "benefits_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_benefits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_certifications: {
        Row: {
          certification_id: string
          created_at: string
          employee_id: string
          expires_at: string | null
          id: string
          issued_at: string
          issued_by: string | null
          notes: string | null
          status: Database["public"]["Enums"]["cert_status"]
          updated_at: string
        }
        Insert: {
          certification_id: string
          created_at?: string
          employee_id: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["cert_status"]
          updated_at?: string
        }
        Update: {
          certification_id?: string
          created_at?: string
          employee_id?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["cert_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_certifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_credential_issuances: {
        Row: {
          consumed_at: string | null
          employee_id: string
          expires_at: string
          id: string
          issued_at: string
          issued_by: string | null
          password_hash: string
        }
        Insert: {
          consumed_at?: string | null
          employee_id: string
          expires_at: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          password_hash: string
        }
        Update: {
          consumed_at?: string | null
          employee_id?: string
          expires_at?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          password_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_credential_issuances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_devices: {
        Row: {
          browser: string | null
          device_name: string | null
          employee_id: string
          first_seen_at: string
          id: string
          ip: unknown
          last_seen_at: string
          os: string | null
          region: string | null
          trusted: boolean
        }
        Insert: {
          browser?: string | null
          device_name?: string | null
          employee_id: string
          first_seen_at?: string
          id?: string
          ip?: unknown
          last_seen_at?: string
          os?: string | null
          region?: string | null
          trusted?: boolean
        }
        Update: {
          browser?: string | null
          device_name?: string | null
          employee_id?: string
          first_seen_at?: string
          id?: string
          ip?: unknown
          last_seen_at?: string
          os?: string | null
          region?: string | null
          trusted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "employee_devices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_leaves: {
        Row: {
          coverage_notes: string | null
          created_at: string
          employee_id: string
          end_date: string
          id: string
          kind: Database["public"]["Enums"]["leave_kind"]
          movement_id: string | null
          start_date: string
          status: string
          workload_covered_by: string | null
        }
        Insert: {
          coverage_notes?: string | null
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          kind: Database["public"]["Enums"]["leave_kind"]
          movement_id?: string | null
          start_date: string
          status?: string
          workload_covered_by?: string | null
        }
        Update: {
          coverage_notes?: string | null
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["leave_kind"]
          movement_id?: string | null
          start_date?: string
          status?: string
          workload_covered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_leaves_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_leaves_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "employee_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_leaves_workload_covered_by_fkey"
            columns: ["workload_covered_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_manager_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          employee_id: string
          id: string
          new_manager_id: string | null
          previous_manager_id: string | null
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          employee_id: string
          id?: string
          new_manager_id?: string | null
          previous_manager_id?: string | null
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          employee_id?: string
          id?: string
          new_manager_id?: string | null
          previous_manager_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_manager_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_manager_history_new_manager_id_fkey"
            columns: ["new_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_manager_history_previous_manager_id_fkey"
            columns: ["previous_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_movements: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          business_justification: string | null
          created_at: string
          effective_date: string | null
          employee_id: string
          end_date: string | null
          id: string
          kind: Database["public"]["Enums"]["movement_kind"]
          payload: Json
          reason: string | null
          requested_by: string | null
          source_snapshot: Json
          status: Database["public"]["Enums"]["movement_status"]
          target_department_id: string | null
          target_level: string | null
          target_manager_id: string | null
          target_role_id: string | null
          target_team_name: string | null
          updated_at: string
          workflow_run_id: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          business_justification?: string | null
          created_at?: string
          effective_date?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          kind: Database["public"]["Enums"]["movement_kind"]
          payload?: Json
          reason?: string | null
          requested_by?: string | null
          source_snapshot?: Json
          status?: Database["public"]["Enums"]["movement_status"]
          target_department_id?: string | null
          target_level?: string | null
          target_manager_id?: string | null
          target_role_id?: string | null
          target_team_name?: string | null
          updated_at?: string
          workflow_run_id?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          business_justification?: string | null
          created_at?: string
          effective_date?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["movement_kind"]
          payload?: Json
          reason?: string | null
          requested_by?: string | null
          source_snapshot?: Json
          status?: Database["public"]["Enums"]["movement_status"]
          target_department_id?: string | null
          target_level?: string | null
          target_manager_id?: string | null
          target_role_id?: string | null
          target_team_name?: string | null
          updated_at?: string
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_movements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_movements_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_movements_target_manager_id_fkey"
            columns: ["target_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_movements_target_role_id_fkey"
            columns: ["target_role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_movements_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "platform_workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_onboarding_checklist: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          employee_id: string
          id: string
          item_key: string
          label: string
          note: string | null
          owner: Database["public"]["Enums"]["checklist_owner"]
          session_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_id: string
          id?: string
          item_key: string
          label: string
          note?: string | null
          owner: Database["public"]["Enums"]["checklist_owner"]
          session_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          item_key?: string
          label?: string
          note?: string | null
          owner?: Database["public"]["Enums"]["checklist_owner"]
          session_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_onboarding_checklist_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_checklist_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "onboarding_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_passports: {
        Row: {
          archived_at: string | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          employee_id: string
          id: string
          issued_at: string
          metadata: Json
          office_location: string | null
          passport_number: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_id: string
          id?: string
          issued_at?: string
          metadata?: Json
          office_location?: string | null
          passport_number: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_id?: string
          id?: string
          issued_at?: string
          metadata?: Json
          office_location?: string | null
          passport_number?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_passports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_sessions: {
        Row: {
          device_id: string | null
          employee_id: string
          id: string
          ip: unknown
          last_seen_at: string
          region: string | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          started_at: string
          user_agent: string | null
        }
        Insert: {
          device_id?: string | null
          employee_id: string
          id?: string
          ip?: unknown
          last_seen_at?: string
          region?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          started_at?: string
          user_agent?: string | null
        }
        Update: {
          device_id?: string | null
          employee_id?: string
          id?: string
          ip?: unknown
          last_seen_at?: string
          region?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          started_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shifts: {
        Row: {
          assigned_by: string | null
          created_at: string
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          shift_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id: string
          id?: string
          shift_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_suspensions: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          ended_at: string | null
          id: string
          investigation_reference: string | null
          movement_id: string | null
          reason: string
          started_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          ended_at?: string | null
          id?: string
          investigation_reference?: string | null
          movement_id?: string | null
          reason: string
          started_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          ended_at?: string | null
          id?: string
          investigation_reference?: string | null
          movement_id?: string | null
          reason?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_suspensions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_suspensions_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "employee_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          company_email: string
          created_at: string
          created_by: string | null
          department_id: string | null
          employee_number: string
          employment_status: Database["public"]["Enums"]["employment_status"]
          exit_date: string | null
          full_name: string
          id: string
          joining_date: string | null
          level: string | null
          passport_id: string | null
          photo_url: string | null
          policies_accepted_at: string | null
          reporting_manager_id: string | null
          requires_2fa_setup: boolean
          requires_password_change: boolean
          role_id: string | null
          updated_at: string
          user_id: string | null
          user_type: Database["public"]["Enums"]["admin_user_type"]
        }
        Insert: {
          company_email: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          employee_number: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          exit_date?: string | null
          full_name: string
          id?: string
          joining_date?: string | null
          level?: string | null
          passport_id?: string | null
          photo_url?: string | null
          policies_accepted_at?: string | null
          reporting_manager_id?: string | null
          requires_2fa_setup?: boolean
          requires_password_change?: boolean
          role_id?: string | null
          updated_at?: string
          user_id?: string | null
          user_type?: Database["public"]["Enums"]["admin_user_type"]
        }
        Update: {
          company_email?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          employee_number?: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          exit_date?: string | null
          full_name?: string
          id?: string
          joining_date?: string | null
          level?: string | null
          passport_id?: string | null
          photo_url?: string | null
          policies_accepted_at?: string | null
          reporting_manager_id?: string | null
          requires_2fa_setup?: boolean
          requires_password_change?: boolean
          role_id?: string | null
          updated_at?: string
          user_id?: string | null
          user_type?: Database["public"]["Enums"]["admin_user_type"]
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_analytics_snapshots: {
        Row: {
          captured_at: string
          id: string
          kpi_code: string
          metadata: Json
          period: string
          period_end: string
          period_start: string
          scope: string
          scope_ref: string | null
          value: number | null
        }
        Insert: {
          captured_at?: string
          id?: string
          kpi_code: string
          metadata?: Json
          period: string
          period_end: string
          period_start: string
          scope?: string
          scope_ref?: string | null
          value?: number | null
        }
        Update: {
          captured_at?: string
          id?: string
          kpi_code?: string
          metadata?: Json
          period?: string
          period_end?: string
          period_start?: string
          scope?: string
          scope_ref?: string | null
          value?: number | null
        }
        Relationships: []
      }
      executive_announcements: {
        Row: {
          audience_ref: Json
          audience_type: string
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          pinned: boolean
          publish_at: string | null
          published_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          audience_ref?: Json
          audience_type?: string
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          pinned?: boolean
          publish_at?: string | null
          published_at?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          audience_ref?: Json
          audience_type?: string
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          pinned?: boolean
          publish_at?: string | null
          published_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      executive_automation_escalations: {
        Row: {
          created_at: string
          escalated_by: string | null
          escalated_to: string | null
          id: string
          level: number
          metadata: Json
          notes: string | null
          reason: string
          resolved_at: string | null
          source_id: string | null
          source_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          escalated_by?: string | null
          escalated_to?: string | null
          id?: string
          level?: number
          metadata?: Json
          notes?: string | null
          reason: string
          resolved_at?: string | null
          source_id?: string | null
          source_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          escalated_by?: string | null
          escalated_to?: string | null
          id?: string
          level?: number
          metadata?: Json
          notes?: string | null
          reason?: string
          resolved_at?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      executive_automation_runs: {
        Row: {
          automation_id: string
          created_at: string
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          input: Json | null
          output: Json | null
          retry_count: number
          started_at: string
          status: string
          trigger_source: string | null
        }
        Insert: {
          automation_id: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          retry_count?: number
          started_at?: string
          status?: string
          trigger_source?: string | null
        }
        Update: {
          automation_id?: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          retry_count?: number
          started_at?: string
          status?: string
          trigger_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "executive_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_automation_schedules: {
        Row: {
          automation_id: string
          created_at: string
          cron_expression: string | null
          end_at: string | null
          frequency: string
          id: string
          is_active: boolean
          start_at: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          automation_id: string
          created_at?: string
          cron_expression?: string | null
          end_at?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          start_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          automation_id?: string
          created_at?: string
          cron_expression?: string | null
          end_at?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          start_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_automation_schedules_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "executive_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_automation_templates: {
        Row: {
          actions: Json
          category: string
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
          tags: string[]
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          category?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          tags?: string[]
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          category?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          tags?: string[]
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      executive_automations: {
        Row: {
          actions: Json
          category: string
          conditions: Json
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          failure_count: number
          id: string
          is_enabled: boolean
          last_run_at: string | null
          name: string
          next_run_at: string | null
          owner_id: string | null
          priority: string
          run_count: number
          status: string
          tags: string[]
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          category?: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          failure_count?: number
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          owner_id?: string | null
          priority?: string
          run_count?: number
          status?: string
          tags?: string[]
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          category?: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          failure_count?: number
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          owner_id?: string | null
          priority?: string
          run_count?: number
          status?: string
          tags?: string[]
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      executive_broadcast_deliveries: {
        Row: {
          acknowledged_at: string | null
          broadcast_id: string
          created_at: string
          delivered_at: string | null
          id: string
          read_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          broadcast_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          read_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          broadcast_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          read_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_broadcast_deliveries_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "executive_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_broadcasts: {
        Row: {
          announcement_id: string | null
          audience: Json
          body: string
          created_at: string
          created_by: string | null
          delivery: string
          expires_at: string | null
          id: string
          require_ack: boolean
          scheduled_for: string | null
          sent_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          announcement_id?: string | null
          audience?: Json
          body?: string
          created_at?: string
          created_by?: string | null
          delivery?: string
          expires_at?: string | null
          id?: string
          require_ack?: boolean
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          announcement_id?: string | null
          audience?: Json
          body?: string
          created_at?: string
          created_by?: string | null
          delivery?: string
          expires_at?: string | null
          id?: string
          require_ack?: boolean
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_broadcasts_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "executive_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_continuity_plans: {
        Row: {
          checklist: Json
          contacts: Json
          content: string
          created_at: string
          created_by: string | null
          department_id: string | null
          dependencies: Json
          id: string
          last_reviewed_at: string | null
          name: string
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          checklist?: Json
          contacts?: Json
          content?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          dependencies?: Json
          id?: string
          last_reviewed_at?: string | null
          name: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          checklist?: Json
          contacts?: Json
          content?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          dependencies?: Json
          id?: string
          last_reviewed_at?: string | null
          name?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_continuity_plans_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_delegations: {
        Row: {
          created_at: string
          delegated_by: string
          delegated_to: string
          expires_at: string | null
          id: string
          reason: string | null
          request_id: string
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delegated_by: string
          delegated_to: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          request_id: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delegated_by?: string
          delegated_to?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          request_id?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_delegations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "platform_approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_department_lockdowns: {
        Row: {
          activated_at: string
          activated_by: string | null
          approver_id: string | null
          created_at: string
          department_id: string
          duration_hours: number | null
          ended_at: string | null
          ended_by: string | null
          id: string
          reason: string
          restrictions: Json
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string
          activated_by?: string | null
          approver_id?: string | null
          created_at?: string
          department_id: string
          duration_hours?: number | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          reason: string
          restrictions?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string
          activated_by?: string | null
          approver_id?: string | null
          created_at?: string
          department_id?: string
          duration_hours?: number | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          reason?: string
          restrictions?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_department_lockdowns_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_emergency_events: {
        Row: {
          activated_at: string
          activated_by: string | null
          approver_id: string | null
          created_at: string
          effects: Json
          end_reason: string | null
          ended_at: string | null
          ended_by: string | null
          expected_duration_minutes: number | null
          id: string
          mode: string
          reason: string
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string
          activated_by?: string | null
          approver_id?: string | null
          created_at?: string
          effects?: Json
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          expected_duration_minutes?: number | null
          id?: string
          mode?: string
          reason: string
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string
          activated_by?: string | null
          approver_id?: string | null
          created_at?: string
          effects?: Json
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          expected_duration_minutes?: number | null
          id?: string
          mode?: string
          reason?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      executive_escalations: {
        Row: {
          created_at: string
          from_priority: string | null
          id: string
          reason: string
          request_id: string
          to_priority: string | null
          triggered_by: string
          triggered_by_user: string | null
        }
        Insert: {
          created_at?: string
          from_priority?: string | null
          id?: string
          reason: string
          request_id: string
          to_priority?: string | null
          triggered_by?: string
          triggered_by_user?: string | null
        }
        Update: {
          created_at?: string
          from_priority?: string | null
          id?: string
          reason?: string
          request_id?: string
          to_priority?: string | null
          triggered_by?: string
          triggered_by_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_escalations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "platform_approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_incident_updates: {
        Row: {
          created_at: string
          id: string
          incident_id: string
          note: string
          status: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id: string
          note: string
          status?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string
          note?: string
          status?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_incident_updates_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "executive_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_incidents: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          detected_at: string
          id: string
          lessons_learned: string | null
          owner_id: string | null
          reference: string
          resolution: string | null
          resolved_at: string | null
          severity: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          detected_at?: string
          id?: string
          lessons_learned?: string | null
          owner_id?: string | null
          reference?: string
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          detected_at?: string
          id?: string
          lessons_learned?: string | null
          owner_id?: string | null
          reference?: string
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      executive_kpi_configs: {
        Row: {
          alert_threshold: number | null
          category: string
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          direction: string
          formula: string | null
          id: string
          is_active: boolean
          name: string
          scope: string
          source_module: string | null
          target_value: number | null
          unit: string | null
          updated_at: string
          warn_threshold: number | null
        }
        Insert: {
          alert_threshold?: number | null
          category: string
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction?: string
          formula?: string | null
          id?: string
          is_active?: boolean
          name: string
          scope?: string
          source_module?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          warn_threshold?: number | null
        }
        Update: {
          alert_threshold?: number | null
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction?: string
          formula?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scope?: string
          source_module?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          warn_threshold?: number | null
        }
        Relationships: []
      }
      executive_login_events: {
        Row: {
          created_at: string
          device_id: string | null
          event_type: string
          id: string
          ip: unknown
          metadata: Json
          outcome: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_type: string
          id?: string
          ip?: unknown
          metadata?: Json
          outcome?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_type?: string
          id?: string
          ip?: unknown
          metadata?: Json
          outcome?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_login_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "executive_trusted_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_maintenance_windows: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          kind: string
          message: string | null
          starts_at: string
          status: string
          target: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          kind: string
          message?: string | null
          starts_at: string
          status?: string
          target?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          kind?: string
          message?: string | null
          starts_at?: string
          status?: string
          target?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      executive_mfa_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          method: string
          secret_ref: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          method: string
          secret_ref?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          method?: string
          secret_ref?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      executive_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          request_id: string
          visibility: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          request_id: string
          visibility?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          request_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_notes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "platform_approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_password_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          ip: unknown
          password_hash: string
          user_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          ip?: unknown
          password_hash: string
          user_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          ip?: unknown
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      executive_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          is_used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          is_used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          is_used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      executive_recovery_methods: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_verified: boolean
          label: string | null
          metadata: Json
          method_type: string
          updated_at: string
          user_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          label?: string | null
          metadata?: Json
          method_type: string
          updated_at?: string
          user_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          label?: string | null
          metadata?: Json
          method_type?: string
          updated_at?: string
          user_id?: string
          value?: string | null
        }
        Relationships: []
      }
      executive_reminders: {
        Row: {
          acknowledged_at: string | null
          automation_id: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json
          recipient_id: string | null
          remind_at: string
          snoozed_until: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          automation_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          recipient_id?: string | null
          remind_at: string
          snoozed_until?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          automation_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          recipient_id?: string | null
          remind_at?: string
          snoozed_until?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_reminders_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "executive_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_report_definitions: {
        Row: {
          category: string
          code: string
          created_at: string
          created_by: string | null
          default_filters: Json
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          query_config: Json
          scope: string
          source_module: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          created_by?: string | null
          default_filters?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          query_config?: Json
          scope?: string
          source_module?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          default_filters?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          query_config?: Json
          scope?: string
          source_module?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      executive_report_history: {
        Row: {
          definition_id: string | null
          duration_ms: number | null
          error: string | null
          file_path: string | null
          filters: Json
          format: string | null
          generated_at: string
          generated_by: string | null
          id: string
          row_count: number | null
          scheduled_id: string | null
          status: string
          triggered_by: string
        }
        Insert: {
          definition_id?: string | null
          duration_ms?: number | null
          error?: string | null
          file_path?: string | null
          filters?: Json
          format?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          row_count?: number | null
          scheduled_id?: string | null
          status?: string
          triggered_by?: string
        }
        Update: {
          definition_id?: string | null
          duration_ms?: number | null
          error?: string | null
          file_path?: string | null
          filters?: Json
          format?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          row_count?: number | null
          scheduled_id?: string | null
          status?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_report_history_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "executive_report_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_report_history_scheduled_id_fkey"
            columns: ["scheduled_id"]
            isOneToOne: false
            referencedRelation: "executive_scheduled_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_report_shares: {
        Row: {
          can_export: boolean
          created_at: string
          history_id: string | null
          id: string
          message: string | null
          saved_id: string | null
          shared_by: string | null
          shared_with_department: string | null
          shared_with_user: string | null
        }
        Insert: {
          can_export?: boolean
          created_at?: string
          history_id?: string | null
          id?: string
          message?: string | null
          saved_id?: string | null
          shared_by?: string | null
          shared_with_department?: string | null
          shared_with_user?: string | null
        }
        Update: {
          can_export?: boolean
          created_at?: string
          history_id?: string | null
          id?: string
          message?: string | null
          saved_id?: string | null
          shared_by?: string | null
          shared_with_department?: string | null
          shared_with_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_report_shares_history_id_fkey"
            columns: ["history_id"]
            isOneToOne: false
            referencedRelation: "executive_report_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_report_shares_saved_id_fkey"
            columns: ["saved_id"]
            isOneToOne: false
            referencedRelation: "executive_saved_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_report_shares_shared_with_department_fkey"
            columns: ["shared_with_department"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_saved_reports: {
        Row: {
          created_at: string
          definition_id: string | null
          description: string | null
          filters: Json
          id: string
          is_pinned: boolean
          owner_id: string
          snapshot: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          definition_id?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_pinned?: boolean
          owner_id: string
          snapshot?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          definition_id?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_pinned?: boolean
          owner_id?: string
          snapshot?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_saved_reports_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "executive_report_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_scheduled_reports: {
        Row: {
          created_at: string
          created_by: string | null
          cron_expression: string | null
          definition_id: string
          filters: Json
          format: string
          frequency: string
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          next_run_at: string | null
          recipients: Json
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cron_expression?: string | null
          definition_id: string
          filters?: Json
          format?: string
          frequency: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          recipients?: Json
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cron_expression?: string | null
          definition_id?: string
          filters?: Json
          format?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          recipients?: Json
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_scheduled_reports_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "executive_report_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_security_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          description: string | null
          id: string
          is_acknowledged: boolean
          metadata: Json
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_acknowledged?: boolean
          metadata?: Json
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_acknowledged?: boolean
          metadata?: Json
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      executive_security_policies: {
        Row: {
          created_at: string
          device_approval_required: boolean
          failed_login_threshold: number
          id: string
          max_concurrent_sessions: number
          mfa_required: boolean
          password_expiry_days: number
          password_history_depth: number
          password_min_length: number
          password_require_lowercase: boolean
          password_require_number: boolean
          password_require_symbol: boolean
          password_require_uppercase: boolean
          session_timeout_minutes: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          device_approval_required?: boolean
          failed_login_threshold?: number
          id?: string
          max_concurrent_sessions?: number
          mfa_required?: boolean
          password_expiry_days?: number
          password_history_depth?: number
          password_min_length?: number
          password_require_lowercase?: boolean
          password_require_number?: boolean
          password_require_symbol?: boolean
          password_require_uppercase?: boolean
          session_timeout_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          device_approval_required?: boolean
          failed_login_threshold?: number
          id?: string
          max_concurrent_sessions?: number
          mfa_required?: boolean
          password_expiry_days?: number
          password_history_depth?: number
          password_min_length?: number
          password_require_lowercase?: boolean
          password_require_number?: boolean
          password_require_symbol?: boolean
          password_require_uppercase?: boolean
          session_timeout_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      executive_system_status: {
        Row: {
          id: string
          last_checked_at: string
          message: string | null
          metadata: Json
          service: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          last_checked_at?: string
          message?: string | null
          metadata?: Json
          service: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          last_checked_at?: string
          message?: string | null
          metadata?: Json
          service?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      executive_trusted_devices: {
        Row: {
          browser: string | null
          created_at: string
          device_fingerprint: string | null
          device_name: string
          id: string
          is_approved: boolean
          last_ip: unknown
          last_used_at: string | null
          metadata: Json
          os: string | null
          risk_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_fingerprint?: string | null
          device_name: string
          id?: string
          is_approved?: boolean
          last_ip?: unknown
          last_used_at?: string | null
          metadata?: Json
          os?: string | null
          risk_level?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_fingerprint?: string | null
          device_name?: string
          id?: string
          is_approved?: boolean
          last_ip?: unknown
          last_used_at?: string | null
          metadata?: Json
          os?: string | null
          risk_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      executive_watchlist_items: {
        Row: {
          created_at: string
          id: string
          item_ref: string | null
          item_type: string
          label: string
          note: string | null
          priority: string
          watchlist_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_ref?: string | null
          item_type: string
          label: string
          note?: string | null
          priority?: string
          watchlist_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_ref?: string | null
          item_type?: string
          label?: string
          note?: string | null
          priority?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_watchlist_items_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "executive_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_watchlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_shared: boolean
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_shared?: boolean
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_shared?: boolean
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_profile_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follows_following_profile_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      founder_seats: {
        Row: {
          council_role: Database["public"]["Enums"]["council_role"] | null
          created_at: string
          founder_title: string | null
          id: string
          is_active: boolean
          revoke_reason: string | null
          seat_number: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          council_role?: Database["public"]["Enums"]["council_role"] | null
          created_at?: string
          founder_title?: string | null
          id?: string
          is_active?: boolean
          revoke_reason?: string | null
          seat_number: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          council_role?: Database["public"]["Enums"]["council_role"] | null
          created_at?: string
          founder_title?: string | null
          id?: string
          is_active?: boolean
          revoke_reason?: string | null
          seat_number?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      governance_approval_matrix: {
        Row: {
          approver_role: string | null
          created_at: string
          created_by: string | null
          delegate_role: string | null
          description: string | null
          id: string
          is_active: boolean
          notify_roles: string[]
          recommender_role: string | null
          request_type: string
          reviewer_role: string | null
          scope: string
          threshold_amount: number | null
          threshold_currency: string | null
          updated_at: string
        }
        Insert: {
          approver_role?: string | null
          created_at?: string
          created_by?: string | null
          delegate_role?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          notify_roles?: string[]
          recommender_role?: string | null
          request_type: string
          reviewer_role?: string | null
          scope: string
          threshold_amount?: number | null
          threshold_currency?: string | null
          updated_at?: string
        }
        Update: {
          approver_role?: string | null
          created_at?: string
          created_by?: string | null
          delegate_role?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          notify_roles?: string[]
          recommender_role?: string | null
          request_type?: string
          reviewer_role?: string | null
          scope?: string
          threshold_amount?: number | null
          threshold_currency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      governance_authority_delegations: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          created_at: string
          delegate_id: string
          delegator_id: string
          end_date: string | null
          id: string
          reason: string | null
          scope: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          delegate_id: string
          delegator_id: string
          end_date?: string | null
          id?: string
          reason?: string | null
          scope: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          delegate_id?: string
          delegator_id?: string
          end_date?: string | null
          id?: string
          reason?: string | null
          scope?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      governance_authority_matrix: {
        Row: {
          authority_level: string
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean
          role_key: string
          scope: string
          updated_at: string
        }
        Insert: {
          authority_level: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          role_key: string
          scope: string
          updated_at?: string
        }
        Update: {
          authority_level?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          role_key?: string
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_authority_matrix_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_department_charters: {
        Row: {
          approval_rights: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          department_id: string
          documentation_standards: string | null
          escalation_path: string | null
          id: string
          kpis: string | null
          mission: string | null
          reporting_structure: string | null
          responsibilities: string | null
          status: string
          training_standards: string | null
          updated_at: string
          version: number
        }
        Insert: {
          approval_rights?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          department_id: string
          documentation_standards?: string | null
          escalation_path?: string | null
          id?: string
          kpis?: string | null
          mission?: string | null
          reporting_structure?: string | null
          responsibilities?: string | null
          status?: string
          training_standards?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          approval_rights?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string
          documentation_standards?: string | null
          escalation_path?: string | null
          id?: string
          kpis?: string | null
          mission?: string | null
          reporting_structure?: string | null
          responsibilities?: string | null
          status?: string
          training_standards?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "governance_department_charters_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_policies: {
        Row: {
          approver_id: string | null
          category: string
          code: string
          created_at: string
          created_by: string | null
          current_version: number
          department_id: string | null
          effective_date: string | null
          id: string
          owner_id: string | null
          published_at: string | null
          published_by: string | null
          review_date: string | null
          status: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          approver_id?: string | null
          category: string
          code: string
          created_at?: string
          created_by?: string | null
          current_version?: number
          department_id?: string | null
          effective_date?: string | null
          id?: string
          owner_id?: string | null
          published_at?: string | null
          published_by?: string | null
          review_date?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          approver_id?: string | null
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          current_version?: number
          department_id?: string | null
          effective_date?: string | null
          id?: string
          owner_id?: string | null
          published_at?: string | null
          published_by?: string | null
          review_date?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_policies_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_policy_acknowledgements: {
        Row: {
          acknowledged_at: string
          id: string
          policy_id: string
          user_id: string
          version: number
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          policy_id: string
          user_id: string
          version: number
        }
        Update: {
          acknowledged_at?: string
          id?: string
          policy_id?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "governance_policy_acknowledgements_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "governance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_policy_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          changelog: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          policy_id: string
          published_at: string | null
          status: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          changelog?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          policy_id: string
          published_at?: string | null
          status?: string
          version: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          changelog?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          policy_id?: string
          published_at?: string | null
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "governance_policy_versions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "governance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_rules: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          effective_date: string | null
          id: string
          name: string
          owner_id: string | null
          priority: string
          related_policy_ids: string[]
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          priority?: string
          related_policy_ids?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          priority?: string
          related_policy_ids?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_rules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      highlight_items: {
        Row: {
          created_at: string
          highlight_id: string
          position: number
          story_id: string
        }
        Insert: {
          created_at?: string
          highlight_id: string
          position?: number
          story_id: string
        }
        Update: {
          created_at?: string
          highlight_id?: string
          position?: number
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlight_items_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "story_highlights"
            referencedColumns: ["id"]
          },
        ]
      }
      hiring_requests: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          budget_approved: boolean
          budget_notes: string | null
          created_at: string
          department_id: string | null
          expected_joining: string | null
          filled_count: number
          id: string
          level: string | null
          priority: Database["public"]["Enums"]["hiring_priority"]
          reason: string
          rejection_reason: string | null
          request_number: string
          requested_by: string | null
          role_title: string
          status: Database["public"]["Enums"]["hiring_request_status"]
          updated_at: string
          vacancies: number
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          budget_approved?: boolean
          budget_notes?: string | null
          created_at?: string
          department_id?: string | null
          expected_joining?: string | null
          filled_count?: number
          id?: string
          level?: string | null
          priority?: Database["public"]["Enums"]["hiring_priority"]
          reason: string
          rejection_reason?: string | null
          request_number?: string
          requested_by?: string | null
          role_title: string
          status?: Database["public"]["Enums"]["hiring_request_status"]
          updated_at?: string
          vacancies?: number
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          budget_approved?: boolean
          budget_notes?: string | null
          created_at?: string
          department_id?: string | null
          expected_joining?: string | null
          filled_count?: number
          id?: string
          level?: string | null
          priority?: Database["public"]["Enums"]["hiring_priority"]
          reason?: string
          rejection_reason?: string | null
          request_number?: string
          requested_by?: string | null
          role_title?: string
          status?: Database["public"]["Enums"]["hiring_request_status"]
          updated_at?: string
          vacancies?: number
        }
        Relationships: [
          {
            foreignKeyName: "hiring_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          holiday_date: string
          id: string
          kind: Database["public"]["Enums"]["holiday_kind"]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          holiday_date: string
          id?: string
          kind?: Database["public"]["Enums"]["holiday_kind"]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          holiday_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["holiday_kind"]
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      improvement_plans: {
        Row: {
          coach_id: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          final_outcome: string | null
          id: string
          objectives: string
          progress: number
          review_dates: Json
          status: Database["public"]["Enums"]["pip_status"]
          timeline_end: string
          timeline_start: string
          updated_at: string
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          final_outcome?: string | null
          id?: string
          objectives: string
          progress?: number
          review_dates?: Json
          status?: Database["public"]["Enums"]["pip_status"]
          timeline_end: string
          timeline_start: string
          updated_at?: string
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          final_outcome?: string | null
          id?: string
          objectives?: string
          progress?: number
          review_dates?: Json
          status?: Database["public"]["Enums"]["pip_status"]
          timeline_end?: string
          timeline_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "improvement_plans_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_plans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_feedback: {
        Row: {
          comments: string | null
          communication_rating: number | null
          culture_fit_rating: number | null
          id: string
          interviewer_id: string | null
          interviewer_name: string | null
          overall_rating: number | null
          problem_solving_rating: number | null
          recommendation: Database["public"]["Enums"]["interview_recommendation"]
          round_id: string
          submitted_at: string
          technical_rating: number | null
        }
        Insert: {
          comments?: string | null
          communication_rating?: number | null
          culture_fit_rating?: number | null
          id?: string
          interviewer_id?: string | null
          interviewer_name?: string | null
          overall_rating?: number | null
          problem_solving_rating?: number | null
          recommendation: Database["public"]["Enums"]["interview_recommendation"]
          round_id: string
          submitted_at?: string
          technical_rating?: number | null
        }
        Update: {
          comments?: string | null
          communication_rating?: number | null
          culture_fit_rating?: number | null
          id?: string
          interviewer_id?: string | null
          interviewer_name?: string | null
          overall_rating?: number | null
          problem_solving_rating?: number | null
          recommendation?: Database["public"]["Enums"]["interview_recommendation"]
          round_id?: string
          submitted_at?: string
          technical_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_feedback_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "interview_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_rounds: {
        Row: {
          application_id: string
          created_at: string
          created_by: string | null
          decision: Database["public"]["Enums"]["interview_decision"]
          duration_minutes: number | null
          id: string
          interviewer_id: string | null
          interviewer_name: string | null
          location: string | null
          meeting_url: string | null
          notes: string | null
          scheduled_at: string | null
          sequence: number
          stage: Database["public"]["Enums"]["candidate_stage"]
          status: Database["public"]["Enums"]["interview_round_status"]
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by?: string | null
          decision?: Database["public"]["Enums"]["interview_decision"]
          duration_minutes?: number | null
          id?: string
          interviewer_id?: string | null
          interviewer_name?: string | null
          location?: string | null
          meeting_url?: string | null
          notes?: string | null
          scheduled_at?: string | null
          sequence?: number
          stage: Database["public"]["Enums"]["candidate_stage"]
          status?: Database["public"]["Enums"]["interview_round_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string | null
          decision?: Database["public"]["Enums"]["interview_decision"]
          duration_minutes?: number | null
          id?: string
          interviewer_id?: string | null
          interviewer_name?: string | null
          location?: string | null
          meeting_url?: string | null
          notes?: string | null
          scheduled_at?: string | null
          sequence?: number
          stage?: Database["public"]["Enums"]["candidate_stage"]
          status?: Database["public"]["Enums"]["interview_round_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_rounds_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_transfers: {
        Row: {
          checklist: Json
          completed_at: string | null
          created_at: string
          from_employee_id: string
          id: string
          movement_id: string | null
          notes: string | null
          status: string
          to_employee_id: string | null
        }
        Insert: {
          checklist?: Json
          completed_at?: string | null
          created_at?: string
          from_employee_id: string
          id?: string
          movement_id?: string | null
          notes?: string | null
          status?: string
          to_employee_id?: string | null
        }
        Update: {
          checklist?: Json
          completed_at?: string | null
          created_at?: string
          from_employee_id?: string
          id?: string
          movement_id?: string | null
          notes?: string | null
          status?: string
          to_employee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_transfers_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_transfers_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "employee_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_transfers_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_submissions: {
        Row: {
          bank_account_number: string
          bank_ifsc: string
          bank_name: string | null
          created_at: string
          full_name: string
          id: string
          id_photo_url: string
          pan_number: string | null
          passbook_photo_url: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_number: string
          bank_ifsc: string
          bank_name?: string | null
          created_at?: string
          full_name: string
          id?: string
          id_photo_url: string
          pan_number?: string | null
          passbook_photo_url: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_number?: string
          bank_ifsc?: string
          bank_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          id_photo_url?: string
          pan_number?: string | null
          passbook_photo_url?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      learning_courses: {
        Row: {
          category: Database["public"]["Enums"]["course_category"]
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["course_difficulty"]
          duration_minutes: number
          id: string
          is_mandatory: boolean
          owner_id: string | null
          prerequisites: string[]
          status: Database["public"]["Enums"]["course_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["course_category"]
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["course_difficulty"]
          duration_minutes?: number
          id?: string
          is_mandatory?: boolean
          owner_id?: string | null
          prerequisites?: string[]
          status?: Database["public"]["Enums"]["course_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["course_category"]
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["course_difficulty"]
          duration_minutes?: number
          id?: string
          is_mandatory?: boolean
          owner_id?: string | null
          prerequisites?: string[]
          status?: Database["public"]["Enums"]["course_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_path_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_required: boolean
          path_id: string
          sequence: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_required?: boolean
          path_id: string
          sequence?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_required?: boolean
          path_id?: string
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_courses_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["course_status"]
          target_role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["course_status"]
          target_role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["course_status"]
          target_role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_paths_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          allocated: number
          created_at: string
          employee_id: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          pending: number
          updated_at: string
          used: number
          year: number
        }
        Insert: {
          allocated?: number
          created_at?: string
          employee_id: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          pending?: number
          updated_at?: string
          used?: number
          year: number
        }
        Update: {
          allocated?: number
          created_at?: string
          employee_id?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          pending?: number
          updated_at?: string
          used?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          annual_allowance: number
          carryover_days: number
          created_at: string
          description: string | null
          id: string
          is_paid: boolean
          leave_type: Database["public"]["Enums"]["leave_type"]
          requires_medical: boolean
          updated_at: string
        }
        Insert: {
          annual_allowance?: number
          carryover_days?: number
          created_at?: string
          description?: string | null
          id?: string
          is_paid?: boolean
          leave_type: Database["public"]["Enums"]["leave_type"]
          requires_medical?: boolean
          updated_at?: string
        }
        Update: {
          annual_allowance?: number
          carryover_days?: number
          created_at?: string
          description?: string | null
          id?: string
          is_paid?: boolean
          leave_type?: Database["public"]["Enums"]["leave_type"]
          requires_medical?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          created_at: string
          days: number
          dept_reviewed_at: string | null
          dept_reviewer: string | null
          employee_id: string
          end_date: string
          handover_notes: string | null
          hr_reviewed_at: string | null
          hr_reviewer: string | null
          id: string
          lead_reviewed_at: string | null
          lead_reviewer: string | null
          leave_type: Database["public"]["Enums"]["leave_type"]
          medical_doc_url: string | null
          reason: string
          rejection_reason: string | null
          request_number: string
          start_date: string
          status: Database["public"]["Enums"]["leave_request_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          days: number
          dept_reviewed_at?: string | null
          dept_reviewer?: string | null
          employee_id: string
          end_date: string
          handover_notes?: string | null
          hr_reviewed_at?: string | null
          hr_reviewer?: string | null
          id?: string
          lead_reviewed_at?: string | null
          lead_reviewer?: string | null
          leave_type: Database["public"]["Enums"]["leave_type"]
          medical_doc_url?: string | null
          reason: string
          rejection_reason?: string | null
          request_number?: string
          start_date: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          days?: number
          dept_reviewed_at?: string | null
          dept_reviewer?: string | null
          employee_id?: string
          end_date?: string
          handover_notes?: string | null
          hr_reviewed_at?: string | null
          hr_reviewer?: string | null
          id?: string
          lead_reviewed_at?: string | null
          lead_reviewer?: string | null
          leave_type?: Database["public"]["Enums"]["leave_type"]
          medical_doc_url?: string | null
          reason?: string
          rejection_reason?: string | null
          request_number?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_chat: {
        Row: {
          body: string
          created_at: string
          id: string
          stream_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          stream_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_reactions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          created_at: string
          ended_at: string | null
          host_id: string
          id: string
          livekit_room: string
          started_at: string
          status: string
          title: string | null
          viewer_count: number
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          host_id: string
          id?: string
          livekit_room: string
          started_at?: string
          status?: string
          title?: string | null
          viewer_count?: number
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          host_id?: string
          id?: string
          livekit_room?: string
          started_at?: string
          status?: string
          title?: string | null
          viewer_count?: number
        }
        Relationships: []
      }
      login_events: {
        Row: {
          city: string | null
          created_at: string
          id: string
          ip: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          kind: string
          media_type: string | null
          media_url: string | null
          read_at: string | null
          sender_id: string
          shared_post_id: string | null
          shared_story_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          kind?: string
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          sender_id: string
          shared_post_id?: string | null
          shared_story_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          sender_id?: string
          shared_post_id?: string | null
          shared_story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_profile_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      movement_approvals: {
        Row: {
          approver_user_id: string | null
          created_at: string
          decided_at: string | null
          decision: Database["public"]["Enums"]["approval_decision"]
          id: string
          movement_id: string
          note: string | null
          role_key: string
          step_order: number
        }
        Insert: {
          approver_user_id?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["approval_decision"]
          id?: string
          movement_id: string
          note?: string | null
          role_key: string
          step_order: number
        }
        Update: {
          approver_user_id?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["approval_decision"]
          id?: string
          movement_id?: string
          note?: string | null
          role_key?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "movement_approvals_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "employee_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      mutes: {
        Row: {
          created_at: string
          muted_id: string
          muter_id: string
        }
        Insert: {
          created_at?: string
          muted_id: string
          muter_id: string
        }
        Update: {
          created_at?: string
          muted_id?: string
          muter_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          comment_id: string | null
          created_at: string
          id: string
          organization_id: string | null
          post_id: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          post_id?: string | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          post_id?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_profile_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          accepted_at: string | null
          application_id: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          department_id: string | null
          effective_date: string | null
          expires_at: string | null
          generated_by: string | null
          id: string
          level: string | null
          notes: string | null
          offer_number: string
          rejected_at: string | null
          rejection_reason: string | null
          role_title: string | null
          salary_amount: number | null
          salary_currency: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
          version: number
          withdrawn_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          application_id: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          department_id?: string | null
          effective_date?: string | null
          expires_at?: string | null
          generated_by?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          offer_number?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          role_title?: string | null
          salary_amount?: number | null
          salary_currency?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
          version?: number
          withdrawn_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          application_id?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          department_id?: string | null
          effective_date?: string | null
          expires_at?: string | null
          generated_by?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          offer_number?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          role_title?: string | null
          salary_amount?: number | null
          salary_currency?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
          version?: number
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_sessions: {
        Row: {
          activated_at: string | null
          background_check_cleared_at: string | null
          background_check_required: boolean
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          hr_notes: string | null
          hr_owner_user_id: string | null
          id: string
          joining_date: string | null
          stage: Database["public"]["Enums"]["onboarding_stage"]
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          background_check_cleared_at?: string | null
          background_check_required?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          hr_notes?: string | null
          hr_owner_user_id?: string | null
          id?: string
          joining_date?: string | null
          stage?: Database["public"]["Enums"]["onboarding_stage"]
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          background_check_cleared_at?: string | null
          background_check_required?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          hr_notes?: string | null
          hr_owner_user_id?: string | null
          id?: string
          joining_date?: string | null
          stage?: Database["public"]["Enums"]["onboarding_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      open_positions: {
        Row: {
          approved_by: string | null
          created_at: string
          department_id: string
          expected_joining: string | null
          filled_by_employee_id: string | null
          id: string
          level: string | null
          notes: string | null
          priority: Database["public"]["Enums"]["open_position_priority"]
          reason: string | null
          requested_by: string | null
          role_id: string | null
          status: Database["public"]["Enums"]["open_position_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          department_id: string
          expected_joining?: string | null
          filled_by_employee_id?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["open_position_priority"]
          reason?: string | null
          requested_by?: string | null
          role_id?: string | null
          status?: Database["public"]["Enums"]["open_position_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          department_id?: string
          expected_joining?: string | null
          filled_by_employee_id?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["open_position_priority"]
          reason?: string | null
          requested_by?: string | null
          role_id?: string | null
          status?: Database["public"]["Enums"]["open_position_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_positions_filled_by_employee_id_fkey"
            columns: ["filled_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_positions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_activity: {
        Row: {
          activity_type: string
          actor_id: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          organization_id: string
          title: string
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          title: string
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_activity_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          organization_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_departments: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          organization_id: string
          parent_department_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          organization_id: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          organization_id?: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_departments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "organization_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          organization_id: string
          role_id: string | null
          status: string
          username: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by: string
          organization_id: string
          role_id?: string | null
          status?: string
          username?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string
          organization_id?: string
          role_id?: string | null
          status?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_member_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          member_id: string
          role_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          member_id: string
          role_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          member_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_member_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_member_roles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_member_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "organization_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organization_permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          module: string
          name: string
          permission_key: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
          name: string
          permission_key: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          name?: string
          permission_key?: string
        }
        Relationships: []
      }
      organization_role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "organization_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_roles: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          is_system: boolean
          name: string
          organization_id: string
          priority: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          name: string
          organization_id: string
          priority?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          name?: string
          organization_id?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          accent_color: string | null
          ai_enabled: boolean
          allow_direct_messages: boolean
          allow_member_invites: boolean
          allow_public_posts: boolean
          created_at: string
          enabled_modules: string[]
          language: string
          logo_shape: string | null
          organization_id: string
          require_join_approval: boolean
          theme_color: string | null
          timezone: string
          updated_at: string
          visibility: string
        }
        Insert: {
          accent_color?: string | null
          ai_enabled?: boolean
          allow_direct_messages?: boolean
          allow_member_invites?: boolean
          allow_public_posts?: boolean
          created_at?: string
          enabled_modules?: string[]
          language?: string
          logo_shape?: string | null
          organization_id: string
          require_join_approval?: boolean
          theme_color?: string | null
          timezone?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          accent_color?: string | null
          ai_enabled?: boolean
          allow_direct_messages?: boolean
          allow_member_invites?: boolean
          allow_public_posts?: boolean
          created_at?: string
          enabled_modules?: string[]
          language?: string
          logo_shape?: string | null
          organization_id?: string
          require_join_approval?: boolean
          theme_color?: string | null
          timezone?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          bio: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          email: string | null
          follower_count: number | null
          following_count: number | null
          id: string
          industry: string | null
          location: string | null
          logo_url: string | null
          member_count: number | null
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          owner_user_id: string
          phone: string | null
          post_count: number | null
          slug: string
          updated_at: string | null
          username: string
          verified: boolean | null
          verified_at: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          member_count?: number | null
          name: string
          org_type?: Database["public"]["Enums"]["org_type"]
          owner_user_id: string
          phone?: string | null
          post_count?: number | null
          slug: string
          updated_at?: string | null
          username: string
          verified?: boolean | null
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          member_count?: number | null
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          owner_user_id?: string
          phone?: string | null
          post_count?: number | null
          slug?: string
          updated_at?: string | null
          username?: string
          verified?: boolean | null
          verified_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ownership_certificates: {
        Row: {
          bitcoin_block_height: number | null
          content_hash: string
          created_at: string
          creator_id: string
          id: string
          media_type: string
          media_url: string
          ots_confirmed_at: string | null
          ots_last_attempt_at: string | null
          ots_proof: string | null
          ots_status: string
          post_id: string
          updated_at: string
        }
        Insert: {
          bitcoin_block_height?: number | null
          content_hash: string
          created_at?: string
          creator_id: string
          id?: string
          media_type: string
          media_url: string
          ots_confirmed_at?: string | null
          ots_last_attempt_at?: string | null
          ots_proof?: string | null
          ots_status?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          bitcoin_block_height?: number | null
          content_hash?: string
          created_at?: string
          creator_id?: string
          id?: string
          media_type?: string
          media_url?: string
          ots_confirmed_at?: string | null
          ots_last_attempt_at?: string | null
          ots_proof?: string | null
          ots_status?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_certificates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ownership_certificates_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_awards: {
        Row: {
          award_date: string
          award_name: string
          awarded_by: string | null
          category: string | null
          created_at: string
          employee_id: string
          evidence: Json
          id: string
          reason: string | null
        }
        Insert: {
          award_date: string
          award_name: string
          awarded_by?: string | null
          category?: string | null
          created_at?: string
          employee_id: string
          evidence?: Json
          id?: string
          reason?: string | null
        }
        Update: {
          award_date?: string
          award_name?: string
          awarded_by?: string | null
          category?: string | null
          created_at?: string
          employee_id?: string
          evidence?: Json
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passport_awards_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_certifications: {
        Row: {
          certification_name: string
          created_at: string
          department_id: string | null
          document_url: string | null
          employee_id: string
          expiry_date: string | null
          id: string
          issue_date: string
          issued_by: string | null
          status: string
        }
        Insert: {
          certification_name: string
          created_at?: string
          department_id?: string | null
          document_url?: string | null
          employee_id: string
          expiry_date?: string | null
          id?: string
          issue_date: string
          issued_by?: string | null
          status?: string
        }
        Update: {
          certification_name?: string
          created_at?: string
          department_id?: string | null
          document_url?: string | null
          employee_id?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string
          issued_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "passport_certifications_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_certifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_department_history: {
        Row: {
          approved_by: string | null
          audit_reference: string | null
          created_at: string
          date_joined: string
          date_left: string | null
          department_id: string | null
          department_slug: string | null
          employee_id: string
          id: string
          reason: string | null
        }
        Insert: {
          approved_by?: string | null
          audit_reference?: string | null
          created_at?: string
          date_joined: string
          date_left?: string | null
          department_id?: string | null
          department_slug?: string | null
          employee_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          approved_by?: string | null
          audit_reference?: string | null
          created_at?: string
          date_joined?: string
          date_left?: string | null
          department_id?: string | null
          department_slug?: string | null
          employee_id?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passport_department_history_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_department_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_documents: {
        Row: {
          access_scope: string
          created_at: string
          description: string | null
          doc_type: Database["public"]["Enums"]["passport_doc_type"]
          employee_id: string
          id: string
          metadata: Json
          storage_bucket: string
          storage_path: string
          supersedes_id: string | null
          title: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          access_scope?: string
          created_at?: string
          description?: string | null
          doc_type: Database["public"]["Enums"]["passport_doc_type"]
          employee_id: string
          id?: string
          metadata?: Json
          storage_bucket?: string
          storage_path: string
          supersedes_id?: string | null
          title: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          access_scope?: string
          created_at?: string
          description?: string | null
          doc_type?: Database["public"]["Enums"]["passport_doc_type"]
          employee_id?: string
          id?: string
          metadata?: Json
          storage_bucket?: string
          storage_path?: string
          supersedes_id?: string | null
          title?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "passport_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_documents_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "passport_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_projects: {
        Row: {
          created_at: string
          department_id: string | null
          employee_id: string
          end_date: string | null
          id: string
          outcome: string | null
          project_name: string
          role_in_project: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          outcome?: string | null
          project_name: string
          role_in_project?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          outcome?: string | null
          project_name?: string
          role_in_project?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "passport_projects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_projects_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_promotion_history: {
        Row: {
          approver_id: string | null
          created_at: string
          employee_id: string
          id: string
          new_level: string
          new_role_id: string | null
          old_level: string | null
          old_role_id: string | null
          promotion_date: string
          reason: string | null
          recommendation: string | null
          supporting_documents: Json
        }
        Insert: {
          approver_id?: string | null
          created_at?: string
          employee_id: string
          id?: string
          new_level: string
          new_role_id?: string | null
          old_level?: string | null
          old_role_id?: string | null
          promotion_date: string
          reason?: string | null
          recommendation?: string | null
          supporting_documents?: Json
        }
        Update: {
          approver_id?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          new_level?: string
          new_role_id?: string | null
          old_level?: string | null
          old_role_id?: string | null
          promotion_date?: string
          reason?: string | null
          recommendation?: string | null
          supporting_documents?: Json
        }
        Relationships: [
          {
            foreignKeyName: "passport_promotion_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_promotion_history_new_role_id_fkey"
            columns: ["new_role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_promotion_history_old_role_id_fkey"
            columns: ["old_role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_skills: {
        Row: {
          created_at: string
          department_id: string | null
          employee_id: string
          evidence: Json
          id: string
          skill_level: string | null
          skill_name: string
          status: Database["public"]["Enums"]["passport_skill_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          employee_id: string
          evidence?: Json
          id?: string
          skill_level?: string | null
          skill_name: string
          status?: Database["public"]["Enums"]["passport_skill_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          employee_id?: string
          evidence?: Json
          id?: string
          skill_level?: string | null
          skill_name?: string
          status?: Database["public"]["Enums"]["passport_skill_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passport_skills_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_team_history: {
        Row: {
          created_at: string
          date_joined: string
          date_left: string | null
          employee_id: string
          id: string
          notes: string | null
          reporting_manager_id: string | null
          role_in_team: string | null
          team_name: string
        }
        Insert: {
          created_at?: string
          date_joined: string
          date_left?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          reporting_manager_id?: string | null
          role_in_team?: string | null
          team_name: string
        }
        Update: {
          created_at?: string
          date_joined?: string
          date_left?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          reporting_manager_id?: string | null
          role_in_team?: string | null
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "passport_team_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_team_history_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_timeline: {
        Row: {
          actor_user_id: string | null
          created_at: string
          description: string | null
          employee_id: string
          event_type: Database["public"]["Enums"]["passport_event_type"]
          id: string
          occurred_at: string
          payload: Json
          title: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          description?: string | null
          employee_id: string
          event_type: Database["public"]["Enums"]["passport_event_type"]
          id?: string
          occurred_at?: string
          payload?: Json
          title: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string
          event_type?: Database["public"]["Enums"]["passport_event_type"]
          id?: string
          occurred_at?: string
          payload?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "passport_timeline_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_training: {
        Row: {
          certificate_url: string | null
          completion_date: string | null
          course_name: string
          created_at: string
          department_id: string | null
          employee_id: string
          id: string
          result: string | null
          trainer: string | null
        }
        Insert: {
          certificate_url?: string | null
          completion_date?: string | null
          course_name: string
          created_at?: string
          department_id?: string | null
          employee_id: string
          id?: string
          result?: string | null
          trainer?: string | null
        }
        Update: {
          certificate_url?: string | null
          completion_date?: string | null
          course_name?: string
          created_at?: string
          department_id?: string | null
          employee_id?: string
          id?: string
          result?: string | null
          trainer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passport_training_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_training_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          currency: string
          environment: string
          id: string
          method: string
          payout_detail: Json
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_cents: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          method: string
          payout_detail?: Json
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          method?: string
          payout_detail?: Json
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payroll_cycles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          currency: string
          finance_reviewed_at: string | null
          finance_reviewer: string | null
          founder_reviewed_at: string | null
          founder_reviewer: string | null
          generated_at: string | null
          generated_by: string | null
          hr_reviewed_at: string | null
          hr_reviewer: string | null
          id: string
          notes: string | null
          period_month: string
          released_at: string | null
          released_by: string | null
          status: Database["public"]["Enums"]["payroll_cycle_status"]
          totals: Json
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          finance_reviewed_at?: string | null
          finance_reviewer?: string | null
          founder_reviewed_at?: string | null
          founder_reviewer?: string | null
          generated_at?: string | null
          generated_by?: string | null
          hr_reviewed_at?: string | null
          hr_reviewer?: string | null
          id?: string
          notes?: string | null
          period_month: string
          released_at?: string | null
          released_by?: string | null
          status?: Database["public"]["Enums"]["payroll_cycle_status"]
          totals?: Json
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          finance_reviewed_at?: string | null
          finance_reviewer?: string | null
          founder_reviewed_at?: string | null
          founder_reviewer?: string | null
          generated_at?: string | null
          generated_by?: string | null
          hr_reviewed_at?: string | null
          hr_reviewer?: string | null
          id?: string
          notes?: string | null
          period_month?: string
          released_at?: string | null
          released_by?: string | null
          status?: Database["public"]["Enums"]["payroll_cycle_status"]
          totals?: Json
          updated_at?: string
        }
        Relationships: []
      }
      payroll_items: {
        Row: {
          bonuses_total: number
          created_at: string
          cycle_id: string
          deductions_total: number
          employee_id: string
          gross: number
          id: string
          leave_days: number
          loss_of_pay_days: number
          net_pay: number
          notes: string | null
          reimbursements_total: number
          structure_snapshot: Json
          updated_at: string
          worked_days: number
        }
        Insert: {
          bonuses_total?: number
          created_at?: string
          cycle_id: string
          deductions_total?: number
          employee_id: string
          gross?: number
          id?: string
          leave_days?: number
          loss_of_pay_days?: number
          net_pay?: number
          notes?: string | null
          reimbursements_total?: number
          structure_snapshot?: Json
          updated_at?: string
          worked_days?: number
        }
        Update: {
          bonuses_total?: number
          created_at?: string
          cycle_id?: string
          deductions_total?: number
          employee_id?: string
          gross?: number
          id?: string
          leave_days?: number
          loss_of_pay_days?: number
          net_pay?: number
          notes?: string | null
          reimbursements_total?: number
          structure_snapshot?: Json
          updated_at?: string
          worked_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_cycles: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          end_date: string
          id: string
          name: string
          notes: string | null
          period_type: Database["public"]["Enums"]["perf_cycle_period"]
          start_date: string
          status: Database["public"]["Enums"]["perf_cycle_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          end_date: string
          id?: string
          name: string
          notes?: string | null
          period_type: Database["public"]["Enums"]["perf_cycle_period"]
          start_date: string
          status?: Database["public"]["Enums"]["perf_cycle_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          end_date?: string
          id?: string
          name?: string
          notes?: string | null
          period_type?: Database["public"]["Enums"]["perf_cycle_period"]
          start_date?: string
          status?: Database["public"]["Enums"]["perf_cycle_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_cycles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_goals: {
        Row: {
          assigned_by: string | null
          completed_at: string | null
          created_at: string
          cycle_id: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          employee_id: string
          id: string
          is_team_goal: boolean
          kpi_id: string | null
          priority: Database["public"]["Enums"]["perf_goal_priority"]
          progress: number
          status: Database["public"]["Enums"]["perf_goal_status"]
          title: string
          updated_at: string
          weightage: number
        }
        Insert: {
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string
          cycle_id?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          is_team_goal?: boolean
          kpi_id?: string | null
          priority?: Database["public"]["Enums"]["perf_goal_priority"]
          progress?: number
          status?: Database["public"]["Enums"]["perf_goal_status"]
          title: string
          updated_at?: string
          weightage?: number
        }
        Update: {
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string
          cycle_id?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          is_team_goal?: boolean
          kpi_id?: string | null
          priority?: Database["public"]["Enums"]["perf_goal_priority"]
          progress?: number
          status?: Database["public"]["Enums"]["perf_goal_status"]
          title?: string
          updated_at?: string
          weightage?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_goals_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_goals_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_goals_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "performance_kpis"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_kpis: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          target_value: number | null
          unit: string | null
          updated_at: string
          weightage: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          weightage?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          weightage?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_kpis_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_ratings: {
        Row: {
          category_ratings: Json
          comments: string | null
          created_at: string
          id: string
          improvement_suggestions: string | null
          overall_rating: number
          review_id: string
          reviewer_id: string | null
          reviewer_role: Database["public"]["Enums"]["perf_reviewer_role"]
          strengths: string | null
          submitted_at: string
          updated_at: string
          weaknesses: string | null
        }
        Insert: {
          category_ratings?: Json
          comments?: string | null
          created_at?: string
          id?: string
          improvement_suggestions?: string | null
          overall_rating: number
          review_id: string
          reviewer_id?: string | null
          reviewer_role: Database["public"]["Enums"]["perf_reviewer_role"]
          strengths?: string | null
          submitted_at?: string
          updated_at?: string
          weaknesses?: string | null
        }
        Update: {
          category_ratings?: Json
          comments?: string | null
          created_at?: string
          id?: string
          improvement_suggestions?: string | null
          overall_rating?: number
          review_id?: string
          reviewer_id?: string | null
          reviewer_role?: Database["public"]["Enums"]["perf_reviewer_role"]
          strengths?: string | null
          submitted_at?: string
          updated_at?: string
          weaknesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_ratings_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          created_at: string
          current_stage: Database["public"]["Enums"]["perf_review_stage"]
          cycle_id: string
          employee_id: string
          finalized: boolean
          finalized_at: string | null
          finalized_by: string | null
          id: string
          overall_rating: number | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stage?: Database["public"]["Enums"]["perf_review_stage"]
          cycle_id: string
          employee_id: string
          finalized?: boolean
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          overall_rating?: number | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stage?: Database["public"]["Enums"]["perf_review_stage"]
          cycle_id?: string
          employee_id?: string
          finalized?: boolean
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          overall_rating?: number | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_activity_events: {
        Row: {
          actor_employee_id: string | null
          actor_user_id: string | null
          created_at: string
          department: string | null
          id: string
          metadata: Json
          object_id: string | null
          object_type: string
          summary: string
          verb: string
          visibility: string
        }
        Insert: {
          actor_employee_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          department?: string | null
          id?: string
          metadata?: Json
          object_id?: string | null
          object_type: string
          summary: string
          verb: string
          visibility?: string
        }
        Update: {
          actor_employee_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          department?: string | null
          id?: string
          metadata?: Json
          object_id?: string | null
          object_type?: string
          summary?: string
          verb?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_activity_events_actor_employee_id_fkey"
            columns: ["actor_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_approval_decisions: {
        Row: {
          created_at: string
          decided_by: string
          decision: string
          id: string
          metadata: Json
          reason: string | null
          request_id: string
          step_id: string | null
        }
        Insert: {
          created_at?: string
          decided_by: string
          decision: string
          id?: string
          metadata?: Json
          reason?: string | null
          request_id: string
          step_id?: string | null
        }
        Update: {
          created_at?: string
          decided_by?: string
          decision?: string
          id?: string
          metadata?: Json
          reason?: string | null
          request_id?: string
          step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_approval_decisions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "platform_approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_approval_decisions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "platform_approval_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_approval_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: number
          description: string | null
          due_at: string | null
          entity_id: string
          entity_type: string
          id: string
          module: string
          payload: Json
          priority: string
          requested_by: string | null
          status: string
          title: string
          updated_at: string
          workflow_id: string | null
          workflow_run_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          description?: string | null
          due_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          module: string
          payload?: Json
          priority?: string
          requested_by?: string | null
          status?: string
          title: string
          updated_at?: string
          workflow_id?: string | null
          workflow_run_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          description?: string | null
          due_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          module?: string
          payload?: Json
          priority?: string
          requested_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          workflow_id?: string | null
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_approval_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "platform_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_approval_requests_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "platform_workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_approval_steps: {
        Row: {
          approver_department: string | null
          approver_role: string | null
          approver_user_id: string | null
          created_at: string
          id: string
          request_id: string
          required: boolean
          status: string
          step_index: number
          updated_at: string
        }
        Insert: {
          approver_department?: string | null
          approver_role?: string | null
          approver_user_id?: string | null
          created_at?: string
          id?: string
          request_id: string
          required?: boolean
          status?: string
          step_index: number
          updated_at?: string
        }
        Update: {
          approver_department?: string | null
          approver_role?: string | null
          approver_user_id?: string | null
          created_at?: string
          id?: string
          request_id?: string
          required?: boolean
          status?: string
          step_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_approval_steps_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "platform_approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_assignment_rules: {
        Row: {
          candidates: Json
          created_at: string
          filter: Json
          id: string
          is_active: boolean
          module: string
          name: string
          strategy: string
          updated_at: string
        }
        Insert: {
          candidates?: Json
          created_at?: string
          filter?: Json
          id?: string
          is_active?: boolean
          module: string
          name: string
          strategy?: string
          updated_at?: string
        }
        Update: {
          candidates?: Json
          created_at?: string
          filter?: Json
          id?: string
          is_active?: boolean
          module?: string
          name?: string
          strategy?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_assignments: {
        Row: {
          accepted_at: string | null
          assigned_by: string | null
          assignee_user_id: string | null
          completed_at: string | null
          created_at: string
          department: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          method: string
          module: string
          priority: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_by?: string | null
          assignee_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          department?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          method?: string
          module: string
          priority?: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_by?: string | null
          assignee_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          department?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          method?: string
          module?: string
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_dashboard_widgets: {
        Row: {
          config: Json
          created_at: string
          dashboard_id: string
          id: string
          position: number
          title: string | null
          updated_at: string
          widget_type: string
        }
        Insert: {
          config?: Json
          created_at?: string
          dashboard_id: string
          id?: string
          position?: number
          title?: string | null
          updated_at?: string
          widget_type: string
        }
        Update: {
          config?: Json
          created_at?: string
          dashboard_id?: string
          id?: string
          position?: number
          title?: string | null
          updated_at?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "platform_dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_dashboards: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          key: string
          layout: string
          name: string
          owner_department: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          layout?: string
          name: string
          owner_department?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          layout?: string
          name?: string
          owner_department?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_document_permissions: {
        Row: {
          created_at: string
          department: string | null
          document_id: string
          id: string
          permission_level: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          document_id: string
          id?: string
          permission_level?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          document_id?: string
          id?: string
          permission_level?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_document_permissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "platform_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_document_versions: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string
          id: string
          note: string | null
          size_bytes: number | null
          storage_path: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id: string
          id?: string
          note?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string
          id?: string
          note?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "platform_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_documents: {
        Row: {
          category: string | null
          created_at: string
          current_version: number
          deleted_at: string | null
          department: string | null
          id: string
          is_archived: boolean
          metadata: Json
          mime_type: string | null
          name: string
          owner_user_id: string
          size_bytes: number | null
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_version?: number
          deleted_at?: string | null
          department?: string | null
          id?: string
          is_archived?: boolean
          metadata?: Json
          mime_type?: string | null
          name: string
          owner_user_id: string
          size_bytes?: number | null
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          current_version?: number
          deleted_at?: string | null
          department?: string | null
          id?: string
          is_archived?: boolean
          metadata?: Json
          mime_type?: string | null
          name?: string
          owner_user_id?: string
          size_bytes?: number | null
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_notification_deliveries: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          id: string
          notification_id: string | null
          payload: Json
          recipient_user_id: string
          sent_at: string | null
          status: string
          template_key: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          notification_id?: string | null
          payload?: Json
          recipient_user_id: string
          sent_at?: string | null
          status?: string
          template_key?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          notification_id?: string | null
          payload?: Json
          recipient_user_id?: string
          sent_at?: string | null
          status?: string
          template_key?: string | null
        }
        Relationships: []
      }
      platform_notification_preferences: {
        Row: {
          email: boolean
          in_app: boolean
          quiet_hours_end: number | null
          quiet_hours_start: number | null
          security_alerts: boolean
          system_announcements: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email?: boolean
          in_app?: boolean
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          security_alerts?: boolean
          system_announcements?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email?: boolean
          in_app?: boolean
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          security_alerts?: boolean
          system_announcements?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_notification_templates: {
        Row: {
          body_template: string
          category: string
          created_at: string
          default_channels: string[]
          id: string
          key: string
          title_template: string
          updated_at: string
        }
        Insert: {
          body_template: string
          category?: string
          created_at?: string
          default_channels?: string[]
          id?: string
          key: string
          title_template: string
          updated_at?: string
        }
        Update: {
          body_template?: string
          category?: string
          created_at?: string
          default_channels?: string[]
          id?: string
          key?: string
          title_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_report_definitions: {
        Row: {
          category: string
          columns: Json
          created_at: string
          created_by: string | null
          default_schedule: string | null
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          parameters: Json
          source: string
          updated_at: string
        }
        Insert: {
          category?: string
          columns?: Json
          created_at?: string
          created_by?: string | null
          default_schedule?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          parameters?: Json
          source: string
          updated_at?: string
        }
        Update: {
          category?: string
          columns?: Json
          created_at?: string
          created_by?: string | null
          default_schedule?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          parameters?: Json
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_report_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          definition_id: string
          error: string | null
          id: string
          output_url: string | null
          parameters: Json
          requested_by: string | null
          row_count: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          definition_id: string
          error?: string | null
          id?: string
          output_url?: string | null
          parameters?: Json
          requested_by?: string | null
          row_count?: number | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          definition_id?: string
          error?: string | null
          id?: string
          output_url?: string | null
          parameters?: Json
          requested_by?: string | null
          row_count?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_report_runs_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "platform_report_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_scheduled_job_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          job_id: string
          output: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_id: string
          output?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string
          output?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_scheduled_job_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "platform_scheduled_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_scheduled_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          cron: string
          id: string
          is_active: boolean
          job_type: string
          key: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cron: string
          id?: string
          is_active?: boolean
          job_type: string
          key: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          payload?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cron?: string
          id?: string
          is_active?: boolean
          job_type?: string
          key?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      platform_search_index: {
        Row: {
          body: string | null
          department: string | null
          document: unknown
          id: string
          metadata: Json
          object_id: string
          object_type: string
          permission_key: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          department?: string | null
          document?: unknown
          id?: string
          metadata?: Json
          object_id: string
          object_type: string
          permission_key?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          department?: string | null
          document?: unknown
          id?: string
          metadata?: Json
          object_id?: string
          object_type?: string
          permission_key?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_workflow_runs: {
        Row: {
          completed_at: string | null
          context: Json
          created_at: string
          current_step: number
          entity_id: string | null
          entity_type: string | null
          id: string
          started_by: string | null
          status: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          context?: Json
          created_at?: string
          current_step?: number
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          started_by?: string | null
          status?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          context?: Json
          created_at?: string
          current_step?: number
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          started_by?: string | null
          status?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "platform_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_workflows: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          owner_department: string | null
          steps: Json
          trigger: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          owner_department?: string | null
          steps?: Json
          trigger?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          owner_department?: string | null
          steps?: Json
          trigger?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      post_collaborators: {
        Row: {
          invited_at: string
          post_id: string
          responded_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          invited_at?: string
          post_id: string
          responded_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          invited_at?: string
          post_id?: string
          responded_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_collaborators_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_embeddings: {
        Row: {
          content_hash: string
          embedding: string
          post_id: string
          updated_at: string
        }
        Insert: {
          content_hash: string
          embedding: string
          post_id: string
          updated_at?: string
        }
        Update: {
          content_hash?: string
          embedding?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_embeddings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_unlocks: {
        Row: {
          amount_cents: number
          created_at: string
          creator_id: string
          currency: string
          environment: string
          id: string
          net_cents: number
          paid_at: string | null
          platform_fee_cents: number
          post_id: string
          status: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          creator_id: string
          currency?: string
          environment?: string
          id?: string
          net_cents?: number
          paid_at?: string | null
          platform_fee_cents?: number
          post_id: string
          status?: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          creator_id?: string
          currency?: string
          environment?: string
          id?: string
          net_cents?: number
          paid_at?: string | null
          platform_fee_cents?: number
          post_id?: string
          status?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_unlocks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          created_at: string
          id: string
          post_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          viewer_id?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          authenticity_breakdown: Json | null
          authenticity_checked_at: string | null
          authenticity_score: number | null
          comment_count: number
          content: string
          created_at: string
          has_certificate: boolean
          id: string
          is_paid: boolean
          is_pinned: boolean
          is_reel: boolean
          like_count: number
          media_type: string | null
          media_url: string | null
          organization_id: string | null
          pinned_at: string | null
          price_cents: number
          scheduled_for: string | null
          status: Database["public"]["Enums"]["post_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          authenticity_breakdown?: Json | null
          authenticity_checked_at?: string | null
          authenticity_score?: number | null
          comment_count?: number
          content?: string
          created_at?: string
          has_certificate?: boolean
          id?: string
          is_paid?: boolean
          is_pinned?: boolean
          is_reel?: boolean
          like_count?: number
          media_type?: string | null
          media_url?: string | null
          organization_id?: string | null
          pinned_at?: string | null
          price_cents?: number
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          authenticity_breakdown?: Json | null
          authenticity_checked_at?: string | null
          authenticity_score?: number | null
          comment_count?: number
          content?: string
          created_at?: string
          has_certificate?: boolean
          id?: string
          is_paid?: boolean
          is_pinned?: boolean
          is_reel?: boolean
          like_count?: number
          media_type?: string | null
          media_url?: string | null
          organization_id?: string | null
          pinned_at?: string | null
          price_cents?: number
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          ai_dm_suggestions_enabled: boolean
          aura_rank: string | null
          avatar_url: string | null
          bio: string | null
          chronicle: string | null
          contribution_score: number
          council_role: Database["public"]["Enums"]["council_role"] | null
          council_vote_weight: number
          cover_url: string | null
          created_at: string
          creator_since: string | null
          creator_terms_version: string | null
          display_name: string
          followers_count: number
          following_count: number
          founder_level: number
          founder_title: string | null
          id: string
          interests: string[]
          is_creator: boolean
          is_founder: boolean
          is_private: boolean
          join_era: string | null
          last_seen_at: string | null
          onboarded_at: string | null
          organization_id: string | null
          posts_count: number
          show_activity: boolean
          show_read_receipts: boolean
          signature_aura: string | null
          tier: string
          updated_at: string
          user_id: string
          username: string
          verification_kind: string | null
          verified: boolean
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          ai_dm_suggestions_enabled?: boolean
          aura_rank?: string | null
          avatar_url?: string | null
          bio?: string | null
          chronicle?: string | null
          contribution_score?: number
          council_role?: Database["public"]["Enums"]["council_role"] | null
          council_vote_weight?: number
          cover_url?: string | null
          created_at?: string
          creator_since?: string | null
          creator_terms_version?: string | null
          display_name?: string
          followers_count?: number
          following_count?: number
          founder_level?: number
          founder_title?: string | null
          id?: string
          interests?: string[]
          is_creator?: boolean
          is_founder?: boolean
          is_private?: boolean
          join_era?: string | null
          last_seen_at?: string | null
          onboarded_at?: string | null
          organization_id?: string | null
          posts_count?: number
          show_activity?: boolean
          show_read_receipts?: boolean
          signature_aura?: string | null
          tier?: string
          updated_at?: string
          user_id: string
          username: string
          verification_kind?: string | null
          verified?: boolean
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          ai_dm_suggestions_enabled?: boolean
          aura_rank?: string | null
          avatar_url?: string | null
          bio?: string | null
          chronicle?: string | null
          contribution_score?: number
          council_role?: Database["public"]["Enums"]["council_role"] | null
          council_vote_weight?: number
          cover_url?: string | null
          created_at?: string
          creator_since?: string | null
          creator_terms_version?: string | null
          display_name?: string
          followers_count?: number
          following_count?: number
          founder_level?: number
          founder_title?: string | null
          id?: string
          interests?: string[]
          is_creator?: boolean
          is_founder?: boolean
          is_private?: boolean
          join_era?: string | null
          last_seen_at?: string | null
          onboarded_at?: string | null
          organization_id?: string | null
          posts_count?: number
          show_activity?: boolean
          show_read_receipts?: boolean
          signature_aura?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
          username?: string
          verification_kind?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      profiles_private: {
        Row: {
          coin_balance: number
          creator_terms_accepted_at: string | null
          deletion_scheduled_at: string | null
          dm_price_cents: number
          dob: string | null
          gender: string | null
          payment_qr_url: string | null
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          coin_balance?: number
          creator_terms_accepted_at?: string | null
          deletion_scheduled_at?: string | null
          dm_price_cents?: number
          dob?: string | null
          gender?: string | null
          payment_qr_url?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          coin_balance?: number
          creator_terms_accepted_at?: string | null
          deletion_scheduled_at?: string | null
          dm_price_cents?: number
          dob?: string | null
          gender?: string | null
          payment_qr_url?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      promotion_readiness_snapshots: {
        Row: {
          audit_score: number
          computed_at: string
          computed_by: string | null
          created_at: string
          department_recommendation: boolean
          employee_id: string
          id: string
          notes: string | null
          overall_score: number
          performance_score: number
          readiness_level: Database["public"]["Enums"]["promotion_readiness_level"]
          skills_score: number
          training_score: number
          updated_at: string
        }
        Insert: {
          audit_score?: number
          computed_at?: string
          computed_by?: string | null
          created_at?: string
          department_recommendation?: boolean
          employee_id: string
          id?: string
          notes?: string | null
          overall_score?: number
          performance_score?: number
          readiness_level?: Database["public"]["Enums"]["promotion_readiness_level"]
          skills_score?: number
          training_score?: number
          updated_at?: string
        }
        Update: {
          audit_score?: number
          computed_at?: string
          computed_by?: string | null
          created_at?: string
          department_recommendation?: boolean
          employee_id?: string
          id?: string
          notes?: string | null
          overall_score?: number
          performance_score?: number
          readiness_level?: Database["public"]["Enums"]["promotion_readiness_level"]
          skills_score?: number
          training_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_readiness_snapshots_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      recognitions: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          created_at: string
          cycle_id: string | null
          description: string | null
          employee_id: string
          id: string
          title: string
          type: Database["public"]["Enums"]["recognition_type"]
          updated_at: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          employee_id: string
          id?: string
          title: string
          type?: Database["public"]["Enums"]["recognition_type"]
          updated_at?: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["recognition_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognitions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognitions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      reimbursements: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          description: string
          employee_id: string
          expense_date: string
          finance_reviewed_at: string | null
          finance_reviewer: string | null
          id: string
          manager_reviewed_at: string | null
          manager_reviewer: string | null
          paid_at: string | null
          paid_cycle_id: string | null
          receipt_url: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["reimbursement_status"]
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          currency?: string
          description: string
          employee_id: string
          expense_date?: string
          finance_reviewed_at?: string | null
          finance_reviewer?: string | null
          id?: string
          manager_reviewed_at?: string | null
          manager_reviewer?: string | null
          paid_at?: string | null
          paid_cycle_id?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["reimbursement_status"]
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          description?: string
          employee_id?: string
          expense_date?: string
          finance_reviewed_at?: string | null
          finance_reviewer?: string | null
          id?: string
          manager_reviewed_at?: string | null
          manager_reviewer?: string | null
          paid_at?: string | null
          paid_cycle_id?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["reimbursement_status"]
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reimbursements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimbursements_paid_cycle_id_fkey"
            columns: ["paid_cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_kind: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_kind: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_kind?: string
        }
        Relationships: []
      }
      salary_revisions: {
        Row: {
          created_at: string
          effective_date: string
          employee_id: string
          finance_reviewed_at: string | null
          finance_reviewer: string | null
          founder_reviewed_at: string | null
          founder_reviewer: string | null
          from_structure_id: string | null
          hr_reviewed_at: string | null
          hr_reviewer: string | null
          id: string
          proposed_gross: number | null
          reason: string
          rejection_reason: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["salary_revision_status"]
          to_structure_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_date: string
          employee_id: string
          finance_reviewed_at?: string | null
          finance_reviewer?: string | null
          founder_reviewed_at?: string | null
          founder_reviewer?: string | null
          from_structure_id?: string | null
          hr_reviewed_at?: string | null
          hr_reviewer?: string | null
          id?: string
          proposed_gross?: number | null
          reason: string
          rejection_reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["salary_revision_status"]
          to_structure_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_date?: string
          employee_id?: string
          finance_reviewed_at?: string | null
          finance_reviewer?: string | null
          founder_reviewed_at?: string | null
          founder_reviewer?: string | null
          from_structure_id?: string | null
          hr_reviewed_at?: string | null
          hr_reviewer?: string | null
          id?: string
          proposed_gross?: number | null
          reason?: string
          rejection_reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["salary_revision_status"]
          to_structure_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_revisions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_revisions_from_structure_id_fkey"
            columns: ["from_structure_id"]
            isOneToOne: false
            referencedRelation: "salary_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_revisions_to_structure_id_fkey"
            columns: ["to_structure_id"]
            isOneToOne: false
            referencedRelation: "salary_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_structures: {
        Row: {
          basic: number
          benefits: Json
          created_at: string
          created_by: string | null
          currency: string
          deductions: Json
          effective_from: string
          effective_to: string | null
          employee_id: string
          gross_monthly: number
          house_allowance: number
          id: string
          medical_allowance: number
          notes: string | null
          other_allowances: Json
          plan_id: string | null
          special_allowance: number
          status: Database["public"]["Enums"]["salary_structure_status"]
          transport_allowance: number
          updated_at: string
        }
        Insert: {
          basic?: number
          benefits?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          deductions?: Json
          effective_from: string
          effective_to?: string | null
          employee_id: string
          gross_monthly?: number
          house_allowance?: number
          id?: string
          medical_allowance?: number
          notes?: string | null
          other_allowances?: Json
          plan_id?: string | null
          special_allowance?: number
          status?: Database["public"]["Enums"]["salary_structure_status"]
          transport_allowance?: number
          updated_at?: string
        }
        Update: {
          basic?: number
          benefits?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          deductions?: Json
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          gross_monthly?: number
          house_allowance?: number
          id?: string
          medical_allowance?: number
          notes?: string | null
          other_allowances?: Json
          plan_id?: string | null
          special_allowance?: number
          status?: Database["public"]["Enums"]["salary_structure_status"]
          transport_allowance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_structures_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_structures_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "compensation_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          created_by: string | null
          days_of_week: number[]
          department_id: string | null
          description: string | null
          end_time: string
          id: string
          is_default: boolean
          kind: Database["public"]["Enums"]["shift_kind"]
          name: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_of_week?: number[]
          department_id?: string | null
          description?: string | null
          end_time?: string
          id?: string
          is_default?: boolean
          kind?: Database["public"]["Enums"]["shift_kind"]
          name: string
          start_time?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_of_week?: number[]
          department_id?: string | null
          description?: string | null
          end_time?: string
          id?: string
          is_default?: boolean
          kind?: Database["public"]["Enums"]["shift_kind"]
          name?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_verifications: {
        Row: {
          assessor_id: string | null
          created_at: string
          decided_at: string | null
          dept_head_id: string | null
          employee_id: string
          evidence: string | null
          id: string
          notes: string | null
          requested_level: string
          skill_id: string
          status: Database["public"]["Enums"]["skill_verify_status"]
          updated_at: string
        }
        Insert: {
          assessor_id?: string | null
          created_at?: string
          decided_at?: string | null
          dept_head_id?: string | null
          employee_id: string
          evidence?: string | null
          id?: string
          notes?: string | null
          requested_level?: string
          skill_id: string
          status?: Database["public"]["Enums"]["skill_verify_status"]
          updated_at?: string
        }
        Update: {
          assessor_id?: string | null
          created_at?: string
          decided_at?: string | null
          dept_head_id?: string | null
          employee_id?: string
          evidence?: string | null
          id?: string
          notes?: string | null
          requested_level?: string
          skill_id?: string
          status?: Database["public"]["Enums"]["skill_verify_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_verifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_verifications_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_catalog: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_catalog_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          audience: Database["public"]["Enums"]["story_audience"]
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          organization_id: string | null
          user_id: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["story_audience"]
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          organization_id?: string | null
          user_id: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["story_audience"]
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      story_highlights: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      story_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: []
      }
      story_sticker_responses: {
        Row: {
          created_at: string
          id: string
          response: Json
          sticker_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          response: Json
          sticker_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          response?: Json
          sticker_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_sticker_responses_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "story_stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      story_stickers: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          position: Json
          story_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          position?: Json
          story_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          position?: Json
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_stickers_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_decision_attachments: {
        Row: {
          created_at: string
          decision_id: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          decision_id: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          decision_id?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategic_decision_attachments_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "strategic_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_decision_dependencies: {
        Row: {
          created_at: string
          created_by: string | null
          decision_id: string
          id: string
          kind: string
          related_approval_request_id: string | null
          related_decision_id: string | null
          related_policy_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decision_id: string
          id?: string
          kind?: string
          related_approval_request_id?: string | null
          related_decision_id?: string | null
          related_policy_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decision_id?: string
          id?: string
          kind?: string
          related_approval_request_id?: string | null
          related_decision_id?: string | null
          related_policy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategic_decision_dependencie_related_approval_request_id_fkey"
            columns: ["related_approval_request_id"]
            isOneToOne: false
            referencedRelation: "platform_approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategic_decision_dependencies_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "strategic_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategic_decision_dependencies_related_decision_id_fkey"
            columns: ["related_decision_id"]
            isOneToOne: false
            referencedRelation: "strategic_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategic_decision_dependencies_related_policy_id_fkey"
            columns: ["related_policy_id"]
            isOneToOne: false
            referencedRelation: "governance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_decision_impact: {
        Row: {
          decision_id: string
          id: string
          kind: string
          metrics: Json
          recorded_at: string
          recorded_by: string | null
          summary: string
        }
        Insert: {
          decision_id: string
          id?: string
          kind: string
          metrics?: Json
          recorded_at?: string
          recorded_by?: string | null
          summary: string
        }
        Update: {
          decision_id?: string
          id?: string
          kind?: string
          metrics?: Json
          recorded_at?: string
          recorded_by?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategic_decision_impact_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "strategic_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_decision_participants: {
        Row: {
          added_by: string | null
          created_at: string
          decision_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          decision_id: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          decision_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategic_decision_participants_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "strategic_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_decision_timeline: {
        Row: {
          actor_id: string | null
          created_at: string
          decision_id: string
          event_type: string
          id: string
          metadata: Json
          note: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          decision_id: string
          event_type: string
          id?: string
          metadata?: Json
          note?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          decision_id?: string
          event_type?: string
          id?: string
          metadata?: Json
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategic_decision_timeline_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "strategic_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_decision_versions: {
        Row: {
          changelog: string | null
          created_at: string
          created_by: string | null
          decision_id: string
          id: string
          snapshot: Json
          version: number
        }
        Insert: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          decision_id: string
          id?: string
          snapshot: Json
          version: number
        }
        Update: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          decision_id?: string
          id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategic_decision_versions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "strategic_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_decisions: {
        Row: {
          affected_departments: string[]
          alternatives_considered: string | null
          business_problem: string | null
          category: string
          completed_date: string | null
          created_at: string
          created_by: string | null
          current_version: number
          decision_code: string
          effective_date: string | null
          expected_benefits: string | null
          id: string
          objectives: string | null
          owner_id: string | null
          priority: string
          review_date: string | null
          risk_assessment: string | null
          status: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          affected_departments?: string[]
          alternatives_considered?: string | null
          business_problem?: string | null
          category: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number
          decision_code: string
          effective_date?: string | null
          expected_benefits?: string | null
          id?: string
          objectives?: string | null
          owner_id?: string | null
          priority?: string
          review_date?: string | null
          risk_assessment?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          affected_departments?: string[]
          alternatives_considered?: string | null
          business_problem?: string | null
          category?: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number
          decision_code?: string
          effective_date?: string | null
          expected_benefits?: string | null
          id?: string
          objectives?: string | null
          owner_id?: string | null
          priority?: string
          review_date?: string | null
          risk_assessment?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      succession_plans: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          incumbent_employee_id: string
          notes: string | null
          primary_successor_id: string | null
          readiness_level: Database["public"]["Enums"]["succession_readiness"]
          scope: Database["public"]["Enums"]["succession_scope"]
          secondary_successor_id: string | null
          training_progress: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          incumbent_employee_id: string
          notes?: string | null
          primary_successor_id?: string | null
          readiness_level?: Database["public"]["Enums"]["succession_readiness"]
          scope: Database["public"]["Enums"]["succession_scope"]
          secondary_successor_id?: string | null
          training_progress?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          incumbent_employee_id?: string
          notes?: string | null
          primary_successor_id?: string | null
          readiness_level?: Database["public"]["Enums"]["succession_readiness"]
          scope?: Database["public"]["Enums"]["succession_scope"]
          secondary_successor_id?: string | null
          training_progress?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "succession_plans_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_plans_incumbent_employee_id_fkey"
            columns: ["incumbent_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_plans_primary_successor_id_fkey"
            columns: ["primary_successor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_plans_secondary_successor_id_fkey"
            columns: ["secondary_successor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      temporary_assignments: {
        Row: {
          acting_role: string | null
          approver_user_id: string | null
          assignment_kind: string
          created_at: string
          employee_id: string
          end_date: string
          expired: boolean
          id: string
          movement_id: string | null
          reason: string | null
          start_date: string
          target_department_id: string | null
          target_project: string | null
        }
        Insert: {
          acting_role?: string | null
          approver_user_id?: string | null
          assignment_kind: string
          created_at?: string
          employee_id: string
          end_date: string
          expired?: boolean
          id?: string
          movement_id?: string | null
          reason?: string | null
          start_date: string
          target_department_id?: string | null
          target_project?: string | null
        }
        Update: {
          acting_role?: string | null
          approver_user_id?: string | null
          assignment_kind?: string
          created_at?: string
          employee_id?: string
          end_date?: string
          expired?: boolean
          id?: string
          movement_id?: string | null
          reason?: string | null
          start_date?: string
          target_department_id?: string | null
          target_project?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temporary_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporary_assignments_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "employee_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporary_assignments_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          dispute_reason: string | null
          environment: string
          id: string
          message: string | null
          net_cents: number
          paid_at: string | null
          platform_fee_cents: number
          post_id: string | null
          recipient_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_id: string
          status: string
          stripe_session_id: string | null
          submitted_at: string | null
          utr: string | null
          verified_at: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          dispute_reason?: string | null
          environment?: string
          id?: string
          message?: string | null
          net_cents?: number
          paid_at?: string | null
          platform_fee_cents?: number
          post_id?: string | null
          recipient_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_id: string
          status?: string
          stripe_session_id?: string | null
          submitted_at?: string | null
          utr?: string | null
          verified_at?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          dispute_reason?: string | null
          environment?: string
          id?: string
          message?: string | null
          net_cents?: number
          paid_at?: string | null
          platform_fee_cents?: number
          post_id?: string | null
          recipient_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_id?: string
          status?: string
          stripe_session_id?: string | null
          submitted_at?: string | null
          utr?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tips_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tips_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_interest_vectors: {
        Row: {
          embedding: string
          updated_at: string
          user_id: string
        }
        Insert: {
          embedding: string
          updated_at?: string
          user_id: string
        }
        Update: {
          embedding?: string
          updated_at?: string
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
      verification_requests: {
        Row: {
          approved: boolean
          category: string
          country: string | null
          created_at: string
          dob: string | null
          full_name: string
          id: string
          id_doc_url: string | null
          links: string[] | null
          official_email: string | null
          organization: string | null
          reason: string | null
          reviewed_at: string | null
          status: string
          supporting_doc_url: string | null
          user_id: string
        }
        Insert: {
          approved?: boolean
          category: string
          country?: string | null
          created_at?: string
          dob?: string | null
          full_name: string
          id?: string
          id_doc_url?: string | null
          links?: string[] | null
          official_email?: string | null
          organization?: string | null
          reason?: string | null
          reviewed_at?: string | null
          status?: string
          supporting_doc_url?: string | null
          user_id: string
        }
        Update: {
          approved?: boolean
          category?: string
          country?: string | null
          created_at?: string
          dob?: string | null
          full_name?: string
          id?: string
          id_doc_url?: string | null
          links?: string[] | null
          official_email?: string | null
          organization?: string | null
          reason?: string | null
          reviewed_at?: string | null
          status?: string
          supporting_doc_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      welcome_email_history: {
        Row: {
          body: string
          employee_id: string
          id: string
          sent_at: string
          sent_by: string | null
          sent_to: string
          session_id: string | null
          subject: string
        }
        Insert: {
          body: string
          employee_id: string
          id?: string
          sent_at?: string
          sent_by?: string | null
          sent_to: string
          session_id?: string | null
          subject: string
        }
        Update: {
          body?: string
          employee_id?: string
          id?: string
          sent_at?: string
          sent_by?: string | null
          sent_to?: string
          session_id?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "welcome_email_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welcome_email_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "onboarding_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workforce_forecasts: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          planned_headcount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          planned_headcount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          planned_headcount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workforce_forecasts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      executive_approval_timeline: {
        Row: {
          actor_id: string | null
          event_at: string | null
          event_kind: string | null
          metadata: Json | null
          request_id: string | null
          summary: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _org_is_system_role_name: { Args: { _name: string }; Returns: boolean }
      _org_slug_is_reserved: { Args: { _slug: string }; Returns: boolean }
      add_group_member: {
        Args: { _conv: string; _user: string }
        Returns: undefined
      }
      admin_approve_kyc: { Args: { _kyc_id: string }; Returns: undefined }
      admin_approve_payout: {
        Args: { _note?: string; _payout_id: string }
        Returns: undefined
      }
      admin_approve_tip: { Args: { _tip_id: string }; Returns: undefined }
      admin_reject_kyc: {
        Args: { _kyc_id: string; _reason: string }
        Returns: undefined
      }
      admin_reject_payout: {
        Args: { _payout_id: string; _reason: string }
        Returns: undefined
      }
      admin_reject_tip: {
        Args: { _reason: string; _tip_id: string }
        Returns: undefined
      }
      admin_revoke_tip: {
        Args: { _reason: string; _tip_id: string }
        Returns: undefined
      }
      apply_movement: { Args: { _movement_id: string }; Returns: undefined }
      assign_owner_role: {
        Args: { p_member_id: string; p_organization_id: string }
        Returns: undefined
      }
      become_creator: { Args: { _terms_version: string }; Returns: undefined }
      can_manage_passports: { Args: { _uid: string }; Returns: boolean }
      create_group: {
        Args: { _member_ids: string[]; _title: string }
        Returns: string
      }
      create_organization: {
        Args: {
          p_cover_url?: string
          p_description?: string
          p_logo_url?: string
          p_name: string
          p_org_type: Database["public"]["Enums"]["org_type"]
          p_owner_user_id: string
          p_username: string
        }
        Returns: string
      }
      create_organization_workspace: {
        Args: {
          p_cover_url?: string
          p_description?: string
          p_logo_url?: string
          p_name: string
          p_org_type: Database["public"]["Enums"]["org_type"]
          p_username: string
        }
        Returns: string
      }
      create_tip: {
        Args: {
          _amount_cents: number
          _message: string
          _post_id: string
          _recipient_id: string
        }
        Returns: string
      }
      credit_coins: {
        Args: {
          _amount: number
          _environment: string
          _price_id: string
          _session_id: string
          _user_id: string
        }
        Returns: undefined
      }
      credit_creator: {
        Args: {
          _currency?: string
          _environment: string
          _net_cents: number
          _user_id: string
        }
        Returns: undefined
      }
      current_employee_id: { Args: never; Returns: string }
      expire_temporary_assignments: { Args: never; Returns: number }
      generate_employee_number: { Args: never; Returns: string }
      generate_unique_org_slug: {
        Args: { _name: string; _self?: string }
        Returns: string
      }
      get_certificate_by_hash: {
        Args: { _hash: string }
        Returns: {
          bitcoin_block_height: number
          content_hash: string
          created_at: string
          creator_id: string
          creator_username: string
          id: string
          media_type: string
          media_url: string
          ots_confirmed_at: string
          ots_status: string
          post_id: string
        }[]
      }
      get_current_employee_id: { Args: never; Returns: string }
      get_current_employment_status: {
        Args: never
        Returns: Database["public"]["Enums"]["employment_status"]
      }
      get_organization_invite_by_token: {
        Args: { _token: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          inviter_avatar_url: string
          inviter_display_name: string
          inviter_user_id: string
          inviter_username: string
          organization_description: string
          organization_id: string
          organization_logo_url: string
          organization_member_count: number
          organization_name: string
          organization_slug: string
          organization_verified: boolean
          role_id: string
          role_name: string
          status: string
          username: string
        }[]
      }
      get_platform_pay_config: {
        Args: never
        Returns: {
          payee_name: string
          qr_url: string
          upi_id: string
        }[]
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_admin_permission: {
        Args: { _permission_key: string; _uid: string }
        Returns: boolean
      }
      has_approved_kyc: { Args: { _user_id: string }; Returns: boolean }
      has_org_permission: {
        Args: {
          _organization_id: string
          _permission_key: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_credential: { Args: { _plain: string }; Returns: string }
      initialize_default_departments: {
        Args: { p_organization_id: string; p_owner_user_id: string }
        Returns: undefined
      }
      initialize_default_role_permissions: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      initialize_default_roles: {
        Args: { p_organization_id: string; p_owner_user_id: string }
        Returns: undefined
      }
      initialize_owner_member: {
        Args: { p_organization_id: string; p_owner_user_id: string }
        Returns: string
      }
      is_active_employee: { Args: { _uid?: string }; Returns: boolean }
      is_admin_department_member: {
        Args: { _department_key: string; _uid: string }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      is_creator: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: { Args: { _org: string; _user: string }; Returns: boolean }
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean }
      is_organization_admin: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      is_organization_member: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      is_organization_owner: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      leave_group: { Args: { _conv: string }; Returns: undefined }
      list_incoming_organization_invites: {
        Args: never
        Returns: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          inviter_avatar_url: string
          inviter_display_name: string
          inviter_username: string
          organization_id: string
          organization_logo_url: string
          organization_name: string
          organization_slug: string
          role_id: string
          role_name: string
          status: string
          username: string
        }[]
      }
      mark_conversation_read: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      match_posts_for_user: {
        Args: { _match_count?: number; _user_id: string }
        Returns: {
          post_id: string
          similarity: number
        }[]
      }
      org_accept_invite: { Args: { _invite_token: string }; Returns: string }
      org_assign_member_department: {
        Args: { _department_id: string; _member_id: string }
        Returns: undefined
      }
      org_cancel_invite: { Args: { _invite_id: string }; Returns: undefined }
      org_change_member_role: {
        Args: { _member_id: string; _organization_id: string; _role_id: string }
        Returns: undefined
      }
      org_create_department: {
        Args: {
          _color?: string
          _description?: string
          _icon?: string
          _name: string
          _organization_id: string
          _parent_department_id?: string
        }
        Returns: string
      }
      org_create_role: {
        Args: {
          _color?: string
          _description?: string
          _name: string
          _organization_id: string
          _priority?: number
        }
        Returns: string
      }
      org_decline_invite: {
        Args: { _invite_token: string }
        Returns: undefined
      }
      org_delete_department: {
        Args: { _department_id: string }
        Returns: undefined
      }
      org_delete_role: { Args: { _role_id: string }; Returns: undefined }
      org_department_member_counts: {
        Args: { _organization_id: string }
        Returns: {
          department_id: string
          member_count: number
        }[]
      }
      org_invite_member: {
        Args: {
          _email?: string
          _organization_id: string
          _role_id?: string
          _username?: string
        }
        Returns: string
      }
      org_remove_member: {
        Args: { _member_id: string; _organization_id: string }
        Returns: undefined
      }
      org_remove_member_department: {
        Args: { _member_id: string }
        Returns: undefined
      }
      org_set_role_permissions: {
        Args: { _permission_keys: string[]; _role_id: string }
        Returns: undefined
      }
      org_transfer_ownership: {
        Args: { _new_owner_user_id: string; _organization_id: string }
        Returns: undefined
      }
      org_update_department: {
        Args: { _department_id: string; _patch: Json }
        Returns: undefined
      }
      org_update_role: {
        Args: {
          _color?: string
          _description?: string
          _name?: string
          _priority?: number
          _role_id: string
        }
        Returns: undefined
      }
      org_update_settings: {
        Args: { _organization_id: string; _patch: Json }
        Returns: undefined
      }
      passport_log_event: {
        Args: {
          _description?: string
          _employee_id: string
          _event: Database["public"]["Enums"]["passport_event_type"]
          _payload?: Json
          _title: string
        }
        Returns: string
      }
      platform_search: {
        Args: { _limit?: number; _q: string }
        Returns: {
          body: string
          department: string
          object_id: string
          object_type: string
          rank: number
          title: string
        }[]
      }
      remove_group_member: {
        Args: { _conv: string; _user: string }
        Returns: undefined
      }
      request_payout: {
        Args: {
          _amount_cents: number
          _environment: string
          _method: string
          _payout_detail: Json
        }
        Returns: string
      }
      resolve_organization_by_slug: {
        Args: { _slug: string }
        Returns: {
          cover_url: string
          id: string
          is_member: boolean
          is_owner: boolean
          logo_url: string
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          slug: string
          username: string
        }[]
      }
      slugify_org_name: { Args: { _name: string }; Returns: string }
      start_dm: { Args: { other_user_id: string }; Returns: string }
      toggle_post_pin: {
        Args: { _pin: boolean; _post_id: string }
        Returns: undefined
      }
      upsert_profile_private: {
        Args: { _dob: string; _gender: string }
        Returns: undefined
      }
      verify_tip_with_utr: {
        Args: { _tip_id: string; _utr: string }
        Returns: Json
      }
      write_org_audit_log: {
        Args: {
          _action: string
          _entity_id?: string
          _entity_type?: string
          _new_data?: Json
          _old_data?: Json
          _organization_id: string
        }
        Returns: string
      }
    }
    Enums: {
      account_type: "personal" | "organization"
      admin_user_type:
        | "founder"
        | "co_founder"
        | "employee"
        | "contractor"
        | "temporary"
      app_role: "admin" | "moderator" | "user"
      application_status:
        | "active"
        | "on_hold"
        | "rejected"
        | "withdrawn"
        | "offer_extended"
        | "hired"
      approval_decision: "pending" | "approved" | "rejected" | "skipped"
      attendance_source: "self" | "manager" | "system" | "import" | "correction"
      attendance_status:
        | "present"
        | "absent"
        | "late"
        | "half_day"
        | "wfh"
        | "business_travel"
        | "training"
        | "holiday"
        | "weekend"
        | "leave"
      bonus_status: "draft" | "approved" | "paid" | "rejected"
      bonus_type:
        | "performance"
        | "festival"
        | "joining"
        | "retention"
        | "referral"
        | "spot_award"
        | "custom"
      candidate_event_type:
        | "application"
        | "stage_change"
        | "interview_scheduled"
        | "interview_completed"
        | "feedback_submitted"
        | "offer_generated"
        | "offer_sent"
        | "offer_accepted"
        | "offer_rejected"
        | "offer_withdrawn"
        | "communication"
        | "status_change"
        | "hired"
        | "rejected"
      candidate_stage:
        | "applied"
        | "screening"
        | "hr_interview"
        | "technical_interview"
        | "manager_interview"
        | "founder_interview"
        | "final_review"
        | "offer"
        | "hired"
        | "rejected"
        | "withdrawn"
      candidate_status:
        | "active"
        | "on_hold"
        | "rejected"
        | "withdrawn"
        | "hired"
      cert_category:
        | "technical"
        | "leadership"
        | "compliance"
        | "security"
        | "department"
        | "process"
      cert_status: "active" | "expired" | "revoked"
      checklist_owner: "hr" | "employee"
      compensation_type:
        | "monthly_salary"
        | "hourly"
        | "intern_stipend"
        | "contract"
        | "project_based"
      correction_status: "pending" | "approved" | "rejected"
      council_role: "architect" | "curator" | "sentinel" | "innovator"
      course_category:
        | "department"
        | "policy"
        | "technical"
        | "leadership"
        | "security"
        | "compliance"
        | "ai"
        | "onboarding"
      course_difficulty: "beginner" | "intermediate" | "advanced" | "expert"
      course_status: "draft" | "published" | "archived"
      employment_status:
        | "candidate"
        | "offer_sent"
        | "offer_accepted"
        | "pre_onboarding"
        | "joining_today"
        | "active"
        | "on_leave"
        | "suspended"
        | "resigned"
        | "exited"
        | "archived"
      enrollment_status:
        | "assigned"
        | "in_progress"
        | "completed"
        | "overdue"
        | "cancelled"
      hiring_priority: "low" | "medium" | "high" | "critical"
      hiring_request_status:
        | "draft"
        | "pending_hr"
        | "pending_founder"
        | "approved"
        | "on_hold"
        | "rejected"
        | "closed"
        | "filled"
      holiday_kind: "national" | "company" | "department" | "regional"
      interview_decision: "pending" | "pass" | "hold" | "reject" | "reopen"
      interview_recommendation:
        | "strong_hire"
        | "hire"
        | "no_hire"
        | "strong_no_hire"
      interview_round_status:
        | "scheduled"
        | "completed"
        | "cancelled"
        | "no_show"
      leave_kind:
        | "annual"
        | "medical"
        | "emergency"
        | "unpaid"
        | "sabbatical"
        | "other"
      leave_request_status:
        | "draft"
        | "pending_lead"
        | "pending_dept_head"
        | "pending_hr"
        | "approved"
        | "rejected"
        | "cancelled"
      leave_type:
        | "annual"
        | "medical"
        | "emergency"
        | "maternity"
        | "paternity"
        | "bereavement"
        | "compensatory"
        | "unpaid"
      movement_kind:
        | "department_transfer"
        | "team_transfer"
        | "manager_change"
        | "promotion"
        | "demotion"
        | "temporary_assignment"
        | "cross_department_assignment"
        | "acting_assignment"
        | "leave"
        | "suspension"
        | "reinstatement"
        | "resignation"
        | "exit"
        | "rejoin"
        | "workload_transfer"
        | "knowledge_transfer"
      movement_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "applied"
        | "expired"
        | "cancelled"
      offer_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "sent"
        | "accepted"
        | "rejected"
        | "expired"
        | "withdrawn"
      onboarding_stage:
        | "draft"
        | "hr_review"
        | "background_check"
        | "account_provisioning"
        | "credentials_generated"
        | "welcome_sent"
        | "awaiting_first_login"
        | "completed"
        | "cancelled"
      open_position_priority: "low" | "medium" | "high" | "critical"
      open_position_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "filled"
        | "cancelled"
      org_member_role: "owner" | "admin" | "manager" | "viewer"
      org_type:
        | "startup"
        | "company"
        | "education"
        | "ngo"
        | "government"
        | "creator"
        | "community"
        | "other"
      passport_doc_type:
        | "offer_letter"
        | "appointment_letter"
        | "nda"
        | "government_document"
        | "educational_document"
        | "promotion_letter"
        | "warning"
        | "transfer_letter"
        | "exit_document"
        | "certificate"
        | "other"
      passport_event_type:
        | "joined"
        | "department_changed"
        | "manager_changed"
        | "team_changed"
        | "promotion"
        | "transfer"
        | "award"
        | "training_completed"
        | "skill_verified"
        | "certification_earned"
        | "warning_issued"
        | "suspension"
        | "leave"
        | "resignation"
        | "exit"
        | "archive"
        | "document_uploaded"
        | "project_added"
        | "note"
      passport_skill_status: "proposed" | "verified" | "revoked"
      payroll_cycle_status:
        | "draft"
        | "finance_review"
        | "hr_review"
        | "founder_review"
        | "approved"
        | "released"
        | "cancelled"
      perf_cycle_period: "monthly" | "quarterly" | "half_yearly" | "annual"
      perf_cycle_status: "draft" | "active" | "in_review" | "closed"
      perf_goal_priority: "low" | "medium" | "high" | "critical"
      perf_goal_status:
        | "not_started"
        | "in_progress"
        | "at_risk"
        | "completed"
        | "missed"
        | "cancelled"
      perf_review_stage:
        | "self"
        | "team_lead"
        | "department_head"
        | "hr"
        | "finalized"
      perf_reviewer_role: "self" | "team_lead" | "department_head" | "hr"
      pip_status:
        | "draft"
        | "active"
        | "on_track"
        | "off_track"
        | "completed"
        | "failed"
        | "cancelled"
      post_status: "draft" | "scheduled" | "published"
      promotion_readiness_level:
        | "not_ready"
        | "emerging"
        | "developing"
        | "ready_soon"
        | "ready_now"
      recognition_type:
        | "award"
        | "achievement"
        | "outstanding"
        | "innovation"
        | "leadership"
        | "special"
      reimbursement_status:
        | "pending_manager"
        | "pending_finance"
        | "approved"
        | "rejected"
        | "paid"
      roadmap_requirement_type: "course" | "skill" | "certification"
      salary_revision_status:
        | "pending_hr"
        | "pending_finance"
        | "pending_founder"
        | "approved"
        | "rejected"
      salary_structure_status: "draft" | "active" | "superseded" | "archived"
      shift_kind:
        | "general"
        | "morning"
        | "evening"
        | "night"
        | "flexible"
        | "remote"
      skill_verify_status:
        | "pending"
        | "assessing"
        | "dept_head_review"
        | "verified"
        | "rejected"
      story_audience: "public" | "close_friends"
      succession_readiness: "not_ready" | "dev_1y" | "dev_6m" | "ready_now"
      succession_scope:
        | "department_head"
        | "deputy_head"
        | "team_lead"
        | "specialist"
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
      account_type: ["personal", "organization"],
      admin_user_type: [
        "founder",
        "co_founder",
        "employee",
        "contractor",
        "temporary",
      ],
      app_role: ["admin", "moderator", "user"],
      application_status: [
        "active",
        "on_hold",
        "rejected",
        "withdrawn",
        "offer_extended",
        "hired",
      ],
      approval_decision: ["pending", "approved", "rejected", "skipped"],
      attendance_source: ["self", "manager", "system", "import", "correction"],
      attendance_status: [
        "present",
        "absent",
        "late",
        "half_day",
        "wfh",
        "business_travel",
        "training",
        "holiday",
        "weekend",
        "leave",
      ],
      bonus_status: ["draft", "approved", "paid", "rejected"],
      bonus_type: [
        "performance",
        "festival",
        "joining",
        "retention",
        "referral",
        "spot_award",
        "custom",
      ],
      candidate_event_type: [
        "application",
        "stage_change",
        "interview_scheduled",
        "interview_completed",
        "feedback_submitted",
        "offer_generated",
        "offer_sent",
        "offer_accepted",
        "offer_rejected",
        "offer_withdrawn",
        "communication",
        "status_change",
        "hired",
        "rejected",
      ],
      candidate_stage: [
        "applied",
        "screening",
        "hr_interview",
        "technical_interview",
        "manager_interview",
        "founder_interview",
        "final_review",
        "offer",
        "hired",
        "rejected",
        "withdrawn",
      ],
      candidate_status: ["active", "on_hold", "rejected", "withdrawn", "hired"],
      cert_category: [
        "technical",
        "leadership",
        "compliance",
        "security",
        "department",
        "process",
      ],
      cert_status: ["active", "expired", "revoked"],
      checklist_owner: ["hr", "employee"],
      compensation_type: [
        "monthly_salary",
        "hourly",
        "intern_stipend",
        "contract",
        "project_based",
      ],
      correction_status: ["pending", "approved", "rejected"],
      council_role: ["architect", "curator", "sentinel", "innovator"],
      course_category: [
        "department",
        "policy",
        "technical",
        "leadership",
        "security",
        "compliance",
        "ai",
        "onboarding",
      ],
      course_difficulty: ["beginner", "intermediate", "advanced", "expert"],
      course_status: ["draft", "published", "archived"],
      employment_status: [
        "candidate",
        "offer_sent",
        "offer_accepted",
        "pre_onboarding",
        "joining_today",
        "active",
        "on_leave",
        "suspended",
        "resigned",
        "exited",
        "archived",
      ],
      enrollment_status: [
        "assigned",
        "in_progress",
        "completed",
        "overdue",
        "cancelled",
      ],
      hiring_priority: ["low", "medium", "high", "critical"],
      hiring_request_status: [
        "draft",
        "pending_hr",
        "pending_founder",
        "approved",
        "on_hold",
        "rejected",
        "closed",
        "filled",
      ],
      holiday_kind: ["national", "company", "department", "regional"],
      interview_decision: ["pending", "pass", "hold", "reject", "reopen"],
      interview_recommendation: [
        "strong_hire",
        "hire",
        "no_hire",
        "strong_no_hire",
      ],
      interview_round_status: [
        "scheduled",
        "completed",
        "cancelled",
        "no_show",
      ],
      leave_kind: [
        "annual",
        "medical",
        "emergency",
        "unpaid",
        "sabbatical",
        "other",
      ],
      leave_request_status: [
        "draft",
        "pending_lead",
        "pending_dept_head",
        "pending_hr",
        "approved",
        "rejected",
        "cancelled",
      ],
      leave_type: [
        "annual",
        "medical",
        "emergency",
        "maternity",
        "paternity",
        "bereavement",
        "compensatory",
        "unpaid",
      ],
      movement_kind: [
        "department_transfer",
        "team_transfer",
        "manager_change",
        "promotion",
        "demotion",
        "temporary_assignment",
        "cross_department_assignment",
        "acting_assignment",
        "leave",
        "suspension",
        "reinstatement",
        "resignation",
        "exit",
        "rejoin",
        "workload_transfer",
        "knowledge_transfer",
      ],
      movement_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "applied",
        "expired",
        "cancelled",
      ],
      offer_status: [
        "draft",
        "pending_approval",
        "approved",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "withdrawn",
      ],
      onboarding_stage: [
        "draft",
        "hr_review",
        "background_check",
        "account_provisioning",
        "credentials_generated",
        "welcome_sent",
        "awaiting_first_login",
        "completed",
        "cancelled",
      ],
      open_position_priority: ["low", "medium", "high", "critical"],
      open_position_status: [
        "draft",
        "pending_approval",
        "approved",
        "filled",
        "cancelled",
      ],
      org_member_role: ["owner", "admin", "manager", "viewer"],
      org_type: [
        "startup",
        "company",
        "education",
        "ngo",
        "government",
        "creator",
        "community",
        "other",
      ],
      passport_doc_type: [
        "offer_letter",
        "appointment_letter",
        "nda",
        "government_document",
        "educational_document",
        "promotion_letter",
        "warning",
        "transfer_letter",
        "exit_document",
        "certificate",
        "other",
      ],
      passport_event_type: [
        "joined",
        "department_changed",
        "manager_changed",
        "team_changed",
        "promotion",
        "transfer",
        "award",
        "training_completed",
        "skill_verified",
        "certification_earned",
        "warning_issued",
        "suspension",
        "leave",
        "resignation",
        "exit",
        "archive",
        "document_uploaded",
        "project_added",
        "note",
      ],
      passport_skill_status: ["proposed", "verified", "revoked"],
      payroll_cycle_status: [
        "draft",
        "finance_review",
        "hr_review",
        "founder_review",
        "approved",
        "released",
        "cancelled",
      ],
      perf_cycle_period: ["monthly", "quarterly", "half_yearly", "annual"],
      perf_cycle_status: ["draft", "active", "in_review", "closed"],
      perf_goal_priority: ["low", "medium", "high", "critical"],
      perf_goal_status: [
        "not_started",
        "in_progress",
        "at_risk",
        "completed",
        "missed",
        "cancelled",
      ],
      perf_review_stage: [
        "self",
        "team_lead",
        "department_head",
        "hr",
        "finalized",
      ],
      perf_reviewer_role: ["self", "team_lead", "department_head", "hr"],
      pip_status: [
        "draft",
        "active",
        "on_track",
        "off_track",
        "completed",
        "failed",
        "cancelled",
      ],
      post_status: ["draft", "scheduled", "published"],
      promotion_readiness_level: [
        "not_ready",
        "emerging",
        "developing",
        "ready_soon",
        "ready_now",
      ],
      recognition_type: [
        "award",
        "achievement",
        "outstanding",
        "innovation",
        "leadership",
        "special",
      ],
      reimbursement_status: [
        "pending_manager",
        "pending_finance",
        "approved",
        "rejected",
        "paid",
      ],
      roadmap_requirement_type: ["course", "skill", "certification"],
      salary_revision_status: [
        "pending_hr",
        "pending_finance",
        "pending_founder",
        "approved",
        "rejected",
      ],
      salary_structure_status: ["draft", "active", "superseded", "archived"],
      shift_kind: [
        "general",
        "morning",
        "evening",
        "night",
        "flexible",
        "remote",
      ],
      skill_verify_status: [
        "pending",
        "assessing",
        "dept_head_review",
        "verified",
        "rejected",
      ],
      story_audience: ["public", "close_friends"],
      succession_readiness: ["not_ready", "dev_1y", "dev_6m", "ready_now"],
      succession_scope: [
        "department_head",
        "deputy_head",
        "team_lead",
        "specialist",
      ],
    },
  },
} as const
