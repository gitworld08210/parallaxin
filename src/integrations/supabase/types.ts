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
    }
    Views: {
      [_ in never]: never
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
      checklist_owner: "hr" | "employee"
      council_role: "architect" | "curator" | "sentinel" | "innovator"
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
      post_status: "draft" | "scheduled" | "published"
      story_audience: "public" | "close_friends"
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
      checklist_owner: ["hr", "employee"],
      council_role: ["architect", "curator", "sentinel", "innovator"],
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
      post_status: ["draft", "scheduled", "published"],
      story_audience: ["public", "close_friends"],
    },
  },
} as const
